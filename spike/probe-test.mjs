// Offline test of the probe panel (P1-P8) against a fake claude.ai (fixtures/chat-app and
// fixtures/fake-claude.mjs). Headless Chromium with the spike extension, on the dedicated
// profile; every request is answered from memory or aborted, DNS resolves nothing, and the
// run fails if any request escapes. Clipboard writes are denied on purpose (headless
// Chrome might share the macOS clipboard), so "Copy results" is tested through its
// fallback, which shows the JSON in the panel.
//
//   node probe-test.mjs [--out out/probe-test]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createFakeClaude, SECRETS } from './fixtures/fake-claude.mjs';
import { args, EXT_DIR, OUT_DIR, PROFILE_DIR, writeJson } from './lib.mjs';

const opt = args({ out: path.join(OUT_DIR, 'probe-test'), profile: PROFILE_DIR });
const fake = createFakeClaude();
const checks = [];
const check = (name, pass, detail) => {
  checks.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${!pass && detail !== undefined ? '  ' + JSON.stringify(detail).slice(0, 300) : ''}`);
};
const noSecrets = (v) => {
  const s = JSON.stringify(v);
  return SECRETS.filter((x) => s.includes(x));
};

const context = await chromium.launchPersistentContext(opt.profile, {
  channel: 'chromium',
  headless: true, // never a window
  args: [`--disable-extensions-except=${EXT_DIR}`, `--load-extension=${EXT_DIR}`, '--host-resolver-rules=MAP * ~NOTFOUND'],
  viewport: { width: 1400, height: 900 },
  serviceWorkers: 'block',
});

const handled = new Set();
const allRequests = [];
const requestLog = [];
const dialogs = [];
let dialogPolicy = 'dismiss';
let page;
let exitCode = 0;

try {
  await context.route('**/*', async (route) => {
    handled.add(route.request());
    const action = await fake.handle(route);
    requestLog.push({ method: route.request().method(), url: route.request().url().slice(0, 200), action });
  });
  await context.routeWebSocket(/.*/, (ws) => ws.close());
  context.on('request', (r) => allRequests.push(r));
  page = context.pages()[0] || (await context.newPage());
  page.on('dialog', async (d) => {
    dialogs.push({ type: d.type(), message: d.message(), answer: dialogPolicy });
    if (dialogPolicy === 'accept') await d.accept();
    else await d.dismiss();
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Browser.setPermission', { permission: { name: 'clipboard-write' }, setting: 'denied', origin: 'https://claude.ai' });
  await cdp.send('Browser.setPermission', { permission: { name: 'clipboard-sanitized-write' }, setting: 'denied', origin: 'https://claude.ai' }).catch(() => {});

  const host = '#zb-spike-host';
  const status = page.locator(`${host} .status`);
  let resultCount = 0;

  async function openPanel() {
    await page.locator(`${host} button[data-zb="open"]`).click();
    resultCount = 0;
  }
  async function probe(id, label, { dialog = 'dismiss', timeout = 30000 } = {}) {
    dialogPolicy = dialog;
    await page.locator(`${host} button[data-zb="${id}-${label}"]`).click();
    resultCount++;
    const want = `${resultCount} result`;
    const t0 = Date.now();
    while (!((await status.textContent()) || '').startsWith(want)) {
      if (Date.now() - t0 > timeout) throw new Error(`no result for ${id} ${label}`);
      await page.waitForTimeout(100);
    }
    const text = await page.locator(`${host} pre[data-zb-result="${id}"]`).textContent();
    let out;
    try {
      out = JSON.parse(text);
    } catch {
      return { unparsed: text.slice(0, 500) };
    }
    // The panel shows a built prompt in its own box, not in the result.
    if (out && out.preview === '(shown below)') out.preview = await page.locator(`${host} pre[data-zb="p8-preview"]`).textContent();
    return out;
  }
  const mode = async (v) => page.locator(`${host} input[name="zb-mode"][value="${v}"]`).check();
  // Pascal pressing Send (the fake app's button).
  const pageSend = async () => {
    const wasNew = !/\/chat\//.test(page.url());
    await page.locator('[data-testid="chat-input-send"]').click();
    if (wasNew) await page.waitForURL(/\/chat\//, { timeout: 10000 });
    await page.waitForTimeout(800);
  };
  const sidebar = (text) => page.locator('[data-testid="sidebar-recents"] a', { hasText: text }).first().click();
  const newChat = async () => {
    await page.locator('[data-testid="sidebar"] a[href="/new"][data-row-main-button]').click();
    await page.waitForURL(/\/new$/);
    await page.waitForTimeout(300);
  };
  const editorHas = async (s) => ((await page.locator('[data-testid="chat-input"] .ProseMirror').textContent()) || '').includes(s);

  // ------------------------------------------------ A. a private chat: guards and read-only probes
  await page.goto(`https://claude.ai/chat/${fake.ids.priv}`);
  await page.locator(host).waitFor({ state: 'attached', timeout: 10000 });
  check('panel mounts on a chat page', true);
  await openPanel();

  let r = await probe('p1', 'Insert test text');
  check('P1 refuses on a private chat', r.refused === true && !(await editorHas('zbtest/p1')), r);
  r = await probe('p4', 'Rename now');
  check('P4 refuses on a private chat', r.refused === true, r);
  r = await probe('p8', 'Build prompt');
  check('P8 refuses on a private chat', r.refused === true, r);
  const urlBefore = page.url();
  r = await probe('p3', 'Open new chat');
  check('P3 refuses on a private chat (no navigation)', r.refused === true && page.url() === urlBefore, r);
  r = await probe('p2', 'Check after sending');
  check('P2 check refuses on a private chat', r.refused === true, r);
  r = await probe('p9', "Fork through Claude's last reply");
  check('P9 refuses on a private chat', r.refused === true, r);
  check('refusals hold no private text or title', noSecrets(checks.slice(-5).map((c) => c.detail)).length === 0);

  r = await probe('p5', 'List conversations');
  check('P5 lists everything through paging (124 chats, 2 list requests)', r.total === 124 && r.requests === 2, { total: r.total, requests: r.requests });
  check('P5 shows only zbtest titles', JSON.stringify(r.zbtestTitles) === JSON.stringify(['zbtest/1 · Root topic', 'zbtest/10 · Sibling root', 'zbtest/1a · First branch', 'zbtest/1a1 · Grandchild']), r.zbtestTitles);
  check('P5 picks the organization with chat', r.organization && r.organization.withChat === 1 && r.organization.organizations === 2, r.organization);
  check('P5 result holds no private title', noSecrets(r).length === 0, noSecrets(r));
  check('P5 counts sidebar entries', r.sidebar && r.sidebar.chatEntries === 30 && r.sidebar.selector === '[data-testid="sidebar-recents"] a[href*="/chat/"]', r.sidebar);
  check('P5 shows the summaries of zbtest chats only', r.zbtestSummaries.length === 4 && r.zbtestSummaries.every((x) => x.start === `Test summary of ${x.title}.`) && r.mix.withSummary === 124, r.zbtestSummaries);
  check('P5 counts the kinds of conversations', r.mix && r.mix.platform && Object.values(r.mix.platform).reduce((a, b) => a + b, 0) === 124, r.mix);

  r = await probe('p6', 'Compare page and API');
  check('P6 on a short chat: every message on the page', r.everyPathMessageOnPage === true && r.api.pathMessages === 4 && r.page.messages === 4, r.api);
  check('P6 result holds no private text', noSecrets(r).length === 0, noSecrets(r));
  r = await probe('p7', 'Run extractor');
  check('P7 extracts with the P0 selectors', r.messages === 4 && r.selectors.user === '[data-testid="user-message"]' && r.selectors.assistant === '.font-claude-response', r.selectors);
  check('P7 matches the API path', r.againstApi && r.againstApi.matched === 4 && r.againstApi.similarity.mean === 1, r.againstApi);
  check('P7 reports which lookups matched', r.lookups && r.lookups.composer && r.lookups.send && r.lookups.newChat, r.lookups);
  check('P7 result holds no private text or title', noSecrets(r).length === 0, noSecrets(r));
  r = await probe('p7', 'Copy diagnostics');
  check('P7 copy diagnostics: clipboard denied, reported', r.ok === false && r.copied === 'copy failed', r);

  // ------------------------------------------------ B. the long chat: page versus API
  await sidebar('Long private chat');
  await page.waitForTimeout(800);
  r = await probe('p6', 'Compare page and API');
  check('P6 on a long chat: 60 in the API, 30 on the page', r.api.pathMessages === 60 && r.page.messages === 30 && r.everyPathMessageOnPage === false && r.comparison.missing.length === 30, { api: r.api, page: r.page, missing: r.comparison && r.comparison.missing.length });
  const att = r.messagesWithAttachmentsOrFiles && r.messagesWithAttachmentsOrFiles[0];
  check('P6 finds the attachment: text in the API, not on the page', att && att.n === 5 && att.attachments[0].textInApi === true && att.attachments[0].textInPage === false && att.files[0].kind === 'image', att);
  check('P6 result holds no attachment text', noSecrets(r).length === 0, noSecrets(r));

  // ------------------------------------------------ C. P1 in a new chat, then P4
  await newChat();
  r = await probe('p1', 'Insert test text');
  check('P1 inserts in a new empty chat', r.ok === true && r.guard === 'new empty chat' && r.editor.equalsInserted === true, r.editor);
  check('P1 sees Send enabled and no attachment', r.send.after.enabled === true && r.send.before.enabled === false && r.attachmentChipLikely === false, r.send);
  await pageSend();
  r = await probe('p1', 'Check last sent message');
  check('P1 check: the sent message is exactly the inserted text', r.ok === true && r.exact === true && r.source === 'api', r);
  check('P1 check offers zbtest/p1, cancelled: nothing renamed', r.testTree && r.testTree.cancelled === true && dialogs[dialogs.length - 1].message.includes('New title: zbtest/p1 · Auto: '), r.testTree);
  r = await probe('p4', 'Rename now', { dialog: 'accept' });
  const p4Title = r.newTitle;
  check('P4 renames a chat born in this tab, after a confirm', r.renamed === true && r.ok === true && /^zbtest\/11 · Auto: /.test(r.newTitle) && r.readBack === r.newTitle, r);
  check('P4 confirm dialog shows old and new titles', dialogs.length && dialogs[dialogs.length - 1].message.includes('Old title: Auto: ') && dialogs[dialogs.length - 1].message.includes('New title: zbtest/11 · '), dialogs[dialogs.length - 1]);
  r = await probe('p4', 'Rename now');
  check('P4 does nothing when the title is already in the tree', r.renamed === false && /already/.test(r.reason), r);
  await page.reload();
  await page.locator(host).waitFor({ state: 'attached' });
  await openPanel();
  await page.waitForTimeout(600);
  r = await probe('p4', 'Read title');
  check('P4 read title after reload: API, document title and sidebar agree', r.api === p4Title && r.documentTitle.startsWith(p4Title) && r.sidebar === p4Title && r.guard.includes('zbtest/'), r);

  // ------------------------------------------------ D. P1 paste fallback
  await newChat();
  r = await probe('p1', 'Try paste instead');
  check('P1 paste: the app handles the paste event', r.ok === true && r.insertion.appHandledIt === true && r.editor.containsInserted === true, r.insertion);

  // ------------------------------------------------ E, F. P2
  await sidebar('Long private chat');
  await page.waitForTimeout(800);
  r = await probe('p2', '5k');
  check('P2 opens its own new chat from a private chat', r.ok === true && r.newChat && r.newChat.opened === true && r.newChat.nowOn === 'new', r.newChat);
  check('P2 5k stays inline', r.verdict === 'stayed inline' && r.insertedChars <= 5000 && r.insertedChars > 4800, { verdict: r.verdict, chars: r.insertedChars });
  await pageSend();
  r = await probe('p2', 'Check after sending', { dialog: 'accept' });
  check('P2 check: full text sent, reply has line 3', r.sentMessage.textChars === r.expected.chars && r.sentMessage.lastLineNumberInText === r.expected.lines && r.reply.hasLine3 === true, r);
  check('P2 check renames the chat to zbtest/p2-5k after a confirm', r.testTree && r.testTree.renamed === true && /^zbtest\/p2-5k · Auto: /.test(r.testTree.newTitle) && r.testTree.readBack === r.testTree.newTitle, r.testTree);
  await newChat();
  r = await probe('p2', 'Header + transcript (20k)');
  check('P2 parts: header, transcript and instruction all in the box', r.ok && r.partsStillInTheBox.header && r.partsStillInTheBox.transcript && r.partsStillInTheBox.instruction && r.steps.length === 3, r.partsStillInTheBox);
  await newChat();
  r = await probe('p2', '100k', { timeout: 120000 });
  check('P2 100k: inserted (time measured)', r.ok === true && r.insertedChars > 99000, { verdict: r.verdict, ms: r.insertion && r.insertion.ms });

  // ------------------------------------------------ G. P3
  await sidebar('zbtest/1 · Root topic');
  await page.waitForTimeout(800);
  r = await probe('p3', 'Open new chat');
  check('P3 opens a new chat without reload and inserts', r.ok === true && r.urlChanged && r.variableSurvived && r.sameDocument && r.markerInBox === true && r.newChatLinkSelector.includes('data-row-main-button'), r);

  // ------------------------------------------------ H. P8 from zbtest/1
  await sidebar('zbtest/1 · Root topic');
  await page.waitForTimeout(800);
  r = await probe('p8', 'Build prompt');
  const pv = r.preview || '';
  const lines = pv.split('\n');
  check('P8 next address by segments (1a exists; 1a1 and 10 are not children of 1)', r.newAddress === 'zbtest/1b' && JSON.stringify(r.existingChildren) === '["1a"]', { newAddress: r.newAddress, existing: r.existingChildren });
  check('P8 header lines', lines[0] === 'Zettelbranch · zbtest/1b' && lines[1] === 'Path: zbtest/1 › 1b' && lines[2].startsWith('Forked from: zbtest/1 · Root topic, after message 4 (Claude): "Branching means'), lines.slice(0, 3));
  check('P8 transcript: 4 turns along the shown path, edit sibling left out', r.turns === 4 && r.forkAt === 4 && !pv.includes('OLD VERSION') && pv.includes('<zb-turn branch="1" n="3" role="user">\nHow does branching work?'), { turns: r.turns });
  check('P8 escapes <zb- in message text', pv.includes('literal &lt;zb-turn> tag') && !pv.includes('literal <zb-turn>'));
  check('P8 instructions name parent and message', pv.includes('copied from the conversation zbtest/1 up to message 4') && pv.includes('"Parent zbtest/1 in brief:"') && pv.endsWith('</zb-instructions>\n\n'));
  await mode('own');
  r = await probe('p8', 'Build prompt');
  check('P8 from my own message: context before it, my message pre-filled', r.forkAt === 3 && r.turns === 2 && r.preview.endsWith('</zb-instructions>\n\nHow does branching work?') && r.preview.split('\n')[2].includes('instead of message 3 (me)'), { forkAt: r.forkAt, turns: r.turns });
  for (let i = 0; i < 3; i++) await page.locator(`${host} button[data-zb="p8-minus"]`).click();
  r = await probe('p8', 'Build prompt');
  check('P8 from the first message: empty transcript, no summary asked', r.forkAt === 1 && r.turns === 0 && r.preview.includes('started from its first message') && !r.preview.includes('in brief') && r.preview.includes('<zb-transcript>\n</zb-transcript>'), { forkAt: r.forkAt, turns: r.turns });
  await page.locator(`${host} button[data-zb="p8-auto"]`).click();
  await mode('reply');
  await page.locator(`${host} button[data-zb="p8-minus"]`).click();
  r = await probe('p8', 'Build prompt');
  check('P8 refuses a fork point of the wrong kind', r.ok === false && /message 3 is yours/.test(r.error), r);
  await page.locator(`${host} button[data-zb="p8-auto"]`).click();
  r = await probe('p8', 'Build prompt');
  r = await probe('p8', 'Open new chat and insert');
  check('P8 opens a new chat and inserts the prompt', r.ok === true && r.insert.editor.equalsInserted === true && r.variableSurvived, { ok: r.ok, editor: r.insert && r.insert.editor });
  await pageSend();
  r = await probe('p8', 'Check summary');
  check('P8 check summary: found, right format, right parent', r.ok === true && r.summary.found && r.summary.formatOk && r.summary.parentMatches && r.summary.atStart && r.sentIntact === true && r.turnsParsedBack === 4, r.summary);
  r = await probe('p8', 'Rename branch', { dialog: 'accept' });
  check('P8 rename branch to its address plus the automatic title', r.renamed === true && r.newTitle === 'zbtest/1b · Auto title of a branch' && r.readBack === r.newTitle, r);

  // ------------------------------------------------ I. P8 from a branch: flattening
  await sidebar('zbtest/1a · First branch');
  await page.waitForTimeout(800);
  r = await probe('p8', 'Build prompt');
  check('P8 flattens a branch parent (6 turns, summary dropped)', r.flattened === true && r.turns === 6 && r.newAddress === 'zbtest/1a2' && !r.preview.includes('Parent zbtest/1 in brief') && r.preview.includes('<zb-turn branch="1a" n="1" role="user">\nTell me about addresses.') && r.preview.includes('<zb-turn branch="1a" n="2" role="assistant">\nAddresses look like'), { flattened: r.flattened, turns: r.turns, newAddress: r.newAddress });
  check('P8 flattening keeps escaping', r.preview.includes('literal &lt;zb-turn> tag'));

  // ------------------------------------------------ J. P8 make root (AD-2)
  await newChat();
  await probe('p1', 'Insert test text');
  await pageSend();
  r = await probe('p8', 'Build prompt');
  check('P8 asks for a tree root first', r.ok === false && r.needsRoot === true, r);
  r = await probe('p8', 'Make it a tree root', { dialog: 'dismiss' });
  check('P8 make root: cancelled by the dialog changes nothing', r.cancelled === true, r);
  r = await probe('p8', 'Make it a tree root', { dialog: 'accept' });
  check('P8 make root: next free root (1, 10, 11 exist -> 12)', r.renamed === true && /^zbtest\/12 · /.test(r.newTitle), r);
  r = await probe('p8', 'Build prompt');
  check('P8 builds from the new root', r.ok === true && r.newAddress === 'zbtest/12a', { newAddress: r.newAddress });

  // ------------------------------------------------ K. copy results (fallback path)
  await page.locator(`${host} button[data-zb="copy-results"]`).click();
  await page.waitForTimeout(500);
  const st = await status.textContent();
  const copied = JSON.parse((await page.locator(`${host} pre[data-zb-copybox]`).textContent()) || '{}');
  check('Copy results: clipboard denied, JSON shown in the panel instead', /Copy failed/.test(st) && Array.isArray(copied.results) && copied.results.length === resultCount, { status: st, results: copied.results && copied.results.length, expected: resultCount });
  check('The whole results log holds no private text or title', noSecrets(copied).length === 0, noSecrets(copied));
  writeJson(path.join(opt.out, 'results-log.json'), copied);
  // ------------------------------------------------ K. P9, claude.ai's own fork
  await sidebar('zbtest/1 · Root topic');
  await page.waitForTimeout(800);
  r = await probe('p9', "Fork through Claude's last reply");
  check('P9 forks a zbtest chat through Claude\'s last reply', r.ok === true && r.through === "message 4 (Claude's)" && /^\/chat\/[0-9a-f-]{36}$/.test(r.newChatPath), r);
  check('P9 shows a link to the new chat', (await page.locator(`${host} a[data-zb="p9-link"]`).getAttribute('href')) === r.newChatPath);
  r = await probe('p9', 'Read the new chat');
  check('P9 read: 4 messages, same roles and text, new ids, through message included', r.ok === true && r.copyMessages === 4 && r.allSameText && r.allSameRole && r.newIds && r.throughIncluded === true && r.sameTitle, { copy: r.copyMessages, through: r.throughWas, included: r.throughIncluded });
  r = await probe('p9', 'Fork through my last message');
  r = await probe('p9', 'Read the new chat');
  check('P9 through your last message: 3 messages', r.ok === true && r.copyMessages === 3 && r.throughWas === 3 && r.throughIncluded === true, { copy: r.copyMessages, through: r.throughWas });

  await page.screenshot({ path: path.join(opt.out, 'panel.png') });
  for (const id of ['p2', 'p4', 'p8', 'p9']) {
    const sec = page.locator(`${host} section[data-zb-section="${id}"]`);
    await sec.screenshot({ path: path.join(opt.out, `${id}.png`) });
    fs.writeFileSync(path.join(opt.out, `${id}-steps.txt`), (await sec.locator('ol.steps').innerText()) + '\n');
  }
} catch (e) {
  check('test run finished without an exception', false, String(e && e.stack ? e.stack : e));
} finally {
  await context.close();
}

// ------------------------------------------------ L. what the extension sent, and the network
const allowed = [
  /^GET \/api\/organizations$/,
  /^GET \/api\/organizations\/<org>\/chat_conversations_v2\?limit=100&offset=\d+$/,
  /^GET \/api\/organizations\/<org>\/chat_conversations\/[0-9a-f-]{36}\?tree=True&rendering_mode=messages&render_all_tools=true$/,
  /^PUT \/api\/organizations\/<org>\/chat_conversations\/[0-9a-f-]{36}$/,
  /^POST \/claudeai-rpc\/anthropic\.bard\.api\.v1alpha\.ConversationService\/PerformAction$/,
];
const bad = fake.apiLog.filter((e) => !allowed.some((re) => re.test(`${e.method} ${e.path}`)));
check('the extension made only the five allowed API calls', bad.length === 0, bad.slice(0, 5));
const rpcs = fake.apiLog.filter((e) => e.method === 'POST');
check('every POST is claude.ai\'s own fork, nothing else', rpcs.length === 2 && rpcs.every((e) => e.action === 'continueBranchAsNewChat' && e.status === 200), rpcs);
const puts = fake.apiLog.filter((e) => e.method === 'PUT');
check('every rename went to a zbtest/ name', puts.length > 0 && puts.every((e) => e.name.startsWith('zbtest/')), puts.map((e) => e.name));
const passive = (u) => u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('about:');
const unhandled = allRequests.filter((x) => !handled.has(x) && !passive(x.url())).map((x) => x.url());
const aborted = requestLog.filter((x) => x.action.startsWith('aborted'));
check('no request escaped the route handler', unhandled.length === 0, unhandled);

const summary = {
  at: new Date().toISOString(),
  passed: checks.filter((c) => c.pass).length,
  failed: checks.filter((c) => !c.pass).length,
  apiCalls: fake.apiLog.reduce((o, e) => ((o[e.method] = (o[e.method] || 0) + 1), o), {}),
  requests: { total: requestLog.length, aborted: aborted.length, unhandled: unhandled.length },
  dialogs: dialogs.length,
};
writeJson(path.join(opt.out, 'report.json'), { summary, checks, apiLog: fake.apiLog, dialogs, aborted });
console.log(`\n${summary.passed} passed, ${summary.failed} failed. API calls: ${JSON.stringify(summary.apiCalls)}. Requests: ${JSON.stringify(summary.requests)}`);
console.log(`wrote ${path.relative(process.cwd(), opt.out)}/{report.json, results-log.json, panel.png, p2.png, p4.png, p8.png}`);
if (summary.failed) exitCode = 1;
process.exit(exitCode);
