// P0 in a real browser, fully offline.
//
// Loads the spike extension into Playwright's own Chromium (new headless mode, never a
// window), on the dedicated profile, and opens the share URL. Nothing reaches the
// network: every request goes through a route handler that serves the page Pascal saved
// by hand (scripts stripped, so the saved app does not run again) and the files of its
// "_files" folder, and aborts everything else. DNS is mapped to nothing as a second
// guard. The run fails if any request was not handled by the route handler.
//
// The content script (isolated world) does the extraction and writes its result to an
// attribute on <html>. Playwright only reads that attribute; it never extracts.
//
//   node p0-read-share.mjs [--html out/share-page.html] [--out out] [--profile <dir>]
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { JSDOM, VirtualConsole } from 'jsdom';
import { args, challengeMarkers, EXT_DIR, OUT_DIR, PROFILE_DIR, SAVED_HTML, SHARE_URL, writeJson } from './lib.mjs';

const opt = args({ html: SAVED_HTML, out: OUT_DIR, url: SHARE_URL, profile: PROFILE_DIR });
const htmlFile = path.resolve(opt.html);
const filesDir = htmlFile.replace(/\.html?$/i, '') + '_files';
const filesMarker = '/' + path.basename(filesDir) + '/';
const pageOrigin = new URL(opt.url).origin;
const rel = (f) => path.relative(process.cwd(), f);

if (!fs.existsSync(htmlFile)) {
  console.error(`Missing ${htmlFile}. Expected the share page saved by hand (Cmd+S, "Webpage, Complete").`);
  process.exit(2);
}

// ---------------------------------------------------------------- prepare the page

const saved = fs.readFileSync(htmlFile, 'utf8');
const markers = challengeMarkers(saved);
if (markers.length) {
  console.error(`The saved page looks like a bot check, not the conversation: ${markers.join(', ')}`);
  process.exit(3);
}

function stripPage(html) {
  const dom = new JSDOM(html, { virtualConsole: new VirtualConsole() });
  const d = dom.window.document;
  const removed = { scripts: 0, links: 0, metaRefresh: 0, handlers: 0 };
  for (const e of d.querySelectorAll('script')) {
    e.remove();
    removed.scripts++;
  }
  for (const e of d.querySelectorAll('link')) {
    if (/preload|modulepreload|prefetch|preconnect|dns-prefetch|manifest/i.test(e.getAttribute('rel') || '')) {
      e.remove();
      removed.links++;
    }
  }
  for (const e of d.querySelectorAll('meta[http-equiv]')) {
    if (/refresh/i.test(e.getAttribute('http-equiv'))) {
      e.remove();
      removed.metaRefresh++;
    }
  }
  for (const el of d.querySelectorAll('*')) {
    for (const a of Array.from(el.attributes)) {
      if (/^on/i.test(a.name)) {
        el.removeAttribute(a.name);
        removed.handlers++;
      }
    }
  }
  return { html: dom.serialize(), removed };
}

const served = stripPage(saved);
fs.mkdirSync(opt.out, { recursive: true });
fs.writeFileSync(path.join(opt.out, 'page-served.html'), served.html);

// ---------------------------------------------------------------- local-only network

const MIME = {
  '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
};
const BY_TYPE = { stylesheet: 'text/css', image: 'image/png', font: 'font/woff2', script: 'text/javascript', document: 'text/html; charset=utf-8' };
const NO_STORE = { 'cache-control': 'no-store' };

const requestLog = [];
const handled = new Set();
const websockets = [];

function localFile(u) {
  if (u.origin !== pageOrigin) return null;
  const p = decodeURIComponent(u.pathname);
  const i = p.indexOf(filesMarker);
  if (i < 0) return null;
  const file = path.resolve(filesDir, p.slice(i + filesMarker.length));
  if (!file.startsWith(filesDir + path.sep)) return null;
  return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

async function onRoute(route) {
  const req = route.request();
  handled.add(req);
  const url = req.url();
  const entry = { url: url.length > 300 ? url.slice(0, 300) + '…' : url, method: req.method(), type: req.resourceType() };
  try {
    const u = new URL(url);
    const noHash = url.split('#')[0];
    if (req.isNavigationRequest() && req.frame() === page.mainFrame() && noHash === opt.url) {
      await route.fulfill({ status: 200, body: served.html, headers: { 'content-type': 'text/html; charset=utf-8', ...NO_STORE } });
      entry.action = 'fulfilled: saved page';
    } else {
      const file = localFile(u);
      if (file) {
        const type = MIME[path.extname(file).toLowerCase()] || BY_TYPE[req.resourceType()] || 'application/octet-stream';
        await route.fulfill({ status: 200, body: fs.readFileSync(file), headers: { 'content-type': type, ...NO_STORE } });
        entry.action = 'fulfilled: ' + path.relative(path.dirname(filesDir), file);
      } else {
        await route.abort('blockedbyclient');
        entry.action = 'aborted';
      }
    }
  } catch (e) {
    entry.action = 'route error: ' + e.message;
    try {
      await route.abort('blockedbyclient');
    } catch {}
  }
  requestLog.push(entry);
}

// ---------------------------------------------------------------- run

let page;
const allRequests = [];
const context = await chromium.launchPersistentContext(opt.profile, {
  channel: 'chromium', // full Chromium in the new headless mode: the one that runs extensions
  headless: true, // hard rule: never a visible window
  args: [
    `--disable-extensions-except=${EXT_DIR}`,
    `--load-extension=${EXT_DIR}`,
    '--host-resolver-rules=MAP * ~NOTFOUND', // second guard: no host name resolves
  ],
  viewport: { width: 1280, height: 900 },
  serviceWorkers: 'block', // so every request goes through the route handler
});

let exitCode = 0;
const report = { startedAt: new Date().toISOString(), html: rel(htmlFile), url: opt.url, removedFromSavedPage: served.removed };
try {
  await context.route('**/*', onRoute);
  await context.routeWebSocket(/.*/, (ws) => {
    websockets.push(ws.url());
    ws.close();
  });
  context.on('request', (r) => allRequests.push(r));
  page = context.pages()[0] || (await context.newPage());
  report.browser = { version: context.browser() ? context.browser().version() : null, headless: true, channel: 'chromium' };

  const tNav = Date.now();
  const resp = await page.goto(opt.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  report.timing = { domContentLoadedMs: Date.now() - tNav };
  report.mainResponseStatus = resp ? resp.status() : null;
  report.title = await page.title();

  const html = page.locator('html');
  const attr = (name) => html.getAttribute(name);
  let state = null;
  for (let waited = 0; waited < 45000; waited += 250) {
    state = await attr('data-zb-p0-state');
    if (state === 'done' || state === 'error') break;
    await page.waitForTimeout(250);
  }
  report.timing.resultMs = Date.now() - tNav;
  report.contentScriptRan = state !== null;
  report.state = state;

  if (state === 'done') {
    const result = JSON.parse(await attr('data-zb-p0-result'));
    result.source = { html: rel(htmlFile), runner: 'headless chromium + extension (offline)' };
    writeJson(path.join(opt.out, 'extracted.json'), result);
    report.messageCount = result.messageCount;
    report.selectors = result.selectors;
    report.contentScriptTiming = result.timing;

    // Probe trigger: the mechanism later probes reuse.
    const nonce = crypto.randomUUID().slice(0, 8);
    await html.evaluate((el, v) => el.setAttribute('data-zb-probe', v), `count:${nonce}`);
    let probe = null;
    for (let waited = 0; waited < 5000 && !probe; waited += 100) {
      const v = await attr('data-zb-probe-result');
      if (v && JSON.parse(v).nonce === nonce) probe = JSON.parse(v);
      else await page.waitForTimeout(100);
    }
    report.probeTrigger = probe ? { ok: probe.ok, result: probe.result, error: probe.error } : 'no answer';
  } else if (state === 'error') {
    const err = JSON.parse(await attr('data-zb-p0-error'));
    writeJson(path.join(opt.out, 'extracted.json'), { error: err });
    report.error = err.message;
    exitCode = 1;
  } else {
    report.error = 'the content script did not run (no data-zb-p0-state on <html>)';
    exitCode = 1;
  }

  await page.screenshot({ path: path.join(opt.out, 'page.png'), fullPage: true });
} catch (e) {
  report.error = String(e && e.stack ? e.stack : e);
  exitCode = 1;
} finally {
  await context.close();
}

// ---------------------------------------------------------------- network verdict

const passive = (u) => u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('about:');
const unhandled = allRequests.filter((r) => !handled.has(r) && !passive(r.url())).map((r) => r.url());
const count = (prefix) => requestLog.filter((e) => e.action.startsWith(prefix)).length;
report.network = {
  requests: requestLog.length,
  fulfilledLocally: count('fulfilled'),
  aborted: count('aborted'),
  routeErrors: count('route error'),
  unhandled,
  websocketsClosed: websockets,
  verdict: unhandled.length === 0 && count('route error') === 0 ? 'PASS: every request was fulfilled locally or aborted' : 'FAIL',
};
if (report.network.verdict === 'FAIL') exitCode = 1;
writeJson(path.join(opt.out, 'requests.json'), { requests: requestLog, unhandled, websockets });
writeJson(path.join(opt.out, 'browser-run.json'), report);

console.log(`browser: Chromium ${report.browser ? report.browser.version : '?'} (headless, channel chromium)`);
console.log(`content script ran: ${report.contentScriptRan}, state: ${report.state}`);
if (report.messageCount !== undefined) console.log(`messages: ${report.messageCount}  selectors: ${JSON.stringify(report.selectors)}`);
if (report.probeTrigger) console.log(`probe trigger: ${JSON.stringify(report.probeTrigger)}`);
if (report.error) console.log(`error: ${report.error}`);
console.log(`timing: ${JSON.stringify(report.timing)}`);
console.log(`network: ${report.network.requests} requests, ${report.network.fulfilledLocally} fulfilled locally, ${report.network.aborted} aborted, ${unhandled.length} unhandled -> ${report.network.verdict}`);
console.log(`wrote ${rel(opt.out)}/{extracted.json, requests.json, browser-run.json, page.png, page-served.html}`);
process.exit(exitCode);
