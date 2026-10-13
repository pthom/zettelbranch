// End-to-end tests of the extension against a fake claude.ai (fake/), in headless Chromium
// with a throwaway profile under tests/out/. Every request is answered from memory or
// aborted, DNS resolves nothing, and the run fails if any request escapes. Browser dialogs
// are answered by the test, from a queue of planned answers.
//
// From a chat's last message, Claude's reply, a branch is claude.ai's own copy (the fake's
// fork); from anywhere else, a copy in the first message. The tests of the copy pick an
// earlier message; the tests of claude.ai's copy come after them.
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
const dialogs = []; // every dialog shown, with the answer given
const answers = []; // planned answers, in order: { value } for a prompt, {} to accept, { dismiss: true }
const seen = []; // panel texts and dialogs on test chats: none may hold private text
const navigations = []; // every address the tab showed (request URLs carry no #fragment)
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
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame()) navigations.push(f.url());
  });
  page.on('dialog', async (d) => {
    const plan = answers.shift();
    dialogs.push({ type: d.type(), message: d.message(), defaultValue: d.defaultValue(), plan: plan || 'none: dismissed' });
    if (!plan || plan.dismiss) return d.dismiss();
    return d.type() === 'prompt' ? d.accept(plan.value === undefined ? d.defaultValue() : plan.value) : d.accept();
  });
});

after(async () => {
  if (context) await context.close();
  writeJson(path.join(OUT_DIR, 'e2e-report.json'), { apiLog: fake.apiLog, dialogs, requests: requestLog.length, aborted: requestLog.filter((r) => r.action.startsWith('aborted')) });
});

// ---------------------------------------------------------------- helpers

const Z = (zb) => page.locator(`#zettelbranch [data-zb="${zb}"]`);
const row = (n) => page.locator(`#zettelbranch [data-zb="message"][data-n="${n}"]`);
// Waits until the panel's current action is over.
const idle = () => page.waitForFunction(() => {
  const h = document.getElementById('zettelbranch');
  const w = h && h.shadowRoot && h.shadowRoot.querySelector('.wrap');
  return !!w && !w.classList.contains('busy');
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
const posts = () => fake.apiLog.filter((e) => e.method === 'POST');
const FORK_PATH = '/claudeai-rpc/anthropic.bard.api.v1alpha.ConversationService/PerformAction';

async function goChat(id) {
  await page.goto(`https://claude.ai/chat/${id}`);
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="transcript-row"]').length > 0);
  await page.locator('#zettelbranch').waitFor({ state: 'attached' });
}
async function openPanel() {
  await click('pill');
  assert.equal(await visible('panel'), true);
}
// Pascal pressing Send: the fake app's own button. `rows`: the messages shown after it.
async function pressSend(rows = 2) {
  sends++;
  const wasNew = !/\/chat\//.test(page.url());
  await page.locator('[data-testid="chat-input-send"]').click();
  if (wasNew) await page.waitForURL(/\/chat\//);
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="transcript-row"]').length >= n, rows);
}
// Pascal typing at the end of the message box.
async function typeInBox(t) {
  await page.locator('[data-testid="chat-input"] [contenteditable="true"]').press('End');
  await page.keyboard.type(t);
}
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
function plan(...a) {
  answers.push(...a);
}
function allAnswered() {
  assert.equal(answers.length, 0, 'every planned dialog was shown');
  answers.length = 0;
}
async function remember() {
  seen.push(await panelText());
}
async function shot(name) {
  await page.mouse.move(5, 5);
  await page.waitForTimeout(150);
  await page.locator('#zettelbranch').screenshot({ path: path.join(SHOTS, name) });
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

let previewText = '';
test('branch from an earlier reply of Claude\'s: a copy; next address by segments (1a exists; 1a1 and 10 are not children of 1)', async () => {
  const before = apiCount();
  await row(2).click();
  await click('branch');
  assert.equal(await text('preview-title'), 'Preview: the first message of zbtest/1b');
  previewText = await Z('preview').textContent();
  const lines = previewText.split('\n');
  assert.equal(lines[0], 'Zettelbranch · zbtest/1b');
  assert.equal(lines[1], 'Path: zbtest/1 › 1b');
  assert.equal(lines[2], 'Forked from: zbtest/1 · Root topic, after message 2 (Claude): "A Zettelkasten is a box of cards with addresses and links…"');
  assert.ok(previewText.includes('literal &lt;zb-turn> tag'), 'escaped');
  assert.ok(!previewText.includes('OLD VERSION'), 'the edited message\'s old version is left out');
  assert.ok(previewText.includes('up to message 2.'));
  assert.ok(previewText.endsWith('</zb-instructions>\n\n'));
  assert.equal(await text('size'), `${previewText.length.toLocaleString('en-US')} characters, about ${Math.round(previewText.length / 4).toLocaleString('en-US')} tokens. 2 messages copied.`);
  assert.equal(await Z('warning').count(), 0);
  assert.deepEqual(fake.apiLog.slice(before).map((e) => `${e.method} ${e.path.replace(/\?.*/, '')}`), ['GET /api/organizations/<org>/chat_conversations_v2', 'GET /api/organizations/<org>/chat_conversations_v2'], 'no fork');
  await remember();
  await shot('preview-light.png');
  await page.emulateMedia({ colorScheme: 'dark' });
  await shot('preview-dark.png');
  await page.emulateMedia({ colorScheme: 'light' });
});

test('Open new chat: the box holds exactly the preview text; Send is not pressed', async () => {
  const sendsBefore = requestLog.filter((r) => r.url.endsWith('/fake/send')).length;
  await click('open');
  assert.match(page.url(), /\/new$/);
  assert.match(await text('opened'), /holds the first message of zbtest\/1b\. Read it, change it if you like, then press Send\./);
  assert.equal(await Z('warning').count(), 0, 'the box matches the preview');
  assert.equal(await editorText(), previewText);
  assert.equal(await page.locator('[data-testid="chat-input-send"]').isEnabled(), true, 'the app saw the text');
  await page.waitForTimeout(500);
  assert.equal(requestLog.filter((r) => r.url.endsWith('/fake/send')).length, sendsBefore, 'nothing sent');
  assert.equal(posts().length, 0, 'no fork');
  await shot('opened-light.png');
});

test('Name this branch after Claude\'s reply: the automatic title proposed, accepted, then the reload notice', async () => {
  await pressSend();
  plan({});
  await click('name');
  allAnswered();
  const d = dialogs[dialogs.length - 1];
  assert.equal(d.type, 'prompt');
  assert.equal(d.defaultValue, 'zbtest/1b · Auto title of a branch');
  assert.match(d.message, /You can change the topic; the address part stays/);
  assert.equal(puts().at(-1).name, 'zbtest/1b · Auto title of a branch');
  assert.equal(await text('notice'), 'Named zbtest/1b · Auto title of a branch. Your phone shows it now. Here, the title at the top shows it after a reload; the sidebar can take a few minutes more.Reload now');
  assert.equal(await text('chat-title'), 'zbtest/1b · Auto title of a branch');
  assert.equal(await Z('name-box').count(), 0);
  assert.equal(await row(2).textContent(), '2ClaudeParent zbtest/1 in brief: We talked about card boxes and the…');
  await remember();
  await shot('notice-light.png');
});

test('Reload now reloads the page; the sidebar then shows the new name', async () => {
  const sidebarBefore = await page.locator('[data-testid="sidebar-recents"]').textContent();
  assert.ok(!sidebarBefore.includes('zbtest/1b · Auto title'), 'the open tab still shows the old name');
  await Promise.all([page.waitForEvent('load'), Z('reload').click()]);
  await page.waitForFunction(() => document.title.startsWith('zbtest/1b · Auto title of a branch'));
  assert.ok((await page.locator('[data-testid="sidebar-recents"]').textContent()).includes('zbtest/1b · Auto title of a branch'));
  assert.equal(await visible('panel'), false);
});

test('branch from your own message: it is pre-filled; next address 1c; Name with an edited topic', async () => {
  await goChat(fake.ids.root);
  await openPanel();
  await row(3).click();
  await click('branch');
  assert.equal(await text('preview-title'), 'Preview: the first message of zbtest/1c');
  const p = await Z('preview').textContent();
  assert.equal(p.split('\n')[2], 'Forked from: zbtest/1 · Root topic, instead of message 3 (me): "How does branching work?"');
  assert.ok(p.includes('up to message 2.'));
  assert.ok(!p.includes('<zb-turn branch="1" n="3"'));
  assert.ok(p.endsWith('</zb-instructions>\n\nHow does branching work?'));
  await click('open');
  assert.equal(await editorText(), p);
  await pressSend();
  plan({ value: 'zbtest/1c · My own topic' });
  await click('name');
  allAnswered();
  assert.equal(puts().at(-1).name, 'zbtest/1c · My own topic');
  assert.match(await text('notice'), /^Named zbtest\/1c · My own topic\./);
});

test('branch from the first message: empty transcript, no summary asked; Cancel goes back', async () => {
  await goChat(fake.ids.root);
  await openPanel();
  await row(1).click();
  await click('branch');
  const p = await Z('preview').textContent();
  assert.equal(await text('preview-title'), 'Preview: the first message of zbtest/1d');
  assert.ok(p.includes('<zb-transcript>\n</zb-transcript>'));
  assert.ok(p.includes('started from its first message, so there is no earlier history'));
  assert.ok(!p.includes('in brief'));
  await click('cancel');
  assert.equal(await Z('message').count(), 4);
  assert.equal(await Z('preview').count(), 0);
});

test('branch of a branch: the transcript is flattened, the summary dropped', async () => {
  await goChat(fake.ids.branch);
  await openPanel();
  assert.deepEqual((await Z('message').allTextContents()).slice(0, 2), ['1YouTell me about addresses.', '2ClaudeAddresses look like 1, 1a, 1a1.']);
  await row(2).click();
  await click('branch');
  assert.equal(await text('preview-title'), 'Preview: the first message of zbtest/1a2');
  assert.match(await text('size'), /4 messages copied, from the whole tree path\.$/);
  const p = await Z('preview').textContent();
  assert.equal((p.match(/<zb-transcript>/g) || []).length, 1);
  assert.equal((p.match(/^Zettelbranch · /gm) || []).length, 1);
  assert.ok(!p.includes('Parent zbtest/1 in brief: We defined'));
  assert.ok(p.includes('<zb-turn branch="1" n="1" role="user">\nWhat is a Zettelkasten? And how is a literal &lt;zb-turn> tag escaped?'));
  assert.ok(p.includes('<zb-turn branch="1a" n="1" role="user">\nTell me about addresses.'));
  assert.ok(p.includes('<zb-turn branch="1a" n="2" role="assistant">\nAddresses look like 1, 1a, 1a1.\n</zb-turn>\n</zb-transcript>'));
  assert.equal(p.split('\n')[1], 'Path: zbtest/1 › 1a › 1a2');
  assert.equal(p.split('\n')[2], 'Forked from: zbtest/1a · First branch, after message 2 (Claude): "Addresses look like 1, 1a, 1a1."');
  await remember();
});

test('a chat not in a tree: tree name and confirm dialogs; cancelling changes nothing', async () => {
  await goChat(fake.ids.oulipo);
  await openPanel();
  const putsBefore = puts().length;
  plan({ dismiss: true });
  await click('branch');
  allAnswered();
  assert.equal(dialogs.at(-1).defaultValue, 'oulipo');
  assert.equal(await text('info'), 'Nothing changed.');
  plan({}, { dismiss: true });
  await click('branch');
  allAnswered();
  assert.equal(dialogs.at(-1).type, 'confirm');
  assert.equal(await text('info'), 'Nothing changed.');
  assert.equal(puts().length, putsBefore, 'no rename');
});

test('a chat not in a tree: an invalid tree name is asked again; accepted, the chat becomes oulipo/1, then claude.ai\'s copy is proposed', async () => {
  plan({ value: 'Oulipo Club' }, { value: 'oulipo' }, {});
  await click('branch');
  allAnswered();
  const [again, confirm] = dialogs.slice(-2);
  assert.match(again.message, /"Oulipo Club" cannot be a tree name/);
  assert.equal(confirm.message, 'Zettelbranch: rename this chat?\n\nOld title: Oulipo and constraints\nNew title: oulipo/1 · Oulipo and constraints');
  assert.equal(puts().at(-1).name, 'oulipo/1 · Oulipo and constraints');
  assert.equal(await text('notice'), 'Named oulipo/1 · Oulipo and constraints. Your phone shows it now. Here, the title at the top shows it after a reload; the sidebar can take a few minutes more.Reload now');
  // From the last reply: claude.ai's own copy, named at once with the parent's topic.
  assert.equal(await text('preview-title'), 'claude.ai will copy this conversation into a new chat, named oulipo/1a · Oulipo and constraints. Your first message there:');
  const p = await Z('preview').textContent();
  assert.equal(p.split('\n')[2], 'Forked from: oulipo/1 · Oulipo and constraints, after message 2 (Claude): "A group of writers who use constraints, such as the…"');
  assert.ok(!p.includes('<zb-transcript>'));
  assert.equal(posts().length, 0, 'nothing forked before Open new chat');
});

test('Name this branch: a wrong edit is asked again, then cancelled; with no title yet, the reply\'s first words', async () => {
  fake.options.autoTitle = false;
  await click('cancel');
  await row(1).click();
  await click('branch');
  assert.equal(await text('preview-title'), 'Preview: the first message of oulipo/1a');
  await click('open');
  assert.equal(await Z('notice').isVisible(), false, 'the reload notice is gone once the new chat opens');
  await typeInBox(' What is a lipogram?');
  await pressSend();
  const putsBefore = puts().length;
  plan({ value: 'Wrong prefix' }, { value: 'oulipo/1a ·   ' }, { dismiss: true });
  await click('name');
  allAnswered();
  const ds = dialogs.slice(-3);
  assert.equal(ds[0].defaultValue, 'oulipo/1a · Here is my answer to your message');
  assert.match(ds[1].message, /must start with "oulipo\/1a · " followed by a topic/);
  assert.equal(await text('info'), 'Not renamed.');
  assert.equal(puts().length, putsBefore);
  plan({});
  await click('name');
  allAnswered();
  assert.equal(puts().at(-1).name, 'oulipo/1a · Here is my answer to your message');
  fake.options.autoTitle = true;
});

test('a branch opened later shows Name this branch in the panel', async () => {
  // zbtest/1a2 from the flattening test was never opened; make a branch and leave it unnamed.
  await goChat(fake.ids.ten);
  await openPanel();
  await row(1).click();
  await click('branch');
  await click('open');
  await pressSend();
  await page.reload();
  await page.locator('#zettelbranch').waitFor({ state: 'attached' });
  await openPanel();
  assert.match(await text('name-box'), /^This chat is the branch zbtest\/10a, not named yet\./);
  plan({});
  await click('name');
  allAnswered();
  assert.equal(puts().at(-1).name, 'zbtest/10a · Auto title of a branch');
  await click('refresh');
  assert.equal(await Z('name-box').count(), 0);
});

test('over 100,000 characters: a warning in the preview', async () => {
  await goChat(fake.ids.big);
  await openPanel();
  await row(2).click();
  await click('branch');
  const p = await Z('preview').textContent();
  assert.ok(p.length > 100000);
  assert.match(await text('warning'), /longer than 100,000 characters, the largest size tested/);
  await click('cancel');
});

test('pasted text is kept; thinking and tool calls left out; placeholders for files and artifacts', async () => {
  await goChat(fake.ids.mixed);
  await openPanel();
  await row(2).click();
  await click('branch');
  const p = await Z('preview').textContent();
  assert.ok(p.includes('<zb-turn branch="3" n="1" role="user">\nHere are my notes and a photo.\n\n[file: photo.png, not copied]\n\n[pasted text: notes.txt]\nPasted line one\nPasted line two\n</zb-turn>'));
  assert.ok(p.includes('<zb-turn branch="3" n="2" role="assistant">\nI read your notes.\n\n[artifact: Garden plan, not copied]\n\nHere is a plan, as an artifact.\n</zb-turn>'));
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

// ---------------------------------------------------------------- claude.ai's own copy (step 6b)

const SUMMARY_REQUEST = (parent) => `Start your first reply with a single blockquote paragraph that begins with "Parent ${parent} in brief:" and says in 2 to 4 sentences where the conversation stood at that point, in the language of the conversation. Then answer my message below. If there is no message below, reply with the summary only.`;
// The start message of a branch claude.ai copied, as specified in the plan (step 6b).
const startText = (address, path, forkedFrom, parent, n) => [
  `Zettelbranch · zbtest/${address}`,
  `Path: zbtest/${path}`,
  `Forked from: ${forkedFrom}`,
  '',
  '<zb-instructions>',
  `The messages above were copied from the conversation ${parent} through message ${n} to start this branch. Do not comment on the header lines above; they are for my own records.`,
  '',
  SUMMARY_REQUEST(parent),
  '</zb-instructions>',
  '',
  '',
].join('\n');
const START_1D = startText('1d', '1 › 1d', 'zbtest/1 · Root topic, after message 4 (Claude): "Branching means continuing a card under a new address."', 'zbtest/1', 4);
const turnsIn = (prompt) => [...prompt.matchAll(/<zb-turn branch="([^"]*)" n="(\d+)" role="(\w+)">\n([^\n]*)/g)].map((m) => `${m[1]}#${m[2]} ${m[3]}: ${m[4]}`);
let native = null; // the chat claude.ai copied for zbtest/1d

test('claude.ai\'s copy, from the last reply: the preview shows the name and the first message, without a transcript', async () => {
  await goChat(fake.ids.root);
  await openPanel();
  assert.equal(await row(4).getAttribute('aria-pressed'), 'true');
  const before = apiCount();
  await click('branch');
  assert.equal(await text('preview-title'), 'claude.ai will copy this conversation into a new chat, named zbtest/1d · Root topic. Your first message there:');
  assert.equal(await Z('preview').textContent(), START_1D);
  assert.equal(await Z('size').count(), 0);
  assert.deepEqual(fake.apiLog.slice(before).map((e) => e.method), ['GET', 'GET'], 'the list only: nothing forked yet');
  await remember();
  await shot('native-preview-light.png');
  await page.emulateMedia({ colorScheme: 'dark' });
  await shot('native-preview-dark.png');
  await page.emulateMedia({ colorScheme: 'light' });
});

test('Open new chat: claude.ai copies the chat, Zettelbranch waits for the copy, names it and loads its page; the panel opens by itself', async () => {
  const before = apiCount();
  const source = fake.convs.get(fake.ids.root);
  const t0 = Date.now();
  await Promise.all([page.waitForURL(/\/chat\/[0-9a-f-]{36}#zettelbranch$/, { timeout: 20000 }), Z('open').click()]);
  const ms = Date.now() - t0;
  const id = /\/chat\/([0-9a-f-]{36})#/.exec(page.url())[1];
  assert.notEqual(id, fake.ids.root);
  await Z('start-box').waitFor({ state: 'visible', timeout: 10000 });
  native = { id, ms };
  const log = fake.apiLog.slice(before);
  // The fork: one POST, only continueBranchAsNewChat, through the last message; the headers.
  const post = log[0];
  assert.equal(`${post.method} ${post.path} ${post.status}`, `POST ${FORK_PATH} 200`);
  assert.deepEqual(Object.keys(post.body).sort(), ['continueBranchAsNewChat', 'header']);
  assert.deepEqual(post.body.continueBranchAsNewChat, { sourceConversationId: fake.ids.root, throughMessageId: source.leaf });
  assert.equal(post.body.header.conversationId, id);
  assert.deepEqual(post.headers, { 'content-type': 'application/json', 'connect-protocol-version': '1', 'x-organization-uuid': '<org>', 'anthropic-client-platform': 'web_claude_ai' });
  // Then reads of the copy every second until it is complete (the fake shows half of it for
  // 1.5 s), the rename, its read-back, the page load, and the read that opens the panel.
  const steps = log.slice(1).map((e) => `${e.method} ${e.path.replace(/\?.*/, '').replace(id, '<new>')}`);
  const reads = steps.filter((x) => x === 'GET /api/organizations/<org>/chat_conversations/<new>').length;
  assert.ok(reads >= 4, `the copy was read ${reads} times`);
  assert.equal(steps[0], 'GET /api/organizations/<org>/chat_conversations/<new>');
  assert.ok(steps.includes('PUT /api/organizations/<org>/chat_conversations/<new>'));
  assert.ok(steps.every((x) => x.endsWith('<new>') || x === 'GET /api/organizations' || x === 'GET /api/organizations/<org>/chat_conversations_v2'), steps.join('\n'));
  assert.equal(puts().at(-1).name, 'zbtest/1d · Root topic');
  // The copy: the shown path, the same text and roles, new ids, then the new name.
  const copy = fake.convs.get(id);
  assert.equal(copy.name, 'zbtest/1d · Root topic');
  assert.deepEqual(fake.pathOf(copy).map((m) => `${m.sender}: ${m.pageText}`), fake.pathOf(source).map((m) => `${m.sender}: ${m.pageText}`));
  assert.ok(fake.pathOf(copy).every((m) => !source.messages.some((x) => x.uuid === m.uuid)), 'new message ids');
  // The panel, opened by itself on that page load.
  assert.equal(await visible('panel'), true);
  assert.equal(await visible('pill'), false);
  assert.equal(await text('chat-title'), 'zbtest/1d · Root topic');
  assert.equal(await text('start-box'), 'This chat is the branch zbtest/1d: claude.ai copied zbtest/1 into it, through message 4. Start the branch to put its first message in the box, then add yours.Start the branch' + 'claude.ai\'s copy uses the default model; pick another in the message box\'s model menu if you like.');
  assert.equal(await text('model-note'), 'claude.ai\'s copy uses the default model; pick another in the message box\'s model menu if you like.');
  assert.equal(await Z('message').count(), 4);
  assert.equal(await Z('name').count(), 1, 'Name this branch is there for the topic');
  await remember();
  await shot('start-panel-light.png');
  await page.emulateMedia({ colorScheme: 'dark' });
  await shot('start-panel-dark.png');
  await page.emulateMedia({ colorScheme: 'light' });
});

test('without the #zettelbranch marker, nothing opens by itself; the pill shows Start the branch too', async () => {
  const before = apiCount();
  await goChat(native.id);
  await page.waitForTimeout(1500);
  assert.equal(apiCount(), before, 'no API call before a click');
  assert.equal(await visible('panel'), false);
  await openPanel();
  assert.equal(await visible('start-box'), true);
});

test('Start the branch: the box holds exactly the start message; Send is not pressed; Claude\'s summary comes first', async () => {
  const sendsBefore = requestLog.filter((r) => r.url.endsWith('/fake/send')).length;
  await click('start');
  assert.equal(await editorText(), START_1D);
  assert.equal(await text('started'), 'The message box holds the first message of zbtest/1d. Add your message at the end, then press Send.');
  assert.equal(await Z('warning').count(), 0);
  assert.equal(await visible('model-note'), true);
  await page.waitForTimeout(500);
  assert.equal(requestLog.filter((r) => r.url.endsWith('/fake/send')).length, sendsBefore, 'nothing sent');
  await shot('started-light.png');
  await typeInBox('Tell me more.');
  assert.equal(await editorText(), START_1D + 'Tell me more.');
  await pressSend(6);
  const msgs = fake.pathOf(fake.convs.get(native.id));
  assert.equal(msgs[4].pageText, START_1D + 'Tell me more.');
  assert.match(msgs[5].pageText, /^> Parent zbtest\/1 in brief: /);
});

test('after the start: the list shows your own text and the reply without its summary; Name this branch edits the topic', async () => {
  await click('refresh');
  assert.equal(await Z('start-box').count(), 0);
  assert.deepEqual((await Z('message').allTextContents()).slice(4), ['5YouTell me more.', '6ClaudeHere is my answer to your message.']);
  plan({ value: 'zbtest/1d · Native topic' });
  await click('name');
  allAnswered();
  assert.equal(dialogs.at(-1).defaultValue, 'zbtest/1d · Root topic', 'the current name proposed');
  assert.equal(puts().at(-1).name, 'zbtest/1d · Native topic');
  assert.match(await text('notice'), /^Named zbtest\/1d · Native topic\./);
  // The same name again: no rename.
  const putsBefore = puts().length;
  plan({});
  await click('name');
  allAnswered();
  assert.equal(await text('info'), 'Not renamed: the name did not change.');
  assert.equal(puts().length, putsBefore);
  // A page load with the marker (as after a reload): the branch is started, so the panel
  // stays closed.
  await page.goto(`https://claude.ai/chat/${native.id}#zettelbranch`); // same document: no load
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="transcript-row"]').length >= 6);
  await page.locator('#zettelbranch').waitFor({ state: 'attached' });
  await page.waitForTimeout(1500);
  assert.equal(await visible('panel'), false);
});

test('a copy from a branch claude.ai copied, at a mid point: flattened, its parent\'s messages attributed to the parent; no fork', async () => {
  await typeInBox('And then?');
  await pressSend(8);
  await openPanel();
  const before = posts().length;
  await row(6).click();
  await click('branch');
  assert.equal(await text('preview-title'), 'Preview: the first message of zbtest/1d1');
  const p = await Z('preview').textContent();
  assert.deepEqual(turnsIn(p), [
    '1#1 user: What is a Zettelkasten? And how is a literal &lt;zb-turn> tag escaped?',
    '1#2 assistant: A Zettelkasten is a box of cards with addresses and links between them.',
    '1#3 user: How does branching work?',
    '1#4 assistant: Branching means continuing a card under a new address.',
    '1d#5 user: Tell me more.',
    '1d#6 assistant: Here is my answer to your message.',
  ]);
  assert.equal(p.split('\n')[2], 'Forked from: zbtest/1d · Native topic, after message 6 (Claude): "Here is my answer to your message."');
  assert.match(await text('size'), /6 messages copied, from the whole tree path\.$/);
  assert.equal((p.match(/^Zettelbranch · /gm) || []).length, 1);
  assert.ok(!p.includes('in brief: We talked'));
  assert.equal(posts().length, before, 'no fork from a mid point');
  await click('cancel');
});

test('claude.ai\'s copy of a branch it copied, then a copy from that: one flat list', async () => {
  // zbtest/1d now ends with Claude's reply 8: claude.ai's copy again, for zbtest/1d1.
  await row(8).click();
  await click('branch');
  assert.equal(await text('preview-title'), 'claude.ai will copy this conversation into a new chat, named zbtest/1d1 · Native topic. Your first message there:');
  const start = await Z('preview').textContent();
  assert.equal(start, startText('1d1', '1 › 1d › 1d1', 'zbtest/1d · Native topic, after message 8 (Claude): "ok"', 'zbtest/1d', 8));
  await Promise.all([page.waitForURL(/\/chat\/[0-9a-f-]{36}#zettelbranch$/, { timeout: 20000 }), Z('open').click()]);
  await Z('start-box').waitFor({ state: 'visible', timeout: 10000 });
  const id = /\/chat\/([0-9a-f-]{36})#/.exec(page.url())[1];
  assert.equal(fake.convs.get(id).name, 'zbtest/1d1 · Native topic');
  assert.match(await text('start-box'), /^This chat is the branch zbtest\/1d1: claude\.ai copied zbtest\/1d into it, through message 8\./);
  await click('start');
  assert.equal(await editorText(), start, 'rebuilt from claude.ai alone, the same as the preview');
  await typeInBox('Go deeper.');
  await pressSend(10);
  await typeInBox('Last question?');
  await pressSend(12);
  await click('refresh');
  assert.deepEqual((await Z('message').allTextContents()).slice(4, 10), ['5YouTell me more.', '6ClaudeHere is my answer to your message.', '7YouAnd then?', '8Claudeok', '9YouGo deeper.', '10ClaudeHere is my answer to your message.']);
  await row(10).click();
  await click('branch');
  assert.equal(await text('preview-title'), 'Preview: the first message of zbtest/1d1a');
  const p = await Z('preview').textContent();
  assert.deepEqual(turnsIn(p), [
    '1#1 user: What is a Zettelkasten? And how is a literal &lt;zb-turn> tag escaped?',
    '1#2 assistant: A Zettelkasten is a box of cards with addresses and links between them.',
    '1#3 user: How does branching work?',
    '1#4 assistant: Branching means continuing a card under a new address.',
    '1d#5 user: Tell me more.',
    '1d#6 assistant: Here is my answer to your message.',
    '1d#7 user: And then?',
    '1d#8 assistant: ok',
    '1d1#9 user: Go deeper.',
    '1d1#10 assistant: Here is my answer to your message.',
  ]);
  assert.equal(p.split('\n')[1], 'Path: zbtest/1 › 1d › 1d1 › 1d1a');
  assert.equal((p.match(/^Zettelbranch · /gm) || []).length, 1, 'no nested header');
  assert.equal((p.match(/<zb-instructions>/g) || []).length, 1, 'no nested instructions');
  assert.ok(!/in brief: We talked/.test(p), 'every summary dropped');
  await remember();
  await click('cancel');
});

// claude.ai's copy fails: the quoted transcript at once, with a note saying why.
async function forkFails(chatId, expectNotes) {
  await goChat(chatId);
  await openPanel();
  await click('branch');
  assert.match(await text('preview-title'), /^claude\.ai will copy this conversation/);
  const putsBefore = puts().length;
  await click('open');
  assert.match(page.url(), /\/new$/);
  const notes = await Z('fallback').allTextContents();
  assert.deepEqual(notes, expectNotes);
  assert.match(await text('opened'), /^The new chat holds the first message of /);
  const box = await editorText();
  assert.ok(box.startsWith('Zettelbranch · ') && box.includes('<zb-transcript>') && box.endsWith('</zb-instructions>\n\n'), 'the copy\'s prompt');
  assert.equal(puts().length, putsBefore, 'no rename');
  await remember();
  return box;
}

test('claude.ai\'s copy fails with an error (500): the quoted transcript at once, with a note', async () => {
  fake.fork.fail = 'status';
  try {
    const box = await forkFails(fake.ids.ten, ['claude.ai\'s own copy failed: HTTP 500 internal; this branch uses a quoted transcript instead.']);
    assert.equal(box.split('\n')[0], 'Zettelbranch · zbtest/10b');
    assert.deepEqual(turnsIn(box), ['10#1 user: Root ten question', '10#2 assistant: Root ten answer']);
    assert.equal(posts().at(-1).status, 500);
    await shot('fallback-note-light.png');
  } finally {
    fake.fork.fail = null;
  }
});

test('claude.ai\'s copy never fills: after 15 seconds, the quoted transcript, with a note', async () => {
  fake.fork.fail = 'never';
  try {
    const t0 = Date.now();
    await forkFails(fake.ids.ten, [
      'claude.ai\'s own copy failed: the copy was not complete after 15 seconds; this branch uses a quoted transcript instead.',
      'claude.ai may still finish its copy: if a second chat named zbtest/10 · Sibling root appears in your list, delete it.',
    ]);
    const s = (Date.now() - t0) / 1000;
    assert.ok(s >= 15 && s < 25, `gave up after ${s} s`);
    const id = posts().at(-1).body.header.conversationId;
    const reads = fake.apiLog.filter((e) => e.method === 'GET' && e.path.includes(id)).length;
    assert.ok(reads >= 13 && reads <= 16, `read ${reads} times, about once a second`);
  } finally {
    fake.fork.fail = null;
  }
});

test('claude.ai refuses a copy through an earlier message (a message came in after the preview): the quoted transcript', async () => {
  await goChat(fake.ids.grand);
  await openPanel();
  await click('branch');
  assert.match(await text('preview-title'), /named zbtest\/1a1a · Grandchild\./);
  // A message arrives after the panel read the chat: Claude's reply 2 is no longer the last.
  fake.add(fake.convs.get(fake.ids.grand), 'human', 'A late message');
  await click('open');
  assert.equal(posts().at(-1).status, 400);
  assert.deepEqual(await Z('fallback').allTextContents(), ['claude.ai\'s own copy failed: HTTP 400 failed_precondition; this branch uses a quoted transcript instead.']);
  assert.equal((await editorText()).split('\n')[0], 'Zettelbranch · zbtest/1a1a');
  await remember();
});

test('api.js refuses to rename a chat to anything but a Zettelbranch title, to fork by anything but ids, to load any other page', async () => {
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
    expression: `Promise.all([
      ...['Private planning notes', 'zbtest/1', 'zbtest/1 · two\\nlines'].map((n) => ZBApi.renameConversation('${fake.ids.priv}', n).then(() => 'renamed', (e) => e.kind)),
      ZBApi.forkConversation('${fake.ids.priv}', 'not-an-id').then(() => 'forked', (e) => e.kind),
      ZBApi.forkConversation('/api/x', '${fake.convs.get(fake.ids.priv).leaf}').then(() => 'forked', (e) => e.kind),
      Promise.resolve().then(() => ZBApi.openCreatedChat('${fake.ids.priv}')).then(() => 'opened', (e) => e.kind),
    ])`,
  });
  assert.deepEqual(r.result.value, ['refused', 'refused', 'refused', 'refused', 'refused', 'refused']);
  assert.equal(apiCount(), before, 'no request at all');
  await cdp.detach();
});

test('network: only the allowed API calls, renames only to tree titles, nothing escaped, no private text shown', async () => {
  const allowed = [
    /^GET \/api\/organizations$/,
    /^GET \/api\/organizations\/<org>\/chat_conversations_v2\?limit=100&offset=\d+$/,
    /^GET \/api\/organizations\/<org>\/chat_conversations\/[0-9a-f-]{36}\?tree=True&rendering_mode=messages&render_all_tools=true$/,
    /^PUT \/api\/organizations\/<org>\/chat_conversations\/[0-9a-f-]{36}$/,
    /^POST \/claudeai-rpc\/anthropic\.bard\.api\.v1alpha\.ConversationService\/PerformAction$/,
  ];
  assert.deepEqual(fake.apiLog.filter((e) => !allowed.some((re) => re.test(`${e.method} ${e.path}`))), []);
  assert.deepEqual(puts().map((e) => e.name), [
    'zbtest/1b · Auto title of a branch',
    'zbtest/1c · My own topic',
    'oulipo/1 · Oulipo and constraints',
    'oulipo/1a · Here is my answer to your message',
    'zbtest/10a · Auto title of a branch',
    'zbtest/1d · Root topic',
    'zbtest/1d · Native topic',
    'zbtest/1d1 · Native topic',
  ]);
  // Every POST is claude.ai's copy, with nothing else in its body.
  assert.equal(posts().length, 5);
  for (const e of posts()) {
    assert.equal(e.path, FORK_PATH);
    assert.deepEqual(Object.keys(e.body).sort(), ['continueBranchAsNewChat', 'header']);
    assert.deepEqual(Object.keys(e.body.continueBranchAsNewChat).sort(), ['sourceConversationId', 'throughMessageId']);
    assert.deepEqual(Object.keys(e.body.header).sort(), ['conversationId', 'mutationId']);
  }
  // Page loads of a chat by the extension: only the chats claude.ai just copied.
  const created = new Set(posts().filter((e) => e.status === 200).map((e) => e.body.header.conversationId));
  const marked = navigations.filter((u) => u.includes('#')).map((u) => /^https:\/\/claude\.ai\/chat\/([0-9a-f-]{36})#zettelbranch$/.exec(u));
  assert.ok(marked.length >= 2, `${marked.length} pages with the marker`);
  assert.ok(marked.every((m) => m && created.has(m[1])), 'every page with a #fragment is a chat claude.ai just copied, with #zettelbranch');
  assert.equal(requestLog.filter((r) => r.url.endsWith('/fake/send')).length, sends, 'every message was sent by the test, none by the extension');
  const passive = (u) => u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('about:') || u.startsWith('chrome-extension:');
  assert.deepEqual(allRequests.filter((x) => !handled.has(x) && !passive(x.url())).map((x) => x.url()), [], 'no request escaped');
  const shown = JSON.stringify([seen, dialogs]);
  assert.deepEqual(SECRETS.filter((s) => shown.includes(s)), [], 'no private text in what the panel and dialogs showed');
});
