// Zettelbranch: a conversation as a list of messages [{ n, role, text }], numbered from 1
// along the path the page shows. Read from the API's answer (with each message's `uuid`), or,
// when the API fails, from the page, which holds only the messages near the screen.
// Reads only: no network (api.js does that), no storage, no innerText, no innerHTML.
(function (global) {
  'use strict';

  // ---------------------------------------------------------------- from the API

  function roleOf(m) {
    const s = m.sender || m.role;
    return s === 'human' || s === 'user' ? 'user' : s === 'assistant' ? 'assistant' : String(s);
  }

  // The path the page shows: from current_leaf_message_uuid up through parent_message_uuid.
  // Falls back to sorting by index.
  function pathOf(conv) {
    const msgs = conv.chat_messages;
    const byId = new Map(msgs.map((m) => [m.uuid, m]));
    if (!byId.has(conv.current_leaf_message_uuid)) return [...msgs].sort((a, b) => (a.index || 0) - (b.index || 0));
    const path = [];
    const seen = new Set();
    for (let m = byId.get(conv.current_leaf_message_uuid); m && !seen.has(m.uuid); m = byId.get(m.parent_message_uuid)) {
      seen.add(m.uuid);
      path.unshift(m);
    }
    return path;
  }

  // Message text, as stored (Markdown). Kept: text blocks, and pasted text, since Claude saw
  // it. Placeholders for artifacts, files and images. Left out: thinking, tool calls and
  // their results.
  function messageText(m) {
    const parts = [];
    const name = (s, fallback) => String(s || fallback).replace(/\s+/g, ' ').slice(0, 100);
    if (Array.isArray(m.content) && m.content.length) {
      for (const b of m.content) {
        if (!b) continue;
        const input = b.input || {};
        if (b.type === 'text' && b.text) parts.push(b.text);
        else if (b.type === 'tool_use' && b.name === 'artifacts') parts.push(`[artifact: ${name(input.title || input.id, 'untitled')}, not copied]`);
        else if (b.type === 'tool_use' && b.name === 'create_file') parts.push(`[file: ${name(String(input.path || input.file_path || '').split('/').pop(), 'created file')}, not copied]`);
      }
    } else if (typeof m.text === 'string' && m.text) {
      parts.push(m.text);
    }
    const files = m.files_v2 && m.files_v2.length ? m.files_v2 : m.files || [];
    for (const f of files) parts.push(`[file: ${name(f.file_name || f.file_kind, 'unnamed')}, not copied]`);
    for (const a of m.attachments || []) {
      if (typeof a.extracted_content === 'string') parts.push(`[pasted text${a.file_name ? ': ' + name(a.file_name) : ''}]\n${a.extracted_content}`);
      else parts.push(`[file: ${name(a.file_name, 'unnamed')}, not copied]`);
    }
    return parts.join('\n\n');
  }

  const fromApi = (conv) => pathOf(conv).map((m, i) => ({ n: i + 1, role: roleOf(m), text: messageText(m), uuid: m.uuid }));

  // ---------------------------------------------------------------- from the page

  // Attributes and class names only, never visible UI text (the UI may be in any language).
  const SELECTORS = {
    user: ['[data-testid="user-message"]', '.font-user-message'],
    assistant: ['[data-testid="assistant-message"]', '.font-claude-response'],
    row: '[data-testid="transcript-row"]', // carries data-index, the message's place in the chat
    markdown: '.standard-markdown, .progressive-markdown', // Claude's text, without thinking or tools
    artifact: '[class*="artifact"], [data-testid*="artifact"]',
    tex: 'annotation[encoding="application/x-tex"]',
  };
  const BLOCK = /^(ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|DETAILS|DIV|DL|DD|DT|FIELDSET|FIGCAPTION|FIGURE|FOOTER|FORM|H[1-6]|HEADER|HR|LI|MAIN|NAV|OL|P|PRE|SECTION|SUMMARY|TABLE|UL)$/;
  const SKIP = /^(BUTTON|SCRIPT|STYLE|NOSCRIPT|TEMPLATE|SVG|INPUT|TEXTAREA|SELECT|IFRAME|CANVAS|VIDEO|AUDIO|OBJECT|EMBED)$/;

  const tag = (el) => String(el.tagName).toUpperCase();
  const nbsp = (s) => s.replace(/ /g, ' ');
  const skipped = (el) => SKIP.test(tag(el)) || el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true' || el.classList.contains('sr-only');
  const outermost = (els) => els.filter((e) => !els.some((o) => o !== e && o.contains(e)));
  const longestRun = (s, ch) => Math.max(0, ...(s.match(new RegExp(`${ch}+`, 'g')) || []).map((r) => r.length));

  // The Markdown blocks of an element's children. Inline content in a row is one paragraph.
  function blocks(parent) {
    const out = [];
    let line = '';
    const flush = () => {
      if (line.trim()) out.push(line.trim());
      line = '';
    };
    for (const c of parent.childNodes) {
      if (c.nodeType === 3) line += nbsp(c.nodeValue);
      if (c.nodeType !== 1) continue;
      const b = block(c);
      if (b === null) line += inline(c);
      else {
        flush();
        if (b) out.push(b);
      }
    }
    flush();
    return out;
  }

  // One element as a Markdown block: a string, '' (left out), or null (not a block).
  function block(el) {
    if (el.matches(SELECTORS.artifact)) return artifact(el);
    if (el.classList.contains('katex-display')) return math(el, true);
    if (skipped(el)) return '';
    const t = tag(el);
    if (/^H[1-6]$/.test(t)) {
      const s = inlines(el).replace(/\s+/g, ' ').trim();
      return s ? '#'.repeat(Number(t[1])) + ' ' + s : '';
    }
    if (t === 'PRE') return code(el, '');
    if (t === 'TABLE') return table(el);
    if (t === 'HR') return '---';
    if (t === 'UL' || t === 'OL') return list(el);
    if (t === 'BLOCKQUOTE') {
      const s = blocks(el).join('\n\n');
      return s ? s.split('\n').map((l) => (l ? '> ' + l : '>')).join('\n') : '';
    }
    if (t === 'DIV') {
      const w = codeWrapper(el);
      if (w) return code(w.pre, w.lang);
    }
    return BLOCK.test(t) ? blocks(el).join('\n\n') : null;
  }

  const inlines = (el) => Array.from(el.childNodes, inline).join('');

  function inline(n) {
    if (n.nodeType === 3) return nbsp(n.nodeValue);
    if (n.nodeType !== 1) return '';
    if (n.matches(SELECTORS.artifact)) return artifact(n);
    if (n.classList.contains('katex') || tag(n) === 'MATH') return math(n, false);
    if (skipped(n)) return '';
    switch (tag(n)) {
      case 'BR':
        return '\n';
      case 'STRONG':
      case 'B':
        return wrap('**', inlines(n));
      case 'EM':
      case 'I':
        return wrap('*', inlines(n));
      case 'DEL':
      case 'S':
        return wrap('~~', inlines(n));
      case 'CODE': {
        const t = nbsp(n.textContent).replace(/\n/g, ' ');
        const fence = '`'.repeat(longestRun(t, '`') + 1);
        const pad = t.startsWith('`') || t.endsWith('`') ? ' ' : '';
        return fence + pad + t + pad + fence;
      }
      case 'A': {
        const text = inlines(n).trim();
        const href = n.getAttribute('href') || '';
        if (!href || /^javascript:/i.test(href)) return text;
        return !text || text === href ? href : `[${text}](${href})`;
      }
      case 'IMG': {
        const alt = (n.getAttribute('alt') || '').trim();
        return `[image${alt ? ': ' + alt : ''}, not copied]`;
      }
      default:
        return inlines(n);
    }
  }

  // Spaces stay outside the markers: `** x**` is not bold in Markdown.
  function wrap(marker, s) {
    if (!s.trim()) return s;
    return /^\s*/.exec(s)[0] + marker + s.trim() + marker + /\s*$/.exec(s)[0];
  }

  // claude.ai wraps a code block in a div with a small language label and a copy button:
  // exactly one <pre>, no prose, and at most a short label outside the <pre>.
  function codeWrapper(el) {
    const pres = el.querySelectorAll('pre');
    if (pres.length !== 1 || el.querySelector('p, li, h1, h2, h3, h4, h5, h6, table, blockquote')) return null;
    let label = '';
    (function walk(n) {
      for (const c of n.childNodes) {
        if (c === pres[0]) continue;
        if (c.nodeType === 3) label += c.nodeValue + ' ';
        else if (c.nodeType === 1 && !skipped(c)) walk(c);
      }
    })(el);
    label = label.replace(/\s+/g, ' ').trim();
    if (label.length > 40) return null;
    return { pre: pres[0], lang: /^[\w+#.-]{1,30}$/.test(label) ? label.toLowerCase() : '' };
  }

  function code(pre, lang) {
    const el = pre.querySelector('code') || pre;
    const m = /(?:^|\s)(?:language|lang)-([\w+#.-]+)/.exec(`${el.getAttribute('class') || ''} ${pre.getAttribute('class') || ''}`);
    let text = '';
    (function walk(n) {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) text += c.nodeValue;
        else if (c.nodeType === 1 && !/linenumber/i.test(c.getAttribute('class') || '')) walk(c);
      }
    })(el);
    text = nbsp(text).replace(/\n$/, '');
    const fence = '`'.repeat(Math.max(3, longestRun(text, '`') + 1));
    return `${fence}${m ? m[1] : lang}\n${text}\n${fence}`;
  }

  function table(el) {
    const rows = Array.from(el.querySelectorAll('tr')).filter((tr) => tr.closest('table') === el);
    if (!rows.length) return '';
    const grid = rows.map((tr) =>
      Array.from(tr.children)
        .filter((c) => /^T[DH]$/.test(tag(c)))
        .map((c) => blocks(c).join(' ').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|').trim())
    );
    const width = Math.max(...grid.map((r) => r.length));
    const row = (r) => '| ' + Array.from({ length: width }, (_, i) => r[i] || '').join(' | ') + ' |';
    return [row(grid[0]), '| ' + Array(width).fill('---').join(' | ') + ' |', ...grid.slice(1).map(row)].join('\n');
  }

  function list(el) {
    const ordered = tag(el) === 'OL';
    let n = ordered ? parseInt(el.getAttribute('start') || '1', 10) || 1 : 0;
    const items = [];
    for (const li of el.children) {
      if (tag(li) !== 'LI') continue;
      const marker = ordered ? `${n++}. ` : '- ';
      const pad = ' '.repeat(marker.length);
      const lines = blocks(li).join('\n').split('\n');
      items.push(marker + lines[0] + lines.slice(1).map((l) => '\n' + (l ? pad + l : '')).join(''));
    }
    return items.join('\n');
  }

  // KaTeX keeps the formula's source in an annotation.
  function math(el, display) {
    const ann = el.querySelector(SELECTORS.tex);
    if (!ann) return '[math]';
    const tex = ann.textContent.trim();
    return display ? `$$\n${tex}\n$$` : `$${tex}$`;
  }

  // An artifact card: its first real text is the title.
  function artifact(el) {
    let title = '';
    (function walk(n) {
      for (const c of n.childNodes) {
        if (title) return;
        if (c.nodeType === 3 && c.nodeValue.trim()) title = c.nodeValue.trim();
        else if (c.nodeType === 1 && !/^(SVG|STYLE|SCRIPT)$/.test(tag(c)) && c.getAttribute('aria-hidden') !== 'true' && !c.classList.contains('sr-only')) walk(c);
      }
    })(el);
    return `[artifact: ${title.replace(/\s+/g, ' ').slice(0, 100) || 'untitled'}, not copied]`;
  }

  // Claude's message: its Markdown parts and artifacts, in order. Everything else (thinking,
  // tool use, buttons) is left out.
  function assistantText(el) {
    const parts = outermost(Array.from(el.querySelectorAll(SELECTORS.markdown)));
    if (!parts.length) return blocks(el).join('\n\n');
    const out = [];
    (function walk(node) {
      for (const c of node.children) {
        if (parts.includes(c)) out.push(...blocks(c));
        else if (c.matches(SELECTORS.artifact)) out.push(artifact(c));
        else if (parts.some((p) => c.contains(p)) || c.querySelector(SELECTORS.artifact)) walk(c);
      }
    })(el);
    return out.join('\n\n');
  }

  // The messages on the page. Numbered by their rows' data-index when every message has one
  // (`numbered`), else from 1; a long chat shows only some of its messages.
  function fromPage(doc) {
    const pick = (sels) => {
      for (const sel of sels) {
        const els = outermost(Array.from(doc.querySelectorAll(sel)));
        if (els.length) return els;
      }
      return [];
    };
    const assistant = pick(SELECTORS.assistant);
    const user = pick(SELECTORS.user).filter((u) => !assistant.some((a) => a.contains(u) || u.contains(a)));
    const items = [...user.map((el) => ({ role: 'user', el })), ...assistant.map((el) => ({ role: 'assistant', el }))];
    items.sort((a, b) => (a.el.compareDocumentPosition(b.el) & 4 ? -1 : 1)); // 4: b follows a
    const index = items.map((it) => {
      const row = it.el.closest(SELECTORS.row);
      return row && /^\d+$/.test(row.getAttribute('data-index') || '') ? Number(row.getAttribute('data-index')) : -1;
    });
    const numbered = items.length > 0 && index.every((x, i) => x >= 0 && (i === 0 || x > index[i - 1]));
    const messages = items.map((it, i) => {
      const text = it.role === 'user' ? blocks(it.el).join('\n\n') : assistantText(it.el);
      return { n: numbered ? index[i] + 1 : i + 1, role: it.role, text: text.replace(/\n{3,}/g, '\n\n').trim() };
    });
    return { messages, numbered };
  }

  global.ZBConversation = { roleOf, pathOf, messageText, fromApi, fromPage, SELECTORS };
})(globalThis);
