// Fake claude.ai app for the offline tests (fixture, not part of the extension).
// A single-page app: links are handled with pushState, the message box enables Send when
// it holds text, Send posts to the fake server (/fake/send), which answers at once. Like
// the real page, it shows only the last messages of a long chat (a virtualized list), in
// rows with data-index and data-perf-row. It uses its own /fake/ endpoints, so the tests
// can tell its requests apart from the extension's /api/ calls.
// Its title menu imitates claude.ai's, as found on 2026-10-13 (P11): a button in
// chat-title-split that opens on pointerdown, four items with claude.ai's test ids, Rename
// turning the title into the field name-chat, Enter saving through the app's own call
// (/fake/rename) and the app updating its own title and sidebar. The fake server's
// options.menu switches parts of it off. Every synthetic event (not from a real user) on a
// pointer, mouse, click or key is reported to /fake/synthetic, with the element it reached.
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const editor = $('[data-testid="chat-input"] .ProseMirror');
  const send = $('[data-testid="chat-input-send"]');
  const list = $('[data-testid="transcript-list"]');
  const recents = $('[data-testid="sidebar-recents"]');
  const split = $('[data-testid="chat-title-split"]');
  const titleButton = split.querySelector('button[aria-haspopup="menu"]');
  const titleText = $('[data-fake="title-text"]');
  const RENDER_LAST = 30;

  function mk(tag, attrs, text) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // Same rules as the extension's editorText: paragraphs and list items are lines.
  function editorText() {
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
          } else walk(c);
        }
      }
    })(editor);
    close(false);
    return lines.join('\n');
  }

  function updateSend() {
    send.disabled = !editorText().trim();
  }

  function clearComposer() {
    editor.replaceChildren(mk('p', {}));
    editor.firstChild.append(mk('br', { class: 'ProseMirror-trailingBreak' }));
    updateSend();
  }

  editor.addEventListener('input', updateSend);

  function renderAssistant(text) {
    const md = mk('div', { class: 'grid-cols-1 grid gap-2.5 standard-markdown' });
    for (const block of text.split(/\n{2,}/)) {
      if (/^>/.test(block)) {
        const q = mk('blockquote');
        q.append(mk('p', { class: 'whitespace-normal break-words' }, block.split('\n').map((l) => l.replace(/^>\s?/, '')).join(' ')));
        md.append(q);
      } else {
        md.append(mk('p', { class: 'whitespace-normal break-words' }, block));
      }
    }
    const inner = mk('div', { class: 'font-claude-response relative leading-[1.65rem]' });
    inner.append(md);
    const wrap = mk('div', { 'data-testid': 'assistant-message' });
    wrap.append(inner);
    return wrap;
  }

  async function loadSidebar() {
    const items = await (await fetch('/fake/list')).json();
    recents.replaceChildren(
      ...items.map((c) => {
        const row = mk('div', { 'data-row': '' });
        const a = mk('a', { href: '/chat/' + c.uuid, 'data-roving-item': '', 'data-row-main-button': '' });
        const label = mk('span', { 'data-row-label': '' });
        label.append(mk('span', { class: 'inline-block whitespace-nowrap' }, c.name || 'New chat'));
        a.append(label);
        row.append(a);
        return row;
      })
    );
  }

  // ---------------------------------------------------------------- the title menu

  const options = async () => (await fetch('/fake/options')).json();
  let menu = null;
  let field = null;
  function closeMenu() {
    if (menu) menu.remove();
    menu = null;
    titleButton.setAttribute('aria-expanded', 'false');
  }
  function closeField() {
    if (field) field.replaceWith(titleButton);
    field = null;
  }
  titleButton.addEventListener('pointerdown', async (e) => {
    if (e.button !== 0) return;
    if (menu) return closeMenu();
    const o = await options();
    if (!o.opens) return;
    menu = mk('div', { role: 'menu' });
    for (const [id, label] of [['star', 'Star'], ['rename', 'Rename'], ['share', 'Share'], ['delete', 'Delete']]) {
      if (id === 'rename' && !o.renameItem) continue;
      const item = mk('div', { role: 'menuitem', 'data-testid': `${id}-chat-trigger` }, label);
      if (id === 'rename') item.addEventListener('click', () => startRename(o));
      menu.append(item);
    }
    document.body.append(menu);
    titleButton.setAttribute('aria-expanded', 'true');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
  function startRename(o) {
    closeMenu();
    if (!o.field) return;
    const m = /^\/chat\/([0-9a-f-]{36})/.exec(location.pathname);
    field = mk('input', { type: 'text', 'data-testid': 'name-chat', ...(o.readonly ? { readonly: '' } : {}) });
    field.value = titleText.textContent;
    titleButton.replaceWith(field);
    field.focus();
    field.addEventListener('keydown', async (e) => {
      if (e.key === 'Escape') return closeField();
      if (e.key !== 'Enter') return;
      const name = field.value;
      await fetch('/fake/rename', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: m[1], name }) });
      titleText.textContent = name;
      document.title = `${name} - Claude`;
      closeField();
      await loadSidebar();
    });
  }
  // Synthetic events, reported with the element they reached.
  for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'keydown', 'keypress', 'keyup']) {
    document.addEventListener(type, (e) => {
      if (e.isTrusted) return;
      const t = e.target instanceof Element ? e.target : null;
      const holder = t && t.closest('[data-testid]');
      const report = { type, key: e.key || null, tag: t ? t.tagName.toLowerCase() : null, testid: holder ? holder.getAttribute('data-testid') : null, own: t ? t.getAttribute('data-testid') : null, href: t && t.closest('a') ? t.closest('a').getAttribute('href') : null, haspopup: t ? t.getAttribute('aria-haspopup') : null, role: t ? t.getAttribute('role') : null };
      fetch('/fake/synthetic', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(report) });
    }, true);
  }

  async function route() {
    const m = /^\/chat\/([0-9a-f-]{36})/.exec(location.pathname);
    list.replaceChildren();
    clearComposer();
    closeMenu();
    closeField();
    if (!(await options()).title) split.remove();
    else if (!split.isConnected) $('[data-testid="chat-header"]').append(split);
    if (!m) {
      document.title = 'Claude';
      titleText.textContent = '';
      return;
    }
    const conv = await (await fetch('/fake/conv/' + m[1])).json();
    document.title = conv.name ? `${conv.name} - Claude` : 'Claude';
    titleText.textContent = conv.name;
    const first = Math.max(0, conv.messages.length - RENDER_LAST);
    conv.messages.forEach((msg, i) => {
      if (i < first) return;
      const row = mk('div', { 'data-testid': 'transcript-row', 'data-index': String(i), 'data-perf-row': msg.role === 'user' ? 'human' : 'assistant' });
      if (msg.role === 'user') {
        for (const a of msg.attachments) row.append(mk('div', { 'data-testid': 'file-thumbnail' }, a.file_name));
        const u = mk('div', { 'data-testid': 'user-message', class: 'font-large !font-user-message grid grid-cols-1 gap-2' });
        u.append(mk('p', { class: 'whitespace-pre-wrap break-words' }, msg.text));
        row.append(u);
      } else {
        row.append(renderAssistant(msg.text));
      }
      list.append(row);
    });
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="/"]');
    if (!a) return;
    e.preventDefault();
    history.pushState({}, '', a.getAttribute('href'));
    route();
  });
  window.addEventListener('popstate', route);

  send.addEventListener('click', async () => {
    const m = /^\/chat\/([0-9a-f-]{36})/.exec(location.pathname);
    const body = { conversationId: m ? m[1] : null, text: editorText() };
    const r = await (await fetch('/fake/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();
    if (!m) history.pushState({}, '', '/chat/' + r.id);
    await route();
    await loadSidebar();
  });

  loadSidebar();
  route();
})();
