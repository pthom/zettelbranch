// Zettelbranch: the branch flow. Each function runs on a click in the panel (ui.js) and
// returns what the panel shows. State lives in this tab's memory only.
//
//   read()     the chat on screen: its messages (from the API, or from the page if the API
//              fails), its title, what it is (a branch, named or not, or a tree root), and,
//              for a chat of a tree, the other chats of that tree. The chat and the
//              conversation list are read at the same time
//   cached()   what read() last gave for the chat on screen, if it read it before
//   prepare()  "Branch": finds the next free address and builds the prompt for the preview.
//              A chat not in a tree yet becomes a tree root first, through the panel's
//              forms: proposeRoot() (the tree name typed), then makeRoot() (the rename)
//   open()     "Open new chat": clicks the app's own New chat link and puts the prompt in
//              the message box with one insertText call, or line by line if that call lost
//              the line breaks (Firefox, 0.1.3). Never presses Send.
//   proposeName(), name()  "Name this branch": the name proposed, shown in the panel's form
//              (the address fixed, the topic editable), then the rename with the topic typed.
//              Also for a branch already named, to change its topic
//   Renames go through claude.ai's own title menu (menu.js), so the open tab shows the new
//   name at once; through the API (PUT) when the menu fails. Both are read back.
(function (global) {
  'use strict';

  const A = () => global.ZBApi;
  const T = () => global.ZBTree;
  const C = () => global.ZBConversation;
  const P = () => global.ZBPrompt;
  const M = () => global.ZBMenu;

  const SIZE_WARNING = 100000; // the largest size tested (Milestone 0, P2)

  // Page elements: attributes and link targets, never visible UI text. First match wins.
  const FIND = {
    composer: ['[data-testid="chat-input"][contenteditable="true"]', '[data-testid="chat-input"] [contenteditable="true"]', 'div.ProseMirror[contenteditable="true"]'],
    newChat: ['[data-testid="sidebar"] a[href="/new"][data-row-main-button]', 'a[href="/new"][data-row-main-button]', '[data-testid="sidebar"] a[href="/new"]'],
    sidebarChats: ['[data-testid="sidebar-recents"] a[href*="/chat/"]', '[data-testid="sidebar"] a[href*="/chat/"]'],
  };
  function findAll(name) {
    for (const sel of FIND[name]) {
      const els = Array.from(document.querySelectorAll(sel));
      if (els.length) return els;
    }
    return [];
  }
  const find = (name) => findAll(name)[0] || null;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // A short wait right after a click, for the new chat to appear. Gives up after `timeout`.
  async function waitFor(fn, timeout = 10000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const v = fn();
      if (v) return v;
      await sleep(100);
    }
    return null;
  }

  let chat = null; // the chat the panel shows, once read
  let last = null; // what read() last gave, shown at once when the panel opens on that chat again
  let pending = null; // the prompt in the preview, until "Open new chat"
  let opened = null; // the branch this tab opened and has not named yet: { address, parent, own }
  let list = null; // the conversation list last read [{ uuid, name }], for the tree after a rename

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  function pageKind() {
    const p = location.pathname;
    const m = /^\/chat\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/.exec(p);
    if (m) return { kind: 'chat', id: m[1] };
    if (p === '/' || p === '/new' || p.startsWith('/new/')) return { kind: 'new' };
    if (p.startsWith('/share/')) return { kind: 'share' };
    return { kind: 'other' };
  }

  // An error as a plain sentence plus a short technical detail. Never message text.
  function explain(e) {
    if (e instanceof A().ApiError) {
      const d = e.details;
      const detail = [e.message, d.method && `${d.method} ${d.path}`, d.shape && `answer: ${d.shape}`, d.error].filter(Boolean).join('; ');
      const text = {
        shape: 'claude.ai changed, Zettelbranch needs an update.',
        http: `claude.ai's API answered with an error (${d.status}).`,
        network: 'claude.ai could not be reached.',
        refused: 'Zettelbranch refused a request it should not make. Nothing was sent.',
        origin: 'Zettelbranch only works on claude.ai.',
      }[e.kind];
      return { text, detail };
    }
    return { text: 'Something went wrong.', detail: String((e && e.message) || e).slice(0, 200) };
  }

  // ---------------------------------------------------------------- reading

  // A message's first words for the list, without quote markers. A branch's first message
  // shows only your text, and its first reply without the summary on top or the branch title.
  function label(m, i, messages) {
    let text = m.text;
    const branchStart = messages[0].n === 1 && P().parseBranchMessage(messages[0].text);
    if (i === 0 && branchStart) text = branchStart.ownText || '(copied history only)';
    if (i === 1 && branchStart && m.role === 'assistant') text = P().replyBody(text) || text;
    const flat = P().plain(text);
    return flat.length > 60 ? flat.slice(0, 60) + '…' : flat || '(empty)';
  }

  // The chat's title without the API: its sidebar entry, else the tab's title.
  function pageTitle(id) {
    const a = findAll('sidebarChats').find((x) => (x.getAttribute('href') || '').endsWith('/chat/' + id));
    if (a) return (a.querySelector('[data-row-label]') || a).textContent.replace(/\s+/g, ' ').trim();
    const t = document.title.replace(/\s+[-–|]\s+Claude$/, '').trim();
    return t === 'Claude' ? '' : t;
  }

  // The branch this tab opened is named: no more reminder.
  function settle(head) {
    if (opened && opened.address === `${head.tree}/${head.address}`) opened = null;
  }

  // Where this chat sits in a tree: a branch at its header's address, else a chat with a tree
  // title at its title's address. Null outside any tree.
  function placeOf(c) {
    const t = T().parseTitle(c.title);
    if (c.branch) return { uuid: c.id, tree: c.branch.tree, address: c.branch.address, topic: c.named ? t.topic : '', unnamed: !c.named };
    if (t) return { uuid: c.id, tree: t.tree, address: t.address, topic: t.topic };
    return null;
  }

  // The line at the top of the panel: what this chat is. '' outside any tree.
  function identity(c) {
    if (c.branch) {
      const f = P().parseForkedFrom(c.messages[0].text);
      return `Branch ${c.branch.tree}/${c.branch.address}${c.named ? '' : ' (not named yet)'}${f ? `, from ${f.parent} ${f.how} message ${f.n}` : ''}`;
    }
    const t = T().parseTitle(c.title);
    if (!t) return '';
    return t.segs.length === 1 ? `Tree root ${t.tree}/${t.address}` : `Chat ${t.tree}/${t.address} of the tree ${t.tree}`;
  }

  // The chats of this chat's tree (step 6c), from the list read with it. Only titles of this
  // tree are kept. Each other chat is a link to its page.
  function treeOf(c, here) {
    const r = c.listRead;
    if (!here || !r) return null;
    if (r.error) {
      // One short line; the technical detail goes in its tooltip.
      const e = r.error;
      const why = e instanceof A().ApiError ? { http: `error ${e.details.status}`, shape: 'claude.ai changed', network: 'claude.ai not reached' }[e.kind] : null;
      return { name: here.tree, error: { text: `The tree could not be read (${why || 'an error'}).`, detail: explain(e).detail } };
    }
    const entries = T().treeEntries(here.tree, r.items, here).map((e) => ({ ...e, href: !e.current && UUID_RE.test(e.uuid) ? `/chat/${e.uuid}` : null }));
    return { name: here.tree, entries };
  }

  // What the panel shows about a chat, from its title, its messages and the list read with
  // it: the list's labels, whether it is a branch and named, what it is, its tree. Run again
  // from memory after a rename.
  function describe(c) {
    c.messages.forEach((m, i) => (m.label = label(m, i, c.messages)));
    // A branch: its first message has a header. Named once its title is `<tree>/<address> · <topic>`.
    const first = c.messages[0];
    c.branch = first && first.n === 1 && first.role === 'user' ? P().parseHeader(first.text) : null;
    c.named = !!c.branch && !!P().namedTopic(c.title, c.branch);
    c.needsName = !!c.branch && !c.named;
    c.identity = identity(c);
    c.tree = treeOf(c, placeOf(c));
    return c;
  }

  // The chat on screen and the conversation list, read at the same time (the list is for the
  // tree; a chat outside any tree does not wait for it). opts.reuseList: right after a
  // rename, the list already read, since only this chat's title changed.
  async function read(opts = {}) {
    chat = null;
    pending = null;
    root = null;
    naming = null;
    const pk = pageKind();
    if (pk.kind === 'share') return { ok: false, text: 'Zettelbranch does not work on shared conversations.' };
    if (pk.kind === 'new' && opened) return { ok: false, steps: { ...opened } };
    if (pk.kind !== 'chat') return { ok: false, text: 'Open a conversation to branch from it.' };
    const listing = (opts.reuseList && list ? Promise.resolve(list) : A().listConversations().then((items) => (list = items))).then((items) => ({ items }), (error) => ({ error }));
    let c;
    try {
      const conv = await A().getConversation(pk.id);
      c = { id: pk.id, title: conv.name, messages: C().fromApi(conv), source: 'api' };
    } catch (e) {
      const page = C().fromPage(document);
      if (!page.messages.length) return { ok: false, text: 'Zettelbranch could not read this chat.', error: explain(e) };
      c = { id: pk.id, title: pageTitle(pk.id), messages: page.messages, source: 'page', apiError: explain(e) };
    }
    // Right after Send, claude.ai may show the new chat before it holds your message: the
    // branch this tab opened keeps its steps until then.
    if (!c.messages.length && opened) return { ok: false, steps: { ...opened, sent: true } };
    describe(c);
    if (placeOf(c)) {
      c.listRead = await listing;
      describe(c);
    }
    if (c.named && c.source === 'api') settle(c.branch);
    const lastReply = c.messages.map((m) => m.role).lastIndexOf('assistant');
    c.selected = lastReply >= 0 ? lastReply : c.messages.length - 1;
    chat = last = c;
    return { ok: true, chat };
  }

  // What read() last gave for the chat on screen, if it read that chat before (this tab's memory).
  function cached() {
    const pk = pageKind();
    return pk.kind === 'chat' && last && last.id === pk.id ? last : null;
  }

  // ---------------------------------------------------------------- branching

  // Every title, for the next free address: the API's full list, else the sidebar's.
  async function registry() {
    try {
      list = await A().listConversations();
      return { titles: list.map((c) => c.name) };
    } catch (e) {
      const titles = findAll('sidebarChats').map((a) => (a.querySelector('[data-row-label]') || a).textContent.replace(/\s+/g, ' ').trim());
      return { titles, fromSidebar: true };
    }
  }

  // Renames the chat `id`, then reads the name back to check that it stuck. On the chat on
  // screen, through claude.ai's own title menu first (menu.js): the open tab then shows the
  // new name at once. If a step of the menu fails, or claude.ai did not keep the name within
  // about 3 s, through the API (PUT), as in 0.1.0. Returns { via: 'menu' } or { via: 'api', why }.
  async function rename(id, name) {
    let why = 'this chat is not the one on screen';
    if (pageKind().id === id) {
      const m = await M().rename(name);
      if (m.ok && (await nameIs(id, name, 3000))) return { via: 'menu' };
      why = m.ok ? 'claude.ai did not keep the name typed in its menu' : m.why;
    }
    await A().renameConversation(id, name);
    const back = await A().getConversation(id);
    if (back.name !== name) throw new Error('the new title did not stick: claude.ai still shows another one');
    return { via: 'api', why };
  }

  // Whether claude.ai holds the name, read back a few times within `ms`.
  async function nameIs(id, name, ms) {
    const t0 = Date.now();
    await sleep(300);
    for (;;) {
      if ((await A().getConversation(id)).name === name) return true;
      if (Date.now() - t0 > ms) return false;
      await sleep(600);
    }
  }

  let root = null; // the root title proposed for the chat on screen, until renamed: { id, name, reg }

  // The chat and message to branch from, still the ones on screen; else what to say.
  function check(index) {
    if (!chat || pageKind().id !== chat.id) return { ok: false, stale: true, text: 'This tab now shows another chat. The list below is this one: choose again.' };
    if (!chat.messages[index]) return { ok: false, text: 'Choose a message first.' };
    return null;
  }

  // "Branch". A chat in a tree: the preview. A chat not in a tree yet: the panel asks for a
  // tree name first ({ ask }), proposed from the title.
  async function prepare(index) {
    pending = null;
    root = null;
    const bad = check(index);
    if (bad) return bad;
    if (!T().parseTitle(chat.title)) return { ok: false, ask: { tree: T().proposeTreeName(chat.title), title: chat.title } };
    return preview(index, await registry());
  }

  // The tree name typed in the panel's form: the title the chat would get as the tree's root
  // ({ confirm }, shown before anything changes), or the form again with what was wrong.
  async function proposeRoot(index, typed) {
    root = null;
    const bad = check(index);
    if (bad) return bad;
    const tree = String(typed).trim();
    if (!T().isTreeName(tree)) return { ok: false, ask: { tree: typed, title: chat.title, error: `"${typed}" cannot be a tree name: use only a-z, 0-9 and -.` } };
    const reg = await registry();
    const name = T().formatTitle(tree, T().nextRoot(tree, reg.titles), chat.title.trim() || 'Untitled');
    root = { id: chat.id, name, reg };
    return { ok: false, confirm: { old: chat.title || '(none yet)', name } };
  }

  // "Rename" under the titles shown: the chat becomes the tree root, then the preview of its
  // first branch.
  async function makeRoot(index) {
    const bad = check(index);
    if (bad) return bad;
    const r = root;
    root = null;
    if (!r || r.id !== chat.id) return { ok: false, text: 'Nothing changed. Click Branch again.' };
    let via;
    try {
      via = await rename(chat.id, r.name);
    } catch (e) {
      return { ok: false, text: 'Could not rename this chat. Nothing else changed.', error: explain(e) };
    }
    chat.title = r.name;
    if (!chat.listRead && list) chat.listRead = { items: list };
    describe(chat);
    return { ...preview(index, r.reg), renamed: r.name, via };
  }

  // The preview of the branch from message `index`, at the next free address among `reg`.
  function preview(index, reg) {
    const notes = [];
    const t = T().parseTitle(chat.title);
    const child = T().nextChild(t.tree, t.segs, reg.titles);
    const built = P().build({ tree: t.tree, parentTitle: chat.title, parentAddress: t.address, newAddress: child.address, messages: chat.messages, fork: index });
    if (chat.source === 'page') notes.push(`Only the ${chat.messages.length} messages on screen were read, because claude.ai's API did not answer as expected. Earlier messages are missing from this branch.`);
    if (reg.fromSidebar) notes.push(`The address ${t.tree}/${child.address} comes from the sidebar's recent chats only, because claude.ai's list did not load. Check that no other chat of the tree has it.`);
    pending = { ...built, address: `${t.tree}/${child.address}`, parent: chat.title, fork: chat.messages[index], tooLong: built.chars > SIZE_WARNING };
    return { ok: true, pending, notes };
  }

  const cancel = () => {
    pending = null;
    root = null;
    naming = null;
  };

  // ---------------------------------------------------------------- the new chat

  // The editor's text with its line breaks: paragraphs and list items are lines; a <br> that
  // only holds an empty line open is not a line break.
  function editorText(el) {
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
          cur = (cur || '') + c.nodeValue.replace(/ /g, ' ');
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

  function caretToEnd(el) {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Text compared without the blank lines at its start and end: Firefox adds an empty line at
  // the top of claude.ai's box whichever way the text goes in (P1, 2026-10-13).
  const trimBlank = (t) => String(t).replace(/^(?:[ \t]*\n)+/, '').replace(/(?:\n[ \t]*)+$/, '');
  const same = (a, b) => trimBlank(a) === trimBlank(b);

  // The three ways the extension writes into the message box `box`, which is empty (open()
  // checks it first), or holds only what insertOnce just put there.
  function insertOnce(box, text) {
    caretToEnd(box);
    document.execCommand('insertText', false, text);
  }
  function insertLines(box, text) {
    caretToEnd(box);
    text.split('\n').forEach((line, i) => {
      if (i > 0) document.execCommand('insertParagraph', false);
      if (line) document.execCommand('insertText', false, line);
    });
  }
  function emptyBox(box) {
    box.focus();
    if (document.activeElement !== box) return false;
    document.execCommand('selectAll', false);
    document.execCommand('delete', false);
    return !editorText(box).trim();
  }

  // Fills the empty box with the prompt. One insertText call keeps the line breaks in Chrome
  // (Milestone 0, P2). In Firefox, claude.ai's box joins all the lines into one paragraph
  // (P1, 2026-10-13): then the box is emptied, and the prompt typed line by line, with a
  // paragraph between lines. Returns { method: 'one call' | 'line by line', inBox, note }.
  async function fill(box, text) {
    insertOnce(box, text);
    await sleep(300);
    const inBox = editorText(find('composer') || box);
    if (same(inBox, text)) return { method: 'one call', inBox };
    const b = find('composer') || box;
    if (!emptyBox(b)) return { method: 'one call', inBox: editorText(b), note: 'the box could not be emptied to try again line by line' };
    insertLines(b, text);
    await sleep(300);
    return { method: 'line by line', inBox: editorText(find('composer') || b) };
  }

  async function open() {
    const p = pending;
    if (!p) return { ok: false, text: 'Click Branch first.' };
    if (pageKind().kind !== 'new') {
      const newChatLink = find('newChat');
      if (!newChatLink) return { ok: false, text: 'The New chat link was not found.', error: { text: 'claude.ai changed, Zettelbranch needs an update.', detail: 'no element matches ' + FIND.newChat.join(' or ') } };
      const start = location.href;
      newChatLink.click();
      if (!(await waitFor(() => location.href !== start))) return { ok: false, text: 'The new chat did not open. Try again.' };
      await sleep(300); // let the app set up the new chat
    }
    const box = await waitFor(() => (pageKind().kind === 'new' && C().fromPage(document).messages.length === 0 ? find('composer') : null));
    if (!box) return { ok: false, text: 'The new chat\'s message box did not appear.', error: { text: 'claude.ai changed, Zettelbranch needs an update.', detail: 'no element matches ' + FIND.composer.join(' or ') } };
    if (editorText(box).trim()) return { ok: false, text: 'The message box already holds text, so nothing was inserted. Empty it, then click Open new chat again.' };
    box.focus();
    if (document.activeElement !== box) return { ok: false, text: 'The message box did not take the focus, so nothing was inserted. Click Open new chat again.' };
    const t0 = Date.now();
    const f = await fill(box, p.text);
    pending = null;
    // own: the box ends with your message, when you branched instead of it.
    opened = { address: p.address, parent: p.parent, own: p.fork.role === 'user' };
    return { ok: true, address: p.address, own: opened.own, chars: p.chars, exact: same(f.inBox, p.text), inBox: trimBlank(f.inBox).length, method: f.method, note: f.note, ms: Date.now() - t0 };
  }

  // ---------------------------------------------------------------- naming

  // Where the proposed topic comes from (prompt.js, proposeTopic), said under the form's field.
  const FROM = {
    current: '', // the form shows the current name already
    claude: 'Proposed by Claude in its first reply.',
    title: 'Proposed from claude.ai\'s title.',
    question: 'Proposed from your first question in this branch.',
    reply: 'Proposed from Claude\'s first reply.',
  };

  let naming = null; // the branch being named, between the form and its Rename: { id, head, prefix, title, wasNamed, ask }

  // "Name this branch", "Rename this branch": the name proposed, read from claude.ai as it is
  // now. The form shows the address as fixed text (prefix) and the topic in its field.
  async function proposeName() {
    naming = null;
    const pk = pageKind();
    if (pk.kind !== 'chat') return { ok: false, text: 'Send the branch\'s first message and wait for Claude\'s reply, then click Name this branch.' };
    try {
      const conv = await A().getConversation(pk.id);
      const msgs = C().fromApi(conv);
      const head = msgs[0] && msgs[0].role === 'user' ? P().parseHeader(msgs[0].text) : null;
      if (!head) return { ok: false, text: 'This chat does not start with a Zettelbranch header, so it is not a branch.' };
      const proposal = P().proposeTopic(conv.name, msgs);
      if (!proposal) return { ok: false, text: 'Wait for Claude\'s reply, then click Name this branch again.' };
      const prefix = `${head.tree}/${head.address} · `;
      const before = T().parseTitle(conv.name);
      const wasNamed = !!before && before.tree === head.tree && before.address === head.address;
      const ask = { prefix, topic: proposal.topic, from: FROM[proposal.from], title: conv.name, wasNamed };
      naming = { id: pk.id, head, prefix, title: conv.name, wasNamed, ask };
      return { ok: false, ask };
    } catch (e) {
      return { ok: false, text: 'Could not name this branch.', error: explain(e) };
    }
  }

  // "Rename" in the form: the address, then the topic typed. An empty topic shows the form again.
  async function name(typed) {
    const n = naming;
    if (!n || pageKind().id !== n.id) return { ok: false, text: 'This tab now shows another chat. Nothing was renamed.' };
    const topic = String(typed).replace(/\s+/g, ' ').trim();
    if (!topic) return { ok: false, ask: { ...n.ask, topic: '', error: 'Type a topic after the address.' } };
    naming = null;
    const newName = n.prefix + topic;
    if (newName === n.title) {
      settle(n.head);
      return { ok: false, text: `The name did not change: ${n.title}. Nothing was renamed.` };
    }
    try {
      const via = await rename(n.id, newName);
      settle(n.head);
      // What the panel read for this chat, with its new name: shown without reading again.
      const mem = last && last.id === n.id ? last : null;
      if (mem) {
        mem.title = newName;
        describe(mem);
        chat = mem;
      }
      return { ok: true, renamed: newName, wasNamed: n.wasNamed, via, chat: mem };
    } catch (e) {
      return { ok: false, text: 'Could not name this branch.', error: explain(e) };
    }
  }

  // The part of claude.ai's message box you see on screen, for the panel to keep clear of it;
  // null if there is none. The box's text can be taller than the screen: it scrolls inside
  // its parents (seen in Pascal's shoot, 2026-10-14), so the box is cut to them and to the
  // window. Read only.
  function boxRect() {
    const box = find('composer');
    if (!box) return null;
    const r = box.getBoundingClientRect();
    const v = { top: Math.max(r.top, 0), bottom: Math.min(r.bottom, window.innerHeight), left: r.left, right: r.right };
    for (let a = box.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (!/auto|scroll|hidden|clip/.test(s.overflowY + ' ' + s.overflowX)) continue;
      const q = a.getBoundingClientRect();
      v.top = Math.max(v.top, q.top);
      v.bottom = Math.min(v.bottom, q.bottom);
    }
    return v.bottom > v.top ? v : null;
  }

  // The branch this tab opened and has not named yet, for the pill's reminder; null if none.
  const unnamed = () => (opened ? opened.address : null);

  // For the offline tests of the insertion against a real editor (tests/editor/).
  const insertion = { insertOnce, insertLines, emptyBox, editorText, same, fill };

  global.ZBBranch = { read, cached, prepare, proposeRoot, makeRoot, cancel, open, proposeName, name, explain, pageKind, unnamed, boxRect, insertion, current: () => chat, SIZE_WARNING };
})(globalThis);
