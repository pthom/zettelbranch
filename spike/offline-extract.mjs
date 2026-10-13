// P0, offline: runs the extension's extract.js in jsdom against a saved share page.
// No browser, no network (jsdom loads no subresources and runs none of the page's scripts).
//
//   node offline-extract.mjs [--html out/share-page.html] [--out out/extracted-offline.json]
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import { args, challengeMarkers, EXT_DIR, OUT_DIR, SAVED_HTML, SHARE_URL, writeJson } from './lib.mjs';

const opt = args({ html: SAVED_HTML, out: path.join(OUT_DIR, 'extracted-offline.json'), url: SHARE_URL });

if (!fs.existsSync(opt.html)) {
  console.error(`Missing ${opt.html}. Expected the share page saved by hand (Cmd+S, "Webpage, Complete").`);
  process.exit(2);
}
const html = fs.readFileSync(opt.html, 'utf8');
const markers = challengeMarkers(html);
if (markers.length) {
  console.error(`The saved page looks like a bot check, not the conversation: ${markers.join(', ')}`);
  writeJson(opt.out, { error: 'challenge page', markers });
  process.exit(3);
}

const t0 = Date.now();
const dom = new JSDOM(html, { url: opt.url, runScripts: 'outside-only', virtualConsole: new VirtualConsole() });
const parseMs = Date.now() - t0;
dom.window.eval(fs.readFileSync(path.join(EXT_DIR, 'extract.js'), 'utf8'));
const t1 = Date.now();
const result = dom.window.ZBExtract.extract(dom.window.document);
result.timing = { parseMs, extractMs: Date.now() - t1 };
result.source = { html: path.relative(process.cwd(), opt.html), runner: 'jsdom' };
// Does the saved HTML also carry the conversation as data (inline scripts, RSC payload)?
result.embeddedData = {
  chat_messages: (html.match(/chat_messages/g) || []).length,
  parent_message_uuid: (html.match(/parent_message_uuid/g) || []).length,
  inlineScripts: (html.match(/<script(?![^>]*\ssrc=)[^>]*>/gi) || []).length,
  nextData: /__NEXT_DATA__|self\.__next_f/.test(html),
};
writeJson(opt.out, result);

const roles = result.messages.map((m) => (m.role === 'user' ? 'U' : 'A')).join('');
console.log(`title: ${result.title}`);
console.log(`selectors: user=${result.selectors.user} assistant=${result.selectors.assistant}`);
console.log(`messages: ${result.messageCount}  roles: ${roles}`);
console.log(`code blocks: ${result.messages.reduce((s, m) => s + m.counts.code, 0)}, tables: ${result.messages.reduce((s, m) => s + m.counts.table, 0)}, math: ${result.messages.reduce((s, m) => s + m.counts.math, 0)}, artifacts: ${result.messages.reduce((s, m) => s + m.counts.artifact, 0)}`);
const leftOut = result.messages.reduce((s, m) => s + m.leftOut.length, 0);
if (leftOut) console.log(`left-out blocks in assistant messages: ${leftOut}`);
if (result.anomalies.length) console.log(`anomalies: ${result.anomalies.join('; ')}`);
console.log(`virtualization hints: ${JSON.stringify(result.diag.virtualization)}`);
console.log(`embedded data in the saved HTML: ${JSON.stringify(result.embeddedData)}`);
console.log(`wrote ${path.relative(process.cwd(), opt.out)} (jsdom ${parseMs} ms parse, ${result.timing.extractMs} ms extract)`);
