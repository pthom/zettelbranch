// Zettelbranch: renaming the chat on screen through claude.ai's own title menu, as you would
// by hand, so the open tab (its sidebar and the title at the top) shows the new name at
// once (probe P11, 2026-10-13). branch.js reads the name back, and renames through the API
// instead when any step here fails.
//
// Safety. This is the only file that sends events to claude.ai's page (besides the click on
// the New chat link in branch.js). It sends them only through pressOn, keyOn and clickOn,
// only to the four TARGETS below, each found by its exact selector: the title button, the
// open menu (Escape only), the Rename item (by its exact test id, never by its label or its
// place: Delete sits next to it) and the rename field (Enter or Escape). Never to the message
// box, Send, Delete or any other element.
(function (global) {
  'use strict';

  const TARGETS = {
    titleButton: '[data-testid="chat-title-split"] button[aria-haspopup="menu"]',
    menu: '[role="menu"]',
    renameItem: '[role="menu"] [data-testid="rename-chat-trigger"]',
    nameField: 'input[data-testid="name-chat"]',
  };
  const target = (which) => document.querySelector(TARGETS[which]);
  const shown = (el) => !!el && el.getClientRects().length > 0;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // A short wait for claude.ai's answer to one of these events. Gives up after `timeout`.
  async function waitFor(fn, timeout) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const v = fn();
      if (v) return v;
      await sleep(50);
    }
    return null;
  }

  // A press of the main mouse button, as claude.ai's menus expect it (they open on pointerdown).
  function pressOn(which) {
    const el = target(which);
    if (!el) return false;
    const o = { bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1, pointerType: 'mouse', isPrimary: true, pointerId: 1 };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    el.dispatchEvent(new MouseEvent('mousedown', o));
    el.dispatchEvent(new PointerEvent('pointerup', { ...o, buttons: 0 }));
    el.dispatchEvent(new MouseEvent('mouseup', { ...o, buttons: 0 }));
    return true;
  }

  // Enter or Escape, pressed and released.
  function keyOn(which, k) {
    const el = target(which);
    if (!el) return false;
    const code = { Enter: 13, Escape: 27 }[k];
    const types = k === 'Enter' ? ['keydown', 'keypress', 'keyup'] : ['keydown', 'keyup'];
    for (const type of types) el.dispatchEvent(new KeyboardEvent(type, { key: k, code: k, keyCode: code, which: code, bubbles: true, cancelable: true }));
    return true;
  }

  function clickOn(which) {
    const el = target(which);
    if (el) el.click();
  }

  // Closes what is open after a step failed, so no menu stays open and no typed text stays.
  async function undo(why) {
    if (target('nameField')) {
      keyOn('nameField', 'Escape');
      if (!(await waitFor(() => !target('nameField'), 500))) why += '; the rename field stayed open';
    }
    if (shown(target('menu'))) keyOn('menu', 'Escape');
    return { ok: false, why };
  }

  // Renames the chat on screen to `name`. { ok: true } once claude.ai's field took the name
  // and closed on Enter (branch.js then reads it back); else { ok: false, why }.
  async function rename(name) {
    if (!target('titleButton')) return { ok: false, why: 'no title button' };
    pressOn('titleButton');
    if (!(await waitFor(() => shown(target('menu')), 1000))) return undo('no menu opened');
    if (!target('renameItem')) return undo('no Rename item in the menu');
    pressOn('renameItem');
    clickOn('renameItem');
    const field = await waitFor(() => target('nameField'), 2000);
    if (!field) return undo('no rename field appeared');
    field.focus();
    if (document.activeElement !== field) return undo('the rename field did not take the focus');
    field.select();
    document.execCommand('insertText', false, name);
    if (field.value !== name) return undo('the name could not be typed in the field');
    keyOn('nameField', 'Enter');
    if (!(await waitFor(() => !target('nameField'), 1000))) return undo('the rename field did not close on Enter');
    return { ok: true };
  }

  global.ZBMenu = { rename, TARGETS };
})(globalThis);
