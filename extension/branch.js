// Zettelbranch: the branch flow. Each function runs on a click in the panel (ui.js) and
// returns what the panel shows. State lives in this tab's memory only.
//
//   read()     the chat on screen: its messages (from the API, or from the page if the API
//              fails), its title, and whether it is a branch still to be named
//   prepare()  "Branch": makes the chat a tree root first if needed (two dialogs and a
//              rename), finds the next free address, builds the prompt for the preview
//   open()     "Open new chat": clicks the app's own New chat link and puts the prompt in
//              the message box with one insertText call. Never presses Send.
//   name()     "Name this branch": a dialog with the proposed name, then a rename
(function (global) {
  'use strict';

  const A = () => global.ZBApi;
  const T = () => global.ZBTree;
  const C = () => global.ZBConversation;
  const P = () => global.ZBPrompt;

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

  let chat = null; // the chat the panel shows
  let pending = null; // the prompt in the preview, until "Open new chat"
  let opened = null; // the branch last opened in this tab: { address, parent }

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
  // shows only your text, and its first reply without the summary on top.
  function label(m, i, messages) {
    let text = m.text;
    const branchStart = messages[0].n === 1 && P().parseBranchMessage(messages[0].text);
    if (i === 0 && branchStart) text = branchStart.ownText || '(copied history only)';
    if (i === 1 && branchStart && m.role === 'assistant') text = P().stripSummary(text) || text;
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

  async function read() {
    chat = null;
    pending = null;
    const pk = pageKind();
    if (pk.kind === 'share') return { ok: false, text: 'Zettelbranch does not work on shared conversations.' };
    if (pk.kind !== 'chat') return { ok: false, text: opened ? `After you send the first message of ${opened.address} and Claude replies, click Name this branch.` : 'Open a conversation to branch from it.' };
    let c;
    try {
      const conv = await A().getConversation(pk.id);
      c = { id: pk.id, title: conv.name, messages: C().fromApi(conv), source: 'api' };
    } catch (e) {
      const page = C().fromPage(document);
      if (!page.messages.length) return { ok: false, text: 'Zettelbranch could not read this chat.', error: explain(e) };
      c = { id: pk.id, title: pageTitle(pk.id), messages: page.messages, source: 'page', apiError: explain(e) };
    }
    c.messages.forEach((m, i) => (m.label = label(m, i, c.messages)));
    // A branch still to be named: its first message has a header, its title not the address.
    const first = c.messages[0];
    c.branch = first && first.n === 1 && first.role === 'user' ? P().parseHeader(first.text) : null;
    c.needsName = !!c.branch && !c.title.startsWith(`${c.branch.tree}/${c.branch.address} · `);
    const lastReply = c.messages.map((m) => m.role).lastIndexOf('assistant');
    c.selected = lastReply >= 0 ? lastReply : c.messages.length - 1;
    chat = c;
    return { ok: true, chat };
  }

  // ---------------------------------------------------------------- branching

  // Every title, for the next free address: the API's full list, else the sidebar's.
  async function registry() {
    try {
      return { titles: (await A().listConversations()).map((c) => c.name) };
    } catch (e) {
      const titles = findAll('sidebarChats').map((a) => (a.querySelector('[data-row-label]') || a).textContent.replace(/\s+/g, ' ').trim());
      return { titles, fromSidebar: true };
    }
  }

  // Renames, then reads the title back to check that it stuck.
  async function rename(id, name) {
    await A().renameConversation(id, name);
    const back = await A().getConversation(id);
    if (back.name !== name) throw new Error('the new title did not stick: claude.ai still shows another one');
  }

  // The tree name for a new root, asked in a browser dialog (what you type there never
  // reaches claude.ai's page). Proposed from the title; only a-z, 0-9 and -.
  function askTreeName(title) {
    const proposal = T().proposeTreeName(title);
    let ask = 'Zettelbranch: this chat is not in a tree yet. Name its tree (a-z, 0-9 and -); the chat becomes the tree\'s first card.';
    for (let i = 0; i < 3; i++) {
      const v = window.prompt(ask, proposal);
      if (v === null) return { text: 'Nothing changed.' };
      if (T().isTreeName(v.trim())) return { tree: v.trim() };
      ask = `"${v}" cannot be a tree name: use only a-z, 0-9 and -. Name the tree:`;
    }
    return { text: 'Nothing changed: a tree name uses only a-z, 0-9 and -.' };
  }

  async function prepare(index) {
    pending = null;
    if (!chat || pageKind().id !== chat.id) return { ok: false, stale: true, text: 'This tab now shows another chat. The list below is this one: choose again.' };
    if (!chat.messages[index]) return { ok: false, text: 'Choose a message first.' };
    const notes = [];
    let renamed = null;
    let t = T().parseTitle(chat.title);
    let reg;
    try {
      if (!t) {
        const asked = askTreeName(chat.title);
        if (!asked.tree) return { ok: false, text: asked.text };
        reg = await registry();
        const name = T().formatTitle(asked.tree, T().nextRoot(asked.tree, reg.titles), chat.title.trim() || 'Untitled');
        const yes = window.confirm(`Zettelbranch: rename this chat?\n\nOld title: ${chat.title || '(none yet)'}\nNew title: ${name}`);
        if (!yes) return { ok: false, text: 'Nothing changed.' };
        await rename(chat.id, name);
        chat.title = name;
        renamed = name;
        t = T().parseTitle(name);
      } else {
        reg = await registry();
      }
    } catch (e) {
      return { ok: false, text: 'Could not rename this chat. Nothing else changed.', error: explain(e) };
    }
    const child = T().nextChild(t.tree, t.segs, reg.titles);
    const built = P().build({ tree: t.tree, parentTitle: chat.title, parentAddress: t.address, newAddress: child.address, messages: chat.messages, fork: index });
    if (chat.source === 'page') notes.push(`Only the ${chat.messages.length} messages on screen were read, because claude.ai's API did not answer as expected. Earlier messages are missing from this branch.`);
    if (reg.fromSidebar) notes.push(`The address ${t.tree}/${child.address} comes from the sidebar's recent chats only, because claude.ai's list did not load. Check that no other chat of the tree has it.`);
    pending = { ...built, address: `${t.tree}/${child.address}`, parent: chat.title, fork: chat.messages[index], tooLong: built.chars > SIZE_WARNING };
    return { ok: true, pending, renamed, notes };
  }

  const cancel = () => (pending = null);

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
    caretToEnd(box);
    document.execCommand('insertText', false, p.text);
    await sleep(300);
    const inBox = editorText(find('composer') || box);
    pending = null;
    opened = { address: p.address, parent: p.parent };
    return { ok: true, address: p.address, chars: p.chars, exact: inBox === p.text, inBox: inBox.length };
  }

  // ---------------------------------------------------------------- naming

  // The first words of Claude's reply, as the topic when claude.ai has no title yet.
  function firstWords(reply) {
    const summary = P().parseSummary(reply);
    const body = P().stripSummary(reply).trim() || (summary ? summary.text : reply);
    const words = body.replace(/[#*_`>[\]]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 8).join(' ');
    return words.slice(0, 60).replace(/[\s.,:;!?-]+$/, '');
  }

  // The name, in a browser dialog. The topic can change; the address part must stay.
  function askName(prefix, topic) {
    let ask = 'Zettelbranch: name this branch. You can change the topic; the address part stays.';
    for (let i = 0; i < 3; i++) {
      const v = window.prompt(ask, prefix + topic);
      if (v === null) return { text: 'Not renamed.' };
      const t = v.startsWith(prefix) ? v.slice(prefix.length).trim() : '';
      if (t) return { name: prefix + t };
      ask = `The name must start with "${prefix}" followed by a topic. Try again:`;
    }
    return { text: `Not renamed: the name must start with "${prefix}" followed by a topic.` };
  }

  async function name() {
    const pk = pageKind();
    if (pk.kind !== 'chat') return { ok: false, text: 'Send the branch\'s first message and wait for Claude\'s reply, then click Name this branch.' };
    try {
      const conv = await A().getConversation(pk.id);
      const msgs = C().fromApi(conv);
      const head = msgs[0] && msgs[0].role === 'user' ? P().parseHeader(msgs[0].text) : null;
      if (!head) return { ok: false, text: 'This chat does not start with a Zettelbranch header, so it is not a branch.' };
      const prefix = `${head.tree}/${head.address} · `;
      if (conv.name.startsWith(prefix)) return { ok: false, text: `This branch is already named ${conv.name}.` };
      const reply = msgs.find((m) => m.role === 'assistant');
      const named = T().parseTitle(conv.name);
      const topic = (named ? named.topic : conv.name) || (reply ? firstWords(reply.text) : '');
      if (!topic) return { ok: false, text: 'Wait for Claude\'s reply, then click Name this branch again.' };
      const asked = askName(prefix, topic);
      if (!asked.name) return { ok: false, text: asked.text };
      await rename(pk.id, asked.name);
      opened = null;
      return { ok: true, renamed: asked.name };
    } catch (e) {
      return { ok: false, text: 'Could not name this branch.', error: explain(e) };
    }
  }

  global.ZBBranch = { read, prepare, cancel, open, name, explain, pageKind, current: () => chat, SIZE_WARNING };
})(globalThis);
