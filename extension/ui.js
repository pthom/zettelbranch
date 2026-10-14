// Zettelbranch: the panel. A small "Zettelbranch" button at the bottom right opens it.
// Shadow DOM outside <body>, built with DOM nodes and textContent only. Click listeners,
// and pointer listeners on the panel's own title bar to drag it; no keyboard or input
// listeners, but on its own text fields, which only stop the keys there so that claude.ai does
// not take them. Every action starts with a click; the flow itself is in branch.js. Names are
// asked in small forms of the panel (0.2.0), whose fields are read when their button is
// clicked. While the panel is open, it follows the chat on screen: when the tab moves to
// another chat, it reads that chat as its refresh button does (reads only).
(function (global) {
  'use strict';

  const B = () => global.ZBBranch;

  const CSS = `
    :host { all: initial; }
    .wrap { font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--fg);
      --fg: #1f1e1b; --muted: #6b675e; --bg: #fffdf8; --line: #ddd6c6; --btn: #f1ece0; --btn-hover: #e6dfcd;
      --accent: #8a4b2a; --accent-fg: #fff; --sel: #f4e6da; --code: #f6f3ea;
      --ok-bg: #e6f0e1; --ok-fg: #24502d; --warn-bg: #fbefd6; --warn-fg: #6e4500; --err-bg: #f9e2de; --err-fg: #84200f; }
    @media (prefers-color-scheme: dark) {
      .wrap { --fg: #ece8de; --muted: #a39e92; --bg: #23211d; --line: #45413a; --btn: #34312b; --btn-hover: #403c35;
        --accent: #e0a07a; --accent-fg: #23211d; --sel: #3d3027; --code: #1b1a17;
        --ok-bg: #213325; --ok-fg: #a9d4ad; --warn-bg: #3a3018; --warn-fg: #f0c674; --err-bg: #3e2220; --err-fg: #f2a69c; }
    }
    [hidden] { display: none !important; }
    .pill { background: var(--accent); color: var(--accent-fg); border: 0; border-radius: 999px; padding: 6px 13px; font: inherit; font-weight: 600; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.2); }
    .panel { box-sizing: border-box; width: 410px; max-width: calc(100vw - 24px); max-height: 80vh; display: flex; flex-direction: column; background: var(--bg); border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 8px 28px rgba(0,0,0,.22); overflow: hidden; }
    .top { display: flex; gap: 6px; align-items: center; padding: 8px 10px; border-bottom: 1px solid var(--line); cursor: grab; touch-action: none; user-select: none; }
    .top.dragging { cursor: grabbing; }
    .top b { flex: 1; font-size: 13.5px; }
    button.icon { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 26px; padding: 0; color: var(--accent); }
    button.icon svg { width: 16px; height: 16px; }
    button.icon[aria-busy="true"] svg { animation: zb-turn .9s linear infinite; }
    @keyframes zb-turn { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { button.icon[aria-busy="true"] svg { animation: none; opacity: .45; } }
    .identity { font-weight: 600; }
    .section { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--line); padding-top: 8px; }
    .section-head { font-weight: 600; }
    .main, .body { display: flex; flex-direction: column; gap: 8px; }
    .main { overflow: auto; padding: 10px; }
    p { margin: 0; }
    .muted { color: var(--muted); }
    .title { color: var(--muted); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    button { font: inherit; background: var(--btn); color: var(--fg); border: 1px solid var(--line); border-radius: 6px; padding: 4px 10px; cursor: pointer; }
    button:hover { background: var(--btn-hover); }
    button.primary { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); font-weight: 600; }
    button:disabled { opacity: .45; cursor: default; }
    .busy button { opacity: .6; pointer-events: none; }
    .box { border-radius: 8px; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
    .notice { background: var(--ok-bg); color: var(--ok-fg); }
    .warn { background: var(--warn-bg); color: var(--warn-fg); }
    .error { background: var(--err-bg); color: var(--err-fg); }
    .detail { font: 11px/1.4 ui-monospace, Menlo, monospace; word-break: break-word; opacity: .85; }
    .row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    .msgs { position: relative; max-height: 34vh; overflow: auto; border: 1px solid var(--line); border-radius: 8px; }
    .msg { display: flex; gap: 8px; width: 100%; text-align: left; border: 0; border-bottom: 1px solid var(--line); border-radius: 0; background: transparent; padding: 5px 8px; }
    .msg:last-child { border-bottom: 0; }
    .msg[aria-pressed="true"] { background: var(--sel); box-shadow: inset 3px 0 0 var(--accent); }
    .msg .n { color: var(--muted); min-width: 2em; text-align: right; font-variant-numeric: tabular-nums; }
    .msg .who { font-weight: 600; min-width: 3.4em; }
    .msg .text { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .tree { display: flex; flex-direction: column; gap: 4px; }
    .tree-head { font-weight: 600; }
    .tree-list { position: relative; box-sizing: border-box; max-height: min(24vh, 210px); overflow: auto; border: 1px solid var(--line); border-radius: 8px; padding: 3px 0; }
    .node { display: flex; gap: 6px; align-items: baseline; padding: 2px 8px; color: var(--fg); text-decoration: none; white-space: nowrap; }
    a.node:hover { background: var(--btn-hover); }
    a.node:hover .topic { text-decoration: underline; }
    a.node .addr { color: var(--accent); }
    .node .addr { font-weight: 600; font-variant-numeric: tabular-nums; }
    .node .topic { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    .node .topic.muted { font-style: italic; }
    .node.here { background: var(--sel); box-shadow: inset 3px 0 0 var(--accent); }
    .tag { flex: none; font-size: 11px; border-radius: 999px; padding: 0 6px; }
    .tag.here { background: var(--accent); color: var(--accent-fg); }
    .tag.dup { background: var(--warn-bg); color: var(--warn-fg); }
    .steps { display: flex; flex-direction: column; gap: 8px; }
    .step { display: flex; gap: 6px; align-items: baseline; }
    .step .num { font-weight: 700; color: var(--accent); min-width: 1.1em; }
    .step .row { flex: 1; }
    .form { display: flex; flex-direction: column; gap: 8px; margin: 0; }
    .field { display: flex; gap: 6px; align-items: center; }
    .field input { flex: 1; min-width: 0; box-sizing: border-box; font: inherit; color: var(--fg); background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: 4px 7px; }
    .field input:focus { outline: 2px solid var(--accent); outline-offset: -1px; border-color: var(--accent); }
    .prefix { font-weight: 600; white-space: nowrap; color: var(--accent); }
    .new-title { font-weight: 600; word-break: break-word; }
    .step.done p, .step.done .num { color: var(--muted); }
    pre { margin: 0; padding: 8px; background: var(--code); border: 1px solid var(--line); border-radius: 6px; max-height: 280px; overflow: auto; white-space: pre-wrap; word-break: break-word; font: 11px/1.45 ui-monospace, Menlo, monospace; }
  `;

  function el(tag, props = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'text') e.textContent = v;
      else if (k === 'class') e.className = v;
      else e.setAttribute(k, v);
    }
    for (const c of children) if (c) e.append(c);
    return e;
  }

  // A button that runs `fn` on click, one action at a time.
  function button(text, zb, fn, cls) {
    const b = el('button', { type: 'button', 'data-zb': zb, text, ...(cls ? { class: cls } : {}) });
    b.addEventListener('click', () => act(fn));
    return b;
  }

  let ui = null; // { host, wrap, pill, panel, bar, refresh, notice, error, info, body }
  let busy = false;
  let shown = null; // the chat the panel shows
  let reading = null; // a read in the background, while the panel shows what was read before
  let seenPath = null; // the tab's address when the panel last read the page, or our own flow moved it
  let watch = null; // the check that follows the chat on screen, only while the panel is open

  async function act(fn) {
    if (busy) return;
    busy = true;
    ui.wrap.classList.add('busy');
    try {
      if (reading) await reading; // a click during a background read waits for it
      await fn();
    } catch (e) {
      showError('', B().explain(e));
    } finally {
      busy = false;
      ui.wrap.classList.remove('busy');
    }
  }

  // ---------------------------------------------------------------- the slots

  const show = (...nodes) => ui.body.replaceChildren(...nodes.filter(Boolean));
  const say = (text) => show(el('p', { 'data-zb': 'status', text }));

  function clearMessages() {
    ui.notice.hidden = true;
    ui.error.hidden = true;
    ui.info.hidden = true;
  }

  // After each rename (M1-4). kind: 'root' (a chat made the root of a tree), 'branch' (a
  // branch named for the first time), 'rename' (a named branch given another topic).
  // via: { via: 'menu' } when claude.ai's own title menu renamed it: the open tab shows the
  // new name at once. { via: 'api', why } when the API did, after the menu failed: the open
  // tab's sidebar shows the new name after a reload. A root is renamed in the middle of a
  // branch: no reload offered there, since a reload would drop the preview below it.
  const renamedText = (name, kind) => ({ root: `This chat is now the tree root ${name}.`, branch: `You just created the branch ${name}.`, rename: `Renamed to ${name}.` })[kind];
  function showRenamed(name, kind, via) {
    const what = renamedText(name, kind);
    const api = !via || via.via !== 'menu';
    ui.notice.replaceChildren(
      ...[
        el('p', { text: what }),
        ...(api && kind !== 'root' ? [el('p', { text: 'Reload the page to see the new name.' }), button('Reload now', 'reload', () => location.reload(), 'primary')] : []),
        api && via ? el('p', { class: 'detail', 'data-zb': 'renamed-via', text: `Renamed through claude.ai's API: its title menu did not work (${via.why}).` }) : null,
      ].filter(Boolean)
    );
    ui.notice.hidden = false;
  }

  function showError(text, err) {
    ui.error.replaceChildren(
      ...[text, err && err.text].filter(Boolean).map((t) => el('p', { text: t })),
      err && err.detail ? el('p', { class: 'detail', text: err.detail }) : null
    );
    ui.error.hidden = false;
  }

  // A result that did not go through: its plain text, and its error if any. In the new chat's
  // steps, the panel then keeps clear of the message box again.
  function showFailure(r) {
    if (r.error) showError(r.text, r.error);
    else {
      ui.info.textContent = r.text;
      ui.info.hidden = false;
    }
    if (ui.body.querySelector('[data-zb="steps"]')) clearBox();
  }

  // ---------------------------------------------------------------- views

  // Reads the chat on screen, always the one on screen, and shows it. If this tab read that
  // chat before, what it read shows at once and the read runs in the background, the refresh
  // button turning until the panel shows the new read. opts.reuseList: see branch.js read().
  async function refresh(opts) {
    seen();
    const before = B().cached();
    ui.refresh.setAttribute('aria-busy', 'true');
    if (before) showChat(before);
    else say('Reading this chat…');
    const run = B().read(opts).then(showRead).finally(() => {
      ui.refresh.removeAttribute('aria-busy');
      reading = null;
    });
    if (!before) return run;
    reading = run.catch((e) => showError('', B().explain(e)));
  }

  function showRead(r) {
    if (r.steps) {
      show(el('p', { class: 'muted', 'data-zb': 'status', text: `You opened the branch ${r.steps.address} in a new chat.` }), steps(r.steps));
      return clearBox();
    }
    if (!r.ok) {
      say(r.text);
      if (r.error) showError('', r.error);
      return;
    }
    // A message you picked while the panel showed the earlier read stays picked.
    if (shown && shown.picked && shown.id === r.chat.id) {
      const n = shown.messages[shown.selected].n;
      const i = r.chat.messages.findIndex((m) => m.n === n);
      if (i >= 0) Object.assign(r.chat, { selected: i, picked: true });
    }
    showChat(r.chat);
  }

  function showChat(chat) {
    shown = chat;
    const parts = [];
    // What this chat is, at the top. A branch still to be named comes with its button: also
    // after a reload, when the pill's reminder is gone.
    if (chat.identity) {
      const who = el('p', { class: 'identity', 'data-zb': 'identity', text: chat.identity });
      const nameIt = button('Name this branch', 'name', nameBranch, 'primary');
      const replied = chat.messages.some((m) => m.role === 'assistant');
      const named = replied ? nameIt : el('div', { class: 'row' }, [el('p', { text: 'When Claude has replied:' }), nameIt]);
      parts.push(chat.needsName && chat.source === 'api' ? el('div', { class: 'box notice', 'data-zb': 'name-box' }, [who, named]) : who);
    }
    parts.push(el('p', { class: 'title', 'data-zb': 'chat-title', text: chat.title || '(no title yet)' }));
    if (chat.source === 'page') {
      showError('', chat.apiError);
      parts.push(el('p', { class: 'box warn', 'data-zb': 'note', text: `claude.ai's API did not answer as expected, so Zettelbranch read the page instead. Only the ${chat.messages.length} messages on screen were read: in a long chat, earlier messages are missing. Naming branches is unavailable until the API answers.` }));
    }
    const tree = chat.tree ? treeSection(chat.tree) : null;
    if (tree) parts.push(tree.section);
    if (!chat.messages.length) {
      parts.push(el('p', { text: 'This chat has no messages yet.' }));
      return show(...parts);
    }
    const hint = el('p', { class: 'muted', 'data-zb': 'hint' });
    const rows = chat.messages.map((m, i) => {
      const row = el('button', { type: 'button', class: 'msg', 'data-zb': 'message', 'data-n': String(m.n), 'aria-pressed': String(i === chat.selected) }, [
        el('span', { class: 'n', text: String(m.n) }),
        el('span', { class: 'who', text: m.role === 'user' ? 'You' : 'Claude' }),
        el('span', { class: 'text', text: m.label }),
      ]);
      row.addEventListener('click', () => {
        chat.selected = i;
        chat.picked = true;
        rows.forEach((r, j) => r.setAttribute('aria-pressed', String(j === i)));
        hint.textContent = hintFor(m);
      });
      return row;
    });
    const list = el('div', { class: 'msgs', 'data-zb': 'messages' }, rows);
    hint.textContent = hintFor(chat.messages[chat.selected]);
    // A branch already named can get another topic.
    const rename = chat.named && chat.source === 'api' ? button('Rename this branch', 'rename', nameBranch) : null;
    parts.push(el('div', { class: 'section', 'data-zb': 'branch-section' }, [
      el('p', { class: 'section-head', 'data-zb': 'branch-head', text: 'New branch from this chat' }),
      el('p', { text: 'Choose where the branch starts:' }),
      list,
      hint,
      el('div', { class: 'row' }, [button('Branch', 'branch', branch, 'primary'), rename]),
    ]));
    show(...parts);
    const sel = rows[chat.selected];
    list.scrollTop = sel.offsetTop - list.clientHeight / 2;
    if (tree) tree.scroll();
  }

  // The chats of this tree, by address, indented by depth (step 6c). Each other chat is a
  // plain link to its page, a page load; the current one is marked, not a link. The link
  // ends with FROM_TREE, so the panel opens again on the page it loads (see content.js).
  const FROM_TREE = '#zettelbranch';
  function treeSection(tree) {
    if (tree.error) return { section: el('p', { class: 'box warn', 'data-zb': 'tree-note', title: tree.error.detail || '', text: tree.error.text }), scroll() {} };
    const n = tree.entries.length;
    let here = null;
    const lines = tree.entries.map((e) => {
      const kids = [
        el('span', { class: 'addr', text: e.address }),
        e.unnamed ? el('span', { class: 'topic muted', text: '(not named yet)' }) : el('span', { class: 'topic', text: e.topic ? `· ${e.topic}` : '' }),
        e.uses > 1 ? el('span', { class: 'tag dup', text: e.uses === 2 ? 'used twice' : `used ${e.uses} times` }) : null,
        e.current ? el('span', { class: 'tag here', text: 'you are here' }) : null,
      ];
      const attrs = { 'data-zb': 'tree-node', 'data-address': e.address };
      const line = e.href
        ? el('a', { ...attrs, class: 'node', href: e.href + FROM_TREE }, kids)
        : el('div', { ...attrs, class: e.current ? 'node here' : 'node', ...(e.current ? { 'aria-current': 'page' } : {}) }, kids);
      line.style.paddingLeft = `${8 + Math.min(e.depth, 8) * 14}px`;
      if (e.current) here = line;
      return line;
    });
    const box = el('div', { class: 'tree-list', 'data-zb': 'tree-list' }, lines);
    const section = el('div', { class: 'tree', 'data-zb': 'tree' }, [el('p', { class: 'tree-head', 'data-zb': 'tree-head', text: `Tree ${tree.name}: ${n} chat${n === 1 ? '' : 's'}` }), box]);
    return { section, scroll: () => here && (box.scrollTop = here.offsetTop - box.clientHeight / 2) };
  }

  // Claude's reply: continue after it. Your message: branch instead of it (FK-3).
  function hintFor(m) {
    return m.role === 'assistant'
      ? `After Claude's reply ${m.n}: the branch continues from there.`
      : `Instead of your message ${m.n}: the branch starts just before it, with your message pre-filled for you to change.`;
  }

  function showPreview(r) {
    const p = r.pending;
    const fmt = (n) => n.toLocaleString('en-US');
    show(
      el('p', { 'data-zb': 'preview-title', text: `Preview: the first message of ${p.address}` }),
      el('p', { class: 'muted', 'data-zb': 'size', text: `${fmt(p.chars)} characters, about ${fmt(p.tokens)} tokens. ${p.turns} messages copied${p.flattened ? ', from the whole tree path' : ''}.` }),
      p.tooLong ? el('p', { class: 'box warn', 'data-zb': 'warning', text: `This is longer than ${fmt(B().SIZE_WARNING)} characters, the largest size tested. It may not go into the message box whole: check the box before you press Send.` }) : null,
      ...r.notes.map((t) => el('p', { class: 'box warn', 'data-zb': 'note', text: t })),
      el('pre', { 'data-zb': 'preview', text: p.text }),
      el('div', { class: 'row' }, [
        button('Open new chat', 'open', openChat, 'primary'),
        button('Cancel', 'cancel', () => {
          B().cancel();
          showChat(B().current());
        }),
      ])
    );
  }

  // ---------------------------------------------------------------- actions

  // The pill: the panel shows at once (also while an action finishes), then reads the chat.
  function open() {
    ui.pill.hidden = true;
    ui.panel.hidden = false;
    if (place) setPlace(place.left, place.top); // where it was dragged, inside the window
    startFollowing();
    readOnScreen();
  }

  // The refresh button, and the panel following the chat on screen: read the chat on screen.
  function readOnScreen() {
    if (reading) return; // it is reading already
    act(() => {
      clearMessages();
      return refresh();
    });
  }

  // While the panel is open, every 0.4 s: has the tab moved to another page since the panel
  // read it? Then read the page on screen, as the refresh button does. It only reads the
  // tab's address; during an action it waits for the next turn. Stopped when the panel hides.
  function follow() {
    if (location.pathname !== seenPath) readOnScreen();
  }
  const startFollowing = () => (watch = watch || setInterval(follow, 400));
  function stopFollowing() {
    clearInterval(watch);
    watch = null;
  }
  // The page the panel shows is this one (also after our own flow moved the tab).
  function seen() {
    seenPath = location.pathname;
    ui.panel.setAttribute('data-shows', seenPath);
  }

  // The pill reminds you of a branch this tab opened and has not named yet (memory only).
  // done: what the panel just did, kept in the pill's tooltip when the panel closes by itself.
  function hide(done) {
    const due = B().unnamed();
    ui.pill.textContent = due ? 'Zettelbranch: name this branch' : 'Zettelbranch';
    const tip = done || (due ? `${due} is not named yet. Click, then Name this branch.` : '');
    if (tip) ui.pill.setAttribute('title', tip);
    else ui.pill.removeAttribute('title');
    stopFollowing();
    ui.panel.hidden = true;
    ui.pill.hidden = false;
    Object.assign(ui.host.style, { left: 'auto', top: 'auto', right: '12px', bottom: '12px' }); // the pill: bottom right
  }

  // ---------------------------------------------------------------- moving the panel

  // The panel moves when you drag its title bar (Pascal, 2026-10-13: it could hide Claude's
  // reply or the Send button). Pointer listeners on that bar only, in our Shadow DOM; a drag
  // never starts on its buttons. The place is kept in this tab's memory only. The pill stays
  // at the bottom right; the panel opens again where it was dragged.
  const MARGIN = 4;
  let place = null; // { left, top } of the panel, once dragged
  let grabbed = null; // where the pointer holds the panel, while dragging
  function setPlace(left, top) {
    const w = ui.panel.offsetWidth;
    const h = ui.panel.offsetHeight;
    left = Math.min(Math.max(MARGIN, left), Math.max(MARGIN, window.innerWidth - w - MARGIN));
    top = Math.min(Math.max(MARGIN, top), Math.max(MARGIN, window.innerHeight - h - MARGIN));
    place = { left, top };
    Object.assign(ui.host.style, { left: `${left}px`, top: `${top}px`, right: 'auto', bottom: 'auto' });
    // Taller content scrolls inside the panel instead of going below the window.
    ui.panel.style.maxHeight = `${Math.round(Math.min(window.innerHeight * 0.8, window.innerHeight - top - MARGIN))}px`;
  }
  // After Open new chat, you type at the end of claude.ai's message box and press its Send
  // button, just under the text. If the panel covers them (a narrow window: Pascal's shoot,
  // 2026-10-14), it moves just above the box; you can still move it. Only for this chat: the
  // panel opens again where you dragged it, or at the bottom right.
  const BUTTON_ROW = 40; // the room for the box's buttons, under its text
  function clearBox() {
    const box = B().boxRect();
    if (!box) return;
    const p = ui.panel.getBoundingClientRect();
    const covers = p.left < box.right && p.right > box.left && p.top < box.bottom + BUTTON_ROW && p.bottom > box.top;
    const top = box.top - p.height - 8;
    if (!covers || top < MARGIN) return;
    const dragged = place;
    setPlace(p.left, top);
    place = dragged;
  }
  function grab(e) {
    if (e.button !== 0 || e.target.closest('button')) return;
    const r = ui.host.getBoundingClientRect();
    grabbed = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    ui.bar.setPointerCapture(e.pointerId);
    ui.bar.classList.add('dragging');
    e.preventDefault();
  }
  function drag(e) {
    if (grabbed) setPlace(e.clientX - grabbed.dx, e.clientY - grabbed.dy);
  }
  function drop(e) {
    if (!grabbed) return;
    grabbed = null;
    ui.bar.classList.remove('dragging');
    if (ui.bar.hasPointerCapture(e.pointerId)) ui.bar.releasePointerCapture(e.pointerId);
  }

  async function branch() {
    clearMessages();
    const index = B().current().selected;
    return prepared(await B().prepare(index), index);
  }

  // What "Branch" and the tree forms lead to: a form (the tree name, then the new title), or
  // the preview.
  async function prepared(r, index) {
    if (r.stale) {
      await refresh();
      return showFailure(r);
    }
    if (r.ask) return treeForm(r.ask, index);
    if (r.confirm) return rootForm(r.confirm, index);
    if (!r.ok) {
      if (B().current()) showChat(B().current());
      return showFailure(r);
    }
    if (r.renamed) showRenamed(r.renamed, 'root', r.via);
    showPreview(r);
  }

  // ---------------------------------------------------------------- forms

  // A form of the panel, in place of the browser's dialogs (0.2.0): those were headed
  // "claude.ai", as if claude.ai were asking. Its main button has a click listener; Enter in
  // its field makes the browser click that button (a form's submit button), and method
  // "dialog" means the form never loads a page. Fields are read only in that click.
  function form(zb, kids, okText, onOk, onCancel) {
    const ok = el('button', { type: 'submit', class: 'primary', 'data-zb': `${zb}-ok`, text: okText });
    ok.addEventListener('click', () => act(onOk));
    const no = button('Cancel', `${zb}-cancel`, onCancel);
    return el('form', { method: 'dialog', class: 'form', 'data-zb': zb }, [...kids, el('div', { class: 'row' }, [ok, no])]);
  }
  // claude.ai moves the focus to its own message box when a key reaches its page from outside
  // its fields (probe P12, 2026-10-14, Chrome and Firefox): the keys typed in a field of the
  // panel stop at that field. Stopped, never read: Enter still clicks the form's button.
  const stopKey = (e) => e.stopPropagation();
  function field(zb, value) {
    const input = el('input', { type: 'text', 'data-zb': zb, value, autocomplete: 'off', spellcheck: 'false' });
    for (const type of ['keydown', 'keypress', 'keyup']) input.addEventListener(type, stopKey);
    return input;
  }
  const formError = (text) => (text ? el('p', { class: 'box warn', 'data-zb': 'form-error', text }) : null);
  function focusField(input) {
    input.focus();
    input.select();
  }
  // Cancel: back to the chat as read, and a word that nothing changed.
  function cancelled(text) {
    B().cancel();
    const c = B().cached();
    if (c) showChat(c);
    ui.info.textContent = text;
    ui.info.hidden = false;
    return c ? null : refresh();
  }

  // A chat not in a tree yet: its tree name, proposed from its title (hints item 7).
  function treeForm(ask, index) {
    const input = field('tree-field', ask.tree);
    show(form('tree-form', [
      el('p', { class: 'section-head', text: 'This chat is not in a tree yet' }),
      el('p', { text: 'Name its tree. The chat becomes the tree\'s first card, and its branches get addresses under it.' }),
      el('label', { class: 'field' }, [el('span', { text: 'Tree name' }), input]),
      el('p', { class: 'muted', 'data-zb': 'tree-hint', text: 'Only a-z, 0-9 and -, such as oulipo or sky-notes: the name starts every title of the tree.' }),
      formError(ask.error),
    ], 'Next', async () => prepared(await B().proposeRoot(index, input.value), index), () => cancelled('Nothing changed.')));
    focusField(input);
  }

  // The chat's new title as the tree root, before anything changes.
  function rootForm(c, index) {
    const ok = button('Rename', 'root-ok', async () => prepared(await B().makeRoot(index), index), 'primary');
    show(el('div', { class: 'form', 'data-zb': 'root-form' }, [
      el('p', { class: 'section-head', text: 'Rename this chat?' }),
      el('p', { class: 'muted title', 'data-zb': 'root-old', text: `Now: ${c.old}` }),
      el('p', {}, [el('span', { class: 'muted', text: 'New: ' }), el('span', { class: 'new-title', 'data-zb': 'root-new', text: c.name })]),
      el('p', { class: 'muted', text: 'Then the panel shows the first message of its branch.' }),
      el('div', { class: 'row' }, [ok, button('Cancel', 'root-cancel', () => cancelled('Nothing changed.'))]),
    ]));
    ok.focus();
  }

  // The branch's name: its address as fixed text, the topic in the field (hints item 2).
  function nameForm(ask) {
    const input = field('name-field', ask.topic);
    show(form('name-form', [
      el('p', { class: 'section-head', 'data-zb': 'name-head', text: ask.wasNamed ? 'Rename this branch' : 'Name this branch' }),
      el('div', { class: 'field' }, [el('span', { class: 'prefix', 'data-zb': 'name-prefix', text: ask.prefix.trim() }), input]),
      ask.from ? el('p', { class: 'muted', 'data-zb': 'name-from', text: ask.from }) : null,
      el('p', { class: 'muted title', 'data-zb': 'name-now', text: `Now: ${ask.title || '(no title yet)'}` }),
      formError(ask.error),
    ], 'Rename', () => named(input), () => cancelled('Not renamed.')));
    focusField(input);
  }

  // What to do in the new chat: after Open new chat, and when the panel opens again there.
  // o.own: the box ends with your own message (a branch instead of it).
  // "Name this branch" in the steps: greyed until the message is sent, since there is nothing
  // to name before (clicked anyway, its warning made the panel taller, over Send: the shoot).
  function nameAfterSend(sent) {
    const b = button('Name this branch', 'name', nameBranch, 'primary');
    if (!sent) {
      b.disabled = true;
      b.title = 'Once you have sent your question and Claude has replied';
    }
    return b;
  }

  // o.sent: the message is sent (the tab moved to the new chat), step 1 is done (hints item 6).
  function steps(o) {
    return el('div', { class: 'steps', 'data-zb': 'steps' }, [
      el('div', { class: o.sent ? 'step done' : 'step', 'data-zb': 'step-1' }, [
        el('span', { class: 'num', text: o.sent ? '✓' : '1.' }),
        el('p', {
          text: o.sent
            ? 'Sent.'
            : o.own
              ? 'Your message is at the end of the box, under MY QUESTION: change it if you like, then press Send. Everything above it is the conversation so far, copied for Claude.'
              : 'Type your first question for this branch at the end of the box, under MY QUESTION, then press Send. Everything above it is the conversation so far, copied for Claude.',
        }),
      ]),
      el('div', { class: 'step', 'data-zb': 'step-2' }, [
        el('span', { class: 'num', text: '2.' }),
        el('div', { class: 'row' }, [el('p', { text: 'When Claude has replied:' }), nameAfterSend(o.sent)]),
      ]),
    ]);
  }

  async function openChat() {
    clearMessages();
    const r = await B().open();
    seen(); // the new chat this flow opened: not a move to follow
    if (!r.ok) return showFailure(r);
    // How the text went in, when one call was not enough (Firefox): shown only with a warning,
    // else in the notice's tooltip (hints item 5).
    const how = r.note ? `Not inserted line by line: ${r.note}.` : r.method === 'line by line' ? `Inserted line by line, in ${(r.ms / 1000).toFixed(1)} s: one insertion had lost the line breaks.` : '';
    show(
      el('p', { class: 'box notice', 'data-zb': 'opened', text: `The new chat holds the first message of ${r.address}.`, ...(how && r.exact ? { title: how } : {}) }),
      r.exact
        ? null
        : el('div', { class: 'box warn', 'data-zb': 'warning' }, [
          el('p', { text: `The message box holds ${r.inBox.toLocaleString('en-US')} characters, the preview had ${r.chars.toLocaleString('en-US')}. Check the box before you press Send.` }),
          how ? el('p', { class: 'detail', 'data-zb': 'insert-method', text: how }) : null,
        ]),
      steps(r)
    );
    clearBox();
  }

  async function nameBranch() {
    clearMessages();
    const r = await B().proposeName();
    if (r.ask) return nameForm(r.ask);
    showFailure(r);
  }

  // "Rename" in the naming form. Done through claude.ai's menu, the panel closes: the title at
  // the top shows the new name, and the pill's tooltip says what happened (hints item 3).
  async function named(input) {
    clearMessages();
    const r = await B().name(input.value);
    if (r.ask) return nameForm(r.ask);
    if (!r.ok) {
      const c = B().cached();
      if (c) showChat(c);
      else await refresh();
      return showFailure(r);
    }
    // What the panel read for this chat, with the new name; else read it (not the list again).
    if (r.chat) showChat(r.chat);
    else await refresh({ reuseList: true });
    const kind = r.wasNamed ? 'rename' : 'branch';
    if (r.via && r.via.via === 'menu') return hide(renamedText(r.renamed, kind));
    showRenamed(r.renamed, kind, r.via);
  }

  // ---------------------------------------------------------------- mount

  // The refresh button: a circular arrow, drawn as SVG elements (no markup from strings).
  function refreshButton() {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) svg.setAttribute(k, v);
    for (const d of ['M20.5 14.5A8.6 8.6 0 1 1 18.3 6.1L19.6 7.2', 'M19.6 2.6v4.6h-4.6']) {
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d);
      svg.append(path);
    }
    const tip = 'Read this chat and its tree again';
    const b = el('button', { type: 'button', class: 'icon', 'data-zb': 'refresh', title: tip, 'aria-label': tip }, [svg]);
    b.addEventListener('click', readOnScreen);
    return b;
  }

  function mount() {
    if (ui) return;
    const host = document.createElement('div');
    host.id = 'zettelbranch';
    Object.assign(host.style, { position: 'fixed', right: '12px', bottom: '12px', zIndex: '2147483647' });
    const shadow = host.attachShadow({ mode: 'open' });
    // A constructed stylesheet: a strict page CSP does not block it, while it could block a
    // <style> element (kept only as a fallback).
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(CSS);
      shadow.adoptedStyleSheets = [sheet];
    } catch (e) {
      shadow.append(el('style', { text: CSS }));
    }
    ui = {};
    ui.pill = el('button', { class: 'pill', type: 'button', 'data-zb': 'pill', text: 'Zettelbranch' });
    ui.pill.addEventListener('click', open);
    ui.notice = el('div', { class: 'box notice', 'data-zb': 'notice', hidden: '' });
    ui.error = el('div', { class: 'box error', 'data-zb': 'error', hidden: '' });
    ui.info = el('p', { class: 'box warn', 'data-zb': 'info', hidden: '' });
    ui.body = el('div', { class: 'body', 'data-zb': 'body' });
    ui.refresh = refreshButton();
    const hideButton = el('button', { type: 'button', 'data-zb': 'hide', title: 'Hide the panel', text: 'Hide' });
    hideButton.addEventListener('click', () => hide()); // also during a background read
    ui.bar = el('div', { class: 'top', 'data-zb': 'bar', title: 'Drag to move' }, [el('b', { text: 'Zettelbranch' }), ui.refresh, hideButton]);
    ui.bar.addEventListener('pointerdown', grab);
    ui.bar.addEventListener('pointermove', drag);
    ui.bar.addEventListener('pointerup', drop);
    ui.bar.addEventListener('pointercancel', drop);
    ui.panel = el('div', { class: 'panel', 'data-zb': 'panel', hidden: '' }, [ui.bar, el('div', { class: 'main' }, [ui.notice, ui.error, ui.info, ui.body])]);
    ui.wrap = el('div', { class: 'wrap' }, [ui.pill, ui.panel]);
    ui.host = host;
    shadow.append(ui.wrap);
    // Outside <body>, so the app's own rendering never touches it.
    document.documentElement.append(host);
  }

  global.ZBUi = { mount, open, FROM_TREE };
})(globalThis);
