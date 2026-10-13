// Zettelbranch: the panel. A small "Zettelbranch" button at the bottom right opens it.
// Shadow DOM outside <body>, built with DOM nodes and textContent only. Click listeners
// only: no keyboard or input listeners. Every action starts with a click; the flow itself
// is in branch.js.
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
    .top { display: flex; gap: 6px; align-items: center; padding: 8px 10px; border-bottom: 1px solid var(--line); }
    .top b { flex: 1; font-size: 13.5px; }
    .main, .body { display: flex; flex-direction: column; gap: 8px; }
    .main { overflow: auto; padding: 10px; }
    p { margin: 0; }
    .muted { color: var(--muted); }
    .title { color: var(--muted); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    button { font: inherit; background: var(--btn); color: var(--fg); border: 1px solid var(--line); border-radius: 6px; padding: 4px 10px; cursor: pointer; }
    button:hover { background: var(--btn-hover); }
    button.primary { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); font-weight: 600; }
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

  let ui = null; // { wrap, pill, panel, notice, error, info, body }
  let busy = false;

  async function act(fn) {
    if (busy) return;
    busy = true;
    ui.wrap.classList.add('busy');
    try {
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

  // After each rename (M1-4). The open tab's title shows the new name after a reload; its
  // sidebar can lag longer (seen on 2026-10-13, even after Shift+Reload). The phone at once.
  function showRenamed(name) {
    ui.notice.replaceChildren(
      el('p', { text: `Named ${name}. Your phone shows it now. Here, the title at the top shows it after a reload; the sidebar can take a few minutes more.` }),
      button('Reload now', 'reload', () => location.reload())
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

  // A result that did not go through: its plain text, and its error if any.
  function showFailure(r) {
    if (r.error) return showError(r.text, r.error);
    ui.info.textContent = r.text;
    ui.info.hidden = false;
  }

  // ---------------------------------------------------------------- views

  async function refresh() {
    say('Reading this chat…');
    const r = await B().read();
    if (!r.ok) {
      say(r.text);
      if (r.error) showError('', r.error);
      return;
    }
    showChat(r.chat);
  }

  function showChat(chat) {
    const parts = [el('p', { class: 'title', 'data-zb': 'chat-title', text: chat.title || '(no title yet)' })];
    if (chat.source === 'page') {
      showError('', chat.apiError);
      parts.push(el('p', { class: 'box warn', 'data-zb': 'note', text: `claude.ai's API did not answer as expected, so Zettelbranch read the page instead. Only the ${chat.messages.length} messages on screen were read: in a long chat, earlier messages are missing. Naming branches is unavailable until the API answers.` }));
    }
    if (chat.needsName && chat.source === 'api') {
      parts.push(el('div', { class: 'box notice', 'data-zb': 'name-box' }, [
        el('p', { text: `This chat is the branch ${chat.branch.tree}/${chat.branch.address}, not named yet.` }),
        button('Name this branch', 'name', nameBranch, 'primary'),
      ]));
    }
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
        rows.forEach((r, j) => r.setAttribute('aria-pressed', String(j === i)));
        hint.textContent = hintFor(m);
      });
      return row;
    });
    const list = el('div', { class: 'msgs', 'data-zb': 'messages' }, rows);
    hint.textContent = hintFor(chat.messages[chat.selected]);
    parts.push(el('p', { text: 'Choose where the branch starts:' }), list, hint, el('div', { class: 'row' }, [button('Branch', 'branch', branch, 'primary')]));
    show(...parts);
    const sel = rows[chat.selected];
    list.scrollTop = sel.offsetTop - list.clientHeight / 2;
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

  async function open() {
    ui.pill.hidden = true;
    ui.panel.hidden = false;
    clearMessages();
    await refresh();
  }

  async function branch() {
    clearMessages();
    const chat = B().current();
    const r = await B().prepare(chat.selected);
    if (r.stale) {
      await refresh();
      return showFailure(r);
    }
    if (!r.ok) return showFailure(r);
    if (r.renamed) showRenamed(r.renamed);
    showPreview(r);
  }

  async function openChat() {
    clearMessages();
    const r = await B().open();
    if (!r.ok) return showFailure(r);
    show(
      el('div', { class: 'box notice', 'data-zb': 'opened' }, [
        el('p', { text: `The new chat holds the first message of ${r.address}. Read it, change it if you like, then press Send.` }),
      ]),
      r.exact ? null : el('p', { class: 'box warn', 'data-zb': 'warning', text: `The message box holds ${r.inBox.toLocaleString('en-US')} characters, the preview had ${r.chars.toLocaleString('en-US')}. Check the box before you press Send.` }),
      el('p', { text: 'Once Claude has replied, name the branch:' }),
      el('div', { class: 'row' }, [button('Name this branch', 'name', nameBranch, 'primary')])
    );
  }

  async function nameBranch() {
    clearMessages();
    const r = await B().name();
    if (!r.ok) return showFailure(r);
    await refresh();
    showRenamed(r.renamed);
  }

  // ---------------------------------------------------------------- mount

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
    ui.pill.addEventListener('click', () => act(open));
    ui.notice = el('div', { class: 'box notice', 'data-zb': 'notice', hidden: '' });
    ui.error = el('div', { class: 'box error', 'data-zb': 'error', hidden: '' });
    ui.info = el('p', { class: 'box warn', 'data-zb': 'info', hidden: '' });
    ui.body = el('div', { class: 'body', 'data-zb': 'body' });
    const top = el('div', { class: 'top' }, [
      el('b', { text: 'Zettelbranch' }),
      button('Read again', 'refresh', () => {
        clearMessages();
        return refresh();
      }),
      button('Hide', 'hide', () => {
        ui.panel.hidden = true;
        ui.pill.hidden = false;
      }),
    ]);
    ui.panel = el('div', { class: 'panel', 'data-zb': 'panel', hidden: '' }, [top, el('div', { class: 'main' }, [ui.notice, ui.error, ui.info, ui.body])]);
    ui.wrap = el('div', { class: 'wrap' }, [ui.pill, ui.panel]);
    shadow.append(ui.wrap);
    // Outside <body>, so the app's own rendering never touches it.
    document.documentElement.append(host);
  }

  global.ZBUi = { mount };
})(globalThis);
