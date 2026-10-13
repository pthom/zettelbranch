// Zettelbranch spike: titles, addresses and conversation shapes. Pure functions, no DOM,
// no network.
//
// Titles: `<tree>/<address> · <topic>`, for example `zbtest/1b1 · Lipograms`.
// Addresses are split into number and letter segments (`1b10` = [1, 'b', 10]); a child has
// its parent's segments plus exactly one more. Never compared as string prefixes (AD-D2).
// After `z`, letters continue `aa`, `ab`… (AD-D5).
(function (global) {
  'use strict';

  const TEST_TREE = 'zbtest';
  const TEST_PREFIX = TEST_TREE + '/';

  function parseAddress(a) {
    if (typeof a !== 'string' || !/^[0-9][0-9a-z]*$/.test(a)) return null;
    const parts = a.match(/[0-9]+|[a-z]+/g);
    const segs = [];
    for (let i = 0; i < parts.length; i++) {
      const isNum = /^[0-9]/.test(parts[i]);
      if (isNum !== (i % 2 === 0)) return null; // must alternate, starting with a number
      if (isNum && (parts[i] === '0' || parts[i].startsWith('0'))) return null;
      segs.push(isNum ? Number(parts[i]) : parts[i]);
    }
    return segs;
  }

  const formatAddress = (segs) => segs.join('');

  // 'a' = 1, 'z' = 26, 'aa' = 27… (bijective base 26, like spreadsheet columns).
  function lettersToIndex(s) {
    let n = 0;
    for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 96);
    return n;
  }
  function indexToLetters(n) {
    let s = '';
    while (n > 0) {
      const r = (n - 1) % 26;
      s = String.fromCharCode(97 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  // `zbtest/1b · Topic` -> { tree, address, segs, topic }. Null if not a tree title.
  function parseTitle(title) {
    const m = /^([a-z0-9-]+)\/([0-9][0-9a-z]*)(?:\s+·\s+([\s\S]*))?$/.exec(String(title || '').trim());
    if (!m) return null;
    const segs = parseAddress(m[2]);
    if (!segs) return null;
    return { tree: m[1], address: m[2], segs, topic: m[3] === undefined ? '' : m[3] };
  }

  function isChild(childSegs, parentSegs) {
    if (childSegs.length !== parentSegs.length + 1) return false;
    return parentSegs.every((s, i) => s === childSegs[i]);
  }

  // Next free child address of `parentSegs` among the given titles (same tree only).
  function nextChild(tree, parentSegs, titles) {
    const kids = titles.map(parseTitle).filter((t) => t && t.tree === tree && isChild(t.segs, parentSegs));
    const lastIsNumber = typeof parentSegs[parentSegs.length - 1] === 'number';
    let max = 0;
    for (const k of kids) {
      const s = k.segs[k.segs.length - 1];
      max = Math.max(max, lastIsNumber ? lettersToIndex(s) : s);
    }
    const next = lastIsNumber ? indexToLetters(max + 1) : max + 1;
    return { address: formatAddress([...parentSegs, next]), existingChildren: kids.map((k) => k.address) };
  }

  function nextRoot(tree, titles) {
    let max = 0;
    for (const t of titles.map(parseTitle)) if (t && t.tree === tree && t.segs.length === 1) max = Math.max(max, t.segs[0]);
    return String(max + 1);
  }

  // Ancestor addresses from the root down to `segs` itself: [1,'b',1] -> ['1','1b','1b1'].
  function ancestry(segs) {
    return segs.map((_, i) => formatAddress(segs.slice(0, i + 1)));
  }

  const isTestTitle = (title) => typeof title === 'string' && title.startsWith(TEST_PREFIX);

  // ---------------------------------------------------------------- API message shapes

  function roleOf(m) {
    const s = m.sender || m.role;
    return s === 'human' || s === 'user' ? 'user' : s === 'assistant' ? 'assistant' : String(s);
  }

  // The path the page shows: from current_leaf_message_uuid up through parent_message_uuid.
  // Falls back to sorting by index.
  function pathOf(conv) {
    const msgs = Array.isArray(conv.chat_messages) ? conv.chat_messages : [];
    const byId = new Map(msgs.map((m) => [m.uuid, m]));
    const children = new Map();
    for (const m of msgs) children.set(m.parent_message_uuid, (children.get(m.parent_message_uuid) || 0) + 1);
    const branchPoints = [...children.values()].filter((n) => n > 1).length;
    if (conv.current_leaf_message_uuid && byId.has(conv.current_leaf_message_uuid)) {
      const path = [];
      const seen = new Set();
      for (let m = byId.get(conv.current_leaf_message_uuid); m && !seen.has(m.uuid); m = byId.get(m.parent_message_uuid)) {
        seen.add(m.uuid);
        path.unshift(m);
      }
      return { path, method: 'leaf', total: msgs.length, branchPoints };
    }
    return { path: [...msgs].sort((a, b) => (a.index || 0) - (b.index || 0)), method: 'index', total: msgs.length, branchPoints };
  }

  // Message text as Markdown. Placeholders for what a branch does not carry (FK-D1):
  // artifacts, created files, attachments, images. Thinking and other tool use left out.
  function messageText(m, { placeholders = true } = {}) {
    const parts = [];
    if (placeholders) {
      for (const a of m.attachments || []) parts.push(`[attachment: ${a.file_name || 'unnamed'}, not copied]`);
      for (const f of m.files_v2 || m.files || []) parts.push(`[file: ${f.file_name || f.file_kind || 'unnamed'}, not copied]`);
    }
    if (Array.isArray(m.content) && m.content.length) {
      for (const b of m.content) {
        if (b.type === 'text' && b.text) parts.push(b.text);
        else if (b.type === 'tool_use' && b.name === 'artifacts') parts.push(`[artifact: ${(b.input && (b.input.title || b.input.id)) || 'untitled'}, not copied]`);
        else if (placeholders && b.type === 'tool_use' && b.name === 'create_file') {
          const p = (b.input && (b.input.path || b.input.file_path)) || '';
          parts.push(`[file: ${p.split('/').pop() || 'created file'}, not copied]`);
        }
      }
    } else if (typeof m.text === 'string') {
      parts.push(m.text);
    }
    return parts.join('\n\n');
  }

  // Facts about attachments and files of one message, without their content.
  function attachmentFacts(m) {
    return {
      attachments: (m.attachments || []).map((a) => ({
        chars: typeof a.extracted_content === 'string' ? a.extracted_content.length : null,
        type: a.file_type || null,
      })),
      files: (m.files_v2 || m.files || []).map((f) => ({ kind: f.file_kind || null })),
    };
  }

  global.ZBConv = {
    TEST_TREE, TEST_PREFIX, parseAddress, formatAddress, lettersToIndex, indexToLetters, parseTitle,
    isChild, nextChild, nextRoot, ancestry, isTestTitle, roleOf, pathOf, messageText, attachmentFacts,
  };
})(globalThis);
