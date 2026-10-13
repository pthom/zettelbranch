// Fake claude.ai app for the offline probe tests (fixture, not part of the extension).
// A single-page app: links are handled with pushState, the message box enables Send when
// it holds text, long pastes become an attachment chip, Send posts to the fake server
// (/fake/send), which answers at once. It uses its own /fake/ endpoints, so the test can
// tell its requests apart from the extension's /api/ calls.
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const editor = $('[data-testid="chat-input"] .ProseMirror');
  const send = $('[data-testid="chat-input-send"]');
  const files = $('[data-testid="composer-files"]');
  const list = $('[data-testid="transcript-list"]');
  const recents = $('[data-testid="sidebar-recents"]');
  let pendingAttachments = [];
  const RENDER_LAST = 30; // like a virtualized list: only the last 30 messages are in the DOM

  function mk(tag, attrs, text) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // Same rules as the probes' editorText: paragraphs and list items are lines.
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
    send.disabled = !editorText().trim() && pendingAttachments.length === 0;
  }

  function clearComposer() {
    editor.replaceChildren(mk('p', {}));
    editor.firstChild.append(mk('br', { class: 'ProseMirror-trailingBreak' }));
    files.replaceChildren();
    pendingAttachments = [];
    updateSend();
  }

  editor.addEventListener('input', updateSend);
  editor.addEventListener('paste', (e) => {
    e.preventDefault();
    const t = e.clipboardData.getData('text/plain');
    if (t.length > 10000) {
      pendingAttachments.push({ file_name: 'Pasted text', extracted_content: t });
      files.append(mk('div', { 'data-testid': 'file-thumbnail' }, `Pasted text (${t.length} characters)`));
    } else {
      document.execCommand('insertText', false, t);
    }
    updateSend();
  });

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

  // The title menu, as a Radix dropdown: opens on pointerdown; Rename turns the title into a
  // field; Enter saves through the app's own call, then the app updates its own sidebar.
  const titleButton = $('[data-testid="chat-title-button"]');
  const titleText = $('[data-testid="chat-title-text"]');
  let menu = null;
  function closeMenu() {
    if (menu) menu.remove();
    menu = null;
  }
  titleButton.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (menu) return closeMenu();
    menu = mk('div', { role: 'menu', 'data-testid': 'chat-title-menu' });
    for (const [label, id] of [['Star', 'star'], ['Rename', 'rename'], ['Delete', 'delete']]) {
      const item = mk('div', { role: 'menuitem', 'data-testid': 'chat-menu-' + id }, label);
      if (id === 'rename') item.addEventListener('click', startRename);
      menu.append(item);
    }
    document.body.append(menu);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
  function startRename() {
    closeMenu();
    const m = /^\/chat\/([0-9a-f-]{36})/.exec(location.pathname);
    const input = mk('input', { type: 'text', 'data-testid': 'chat-title-input' });
    input.value = titleText.textContent;
    titleButton.replaceWith(input);
    input.focus();
    input.addEventListener('keydown', async (e) => {
      if (e.key !== 'Enter') return;
      await fetch('/fake/rename', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: m[1], name: input.value }) });
      titleText.textContent = input.value;
      input.replaceWith(titleButton);
      await loadSidebar();
    });
  }

  async function route() {
    const m = /^\/chat\/([0-9a-f-]{36})/.exec(location.pathname);
    list.replaceChildren();
    clearComposer();
    closeMenu();
    if (!m) {
      document.title = 'Claude';
      titleText.textContent = '';
      return;
    }
    const conv = await (await fetch('/fake/conv/' + m[1])).json();
    document.title = conv.name ? `${conv.name} - Claude` : 'Claude';
    titleText.textContent = conv.name;
    for (const msg of conv.messages.slice(-RENDER_LAST)) {
      const turn = mk('div', { 'data-test-render-count': '1' });
      if (msg.role === 'user') {
        for (const a of msg.attachments) turn.append(mk('div', { 'data-testid': 'file-thumbnail' }, a.file_name));
        const u = mk('div', { 'data-testid': 'user-message', class: 'font-large !font-user-message grid grid-cols-1 gap-2' });
        u.append(mk('p', { class: 'whitespace-pre-wrap break-words' }, msg.text));
        turn.append(u);
      } else {
        turn.append(renderAssistant(msg.text));
      }
      list.append(turn);
    }
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
    const body = { conversationId: m ? m[1] : null, text: editorText(), attachments: pendingAttachments };
    const r = await (await fetch('/fake/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();
    if (!m) history.pushState({}, '', '/chat/' + r.id);
    await route();
    await loadSidebar();
  });

  loadSidebar();
  route();
})();
