// End-to-end tests of the extension against a fake claude.ai (fake/), in headless Chromium
// with a throwaway profile under tests/out/. Every request is answered from memory or
// aborted, DNS resolves nothing, and the run fails if any request escapes. Names are typed
// in the panel's own forms (0.2.0); a browser dialog, which the extension must never open,
// is dismissed and fails the last test.
//
//   node --test --test-concurrency=1 e2e.test.mjs
// Screenshots go to tests/out/screenshots/, a report to tests/out/e2e-report.json.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createFakeClaude, SECRETS } from './fake/fake-claude.mjs';
import { EXT_DIR, OUT_DIR, PROFILE_DIR, writeJson } from './lib.mjs';

const SHOTS = path.join(OUT_DIR, 'screenshots');
const fake = createFakeClaude();
const handled = new Set();
const allRequests = [];
const requestLog = [];
const dialogs = []; // every browser dialog shown: there must be none
const seen = []; // panel texts on test chats: none may hold private text
let context;
let page;
let sends = 0; // times the test pressed the app's Send button

before(async () => {
  fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
  fs.mkdirSync(SHOTS, { recursive: true });
  context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chromium',
    headless: true, // never a window
    args: [`--disable-extensions-except=${EXT_DIR}`, `--load-extension=${EXT_DIR}`, '--host-resolver-rules=MAP * ~NOTFOUND'],
    viewport: { width: 1280, height: 860 },
    serviceWorkers: 'block',
  });
  await context.route('**/*', async (route) => {
    handled.add(route.request());
    const action = await fake.handle(route);
    requestLog.push({ method: route.request().method(), url: route.request().url().slice(0, 160), action });
  });
  await context.routeWebSocket(/.*/, (ws) => ws.close());
  context.on('request', (r) => allRequests.push(r));
  page = context.pages()[0] || (await context.newPage());
  page.on('dialog', async (d) => {
    dialogs.push({ type: d.type(), message: d.message() });
    return d.dismiss();
  });
});

after(async () => {
  if (context) await context.close();
  writeJson(path.join(OUT_DIR, 'e2e-report.json'), { apiLog: fake.apiLog, dialogs, requests: requestLog.length, aborted: requestLog.filter((r) => r.action.startsWith('aborted')) });
});

// ---------------------------------------------------------------- helpers

const Z = (zb) => page.locator(`#zettelbranch [data-zb="${zb}"]`);
const row = (n) => page.locator(`#zettelbranch [data-zb="message"][data-n="${n}"]`);
// Waits until the panel's current action is over, and any read in the background too.
const idle = () => page.waitForFunction(() => {
  const h = document.getElementById('zettelbranch');
  const w = h && h.shadowRoot && h.shadowRoot.querySelector('.wrap');
  const r = w && w.querySelector('[data-zb="refresh"]');
  return !!w && !w.classList.contains('busy') && !(r && r.getAttribute('aria-busy') === 'true');
});
async function click(zb) {
  await Z(zb).click();
  await idle();
}
const text = async (zb) => ((await Z(zb).textContent()) || '').trim();
const visible = (zb) => Z(zb).isVisible();
const panelText = async () => ((await Z('panel').textContent()) || '').replace(/\s+/g, ' ');
const apiCount = () => fake.apiLog.length;
const puts = () => fake.apiLog.filter((e) => e.method === 'PUT');

async function goChat(id) {
  await page.goto(`https://claude.ai/chat/${id}`);
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="transcript-row"]').length > 0);
  await page.locator('#zettelbranch').waitFor({ state: 'attached' });
}
async function openPanel() {
  await click('pill');
  assert.equal(await visible('panel'), true);
}
// The panel has caught up with the tab: hidden, or showing the page on screen, idle.
const settle = async () => {
  await page.waitForFunction(() => {
    const h = document.getElementById('zettelbranch');
    const p = h && h.shadowRoot && h.shadowRoot.querySelector('[data-zb="panel"]');
    return !!p && (p.hidden || p.getAttribute('data-shows') === location.pathname);
  });
  await idle();
};
// Pascal pressing Send: the fake app's own button. Waits for his message and the reply, and
// for the panel, if open, to follow the tab to the new chat.
async function pressSend() {
  sends++;
  const rows = await page.locator('[data-testid="transcript-row"]').count();
  const wasNew = !/\/chat\//.test(page.url());
  await page.locator('[data-testid="chat-input-send"]').click();
  if (wasNew) await page.waitForURL(/\/chat\//);
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="transcript-row"]').length >= n + 2, rows);
  await settle();
}
// Pascal typing at the end of the message box (the test puts the caret there, as his click would).
async function typeAtEnd(s) {
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="chat-input"] [contenteditable="true"]');
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
  });
  await page.keyboard.type(s);
}
// The tree's lines: address, topic, tags, link, current mark, indentation.
const nodes = () => Z('tree-node').evaluateAll((els) => els.map((e) => ({
  address: e.getAttribute('data-address'),
  topic: e.querySelector('.topic').textContent,
  tags: [...e.querySelectorAll('.tag')].map((t) => t.textContent).join(','),
  href: e.getAttribute('href'),
  current: e.getAttribute('aria-current') === 'page',
  indent: e.style.paddingLeft,
})));
const node = async (address, topic) => (await nodes()).find((n) => n.address === address && (!topic || n.topic.includes(topic)));
const listCalls = (from) => fake.apiLog.slice(from).filter((e) => e.path.includes('chat_conversations_v2')).length;
// A rename through claude.ai's own title menu: the app's own save, no PUT, and the open tab
// (the title at the top, the sidebar) shows the name at once; nothing left open; no reload offered.
async function assertMenuRename(name, putsBefore) {
  assert.deepEqual(fake.menuRenames.at(-1), { name, kept: true }, 'saved through the app\'s own menu');
  assert.equal(puts().length, putsBefore, 'no PUT');
  assert.equal(await page.locator('[data-fake="title-text"]').textContent(), name, 'the title at the top, at once');
  assert.ok((await page.locator('[data-testid="sidebar-recents"]').textContent()).includes(name), 'the sidebar, at once');
  await assertNothingLeftOpen();
  assert.equal(await Z('reload').count(), 0, 'no reload offered');
}
async function assertNothingLeftOpen() {
  assert.equal(await page.locator('[role="menu"]').count(), 0, 'no menu left open');
  assert.equal(await page.locator('input[data-testid="name-chat"]').count(), 0, 'no rename field left open');
}
const step = async (n) => ((await Z(`step-${n}`).locator('p').first().textContent()) || '').trim();
const convNamed = (name, ok = () => true) => [...fake.convs.values()].find((c) => c.name === name && ok(c));
// The message box's text, by the same rules as the extension's editorText.
const editorText = () => page.evaluate(() => {
  const el = document.querySelector('[data-testid="chat-input"] [contenteditable="true"]');
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
      if (c.nodeType === 3) cur = (cur || '') + c.nodeValue.replace(/ /g, ' ');
      else if (c.nodeType === 1) {
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
  })(el);
  close(false);
  return lines.join('\n');
});
// A form of the panel: its field filled (all its text replaced), then its button clicked, or
// Enter pressed in the field (the browser then clicks the button).
async function fill(fieldZb, value, okZb, { enter = false } = {}) {
  await Z(fieldZb).fill(value);
  if (enter) await Z(fieldZb).press('Enter');
  else await Z(okZb).click();
  await idle();
}
// The element of the panel that has the focus.
const focused = () => page.evaluate(() => {
  const a = document.getElementById('zettelbranch').shadowRoot.activeElement;
  return a ? a.getAttribute('data-zb') : null;
});
// The panel closed by itself after naming: the pill, its tooltip saying what was done.
async function assertClosed(done) {
  assert.equal(await visible('panel'), false, 'the panel closed by itself');
  assert.equal(await visible('pill'), true);
  assert.equal(await text('pill'), 'Zettelbranch');
  assert.equal(await Z('pill').getAttribute('title'), done);
}
async function remember() {
  seen.push(await panelText());
}
async function shot(name) {
  await page.mouse.move(5, 5);
  await page.waitForTimeout(150);
  await page.locator('#zettelbranch').screenshot({ path: path.join(SHOTS, name) });
}
// The same, in light and dark: `<name>-light.png`, `<name>-dark.png`. `css`: a part only.
async function shots(name, css) {
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    if (css) await page.locator(`#zettelbranch ${css}`).screenshot({ path: path.join(SHOTS, `${name}-${scheme}.png`), animations: 'allow' });
    else await shot(`${name}-${scheme}.png`);
  }
  await page.emulateMedia({ colorScheme: 'light' });
}

// ---------------------------------------------------------------- tests

test('the pill mounts on chat pages, not on shared ones; nothing happens before a click', async () => {
  await page.goto('https://claude.ai/share/00000000-0000-4000-8000-00000000abcd');
  await page.waitForTimeout(800);
  assert.equal(await page.locator('#zettelbranch').count(), 0);
  await goChat(fake.ids.root);
  const before = apiCount();
  await page.waitForTimeout(1500);
  assert.equal(apiCount(), before, 'no API call before a click');
  assert.equal(await visible('pill'), true);
  assert.equal(await visible('panel'), false);
  await openPanel();
  assert.equal(await visible('pill'), false);
  await click('hide');
  assert.equal(await visible('panel'), false);
  assert.equal(await visible('pill'), true);
  assert.equal(await text('pill'), 'Zettelbranch');
});

test('the panel lists the messages, Claude\'s last reply chosen', async () => {
  await openPanel();
  assert.equal(await text('chat-title'), 'zbtest/1 · Root topic');
  const rows = await Z('message').allTextContents();
  assert.deepEqual(rows, [
    '1YouWhat is a Zettelkasten? And how is a literal <zb-turn> tag e…',
    '2ClaudeA Zettelkasten is a box of cards with addresses and links be…',
    '3YouHow does branching work?',
    '4ClaudeBranching means continuing a card under a new address.',
  ]);
  assert.equal(await row(4).getAttribute('aria-pressed'), 'true');
  assert.match(await text('hint'), /^After Claude's reply 4/);
  assert.equal(await text('identity'), 'Tree root zbtest/1');
  assert.equal(await text('branch-head'), 'New branch from this chat');
  assert.match(await text('branch-section'), /^New branch from this chat ?Choose where the branch starts:/);
  await row(3).click();
  assert.equal(await row(4).getAttribute('aria-pressed'), 'false');
  assert.match(await text('hint'), /^Instead of your message 3/);
  await row(4).click();
  await remember();
  await shot('panel-light.png');
  await page.emulateMedia({ colorScheme: 'dark' });
  await shot('panel-dark.png');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 380, height: 700 });
  assert.equal(Math.round((await Z('panel').boundingBox()).width), 380 - 24, 'the panel fits a narrow window');
  await shot('panel-narrow.png');
  await page.setViewportSize({ width: 1280, height: 860 });
});

test('the tree in the panel, on a root: every chat of the tree by address, indented, the current one marked, links to the others', async () => {
  assert.equal(await text('tree-head'), 'Tree zbtest: 7 chats');
  const ns = await nodes();
  assert.deepEqual(ns.map((n) => n.address), ['1', '1a', '1a1', '1a1', '3', '4', '10']);
  assert.deepEqual(ns[0], { address: '1', topic: '· Root topic', tags: 'you are here', href: null, current: true, indent: '8px' });
  assert.deepEqual(ns[1], { address: '1a', topic: '· First branch', tags: '', href: `/chat/${fake.ids.branch}#zettelbranch`, current: false, indent: '22px' });
  const twice = ns.filter((n) => n.address === '1a1');
  assert.deepEqual(twice.map((n) => [n.topic, n.tags, n.indent]).sort(), [['· Grandchild', 'used twice', '36px'], ['· Same address by hand', 'used twice', '36px']]);
  assert.deepEqual(twice.map((n) => n.href).sort(), [`/chat/${fake.ids.dup}#zettelbranch`, `/chat/${fake.ids.grand}#zettelbranch`].sort());
  assert.equal(await node('10').then((n) => n.href), `/chat/${fake.ids.ten}#zettelbranch`);
  const shown = await text('tree');
  for (const other of ['zbmany', 'oulipo', 'Oulipo', 'Private', 'Long']) assert.ok(!shown.includes(other), `no title of another tree: ${other}`);
  // The refresh button reads the chat and the list (in pages of 100) again, nothing else.
  const before = apiCount();
  await click('refresh');
  assert.deepEqual(fake.apiLog.slice(before).map((e) => `${e.method} ${e.path.replace(/\?.*/, '').replace(/[0-9a-f-]{36}$/, '<id>')}`).sort(), [
    'GET /api/organizations/<org>/chat_conversations/<id>',
    'GET /api/organizations/<org>/chat_conversations_v2',
    'GET /api/organizations/<org>/chat_conversations_v2',
  ]);
  await row(4).click();
  await remember();
});

let previewText = '';
test('branch from Claude\'s reply: next address by segments (1a exists; 1a1 and 10 are not children of 1)', async () => {
  const before = apiCount();
  await click('branch');
  assert.equal(await text('preview-title'), 'Preview: the first message of zbtest/1b');
  previewText = await Z('preview').textContent();
  const lines = previewText.split('\n');
  assert.equal(lines[0], '> Zettelbranch · zbtest/1b');
  assert.equal(lines[1], '> Path: zbtest/1 › 1b');
  assert.equal(lines[2], '> Forked from: zbtest/1 · Root topic, after message 4 (Claude): "Branching means continuing a card under a new address."');
  assert.ok(previewText.includes('> `Me · zbtest/1, message 1`\n\nWhat is a Zettelkasten? And how is a literal <zb-turn> tag escaped?\n\n> `Claude · zbtest/1, message 2`'), 'labelled, not escaped');
  assert.ok(!previewText.includes('OLD VERSION'), 'the edited message\'s old version is left out');
  assert.ok(previewText.endsWith('> `MY QUESTION`\n\n'));
  assert.equal(await text('size'), `${previewText.length.toLocaleString('en-US')} characters, about ${Math.round(previewText.length / 4).toLocaleString('en-US')} tokens. 4 messages copied.`);
  assert.equal(await Z('warning').count(), 0);
  assert.deepEqual(fake.apiLog.slice(before).map((e) => `${e.method} ${e.path.replace(/\?.*/, '')}`), ['GET /api/organizations/<org>/chat_conversations_v2', 'GET /api/organizations/<org>/chat_conversations_v2']);
  await remember();
  await shot('preview-light.png');
  await page.emulateMedia({ colorScheme: 'dark' });
  await shot('preview-dark.png');
  await page.emulateMedia({ colorScheme: 'light' });
});

test('Open new chat: the box holds exactly the preview text; Send is not pressed; two steps say what comes next', async () => {
  const sendsBefore = requestLog.filter((r) => r.url.endsWith('/fake/send')).length;
  await click('open');
  assert.match(page.url(), /\/new$/);
  assert.equal(await text('opened'), 'The new chat holds the first message of zbtest/1b.');
  assert.equal(await step(1), 'Type your first question for this branch at the end of the box, under MY QUESTION, then press Send. Everything above it is the conversation so far, copied for Claude.');
  assert.equal(await step(2), 'When Claude has replied:');
  assert.equal(await Z('step-2').locator('[data-zb="name"]').textContent(), 'Name this branch');
  assert.equal(await Z('step-2').locator('[data-zb="name"]').isDisabled(), true, 'greyed until sent: nothing to name yet');
  assert.equal(await Z('warning').count(), 0, 'the box matches the preview');
  assert.equal(await Z('insert-method').count(), 0, 'one insertText call was enough');
  assert.equal(await editorText(), previewText);
  assert.equal(await page.locator('[data-testid="chat-input-send"]').isEnabled(), true, 'the app saw the text');
  // The panel keeps clear of the message box and its Send button, pressed next (Pascal's
  // shoot, 2026-10-14: the panel hid Send in a narrow window). At the bottom right, it covered them.
  const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  const panelBox = await Z('panel').boundingBox();
  const frame = await page.locator('[data-testid="chat-input"]').boundingBox();
  assert.ok(!overlaps(panelBox, { ...frame, height: frame.height + 40 }), 'the message box and the row of buttons under it are not covered');
  assert.ok(Math.abs(panelBox.x + panelBox.width - (1280 - 12)) <= 1, 'still on the right');
  const reads = apiCount();
  await page.waitForTimeout(1000);
  assert.equal(requestLog.filter((r) => r.url.endsWith('/fake/send')).length, sendsBefore, 'nothing sent');
  assert.equal(apiCount(), reads, 'our own move to the new chat is not followed: no read');
  assert.equal(await text('opened'), 'The new chat holds the first message of zbtest/1b.', 'the panel still shows the steps');
  assert.equal(await Z('panel').getAttribute('data-shows'), '/new');
  await remember();
  await shots('opened');
});

test('while the branch is not named, the hidden panel\'s pill says so; opened again in the new chat, the steps', async () => {
  const before = apiCount();
  await click('hide');
  assert.equal(await text('pill'), 'Zettelbranch: name this branch');
  assert.equal(await Z('pill').getAttribute('title'), 'zbtest/1b is not named yet. Click, then Name this branch.');
  await shots('pill-remind');
  await openPanel();
  assert.equal(await text('status'), 'You opened the branch zbtest/1b in a new chat.');
  assert.equal(await step(1), 'Type your first question for this branch at the end of the box, under MY QUESTION, then press Send. Everything above it is the conversation so far, copied for Claude.');
  assert.equal(apiCount(), before, 'no API call in the new chat');
  assert.equal(await editorText(), previewText, 'the box is untouched');
});

test('after Send, the panel follows to the new branch; Name this branch proposes Claude\'s branch title', async () => {
  await typeAtEnd('What about fish and birds?');
  await pressSend();
  const id = /\/chat\/([0-9a-f-]{36})/.exec(page.url())[1];
  assert.equal(fake.convs.get(id).name, 'Root topic', 'the fake names a branch after its parent, as claude.ai did');
  assert.match(fake.convs.get(id).messages[1].content[0].text, /\n\nBranch title: Fish and birds on one page$/);
  assert.equal(await Z('panel').getAttribute('data-shows'), `/chat/${id}`, 'the panel followed to the new chat');
  assert.equal(await text('identity'), 'Branch zbtest/1b (not named yet), from zbtest/1 after message 4');
  assert.equal(await Z('steps').count(), 0);
  await shots('after-send');
  await click('hide');
  assert.equal(await text('pill'), 'Zettelbranch: name this branch');
  await openPanel();
  assert.equal(await text('name-box'), 'Branch zbtest/1b (not named yet), from zbtest/1 after message 4Name this branch');
  assert.equal(await text('identity'), 'Branch zbtest/1b (not named yet), from zbtest/1 after message 4');
  assert.equal(await text('chat-title'), 'Root topic');
  assert.equal(await Z('rename').count(), 0);
  assert.deepEqual(await node('1b'), { address: '1b', topic: '(not named yet)', tags: 'you are here', href: null, current: true, indent: '22px' });
  assert.equal(await Z('tree-node').count(), 8, 'the named chats, and this one at its address');
  await remember();
  await shots('name-box');
  const before = apiCount();
  const putsBefore = puts().length;
  const menuBefore = fake.menuRenames.length;
  await click('name');
  assert.equal(await text('name-head'), 'Name this branch');
  assert.equal(await text('name-prefix'), 'zbtest/1b ·', 'the address, as fixed text');
  assert.equal(await Z('name-field').inputValue(), 'Fish and birds on one page', 'only the topic in the field');
  assert.equal(await text('name-from'), 'Proposed by Claude in its first reply.');
  assert.equal(await text('name-now'), 'Now: Root topic');
  assert.equal(await focused(), 'name-field', 'the field has the focus, its text selected');
  assert.deepEqual(await Z('name-field').evaluate((e) => [e.selectionStart, e.selectionEnd]), [0, 'Fish and birds on one page'.length]);
  assert.equal(puts().length, putsBefore, 'nothing renamed before Rename');
  assert.equal(fake.menuRenames.length, menuBefore, 'nothing renamed before Rename');
  await remember();
  await shots('name-form');
  await Z('name-field').press('Enter'); // Enter in the field: the browser clicks Rename
  await idle();
  assert.equal(listCalls(before), 0, 'the list is not read again after a rename');
  await assertClosed('You just created the branch zbtest/1b · Fish and birds on one page.');
  await assertMenuRename('zbtest/1b · Fish and birds on one page', putsBefore);
  assert.equal(await editorText(), '', 'nothing reached the message box');
  await shots('named-pill', '.pill');
  await openPanel();
  assert.deepEqual(await node('1b'), { address: '1b', topic: '· Fish and birds on one page', tags: 'you are here', href: null, current: true, indent: '22px' });
  assert.equal(await text('identity'), 'Branch zbtest/1b, from zbtest/1 after message 4', 'this is the branch just made');
  assert.equal(await text('chat-title'), 'zbtest/1b · Fish and birds on one page');
  assert.equal(await Z('name-box').count(), 0);
  assert.equal(await Z('rename').isVisible(), true, 'a named branch can be renamed');
  assert.equal(await row(2).textContent(), '2ClaudeHere is my answer to your message.', 'the list leaves out the branch title');
  await remember();
  await shots('named');
});

test('renamed through claude.ai\'s menu, the open tab shows the new name at once, without a reload', async () => {
  assert.equal(await page.title(), 'zbtest/1b · Fish and birds on one page - Claude');
  const events = fake.synthetic.map((e) => `${e.type} ${e.own || e.testid || e.role}${e.key ? ' ' + e.key : ''}`);
  assert.deepEqual(events.slice(-12), [
    'pointerdown chat-title-split', 'mousedown chat-title-split', 'pointerup chat-title-split', 'mouseup chat-title-split',
    'pointerdown rename-chat-trigger', 'mousedown rename-chat-trigger', 'pointerup rename-chat-trigger', 'mouseup rename-chat-trigger', 'click rename-chat-trigger',
    'keydown name-chat Enter', 'keypress name-chat Enter', 'keyup name-chat Enter',
  ], 'the title button pressed, Rename pressed and clicked, Enter in the field; nothing else');
});

test('branch from your own message: it is pre-filled; next address 1c; Name with an edited topic', async () => {
  await goChat(fake.ids.root);
  await openPanel();
  await row(3).click();
  await click('branch');
  assert.equal(await text('preview-title'), 'Preview: the first message of zbtest/1c');
  const p = await Z('preview').textContent();
  assert.equal(p.split('\n')[2], '> Forked from: zbtest/1 · Root topic, instead of message 3 (me): "How does branching work?"');
  assert.ok(p.includes('up to message 2.'));
  assert.ok(!p.includes('> `Me · zbtest/1, message 3`'));
  assert.ok(p.endsWith('> `MY QUESTION`\n\nHow does branching work?'));
  await click('open');
  assert.equal(await editorText(), p);
  assert.equal(await step(1), 'Your message is at the end of the box, under MY QUESTION: change it if you like, then press Send. Everything above it is the conversation so far, copied for Claude.');
  fake.options.branchTitle = 'Visual poems about cards and boxes'; // describes the parent, as on 2026-10-13
  fake.options.claudeTitles = false; // Claude did not end with a branch title: the question is next
  await pressSend();
  fake.options.branchTitle = null;
  fake.options.claudeTitles = true;
  assert.equal(convNamed('Visual poems about cards and boxes').messages.length, 2);
  const putsBefore = puts().length;
  await click('name');
  assert.equal(await text('name-prefix'), 'zbtest/1c ·');
  assert.equal(await Z('name-field').inputValue(), 'How does branching work');
  assert.equal(await text('name-from'), 'Proposed from your first question in this branch.');
  // Typed key by key, as Pascal would: claude.ai (and the fake) moves keys that reach its page
  // to its message box; the field keeps them (probe P12).
  await Z('name-field').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('My own topic');
  assert.equal(await Z('name-field').inputValue(), 'My own topic', 'every key stayed in the field');
  assert.equal(await editorText(), '', 'none reached claude.ai\'s message box');
  await page.keyboard.press('Enter');
  await idle();
  await assertMenuRename('zbtest/1c · My own topic', putsBefore);
  await assertClosed('You just created the branch zbtest/1c · My own topic.');
  await openPanel();
  await click('hide');
  assert.equal(await text('pill'), 'Zettelbranch', 'named: no more reminder');
  assert.equal(await Z('pill').getAttribute('title'), null);
});

test('branch from the first message: empty transcript, no summary asked; Cancel goes back', async () => {
  await goChat(fake.ids.root);
  await openPanel();
  await row(1).click();
  await click('branch');
  const p = await Z('preview').textContent();
  assert.equal(await text('preview-title'), 'Preview: the first message of zbtest/1d');
  assert.ok(!p.includes('OUR CONVERSATION SO FAR'));
  assert.ok(p.includes('started from its first message, so there is no earlier history'));
  assert.ok(!p.includes('in brief'));
  await click('cancel');
  assert.equal(await Z('message').count(), 4);
  assert.equal(await Z('preview').count(), 0);
});

test('branch of a branch made before 0.1.4 (tags): the transcript is flattened into the new layout, the summary dropped', async () => {
  await goChat(fake.ids.branch);
  await openPanel();
  assert.deepEqual((await Z('message').allTextContents()).slice(0, 2), ['1YouTell me about addresses.', '2ClaudeAddresses look like 1, 1a, 1a1.']);
  await click('branch');
  assert.equal(await text('preview-title'), 'Preview: the first message of zbtest/1a2');
  assert.match(await text('size'), /6 messages copied, from the whole tree path\.$/);
  const p = await Z('preview').textContent();
  assert.ok(!/<zb-(transcript|instructions)>|<zb-turn branch|&lt;zb-/.test(p), 'no tags and no escapes left');
  assert.equal((p.match(/OUR CONVERSATION SO FAR/g) || []).length, 1);
  assert.equal((p.match(/^> Zettelbranch · /gm) || []).length, 1);
  assert.ok(!p.includes('Parent zbtest/1 in brief: We defined'));
  assert.ok(p.includes('> `Me · zbtest/1, message 1`\n\nWhat is a Zettelkasten? And how is a literal <zb-turn> tag escaped?\n\n'));
  assert.ok(p.includes('> `Me · zbtest/1a, message 1`\n\nTell me about addresses.\n\n'));
  assert.ok(p.includes('> `Claude · zbtest/1a, message 2`\n\nAddresses look like 1, 1a, 1a1.\n\n'));
  assert.equal(p.split('\n')[1], '> Path: zbtest/1 › 1a › 1a2');
  await remember();
});

test('the tree on a branch; a link opens that chat in this tab, with a page load, the panel open there', async () => {
  await goChat(fake.ids.branch);
  await openPanel();
  const ns = await nodes();
  assert.deepEqual(ns.map((n) => n.address), ['1', '1a', '1a1', '1a1', '1b', '1c', '3', '4', '10']);
  assert.deepEqual(ns.filter((n) => n.current).map((n) => `${n.address} ${n.topic} ${n.indent}`), ['1a · First branch 22px']);
  assert.equal(await text('identity'), 'Branch zbtest/1a, from zbtest/1 after message 2');
  assert.equal(ns[0].href, `/chat/${fake.ids.root}#zettelbranch`);
  await shots('tree-branch');
  await Promise.all([page.waitForEvent('load'), page.locator(`#zettelbranch a[data-zb="tree-node"][href="/chat/${fake.ids.grand}#zettelbranch"]`).click()]);
  assert.equal(new URL(page.url()).pathname, `/chat/${fake.ids.grand}`);
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="transcript-row"]').length > 0);
  await idle();
  assert.equal(await visible('panel'), true, 'opened from the tree: the panel opens by itself there');
  assert.equal(await text('chat-title'), 'zbtest/1a1 · Grandchild');
  assert.equal(await text('identity'), 'Chat zbtest/1a1 of the tree zbtest', 'named by hand, without a header');
  const here = (await nodes()).filter((n) => n.current);
  assert.deepEqual(here.map((n) => `${n.address} ${n.topic} ${n.tags}`), ['1a1 · Grandchild used twice,you are here']);
  assert.equal((await node('1a1', 'Same address')).href, `/chat/${fake.ids.dup}#zettelbranch`);
});

test('speed: the chat and the list are read at the same time, the organization once per page load', async (t) => {
  fake.options.delay = 300;
  try {
    await goChat(fake.ids.root);
    const from = apiCount();
    const t0 = Date.now();
    await openPanel();
    const ms = Date.now() - t0;
    const log = fake.apiLog.slice(from);
    const kind = (e) => (e.path.includes('chat_conversations_v2') ? 'list' : e.path.includes('chat_conversations/') ? 'chat' : 'org');
    assert.deepEqual(log.map(kind).sort(), ['chat', 'list', 'list', 'org']);
    const chat = log.find((e) => kind(e) === 'chat');
    const list = log.find((e) => kind(e) === 'list');
    assert.ok(list.t0 < chat.t1 && chat.t0 < list.t1, `the reads overlap: chat ${chat.t0 - from}…, list…`);
    t.diagnostic(`panel open with every answer held 300 ms: ${ms} ms; chat ${chat.t1 - chat.t0} ms, list's first page ${list.t1 - list.t0} ms, started ${Math.abs(list.t0 - chat.t0)} ms apart`);
  } finally {
    fake.options.delay = 0;
  }
});

test('opened again on the same chat: what was read shows at once while the refresh button turns, then the new read', async () => {
  await click('hide');
  const added = fake.addChat('zbtest/6 · Made while the panel was hidden');
  fake.options.delay = 700;
  try {
    await Z('pill').click(); // no wait: the panel shows what it read before
    assert.equal(await Z('refresh').getAttribute('aria-busy'), 'true');
    assert.equal(await Z('message').count(), 4, 'the earlier read, at once');
    assert.equal(await node('6'), undefined, 'not in the earlier read');
    assert.equal(await Z('refresh').getAttribute('title'), 'Read this chat and its tree again');
    assert.equal(await Z('refresh').getAttribute('aria-label'), 'Read this chat and its tree again');
    assert.equal(await Z('refresh').locator('svg path').count(), 2);
    await shots('refresh-busy', '.top');
    await idle();
  } finally {
    fake.options.delay = 0;
  }
  assert.equal(await Z('refresh').getAttribute('aria-busy'), null);
  assert.equal((await node('6')).href, `/chat/${added}#zettelbranch`, 'the new read');
  await shots('refresh', '.top');
});

test('while open, the panel follows a move to another chat (reads only); hidden, it does not', async () => {
  // Open on zbtest/1. Moving with the sidebar (the app's own navigation, no page load):
  let before = apiCount();
  await page.locator('[data-testid="sidebar-recents"] a', { hasText: 'zbtest/10 · Sibling root' }).click();
  await page.waitForFunction(() => document.title.startsWith('zbtest/10 · '));
  await settle();
  assert.equal(await text('chat-title'), 'zbtest/10 · Sibling root');
  assert.equal(await text('identity'), 'Tree root zbtest/10');
  const read = fake.apiLog.slice(before).map((e) => `${e.method} ${e.path.includes('_v2') ? 'list' : 'chat'}`).sort();
  assert.deepEqual(read, ['GET chat', 'GET list', 'GET list'], 'the same reads as the refresh button, no write');
  // To a page that is not a chat: the panel shows that page's state.
  before = apiCount();
  await page.locator('[data-testid="sidebar"] a[href="/new"][data-row-main-button]').click();
  await page.waitForURL(/\/new$/);
  await settle();
  assert.equal(await Z('message').count(), 0);
  assert.equal(apiCount(), before, 'nothing to read on a new chat page');
  // Hidden: no following, no read.
  await click('hide');
  before = apiCount();
  await page.locator('[data-testid="sidebar-recents"] a', { hasText: 'zbtest/1 · Root topic' }).click();
  await page.waitForFunction(() => document.title.startsWith('zbtest/1 · '));
  await page.waitForTimeout(1000);
  assert.equal(apiCount(), before, 'hidden, the panel does not follow');
  assert.equal(await Z('panel').getAttribute('data-shows'), '/new');
  await openPanel();
  assert.equal(await text('chat-title'), 'zbtest/1 · Root topic');
  assert.equal(await text('identity'), 'Tree root zbtest/1');
});

test('a chat not in a tree: the tree name, then the new title, in the panel; cancelling changes nothing', async () => {
  await goChat(fake.ids.oulipo);
  const opened = apiCount();
  await openPanel();
  assert.equal(listCalls(opened), 2, 'the list is read with the chat, at the same time (2 pages of 100)');
  assert.equal(await Z('tree').count(), 0, 'outside a tree: no tree');
  assert.equal(await Z('identity').count(), 0, 'outside a tree: nothing says what it is');
  const putsBefore = puts().length;
  const menuBefore = fake.menuRenames.length;
  await click('branch');
  assert.equal(await Z('tree-field').inputValue(), 'oulipo', 'proposed from the title');
  assert.equal(await text('tree-hint'), 'Only a-z, 0-9 and -, such as oulipo or sky-notes: the name starts every title of the tree.');
  assert.equal(await focused(), 'tree-field');
  assert.equal(await Z('message').count(), 0, 'the form instead of the list');
  await remember();
  await shots('tree-form');
  await click('tree-form-cancel');
  assert.equal(await text('info'), 'Nothing changed.');
  assert.equal(await Z('message').count(), 2, 'the list again');
  await click('branch');
  await click('tree-form-ok');
  assert.equal(await text('root-old'), 'Now: Oulipo and constraints');
  assert.equal(await text('root-new'), 'oulipo/1 · Oulipo and constraints');
  assert.equal(await focused(), 'root-ok');
  await remember();
  await shots('root-form');
  await click('root-cancel');
  assert.equal(await text('info'), 'Nothing changed.');
  assert.equal(await Z('message').count(), 2);
  assert.equal(puts().length, putsBefore, 'no rename');
  assert.equal(fake.menuRenames.length, menuBefore, 'no rename');
});

test('a chat not in a tree: an invalid tree name is asked again; accepted, the chat becomes oulipo/1', async () => {
  const putsBefore = puts().length;
  await click('branch');
  await fill('tree-field', 'Oulipo Club', 'tree-form-ok');
  assert.equal(await text('form-error'), '"Oulipo Club" cannot be a tree name: use only a-z, 0-9 and -.');
  assert.equal(await Z('tree-field').inputValue(), 'Oulipo Club', 'what was typed stays, to correct');
  await fill('tree-field', 'oulipo', 'tree-form-ok', { enter: true });
  assert.equal(await text('root-new'), 'oulipo/1 · Oulipo and constraints');
  await click('root-ok');
  assert.equal(await text('notice'), 'This chat is now the tree root oulipo/1 · Oulipo and constraints.');
  await assertMenuRename('oulipo/1 · Oulipo and constraints', putsBefore);
  assert.equal(await text('preview-title'), 'Preview: the first message of oulipo/1a');
  assert.equal((await Z('preview').textContent()).split('\n')[2].slice(0, 65), '> Forked from: oulipo/1 · Oulipo and constraints, after message 2');
});

test('Name this branch: an empty topic is asked again, then cancelled; Claude\'s branch title in bold, with a period', async () => {
  fake.options.autoTitle = false;
  fake.options.titleStyle = 'bold';
  await click('open');
  assert.equal(await Z('notice').isVisible(), false, 'the reload notice is gone once the new chat opens');
  await typeAtEnd('What is a lipogram?');
  await pressSend();
  fake.options.titleStyle = 'plain';
  const putsBefore = puts().length;
  const menuBefore = fake.menuRenames.length;
  await click('name');
  assert.equal(await text('name-prefix'), 'oulipo/1a ·');
  assert.equal(await Z('name-field').inputValue(), 'Lipograms');
  assert.equal(await text('name-from'), 'Proposed by Claude in its first reply.');
  await fill('name-field', '   ', 'name-form-ok');
  assert.equal(await text('form-error'), 'Type a topic after the address.');
  assert.equal(await text('name-prefix'), 'oulipo/1a ·', 'the address stays');
  await shots('name-form-error');
  await click('name-form-cancel');
  assert.equal(await text('info'), 'Not renamed.');
  assert.equal(await Z('name-box').isVisible(), true, 'back to the chat');
  assert.equal(puts().length, putsBefore);
  assert.equal(fake.menuRenames.length, menuBefore);
  await click('name');
  fake.options.autoTitle = true;
  await click('name-form-ok');
  await assertMenuRename('oulipo/1a · Lipograms', putsBefore);
  await assertClosed('You just created the branch oulipo/1a · Lipograms.');
});

test('Pascal\'s case, after a reload: prompt sent as is, question in a second message; the top box names the branch from it', async () => {
  // zbtest/1a2 from the flattening test was never opened; make a branch and leave it unnamed.
  await goChat(fake.ids.ten);
  await openPanel();
  await click('branch');
  await click('open');
  await pressSend(); // sent as is: Claude replies with the summary only
  await typeAtEnd('Fish and birds?');
  await pressSend();
  await page.reload();
  await page.locator('#zettelbranch').waitFor({ state: 'attached' });
  assert.equal(await text('pill'), 'Zettelbranch', 'the reminder lives in memory only');
  await openPanel();
  assert.equal(await text('identity'), 'Branch zbtest/10a (not named yet), from zbtest/10 after message 2');
  assert.equal(await text('chat-title'), 'Sibling root', 'named after its parent');
  assert.deepEqual((await nodes()).slice(-2).map((n) => `${n.address} ${n.topic} ${n.indent}${n.current ? ' here' : ''}`), ['10 · Sibling root 8px', '10a (not named yet) 22px here']);
  const putsBefore = puts().length;
  await click('name');
  assert.equal(await Z('name-field').inputValue(), 'Fish and birds');
  assert.equal(await text('name-from'), 'Proposed from your first question in this branch.');
  await click('name-form-ok');
  await assertMenuRename('zbtest/10a · Fish and birds', putsBefore);
  await openPanel();
  assert.equal(await Z('name-box').count(), 0);
});

test('Rename this branch, once named: its current name proposed; unchanged, nothing is renamed and the panel says so', async () => {
  await goChat(convNamed('zbtest/1c · My own topic').uuid);
  await openPanel();
  assert.equal(await Z('name-box').count(), 0);
  assert.equal(await text('identity'), 'Branch zbtest/1c, from zbtest/1 instead of message 3');
  const putsBefore = puts().length;
  const menuBefore = fake.menuRenames.length;
  await click('rename');
  assert.equal(await text('name-head'), 'Rename this branch');
  assert.equal(await text('name-prefix'), 'zbtest/1c ·');
  assert.equal(await Z('name-field').inputValue(), 'My own topic');
  assert.equal(await Z('name-from').count(), 0, 'no source line: "Now:" shows the current name');
  await shots('rename-form');
  await click('name-form-ok');
  assert.equal(await text('info'), 'The name did not change: zbtest/1c · My own topic. Nothing was renamed.');
  assert.equal(await visible('panel'), true, 'nothing done: the panel stays');
  assert.equal(puts().length, putsBefore, 'no rename');
  assert.equal(fake.menuRenames.length, menuBefore, 'no rename');
  await remember();
  await shots('rename');
  assert.equal((await node('1c')).topic, '· My own topic');
  const before = apiCount();
  await click('rename');
  await fill('name-field', '  Branching,   revisited ', 'name-form-ok');
  assert.equal(listCalls(before), 0, 'the list is not read again after a rename');
  await assertClosed('Renamed to zbtest/1c · Branching, revisited.');
  await assertMenuRename('zbtest/1c · Branching, revisited', putsBefore);
  assert.deepEqual(await node('1c'), { address: '1c', topic: '· Branching, revisited', tags: 'you are here', href: null, current: true, indent: '22px' }, 'what the panel shows when opened again');
  assert.equal(await text('chat-title'), 'zbtest/1c · Branching, revisited');
  assert.equal(await Z('info').isVisible(), false);
});

test('the list cannot be read: one line instead of the tree, the rest works; Read again brings the tree back, fresh', async () => {
  fake.fail.list = 'status';
  try {
    await goChat(fake.ids.root);
    await openPanel();
    assert.equal(await text('tree-note'), 'The tree could not be read (error 500).');
    assert.match(await Z('tree-note').getAttribute('title'), /^claude\.ai answered 500; GET \/api\/organizations\/<org>\/chat_conversations_v2/);
    assert.equal(await Z('tree-node').count(), 0);
    assert.equal(await Z('error').isVisible(), false);
    assert.equal(await Z('message').count(), 4);
    assert.equal(await Z('branch').isVisible(), true);
    await remember();
    await shot('tree-error-light.png');
  } finally {
    fake.fail.list = null;
  }
  const added = fake.addChat('zbtest/5 · Made in another tab');
  await click('refresh');
  assert.equal(await Z('tree-note').count(), 0);
  assert.equal((await node('5')).href, `/chat/${added}#zettelbranch`);
});

test('a tree of 25 chats: in tree order, never string order; the section scrolls inside the panel', async () => {
  await goChat(fake.manyIds['1b1']);
  await openPanel();
  assert.equal(await text('tree-head'), 'Tree zbmany: 25 chats');
  const ns = await nodes();
  assert.deepEqual(ns.map((n) => n.address), ['1', '1a', '1a1', '1a2', '1a9', '1a10', '1b', '1b1', '1b1a', '1b1b', '1b9', '1b10', '1c', '1d', '1e', '1y', '1z', '1aa', '1ab', '2', '2a', '2a1', '9', '10', '10a']);
  assert.deepEqual(ns.filter((n) => n.current).map((n) => n.address), ['1b1']);
  assert.equal((await node('1b1a')).indent, `${8 + 3 * 14}px`);
  const box = await Z('tree-list').evaluate((e) => {
    const cur = e.querySelector('[aria-current="page"]').getBoundingClientRect();
    const r = e.getBoundingClientRect();
    return { scrolls: e.scrollHeight > e.clientHeight + 20, height: r.height, shown: cur.top >= r.top && cur.bottom <= r.bottom };
  });
  assert.ok(box.scrolls, 'the section scrolls');
  assert.ok(box.height <= 212, `at most about 210 px high: ${box.height}`);
  assert.ok(box.shown, 'the current line is scrolled into view');
  assert.ok((await Z('panel').boundingBox()).height <= 860 * 0.8 + 1, 'the panel fits the window');
  assert.equal(await Z('message').count(), 2);
  await shots('tree-many');
});

test('right after Send, before the message is stored and before Claude replies: the panel follows without losing the steps', async () => {
  await goChat(fake.ids.grand);
  await openPanel();
  await click('branch');
  await click('open');
  await typeAtEnd('Shall we name the cards?');
  fake.options.slowSend = { human: 1200, reply: 2600 };
  try {
    sends++;
    await page.locator('[data-testid="chat-input-send"]').click();
    await page.waitForURL(/\/chat\//);
    await settle();
    assert.equal(await text('status'), 'You opened the branch zbtest/1a1a in a new chat.', 'nothing stored yet: the steps stay');
    assert.equal(await step(1), 'Sent.', 'step 1 done');
    assert.equal(await Z('step-1').locator('.num').textContent(), '✓');
    assert.equal(await Z('step-2').locator('[data-zb="name"]').isDisabled(), false, 'sent: Name this branch can be clicked');
    await shots('steps-sent', '[data-zb="steps"]');
    await page.waitForTimeout(1300); // the message is stored; Claude is still replying
    await click('refresh');
    assert.equal(await text('name-box'), 'Branch zbtest/1a1a (not named yet), from zbtest/1a1 after message 2When Claude has replied:Name this branch');
    await shots('waiting-reply');
    await page.waitForTimeout(1500); // Claude has replied
  } finally {
    fake.options.slowSend = null;
  }
  const putsBefore = puts().length;
  await click('name');
  assert.equal(await Z('name-field').inputValue(), 'Naming the cards');
  assert.equal(await text('name-from'), 'Proposed by Claude in its first reply.');
  await click('name-form-ok');
  await assertMenuRename('zbtest/1a1a · Naming the cards', putsBefore);
  assert.equal(await editorText(), '', 'nothing reached the message box');
});

test('a branch of a branch whose first reply ends with a branch title: the title line is not copied', async () => {
  await goChat(convNamed('zbtest/1b · Fish and birds on one page').uuid);
  await openPanel();
  await click('branch');
  assert.equal(await text('preview-title'), 'Preview: the first message of zbtest/1b1');
  const p = await Z('preview').textContent();
  assert.equal(p.split('\n')[2], '> Forked from: zbtest/1b · Fish and birds on one page, after message 2 (Claude): "Here is my answer to your message."');
  assert.ok(p.includes('> `Me · zbtest/1b, message 1`\n\nWhat about fish and birds?\n\n> `Claude'));
  assert.ok(p.includes('> `Claude · zbtest/1b, message 2`\n\nHere is my answer to your message.\n\n> `INSTRUCTIONS FOR CLAUDE`'), 'without the summary and the branch title');
  assert.ok(!/^\**Branch title/m.test(p), 'no branch title line copied');
  await click('cancel');
});

test('over 100,000 characters: a warning in the preview', async () => {
  await goChat(fake.ids.big);
  await openPanel();
  await click('branch');
  const p = await Z('preview').textContent();
  assert.ok(p.length > 100000);
  assert.match(await text('warning'), /longer than 100,000 characters, the largest size tested/);
  await click('cancel');
});

test('pasted text is kept; thinking and tool calls left out; placeholders for files and artifacts', async () => {
  await goChat(fake.ids.mixed);
  await openPanel();
  await click('branch');
  const p = await Z('preview').textContent();
  assert.ok(p.includes('> `Me · zbtest/3, message 1`\n\nHere are my notes and a photo.\n\n[file: photo.png, not copied]\n\n[pasted text: notes.txt]\nPasted line one\nPasted line two\n\n> `Claude'));
  assert.ok(p.includes('> `Claude · zbtest/3, message 2`\n\nI read your notes.\n\n[artifact: Garden plan, not copied]\n\nHere is a plan, as an artifact.\n\n> `INSTRUCTIONS FOR CLAUDE`'));
  assert.ok(!p.includes('THINKING-SECRET-TEXT') && !p.includes('TOOL-SECRET-TEXT'));
  await remember();
});

test('API failure: the page is read instead, with a clear note; the address comes from the sidebar', async () => {
  fake.fail.conversation = 'shape';
  fake.fail.list = 'status';
  try {
    await goChat(fake.ids.branch);
    await openPanel();
    const err = await text('error');
    assert.match(err, /^claude\.ai changed, Zettelbranch needs an update\./);
    assert.match(err, /no chat_messages list/);
    assert.match(await text('note'), /Only the 4 messages on screen were read/);
    assert.equal(await Z('name-box').count(), 0);
    assert.equal(await text('tree-note'), 'The tree could not be read (error 500).');
    await remember();
    await click('branch');
    assert.equal(await text('preview-title'), 'Preview: the first message of zbtest/1a2');
    const notes = await Z('note').allTextContents();
    assert.ok(notes.some((n) => /comes from the sidebar's recent chats only/.test(n)));
    assert.match(await text('size'), /6 messages copied, from the whole tree path/);
    await remember();
    await shot('fallback-light.png');

    await goChat(fake.ids.long);
    await openPanel();
    assert.match(await text('note'), /Only the 30 messages on screen were read/);
    const ns = await Z('message').evaluateAll((els) => els.map((e) => e.getAttribute('data-n')));
    assert.equal(ns[0], '31');
    assert.equal(ns.at(-1), '60');

    fake.fail.conversation = 'status';
    await goChat(fake.ids.root);
    await openPanel();
    assert.match(await text('error'), /^claude\.ai's API answered with an error \(500\)\./);
    await remember();
  } finally {
    fake.fail.conversation = null;
    fake.fail.list = null;
  }
});

test('a panel left open on another chat reads again before branching', async () => {
  await goChat(fake.ids.root);
  await openPanel();
  await page.locator('[data-testid="sidebar-recents"] a', { hasText: 'zbtest/1a1 · Grandchild' }).click();
  await page.waitForFunction(() => document.title.startsWith('zbtest/1a1'));
  await click('branch');
  assert.match(await text('info'), /^This tab now shows another chat/);
  assert.equal(await text('chat-title'), 'zbtest/1a1 · Grandchild');
  assert.equal(await Z('preview').count(), 0);
});

test('Firefox (claude.ai\'s box joins the lines of one insertion): the box is emptied and filled line by line, exactly; the branch sent is named', async () => {
  fake.options.firefox = { flatten: true, emptyTop: true };
  try {
    await goChat(fake.ids.root);
    await openPanel();
    await click('branch');
    assert.equal(await text('preview-title'), 'Preview: the first message of zbtest/1d');
    const preview = await Z('preview').textContent();
    await click('open');
    assert.equal(await Z('insert-method').count(), 0, 'the box is right: no technical line');
    assert.match(await Z('opened').getAttribute('title'), /^Inserted line by line, in \d+\.\d s: one insertion had lost the line breaks\.$/, 'how, in the tooltip');
    assert.equal(await Z('warning').count(), 0, 'no warning: the box holds the preview (Firefox\'s empty top line aside)');
    assert.equal(await editorText(), '\n' + preview, 'exact, after the empty line Firefox adds at the top');
    await shots('opened-firefox');
    await typeAtEnd('What is the green flash?');
    await pressSend();
    const sent = [...fake.convs.values()].find((c) => c.messages.length && c.messages[0].content[0].text.includes('Zettelbranch · zbtest/1d')).messages[0].content[0].text;
    assert.ok(sent.startsWith('\n> Zettelbranch · zbtest/1d\n> Path: zbtest/1 › 1d\n> Forked from: '), 'sent with its line breaks');
    assert.equal(await text('identity'), 'Branch zbtest/1d (not named yet), from zbtest/1 after message 4');
    const putsBefore = puts().length;
    await click('name');
    assert.equal(await Z('name-field').inputValue(), 'The green flash');
    await click('name-form-ok');
    await assertMenuRename('zbtest/1d · The green flash', putsBefore);
  } finally {
    fake.options.firefox = null;
  }
});

test('Firefox: a prompt over 100,000 characters also goes in line by line, exactly', async (t) => {
  fake.options.firefox = { flatten: true, emptyTop: true };
  try {
    await goChat(fake.ids.big);
    await openPanel();
    await click('branch');
    const preview = await Z('preview').textContent();
    assert.ok(preview.length > 100000);
    const t0 = Date.now();
    await click('open');
    const ms = Date.now() - t0;
    const how = await Z('opened').getAttribute('title');
    assert.match(how, /^Inserted line by line, in \d+\.\d s/);
    assert.equal(await Z('warning').count(), 0);
    assert.equal(await editorText(), '\n' + preview);
    t.diagnostic(`${preview.length.toLocaleString('en-US')} characters, ${preview.split('\n').length} lines: Open new chat took ${ms} ms in all (${how})`);
  } finally {
    fake.options.firefox = null;
  }
});

test('a branch whose first message lost its line breaks (0.1.2 in Firefox) is still a branch, and can be named', async () => {
  await goChat(fake.ids.ten);
  await openPanel();
  await click('branch');
  assert.equal(await text('preview-title'), 'Preview: the first message of zbtest/10b');
  await click('cancel');
  // As 0.1.2 wrote it (tags), every line joined into one by claude.ai's box in Firefox.
  const flat = '\n' + [
    'Zettelbranch · zbtest/10b', 'Path: zbtest/10 › 10b', 'Forked from: zbtest/10 · Sibling root, after message 2 (Claude): "Root ten answer"', '',
    '<zb-transcript>', '<zb-turn branch="10" n="1" role="user">', 'Root ten question', '</zb-turn>', '<zb-turn branch="10" n="2" role="assistant">', 'Root ten answer', '</zb-turn>', '</zb-transcript>', '',
    '<zb-instructions>', 'The transcript above is our conversation so far. (…)', '</zb-instructions>', '', '',
  ].join(' ') + 'What about flattened lines?';
  const id = fake.addChat('Sibling root', flat, '> Parent zbtest/10 in brief: We talked about card boxes.\n\nAn answer.\n\nBranch title: Flattened lines');
  await goChat(id);
  await openPanel();
  assert.equal(await text('identity'), 'Branch zbtest/10b (not named yet), from zbtest/10 after message 2');
  assert.deepEqual((await Z('message').allTextContents()).slice(0, 1), ['1YouWhat about flattened lines?']);
  const putsBefore = puts().length;
  await click('name');
  assert.equal(await text('name-prefix'), 'zbtest/10b ·');
  assert.equal(await Z('name-field').inputValue(), 'Flattened lines');
  await click('name-form-ok');
  await assertMenuRename('zbtest/10b · Flattened lines', putsBefore);
});

test('the panel moves when you drag its title bar, stays inside the window, and opens again where it was; the pill stays at the bottom right', async () => {
  await goChat(fake.ids.root);
  await openPanel();
  assert.equal(await Z('bar').getAttribute('title'), 'Drag to move');
  const box = () => Z('panel').boundingBox();
  const b0 = await box();
  const dragFrom = async (x, y, dx, dy) => {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 3 });
    await page.mouse.move(x + dx, y + dy, { steps: 3 });
    await page.mouse.up();
  };
  await dragFrom(b0.x + 60, b0.y + 16, -500, -200); // on the bar's title, not a button
  const b1 = await box();
  assert.ok(Math.abs(b1.x - (b0.x - 500)) <= 1 && Math.abs(b1.y - (b0.y - 200)) <= 1, `moved with the pointer: ${JSON.stringify([b0, b1])}`);
  await page.mouse.move(5, 5);
  await page.screenshot({ path: path.join(SHOTS, 'dragged-page-light.png') });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: path.join(SHOTS, 'dragged-page-dark.png') });
  await page.emulateMedia({ colorScheme: 'light' });
  await dragFrom(b1.x + 60, b1.y + 16, -2000, -2000);
  const b2 = await box();
  assert.ok(b2.x >= 0 && b2.y >= 0 && b2.x <= 8 && b2.y <= 8, `kept inside, top left: ${JSON.stringify(b2)}`);
  await dragFrom(b2.x + 60, b2.y + 16, 3000, 3000);
  const b3 = await box();
  assert.ok(b3.x + b3.width <= 1280 && b3.y + b3.height <= 860 && b3.x + b3.width >= 1270, `kept inside, bottom right: ${JSON.stringify(b3)}`);
  await dragFrom(b3.x + 60, b3.y + 16, -400, -300);
  const b4 = await box();
  const hide = await Z('hide').boundingBox();
  await dragFrom(hide.x + 5, hide.y + 5, -200, -200); // a press on a button does not drag
  assert.deepEqual(await box(), b4, 'no drag from a button');
  await click('refresh');
  assert.deepEqual(await box(), b4, 'the refresh button still works, the panel stays');
  await click('hide');
  const pill = await Z('pill').boundingBox();
  assert.ok(Math.abs(pill.x + pill.width - (1280 - 12)) <= 1 && Math.abs(pill.y + pill.height - (860 - 12)) <= 1, `the pill at the bottom right: ${JSON.stringify(pill)}`);
  await openPanel();
  const b5 = await box();
  assert.ok(Math.abs(b5.x - b4.x) <= 1 && Math.abs(b5.y - b4.y) <= 1, 'opened again where it was dragged');
  await page.reload();
  await page.locator('#zettelbranch').waitFor({ state: 'attached' });
  await openPanel();
  const b6 = await box();
  assert.ok(Math.abs(b6.x + b6.width - (1280 - 12)) <= 1, 'after a reload, back at the bottom right (memory only)');
});

test('when claude.ai\'s menu fails at any step, the rename goes through the API, with the reload notice; nothing is left open or typed', async () => {
  const id = convNamed('zbtest/1c · Branching, revisited').uuid;
  const cases = [
    [{ title: false }, 'no title button'],
    [{ opens: false }, 'no menu opened'],
    [{ renameItem: false }, 'no Rename item in the menu'],
    [{ field: false }, 'no rename field appeared'],
    [{ readonly: true }, 'the name could not be typed in the field'],
    [{ sticks: false }, 'claude.ai did not keep the name typed in its menu'],
  ];
  try {
    for (const [i, [menu, why]] of cases.entries()) {
      fake.options.menu = menu;
      await goChat(id);
      await openPanel();
      const titleShown = async () => ((await page.locator('[data-fake="title-text"]').count()) ? page.locator('[data-fake="title-text"]').textContent() : null);
      const shownBefore = await titleShown();
      const name = `zbtest/1c · Fallback ${i + 1}`;
      await click('rename');
      await fill('name-field', `Fallback ${i + 1}`, 'name-form-ok');
      assert.equal(puts().at(-1).name, name, `${why}: renamed through the API`);
      assert.equal(await visible('panel'), true, `${why}: the panel stays open, for the reload notice`);
      assert.equal(await text('notice'), `Renamed to ${name}.Reload the page to see the new name.Reload nowRenamed through claude.ai's API: its title menu did not work (${why}).`);
      await assertNothingLeftOpen();
      if (menu.sticks !== false) assert.equal(await titleShown(), shownBefore, `${why}: no typed text left in place`);
      assert.equal(await editorText(), '', `${why}: nothing reached the message box`);
      if (i === 1) {
        await shots('fallback-notice');
        assert.ok(!(await page.locator('[data-testid="sidebar-recents"]').textContent()).includes(name), 'the open tab still shows the old name');
        await Promise.all([page.waitForEvent('load'), Z('reload').click()]);
        await page.waitForFunction((n) => document.title.startsWith(n), name);
        assert.ok((await page.locator('[data-testid="sidebar-recents"]').textContent()).includes(name), 'after Reload now, the sidebar shows it');
      }
    }
    // A new tree root, through the API: its notice, without Reload now (it would drop the preview).
    fake.options.menu = { opens: false };
    await goChat(fake.addChat('A plain chat to make a root'));
    await openPanel();
    await click('branch');
    await fill('tree-field', 'zbfall', 'tree-form-ok');
    await click('root-ok');
    assert.equal(puts().at(-1).name, 'zbfall/1 · A plain chat to make a root');
    assert.equal(await text('notice'), 'This chat is now the tree root zbfall/1 · A plain chat to make a root.Renamed through claude.ai\'s API: its title menu did not work (no menu opened).');
    assert.equal(await Z('reload').count(), 0);
    assert.equal(await text('preview-title'), 'Preview: the first message of zbfall/1a');
    await click('cancel');
  } finally {
    fake.options.menu = null;
  }
});

test('api.js refuses to rename a chat to anything but a Zettelbranch title', async () => {
  const cdp = await context.newCDPSession(page);
  const contexts = [];
  cdp.on('Runtime.executionContextCreated', (e) => contexts.push(e.context));
  await cdp.send('Runtime.enable');
  const ext = contexts.find((c) => c.auxData && c.auxData.type === 'isolated' && c.name === 'Zettelbranch');
  assert.ok(ext, 'the extension\'s own world');
  const before = apiCount();
  const r = await cdp.send('Runtime.evaluate', {
    contextId: ext.id,
    awaitPromise: true,
    returnByValue: true,
    expression: `Promise.all(['Private planning notes', 'zbtest/1', 'zbtest/1 · two\\nlines'].map((n) => ZBApi.renameConversation('${fake.ids.priv}', n).then(() => 'renamed', (e) => e.kind)))`,
  });
  assert.deepEqual(r.result.value, ['refused', 'refused', 'refused']);
  assert.equal(apiCount(), before, 'no request at all');
  await cdp.detach();
});

test('network: only the allowed API calls, renames only to tree titles, nothing escaped, no private text shown, no browser dialog', async () => {
  const allowed = [
    /^GET \/api\/organizations$/,
    /^GET \/api\/organizations\/<org>\/chat_conversations_v2\?limit=100&offset=\d+$/,
    /^GET \/api\/organizations\/<org>\/chat_conversations\/[0-9a-f-]{36}\?tree=True&rendering_mode=messages&render_all_tools=true$/,
    /^PUT \/api\/organizations\/<org>\/chat_conversations\/[0-9a-f-]{36}$/,
  ];
  assert.deepEqual(fake.apiLog.filter((e) => !allowed.some((re) => re.test(`${e.method} ${e.path}`))), []);
  assert.deepEqual(puts().map((e) => e.name), [
    'zbtest/1c · Fallback 1',
    'zbtest/1c · Fallback 2',
    'zbtest/1c · Fallback 3',
    'zbtest/1c · Fallback 4',
    'zbtest/1c · Fallback 5',
    'zbtest/1c · Fallback 6',
    'zbfall/1 · A plain chat to make a root',
  ], 'a PUT only when the menu failed');
  assert.deepEqual(fake.menuRenames.filter((r) => r.kept).map((r) => r.name), [
    'zbtest/1b · Fish and birds on one page',
    'zbtest/1c · My own topic',
    'oulipo/1 · Oulipo and constraints',
    'oulipo/1a · Lipograms',
    'zbtest/10a · Fish and birds',
    'zbtest/1c · Branching, revisited',
    'zbtest/1a1a · Naming the cards',
    'zbtest/1d · The green flash',
    'zbtest/10b · Flattened lines',
  ], 'every other rename through claude.ai\'s own menu');
  // Every synthetic event the page received: only to the title button, the menu (Escape), the
  // exact Rename item, the rename field (Enter, Escape), and the New chat link (a click).
  const allowedEvent = (e) =>
    (e.testid === 'chat-title-split' && e.haspopup === 'menu' && /^(pointer|mouse)(down|up)$/.test(e.type)) ||
    (e.own === 'rename-chat-trigger' && /^((pointer|mouse)(down|up)|click)$/.test(e.type)) ||
    (e.own === 'name-chat' && /^key(down|press|up)$/.test(e.type) && ['Enter', 'Escape'].includes(e.key)) ||
    (e.role === 'menu' && /^key(down|up)$/.test(e.type) && e.key === 'Escape') ||
    (e.type === 'click' && e.href === '/new');
  assert.deepEqual(fake.synthetic.filter((e) => !allowedEvent(e)), [], 'no event to any other element');
  for (const never of ['delete-chat-trigger', 'share-chat-trigger', 'star-chat-trigger', 'chat-input', 'chat-input-send']) {
    assert.ok(!fake.synthetic.some((e) => e.own === never || e.testid === never), `nothing ever reached ${never}`);
  }
  assert.ok(fake.synthetic.some((e) => e.role === 'menu' && e.key === 'Escape') && fake.synthetic.some((e) => e.own === 'name-chat' && e.key === 'Escape'), 'the fallbacks closed what they opened');
  assert.equal(requestLog.filter((r) => r.url.endsWith('/fake/send')).length, sends, 'every message was sent by the test, none by the extension');
  const passive = (u) => u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('about:') || u.startsWith('chrome-extension:');
  assert.deepEqual(allRequests.filter((x) => !handled.has(x) && !passive(x.url())).map((x) => x.url()), [], 'no request escaped');
  assert.deepEqual(dialogs, [], 'no browser dialog, ever (0.2.0)');
  const shown = JSON.stringify(seen);
  assert.deepEqual(SECRETS.filter((s) => shown.includes(s)), [], 'no private text in what the panel showed');
});
