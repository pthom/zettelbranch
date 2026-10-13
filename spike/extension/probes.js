// Zettelbranch spike: the Milestone 0 probes P1 to P8. Each runs only when Pascal clicks
// its button in the panel. Nothing is ever sent: Pascal presses Send himself.
//
// Guards:
//   - Write probes (P1-P4, P8: inserting text, renaming) run only on a new empty chat, on
//     a conversation whose title starts with `zbtest/`, or on a chat this tab saw being
//     started from a new chat (needed to rename it into the test tree before its reply ends).
//   - Read-only probes (P5-P7) run anywhere and change nothing. Their results hold counts and
//     structure, never message text, and only `zbtest/` titles.
//   - Renames go only to `zbtest/…` names, after a confirm dialog showing both titles.
// No keyboard or input listeners: field values are read when a button is clicked.
(function (global) {
  'use strict';

  const X = () => global.ZBExtract;
  const A = () => global.ZBApi;
  const C = () => global.ZBConv;
  const P = () => global.ZBPrompt;
  const K = () => global.ZBCompare;

  const READ_ONLY = 'read-only, nothing is changed';

  // Page elements. Each lookup tries a short list and reports which candidate matched.
  // All are attributes or link targets, never visible UI text.
  const CANDIDATES = {
    composer: [
      '[data-testid="chat-input"] [contenteditable="true"]',
      '[data-testid="chat-input"][contenteditable="true"]',
      'div.ProseMirror[contenteditable="true"]',
      '[contenteditable="true"][role="textbox"]',
      'fieldset [contenteditable="true"]',
      'textarea[data-testid="chat-input"]',
      'fieldset textarea',
    ],
    send: [
      '[data-testid="chat-input-send"]',
      'button[data-testid*="send"]',
      'fieldset button[type="submit"]',
      'form button[type="submit"]',
    ],
    newChat: [
      '[data-testid="sidebar"] a[href="/new"][data-row-main-button]',
      'a[href="/new"][data-row-main-button]',
      '[data-testid="sidebar"] a[href="/new"]',
      'a[href="/new"]',
      'a[href^="/new?"]',
    ],
    sidebarEntries: [
      '[data-testid="sidebar-recents"] a[href*="/chat/"]',
      '[data-testid="sidebar"] a[href*="/chat/"]',
      'nav a[href*="/chat/"]',
      'aside a[href*="/chat/"]',
    ],
    attachmentChip: ['[data-testid*="file"]', '[data-testid*="attachment"]', '[data-testid*="paste"]', '[data-testid*="thumbnail"]'],
  };

  function find(name, root = document) {
    for (const sel of CANDIDATES[name]) {
      const el = root.querySelector(sel);
      if (el) return { el, selector: sel };
    }
    return { el: null, selector: null, tried: CANDIDATES[name] };
  }

  function findAll(name, root = document) {
    for (const sel of CANDIDATES[name]) {
      const els = Array.from(root.querySelectorAll(sel));
      if (els.length) return { els, selector: sel };
    }
    return { els: [], selector: null, tried: CANDIDATES[name] };
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function waitFor(fn, timeout = 10000, every = 100) {
    const t0 = performance.now();
    while (performance.now() - t0 < timeout) {
      const v = fn();
      if (v) return v;
      await sleep(every);
    }
    return null;
  }

  // ---------------------------------------------------------------- state (memory only)

  const state = {
    bornHere: new Set(), // chats this tab saw being started from a new chat
    navigations: 0,
    lastInserted: null,
    p2: null,
    p3: null,
    zbtestTitles: null, // from the last conversation list, zbtest titles only
    p8: { pending: null, forkAt: null },
  };

  function kindOf(path) {
    const m = /^\/chat\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/.exec(path);
    if (m) return { kind: 'chat', id: m[1] };
    if (path === '/' || path === '/new' || path.startsWith('/new/')) return { kind: 'new' };
    if (path.startsWith('/share/')) return { kind: 'share' };
    return { kind: 'other' };
  }
  const pageKind = () => kindOf(location.pathname);

  // Watches the address (polling, no listeners) to see chats being born in this tab.
  let lastPath = location.pathname;
  function watchTick() {
    const p = location.pathname;
    if (p === lastPath) return;
    const from = kindOf(lastPath);
    const to = kindOf(p);
    state.navigations++;
    if (from.kind === 'new' && to.kind === 'chat') state.bornHere.add(to.id);
    lastPath = p;
  }
  let watcher = null;
  function startWatching() {
    if (!watcher) watcher = setInterval(watchTick, 300);
  }

  // ---------------------------------------------------------------- guards

  function refuse(reason) {
    return { ok: false, refused: true, reason, changed: 'nothing' };
  }

  async function titleOf(id) {
    try {
      const conv = await A().getConversation(id);
      return { title: conv.name, source: 'api', conv };
    } catch (e) {
      const entry = sidebarEntry(id);
      return { title: entry ? entry.label : null, source: entry ? 'sidebar' : 'none', apiError: A().errorInfo(e) };
    }
  }

  function sidebarEntry(id) {
    const all = findAll('sidebarEntries');
    const a = all.els.find((e) => (e.getAttribute('href') || '').endsWith('/chat/' + id));
    if (!a) return null;
    const label = a.querySelector('[data-row-label]') || a;
    return { label: label.textContent.replace(/\s+/g, ' ').trim(), selector: all.selector };
  }

  // Write probes: a new empty chat (if allowed), a zbtest/ chat, or a chat born in this tab.
  async function writeGuard({ allowNew }) {
    const pk = pageKind();
    if (pk.kind === 'new') {
      if (!allowNew) return refuse('open a conversation first: this probe works on a test conversation, not on a new chat');
      if (X().countMessages(document) > 0) return refuse('this new chat already shows messages; open a fresh new chat');
      return { ok: true, page: 'new empty chat' };
    }
    if (pk.kind !== 'chat') return refuse('not a chat page');
    if (state.bornHere.has(pk.id)) {
      const t = await titleOf(pk.id);
      return { ok: true, page: 'test chat (started from a new chat in this tab)', id: pk.id, title: t.title, conv: t.conv };
    }
    const t = await titleOf(pk.id);
    if (C().isTestTitle(t.title)) return { ok: true, page: 'test chat (title starts with zbtest/)', id: pk.id, title: t.title, conv: t.conv };
    return refuse(
      'this conversation is not a test chat: its title does not start with zbtest/ and this tab did not see it start. ' +
        'Nothing was done.' + (t.source === 'none' ? ' (Its title could not be read.)' : '')
    );
  }

  // ---------------------------------------------------------------- message box

  function testidCounts() {
    const counts = {};
    for (const el of document.querySelectorAll('[data-testid]')) {
      const t = el.getAttribute('data-testid');
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }
  function newTestids(before, after) {
    const out = {};
    for (const [k, v] of Object.entries(after)) if (v > (before[k] || 0)) out[k] = v - (before[k] || 0);
    return out;
  }
  function chipCount() {
    return CANDIDATES.attachmentChip.reduce((s, sel) => s + document.querySelectorAll(sel).length, 0);
  }

  // The editor's text with its line breaks, from its DOM: paragraphs and list items are
  // lines; a <br> that only holds an empty line open (last child, or ProseMirror's
  // trailing break) is not a line break; non-breaking spaces count as spaces.
  function editorText(el) {
    if (el.tagName === 'TEXTAREA') return el.value;
    const lines = [];
    let cur = null;
    const close = (force) => {
      if (cur !== null) {
        lines.push(cur);
        cur = null;
      } else if (force) lines.push('');
    };
    (function walk(n) {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) {
          cur = (cur || '') + c.nodeValue.replace(/\u00a0/g, ' ');
        } else if (c.nodeType === 1) {
          if (c.tagName === 'BR') {
            if (c.classList.contains('ProseMirror-trailingBreak') || !c.nextSibling) continue;
            cur = (cur || '') + '\n';
          } else if (/^(P|PRE|H[1-6])$/.test(c.tagName)) {
            close(false);
            walk(c);
            close(true);
          } else if (/^(DIV|LI|UL|OL|BLOCKQUOTE)$/.test(c.tagName)) {
            close(false);
            walk(c);
            close(false);
          } else {
            walk(c);
          }
        }
      }
    })(el);
    close(false);
    return lines.join('\n');
  }

  function sendState() {
    const s = find('send');
    if (!s.el) return { found: false, tried: s.tried };
    return { found: true, selector: s.selector, enabled: !(s.el.disabled || s.el.getAttribute('aria-disabled') === 'true') };
  }

  function measureEditor(el, inserted) {
    const text = editorText(el);
    const count = (sel) => el.querySelectorAll(sel).length;
    return {
      chars: text.length,
      newlines: (text.match(/\n/g) || []).length,
      structure: { p: count('p'), li: count('li'), ul: count('ul'), ol: count('ol'), pre: count('pre'), br: count('br') },
      ratioToInserted: inserted ? Math.round((text.length / inserted.length) * 1000) / 1000 : null,
      equalsInserted: inserted ? text === inserted : null,
      containsInserted: inserted ? text.includes(inserted) : null,
    };
  }

  function caretToEnd(el) {
    el.focus();
    if (el.tagName === 'TEXTAREA') {
      el.setSelectionRange(el.value.length, el.value.length);
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function insertText(el, text) {
    caretToEnd(el);
    const t0 = performance.now();
    const returned = document.execCommand('insertText', false, text);
    return { method: 'execCommand insertText', returned, ms: Math.round(performance.now() - t0) };
  }

  function pasteText(el, text) {
    caretToEnd(el);
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    const t0 = performance.now();
    el.dispatchEvent(ev);
    return { method: 'synthetic paste with DataTransfer', appHandledIt: ev.defaultPrevented, ms: Math.round(performance.now() - t0) };
  }

  // Inserts and measures: editor text, Send button, new elements (an attachment chip?).
  async function insertAndMeasure(text, how = 'insert') {
    const comp = find('composer');
    if (!comp.el) return { ok: false, error: 'message box not found', tried: comp.tried };
    const before = testidCounts();
    const chipsBefore = chipCount();
    const charsBefore = editorText(comp.el).length;
    const sendBefore = sendState();
    const ins = how === 'paste' ? pasteText(comp.el, text) : insertText(comp.el, text);
    await sleep(600);
    const added = newTestids(before, testidCounts());
    const chipsAfter = chipCount();
    return {
      ok: true,
      composerSelector: comp.selector,
      insertion: ins,
      insertedChars: text.length,
      editorCharsBefore: charsBefore,
      editor: measureEditor(comp.el, text),
      send: { before: sendBefore, after: sendState() },
      newTestidsOnPage: added,
      attachmentChipLikely: chipsAfter > chipsBefore || Object.keys(added).some((k) => /file|attach|paste|thumb/i.test(k)),
    };
  }

  // ---------------------------------------------------------------- reading what was sent

  async function currentPath(id) {
    try {
      const conv = await A().getConversation(id);
      const p = C().pathOf(conv);
      return { source: 'api', conv, path: p.path, info: { method: p.method, treeMessages: p.total, branchPoints: p.branchPoints } };
    } catch (e) {
      const r = X().extract(document);
      return { source: 'dom', apiError: A().errorInfo(e), dom: r.messages };
    }
  }

  function lastOf(cp, role) {
    if (cp.source === 'api') {
      const m = [...cp.path].reverse().find((x) => C().roleOf(x) === role);
      return m ? { text: C().messageText(m, { placeholders: false }), msg: m } : null;
    }
    const m = [...cp.dom].reverse().find((x) => x.role === role);
    return m ? { text: m.markdown, msg: null } : null;
  }

  function diffSummary(a, b) {
    const la = a.split('\n');
    const lb = b.split('\n');
    let first = null;
    for (let i = 0; i < Math.max(la.length, lb.length); i++) {
      if (la[i] !== lb[i]) {
        first = { line: i + 1, inserted: la[i] === undefined ? null : la[i], sent: lb[i] === undefined ? null : lb[i] };
        break;
      }
    }
    const stats = (t) => ({
      chars: t.length,
      newlines: (t.match(/\n/g) || []).length,
      indentedLines: t.split('\n').filter((l) => /^ +\S/.test(l)).length,
      fenceLines: t.split('\n').filter((l) => /^\s*```/.test(l)).length,
      listLines: t.split('\n').filter((l) => /^\s*[-*] /.test(l)).length,
    });
    return { inserted: stats(a), sent: stats(b), firstDifferentLine: first };
  }

  // ---------------------------------------------------------------- P1

  const P1_TEXT = [
    'Zettelbranch · zbtest/p1',
    'Path: zbtest/p1 (insertion test, P1)',
    '',
    'A list:',
    '- first item',
    '- second item',
    '  - nested item',
    '',
    '```python',
    'def f(x):',
    '    if x:',
    '        return 1',
    '    return 0',
    '```',
    '',
    'Reply only with: ok',
  ].join('\n');

  async function p1Insert(how) {
    const g = await writeGuard({ allowNew: true });
    if (!g.ok) return g;
    const r = await insertAndMeasure(P1_TEXT, how);
    if (r.ok) state.lastInserted = { text: P1_TEXT, probe: 'P1', how };
    return { guard: g.page, ...r, next: 'Look at the box, then press Send yourself. After the reply, click "Check last sent message".' };
  }

  async function checkLastSent() {
    const pk = pageKind();
    if (pk.kind !== 'chat') return refuse('open the chat where you sent the text');
    const g = await writeGuard({ allowNew: false });
    if (!g.ok) return g;
    if (!state.lastInserted) return { ok: false, error: 'nothing was inserted from this tab yet (or the page reloaded since)' };
    const cp = await currentPath(pk.id);
    const last = lastOf(cp, 'user');
    if (!last) return { ok: false, error: 'no message of yours found', source: cp.source };
    const ins = state.lastInserted.text;
    const out = {
      ok: true,
      source: cp.source,
      apiError: cp.apiError,
      insertedBy: state.lastInserted.how,
      exact: last.text === ins,
      exactIgnoringOuterWhitespace: last.text.trim() === ins.trim(),
      diff: diffSummary(ins, last.text),
      attachmentsOfThatMessage: last.msg ? C().attachmentFacts(last.msg) : 'unknown (no API)',
    };
    out.testTree = await intoTestTree(pk.id, g.title, state.lastInserted.how === 'paste' ? 'p1-paste' : 'p1', 'insertion test');
    return out;
  }

  // ---------------------------------------------------------------- P2

  // Numbered lines, so truncation is visible; total length (with newlines) stays <= target.
  function fillerLines(target, label) {
    const lines = [];
    let len = 0;
    for (let i = 1; ; i++) {
      const line = `Line ${String(i).padStart(5, '0')}: zbtest filler for P2 (${label}), the quick brown fox jumps over the lazy dog.`;
      if (len + line.length + 1 > target) break;
      lines.push(line);
      len += line.length + 1;
    }
    return lines;
  }
  const P2_ASK = 'Reply only with the exact text of line 3.';

  // P2 needs an empty new chat. Elsewhere, it opens one through the app's own New chat
  // link, which P3 showed works without a page load.
  async function ensureNewChat() {
    const comp = find('composer');
    if (pageKind().kind === 'new' && X().countMessages(document) === 0 && comp.el && !editorText(comp.el).trim()) return { opened: false };
    const link = find('newChat');
    if (!link.el) return { opened: false, error: 'New chat link not found', tried: link.tried };
    const start = location.href;
    link.el.click();
    await waitFor(() => location.href !== start, 10000);
    await sleep(300);
    const box = await waitFor(() => find('composer').el, 10000);
    return { opened: true, nowOn: pageKind().kind, composerFound: !!box };
  }

  async function p2Insert(size, label) {
    const nc = await ensureNewChat();
    if (nc.error) return { ok: false, ...nc };
    const g = await writeGuard({ allowNew: true });
    if (!g.ok) return g;
    const lines = fillerLines(size - P2_ASK.length - 1, label);
    const text = lines.join('\n') + '\n' + P2_ASK;
    const r = await insertAndMeasure(text);
    if (r.ok) {
      state.lastInserted = { text, probe: 'P2', how: 'insert' };
      state.p2 = { label, expectedLine3: lines[2], lines: lines.length, chars: text.length };
    }
    const ratio = r.ok ? r.editor.ratioToInserted : null;
    return {
      guard: g.page,
      newChat: nc,
      size: label,
      verdict: !r.ok ? 'failed' : ratio >= 0.98 ? 'stayed inline' : r.attachmentChipLikely ? 'became an attachment (likely)' : 'unclear: partly inline?',
      ...r,
      next: 'Press Send yourself. After the reply, click "Check after sending".',
    };
  }

  async function p2Parts(size, label) {
    const nc = await ensureNewChat();
    if (nc.error) return { ok: false, ...nc };
    const g = await writeGuard({ allowNew: true });
    if (!g.ok) return g;
    const header = 'Zettelbranch · zbtest/p2\nPath: zbtest/p2 (long text test, P2, inserted in three parts)\nForked from: nothing, this is a size test';
    const lines = fillerLines(size - 40, label);
    const transcript = '<zb-transcript>\n' + lines.join('\n') + '\n</zb-transcript>';
    const parts = [
      { name: 'header', text: header + '\n\n', marker: 'Zettelbranch · zbtest/p2' },
      { name: 'transcript', text: transcript + '\n\n', marker: '<zb-transcript>' },
      { name: 'instruction', text: P2_ASK, marker: P2_ASK },
    ];
    const comp = find('composer');
    if (!comp.el) return { ok: false, error: 'message box not found', tried: comp.tried };
    const start = testidCounts();
    const steps = [];
    for (const part of parts) {
      const ins = insertText(comp.el, part.text);
      await sleep(600);
      steps.push({ part: part.name, chars: part.text.length, insertion: ins, editorCharsAfter: editorText(comp.el).length, newTestidsSinceStart: newTestids(start, testidCounts()) });
    }
    const final = editorText(comp.el);
    const inBox = Object.fromEntries(parts.map((p) => [p.name, final.includes(p.marker)]));
    const all = parts.map((p) => p.text).join('');
    state.lastInserted = { text: all, probe: 'P2 parts', how: 'insert x3' };
    state.p2 = { label: label + ' in parts', expectedLine3: lines[2], lines: lines.length, chars: all.length };
    return { ok: true, guard: g.page, newChat: nc, size: label, composerSelector: comp.selector, steps, partsStillInTheBox: inBox, send: sendState(), next: 'Press Send yourself. After the reply, click "Check after sending".' };
  }

  async function p2Check() {
    const pk = pageKind();
    if (pk.kind !== 'chat') return refuse('open the chat where you sent the long text');
    const g = await writeGuard({ allowNew: false });
    if (!g.ok) return g;
    const cp = await currentPath(pk.id);
    const user = lastOf(cp, 'user');
    const reply = lastOf(cp, 'assistant');
    const maxLine = (t) => {
      let max = 0;
      for (const m of String(t).matchAll(/Line (\d{5}):/g)) max = Math.max(max, Number(m[1]));
      return max;
    };
    const atts = user && user.msg ? user.msg.attachments || [] : [];
    const exp = state.p2 ? state.p2.expectedLine3 : null;
    const flat = (t) => String(t || '').replace(/\s+/g, ' ').trim();
    const out = {
      ok: !!user,
      source: cp.source,
      apiError: cp.apiError,
      expected: state.p2 ? { size: state.p2.label, lines: state.p2.lines, chars: state.p2.chars } : 'unknown (page reloaded since the insert)',
      sentMessage: user
        ? {
            textChars: user.text.length,
            lastLineNumberInText: maxLine(user.text),
            attachments: atts.map((a) => ({ chars: typeof a.extracted_content === 'string' ? a.extracted_content.length : null, type: a.file_type || null, lastLineNumber: maxLine(a.extracted_content || '') })),
            files: user.msg ? (user.msg.files_v2 || user.msg.files || []).length : 'unknown',
          }
        : null,
      reply: reply
        ? {
            chars: reply.text.length,
            start: reply.text.slice(0, 200),
            hasLine3: exp ? flat(reply.text).includes(flat(exp)) || flat(reply.text).includes(flat(exp.replace(/^Line \d+: /, ''))) : 'unknown',
          }
        : 'no reply yet',
    };
    const size = state.p2 ? state.p2.label.replace(/ in parts$/, '-parts') : 'size-unknown';
    out.testTree = await intoTestTree(pk.id, g.title, 'p2-' + size, 'long text test');
    return out;
  }

  // ---------------------------------------------------------------- P3

  // Opens a new chat through the app's own link, without a page load, then inserts text.
  async function openNewChatAndInsert(text) {
    const link = find('newChat');
    if (!link.el) return { ok: false, error: 'New chat link not found', tried: link.tried };
    const nonce = Math.random().toString(36).slice(2, 10);
    state.p3 = { nonce, timeOrigin: performance.timeOrigin };
    const startHref = location.href;
    const t0 = performance.now();
    link.el.click();
    const changed = await waitFor(() => location.href !== startHref, 10000);
    const comp = await waitFor(() => find('composer').el, 10000);
    const result = {
      newChatLinkSelector: link.selector,
      urlChanged: !!changed,
      nowOn: pageKind().kind,
      msToNewChat: Math.round(performance.now() - t0),
      variableSurvived: !!state.p3 && state.p3.nonce === nonce,
      sameDocument: performance.timeOrigin === state.p3.timeOrigin,
    };
    if (!comp) return { ok: false, ...result, error: 'no message box in the new chat after 10 s' };
    if (X().countMessages(document) > 0) return { ok: false, ...result, error: 'the new page shows messages; not a new chat' };
    const ins = await insertAndMeasure(text);
    return { ok: result.urlChanged && result.variableSurvived && result.sameDocument && ins.ok, ...result, insert: ins };
  }

  async function p3() {
    const g = await writeGuard({ allowNew: false });
    if (!g.ok) return g;
    const marker = `zbtest P3 marker ${Math.random().toString(36).slice(2, 8)}: this text was inserted by the spike after opening a new chat without a reload. Do not send.`;
    const r = await openNewChatAndInsert(marker);
    if (r.insert && r.insert.ok) state.lastInserted = { text: marker, probe: 'P3', how: 'insert' };
    return { guard: g.page, ...r, markerInBox: r.insert ? r.insert.editor && r.insert.editor.containsInserted : false };
  }

  // ---------------------------------------------------------------- renaming (P4, P8)

  async function zbtestTitles() {
    const r = await A().listConversations();
    state.zbtestTitles = r.items.map((c) => c.name).filter(C().isTestTitle);
    return { titles: state.zbtestTitles, requests: r.requests, ms: r.ms };
  }

  // Renames after a confirm showing both titles. Only to zbtest/ names (also enforced in claude-api.js).
  async function confirmAndRename(id, oldTitle, newTitle) {
    if (!C().isTestTitle(newTitle)) return { ok: false, error: 'refused: new title does not start with zbtest/' };
    if (oldTitle === newTitle) return { ok: true, renamed: false, reason: 'the title is already ' + newTitle };
    const yes = window.confirm(`Zettelbranch spike: rename this conversation?\n\nOld title: ${oldTitle || '(none yet)'}\nNew title: ${newTitle}`);
    if (!yes) return { ok: true, renamed: false, cancelled: true, changed: 'nothing' };
    const t0 = performance.now();
    const answer = await A().renameConversation(id, newTitle);
    const back = await A().getConversation(id);
    return { ok: back.name === newTitle, renamed: true, oldTitle, newTitle, readBack: back.name, answer: answer.answer, ms: Math.round(performance.now() - t0) };
  }

  // After its check, a P1 or P2 chat joins the test tree under the probe's name (not an
  // address, so tree probes ignore it), keeping claude.ai's automatic title as the topic.
  async function intoTestTree(id, title, name, fallbackTopic) {
    if (C().isTestTitle(title)) return { renamed: false, reason: 'already in the test tree' };
    try {
      return await confirmAndRename(id, title, `${C().TEST_TREE}/${name} · ${title || fallbackTopic}`);
    } catch (e) {
      return { ok: false, renamed: false, error: A().errorInfo(e) };
    }
  }

  function convFacts(conv) {
    const p = C().pathOf(conv);
    const last = p.path[p.path.length - 1];
    return {
      messages: p.path.length,
      lastMessage: last ? { role: C().roleOf(last), stopReason: last.stop_reason === undefined ? 'absent' : last.stop_reason } : null,
      updatedAt: conv.updated_at || null,
    };
  }

  async function p4Rename() {
    const pk = pageKind();
    if (pk.kind !== 'chat') return refuse('send a first message in a new chat, then click this');
    const g = await writeGuard({ allowNew: false });
    if (!g.ok) return g;
    const conv = g.conv || (await A().getConversation(pk.id));
    const old = conv.name;
    const t = C().parseTitle(old);
    let proposed;
    if (t && t.tree === C().TEST_TREE) {
      proposed = old;
    } else {
      const list = await zbtestTitles();
      const n = C().nextRoot(C().TEST_TREE, list.titles);
      const topic = (old || '').replace(/^zbtest\/\S*\s*·?\s*/, '') || 'P4 early';
      proposed = `zbtest/${n} · ${topic}`;
    }
    const atRename = convFacts(conv);
    const r = await confirmAndRename(pk.id, old, proposed);
    return { guard: g.page, atRename, ...r, next: r.renamed ? 'Wait for the reply and the automatic title, reload, then click "Read title".' : undefined };
  }

  async function p4Read() {
    const pk = pageKind();
    if (pk.kind !== 'chat') return refuse('open the test chat first');
    const g = await writeGuard({ allowNew: false });
    if (!g.ok) return g;
    const conv = g.conv || (await A().getConversation(pk.id));
    const entry = sidebarEntry(pk.id);
    return {
      ok: true,
      guard: g.page,
      api: conv.name,
      documentTitle: document.title,
      sidebar: entry ? entry.label : 'not found in the sidebar',
      sidebarSelector: entry ? entry.selector : findAll('sidebarEntries').selector,
      apiStartsWithZbtest: C().isTestTitle(conv.name),
      ...convFacts(conv),
    };
  }

  // ---------------------------------------------------------------- P5

  // Counts only: which kinds of conversations the list mixes (chats, Cowork, Code sessions?).
  // A field's values are shown only when they look like identifiers, never free text.
  function listMix(items) {
    const countBy = (f) => {
      const out = {};
      for (const c of items) {
        const v = c[f];
        const k = v === null || v === undefined ? 'none' : typeof v === 'string' && /^[A-Za-z0-9_.-]{1,40}$/.test(v) ? v : 'other';
        out[k] = (out[k] || 0) + 1;
      }
      return out;
    };
    const count = (fn) => items.filter(fn).length;
    return {
      platform: countBy('platform'),
      latestOutputKind: countBy('latest_assistant_output_kind'),
      inAProject: count((c) => c.project_uuid),
      withSessionId: count((c) => c.session_id),
      withWorkspaceSession: count((c) => c.workspace_session_id),
      temporary: count((c) => c.is_temporary),
      archived: count((c) => c.is_archived),
      starred: count((c) => c.is_starred),
      withSummary: count((c) => typeof c.summary === 'string' && c.summary.trim()),
    };
  }

  async function p5() {
    const t0 = performance.now();
    const r = await A().listConversations();
    const zb = r.items.filter((c) => C().isTestTitle(c.name));
    state.zbtestTitles = zb.map((c) => c.name);
    const dates = (k) => r.items.map((c) => c[k]).filter((d) => typeof d === 'string').sort();
    const created = dates('created_at');
    const updated = dates('updated_at');
    const side = findAll('sidebarEntries');
    return {
      ok: true,
      note: READ_ONLY,
      total: r.items.length,
      zbtest: zb.length,
      zbtestTitles: state.zbtestTitles.slice().sort(),
      // Test chats only: claude.ai's own summary field, to see what it holds.
      zbtestSummaries: zb
        .map((c) => ({ title: c.name, chars: typeof c.summary === 'string' ? c.summary.length : 0, start: typeof c.summary === 'string' ? c.summary.slice(0, 300) : null }))
        .sort((a, b) => (a.title < b.title ? -1 : 1)),
      oldestCreated: created[0] || null,
      newestUpdated: updated[updated.length - 1] || null,
      requests: r.requests,
      ms: Math.round(performance.now() - t0),
      answerShape: r.shape,
      fieldsOfOneItem: r.items[0] ? Object.keys(r.items[0]).sort() : [],
      mix: listMix(r.items),
      organization: await A().org(),
      sidebar: {
        selector: side.selector,
        chatEntries: side.els.length,
        zbtestEntries: side.els.map((a) => (a.querySelector('[data-row-label]') || a).textContent.replace(/\s+/g, ' ').trim()).filter(C().isTestTitle),
      },
    };
  }

  // ---------------------------------------------------------------- P6

  async function p6() {
    const pk = pageKind();
    if (pk.kind !== 'chat') return refuse('open a conversation first');
    const conv = await A().getConversation(pk.id);
    const p = C().pathOf(conv);
    const dom = X().extract(document);
    const cmp = K().align(
      p.path.map((m) => ({ role: C().roleOf(m), text: C().messageText(m, { placeholders: false }) })),
      dom.messages.map((m) => ({ role: m.role, text: m.markdown }))
    );
    const list = document.querySelector('[data-testid="transcript-list"]') || document.body;
    const pageText = K().normalize(list.textContent);
    const withFiles = [];
    p.path.forEach((m, i) => {
      const atts = m.attachments || [];
      const files = m.files_v2 || m.files || [];
      if (!atts.length && !files.length) return;
      withFiles.push({
        n: i + 1,
        role: C().roleOf(m),
        attachments: atts.map((a) => {
          const t = typeof a.extracted_content === 'string' ? a.extracted_content : null;
          const probe = t ? K().normalize(t).slice(0, 120) : null;
          return { textInApi: t !== null, chars: t ? t.length : 0, textInPage: probe ? pageText.includes(probe) : null };
        }),
        files: files.map((f) => ({ kind: f.file_kind || null })),
      });
    });
    return {
      ok: true,
      note: READ_ONLY,
      api: { pathMessages: p.path.length, treeMessages: p.total, branchPoints: p.branchPoints, pathFrom: p.method },
      page: { messages: dom.messageCount, selectors: dom.selectors },
      everyPathMessageOnPage: cmp.missing.length === 0 && cmp.matched === p.path.length,
      comparison: cmp,
      messagesWithAttachmentsOrFiles: withFiles,
      virtualization: { hints: dom.diag.virtualization, scrollers: dom.diag.layout ? dom.diag.layout.scrollers : null, listContainer: dom.diag.listContainer ? dom.diag.listContainer.signature : null },
    };
  }

  // ---------------------------------------------------------------- P7

  let lastDiagnostics = null;

  async function p7() {
    const r = X().extract(document);
    const turnSigs = {};
    for (const t of r.diag.turns) turnSigs[t.signature] = (turnSigs[t.signature] || 0) + 1;
    const out = {
      ok: r.messageCount > 0,
      note: READ_ONLY,
      page: pageKind().kind,
      selectors: r.selectors,
      messages: r.messageCount,
      roles: r.messages.map((m) => (m.role === 'user' ? 'U' : 'A')).join(''),
      listContainer: r.diag.listContainer ? { signature: r.diag.listContainer.signature, ancestry: r.diag.listContainer.ancestry } : null,
      turnSignatures: turnSigs,
      firstUserAncestry: r.diag.firstUserAncestry,
      firstAssistantAncestry: r.diag.firstAssistantAncestry,
      candidates: r.diag.candidates,
      testids: r.diag.testids,
      perMessage: r.messages.map((m) => ({ n: m.index + 1, role: m.role, mode: m.mode, chars: m.markdown.length, counts: m.counts, leftOut: m.leftOut.length })),
      anomalies: r.anomalies,
      lookups: Object.fromEntries(['composer', 'send', 'newChat', 'sidebarEntries'].map((k) => [k, k === 'sidebarEntries' ? findAll(k).selector : find(k).selector])),
    };
    const pk = pageKind();
    if (pk.kind === 'chat') {
      try {
        const conv = await A().getConversation(pk.id);
        const p = C().pathOf(conv);
        out.againstApi = K().align(
          p.path.map((m) => ({ role: C().roleOf(m), text: C().messageText(m, { placeholders: false }) })),
          r.messages.map((m) => ({ role: m.role, text: m.markdown }))
        );
      } catch (e) {
        out.againstApi = A().errorInfo(e);
      }
    }
    lastDiagnostics = out;
    return out;
  }

  // ---------------------------------------------------------------- P8

  function setForkAt(v) {
    state.p8.forkAt = v;
    return state.p8.forkAt;
  }
  const getForkAt = () => state.p8.forkAt;

  async function parentMessages(id) {
    const cp = await currentPath(id);
    if (cp.source === 'api') {
      return { source: 'api', conv: cp.conv, messages: cp.path.map((m) => ({ role: C().roleOf(m), text: C().messageText(m) })) };
    }
    return { source: 'dom', apiError: cp.apiError, messages: cp.dom.map((m) => ({ role: m.role, text: m.markdown })) };
  }

  async function p8Build(mode) {
    const pk = pageKind();
    if (pk.kind !== 'chat') return refuse('open the zbtest conversation you want to branch from');
    const g = await writeGuard({ allowNew: false });
    if (!g.ok) return g;
    const title = g.title || '';
    const t = C().parseTitle(title);
    if (!t || t.tree !== C().TEST_TREE) {
      return { ok: false, needsRoot: true, title, reason: 'this chat is not in the zbtest tree yet: click "Make it a tree root" first (AD-2)' };
    }
    const pm = await parentMessages(pk.id);
    const list = await zbtestTitles();
    const child = C().nextChild(C().TEST_TREE, t.segs, list.titles);
    let forkAt = state.p8.forkAt;
    if (!forkAt) {
      const idx = pm.messages.map((m) => m.role).lastIndexOf(mode === 'own' ? 'user' : 'assistant');
      forkAt = idx + 1;
    }
    const built = P().build({ tree: C().TEST_TREE, parentTitle: title, parentAddress: t.address, newAddress: child.address, messages: pm.messages, forkAt, mode });
    state.p8.pending = { text: built.text, address: child.address, parent: `${C().TEST_TREE}/${t.address}`, mode, forkAt };
    return {
      ok: true,
      guard: g.page,
      source: pm.source,
      parent: title,
      parentMessages: pm.messages.length,
      forkAt,
      mode: mode === 'own' ? 'from my own message' : "from Claude's reply",
      newAddress: `${C().TEST_TREE}/${child.address}`,
      existingChildren: child.existingChildren,
      turns: built.turns,
      flattened: built.flattened,
      chars: built.chars,
      tokensEstimate: built.tokensEstimate,
      preview: built.text,
    };
  }

  async function p8MakeRoot() {
    const pk = pageKind();
    if (pk.kind !== 'chat') return refuse('open the chat to turn into a tree root');
    const g = await writeGuard({ allowNew: false });
    if (!g.ok) return g;
    const old = g.title || '';
    const t = C().parseTitle(old);
    if (t && t.tree === C().TEST_TREE) return { ok: true, renamed: false, reason: `already in the tree as ${C().TEST_TREE}/${t.address}` };
    const list = await zbtestTitles();
    const n = C().nextRoot(C().TEST_TREE, list.titles);
    const topic = old.replace(/^zbtest\/\S*\s*·?\s*/, '') || 'P8 root';
    return { guard: g.page, ...(await confirmAndRename(pk.id, old, `zbtest/${n} · ${topic}`)) };
  }

  async function p8Open() {
    const pending = state.p8.pending;
    if (!pending) return { ok: false, error: 'build the prompt first' };
    const g = await writeGuard({ allowNew: false });
    if (!g.ok) return g;
    const r = await openNewChatAndInsert(pending.text);
    if (r.insert && r.insert.ok) state.lastInserted = { text: pending.text, probe: 'P8', how: 'insert' };
    return { guard: g.page, address: `${C().TEST_TREE}/${pending.address}`, ...r, next: 'Read the box, press Send yourself, wait for the reply, then click "Check summary".' };
  }

  // Header of a branch's first message: address and parent (second to last in the path).
  function branchInfo(firstUserText) {
    const lines = String(firstUserText || '').split('\n');
    const h = P().HEADER_RE.exec((lines[0] || '').trim());
    if (!h) return null;
    const path = /^Path: (.*)$/.exec((lines[1] || '').trim());
    const steps = path ? path[1].split(' › ') : [];
    const parentAddr = steps.length >= 2 ? steps[steps.length - 2].replace(/^[a-z0-9-]+\//, '') : null;
    return { tree: h[1], address: h[2], parent: parentAddr ? `${h[1]}/${parentAddr}` : null };
  }

  async function p8Check() {
    const pk = pageKind();
    if (pk.kind !== 'chat') return refuse('open the new branch after Claude replied');
    const g = await writeGuard({ allowNew: false });
    if (!g.ok) return g;
    const conv = g.conv || (await A().getConversation(pk.id));
    const path = C().pathOf(conv).path;
    const first = path.find((m) => C().roleOf(m) === 'user');
    const reply = path.find((m) => C().roleOf(m) === 'assistant');
    if (!first) return { ok: false, error: 'no message in this chat yet' };
    const firstText = C().messageText(first, { placeholders: false });
    const info = branchInfo(firstText);
    const parsedBack = P().parseBranchMessage(firstText);
    // A branch from a chat's first message has an empty transcript: no summary is asked for.
    const summaryExpected = parsedBack ? parsedBack.turns.length > 0 : true;
    const pending = state.p8.pending;
    const out = {
      guard: g.page,
      header: info,
      sentIntact: pending ? firstText === pending.text || firstText.trim() === pending.text.trim() : 'unknown (page reloaded since the insert)',
      sentDiff: pending ? diffSummary(pending.text, firstText) : undefined,
      firstMessageAttachments: C().attachmentFacts(first),
      turnsParsedBack: parsedBack ? parsedBack.turns.length : null,
      summaryExpected,
    };
    if (!reply) return { ok: false, ...out, error: 'no reply from Claude yet' };
    const replyText = C().messageText(reply, { placeholders: false });
    const expectedParent = info ? info.parent : pending ? pending.parent : null;
    out.summary = P().parseSummary(replyText, expectedParent);
    out.ok = summaryExpected ? out.summary.found && out.summary.formatOk && out.summary.parentMatches : !out.summary.found;
    out.replyChars = replyText.length;
    out.replyStart = replyText.slice(0, 300);
    return out;
  }

  async function p8Rename() {
    const pk = pageKind();
    if (pk.kind !== 'chat') return refuse('open the new branch first');
    const g = await writeGuard({ allowNew: false });
    if (!g.ok) return g;
    const conv = g.conv || (await A().getConversation(pk.id));
    const first = C().pathOf(conv).path.find((m) => C().roleOf(m) === 'user');
    const info = first ? branchInfo(C().messageText(first, { placeholders: false })) : null;
    const address = info ? info.address : state.p8.pending ? state.p8.pending.address : null;
    if (!address) return { ok: false, error: 'this chat does not start with a Zettelbranch header' };
    const old = conv.name || '';
    const topic = old.replace(/^zbtest\/\S*\s*·?\s*/, '') || 'P8 branch';
    return { guard: g.page, autoTitle: old, ...(await confirmAndRename(pk.id, old, `${C().TEST_TREE}/${address} · ${topic}`)) };
  }

  global.ZBProbes = {
    startWatching,
    pageKind,
    p1Insert: () => p1Insert('insert'),
    p1Paste: () => p1Insert('paste'),
    p1Check: checkLastSent,
    p2Insert,
    p2Parts,
    p2Check,
    p3,
    p4Rename,
    p4Read,
    p5,
    p6,
    p7,
    p7Diagnostics: () => lastDiagnostics,
    p8Build,
    p8MakeRoot,
    p8Open,
    p8Check,
    p8Rename,
    setForkAt,
    getForkAt,
    _state: state,
    _editorText: editorText,
  };
})(globalThis);
