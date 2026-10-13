// Audit of the extension: checks that prove what the code never does. Comments are
// ignored, so the files may say what they do not do.
//   Part 1: the checks, in JavaScript.
//   Part 2: every `sh` command of AUDIT.md, run as a person would, from the folder that
//           holds extension/. Each must print nothing.
//
//   node audit.mjs [--dir ../extension] [--root ..]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { args, EXT_DIR, ROOT_DIR } from './lib.mjs';

const opt = args({ dir: EXT_DIR, root: ROOT_DIR });
const NET_FILE = 'api.js';
const files = fs.readdirSync(opt.dir).filter((f) => f.endsWith('.js')).sort();

// Code lines without comments: block comments, and `//` comments that start a line or
// follow whitespace (so 'https://…' inside strings stays).
function codeLines(file) {
  const src = fs.readFileSync(path.join(opt.dir, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ''));
  return src.split('\n').map((l, i) => ({ file, n: i + 1, text: l.replace(/(^|\s)\/\/.*$/, '$1') }));
}
const lines = files.flatMap(codeLines);
const hits = (re, only) => lines.filter((l) => (!only || only(l.file)) && re.test(l.text));

const checks = [];
const check = (name, offending) => checks.push({ name, pass: offending.length === 0, offending });

check(`Network calls only in ${NET_FILE}`,
  hits(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|importScripts|new Image\b|\.src\s*=|\bimport\s*\(|window\.open\s*\(|location\.(assign|replace)\s*\(|location\.href\s*=/, (f) => f !== NET_FILE));
const fetches = hits(/\bfetch\s*\(/, (f) => f === NET_FILE);
check(`${NET_FILE} calls fetch in one place, behind its allowed list`, fetches.length === 1 ? [] : fetches.length ? fetches : [{ file: NET_FILE, n: 0, text: 'no fetch call found' }]);
check('Only GET and PUT', hits(/['"](POST|DELETE|PATCH|HEAD|OPTIONS)['"]/i));
// SVG's namespace name, for createElementNS (the refresh icon), is a name, never fetched:
// allowed on that one exact line only.
const SVG_NS_LINE = "const NS = 'http://www.w3.org/2000/svg';";
check('No other host than claude.ai (SVG\'s namespace name only on its one line)',
  lines.filter((l) => l.text.trim() !== SVG_NS_LINE && (l.text.match(/(https?|wss?):\/\/[^\s'"`)]*/g) || []).some((u) => u !== 'https://claude.ai')));
check('No cookies, no credentials or tokens (requests use credentials: same-origin only)',
  hits(/cookie|sessionKey|Authorization|bearer|credentials:\s*['"](?!same-origin['"])/i));
check('No storage (web storage, IndexedDB, extension storage, caches)',
  hits(/localStorage|sessionStorage|indexedDB|openDatabase|\bstorage\.|caches\./));
check('No HTML injection', hits(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|DOMParser|createContextualFragment|srcdoc/));
check('No innerText (never document.body.innerText)', hits(/\.innerText\b/));
check('Click listeners only (no keyboard, input or other listeners)',
  [...hits(/addEventListener\(\s*(?!['"]click['"])/), ...hits(/\.on[a-z]+\s*=/)]);
// The key events menu.js sends (Enter or Escape) name their types on one exact line.
const KEY_TYPES_LINE = "const types = k === 'Enter' ? ['keydown', 'keypress', 'keyup'] : ['keydown', 'keyup'];";
check('No keyboard or input listeners',
  hits(/['"](keydown|keyup|keypress|input|beforeinput|change|compositionstart|compositionupdate|compositionend|paste|copy)['"]/).filter((l) => !(l.file === 'menu.js' && l.text.trim() === KEY_TYPES_LINE)));
check('No watching of the page (no MutationObserver or other observers)', hits(/MutationObserver|IntersectionObserver|ResizeObserver/));
// One interval (step 6e): while the panel is open, follow() compares the tab's address with
// the page the panel shows and, on a change, reads as the refresh button does.
const INTERVAL_LINE = 'const startFollowing = () => (watch = watch || setInterval(follow, 400));';
const FOLLOW = ['function follow() {', 'if (location.pathname !== seenPath) readOnScreen();', '}'];
const uiLines = fs.readFileSync(path.join(opt.dir, 'ui.js'), 'utf8').split('\n').map((l) => l.trim());
const followAt = uiLines.indexOf(FOLLOW[0]);
const intervals = hits(/setInterval/);
check('Nothing runs on its own but one check while the panel is open: one setInterval, whose callback only compares the tab\'s address and reads as the refresh button does; no frame callbacks; setTimeout only in the short wait helper', [
  ...hits(/requestAnimationFrame|requestIdleCallback/),
  ...intervals.filter((l) => !(l.file === 'ui.js' && l.text.trim() === INTERVAL_LINE)),
  ...(intervals.length > 1 ? [{ file: 'ui.js', n: 0, text: `setInterval on ${intervals.length} lines` }] : []),
  ...(followAt < 0 || uiLines.lastIndexOf(FOLLOW[0]) !== followAt || uiLines.slice(followAt, followAt + 3).join(' ') !== FOLLOW.join(' ') ? [{ file: 'ui.js', n: followAt + 1, text: `follow() is not exactly: ${FOLLOW.join(' ')}` }] : []),
  ...(uiLines.includes("b.addEventListener('click', readOnScreen);") ? [] : [{ file: 'ui.js', n: 0, text: 'the refresh button does not call readOnScreen' }]),
  ...hits(/setTimeout/).filter((l) => !/const sleep = \(ms\) => new Promise\(\(r\) => setTimeout\(r, ms\)\);/.test(l.text)),
]);
check('No eval or code from strings', hits(/\beval\s*\(|new Function\s*\(|setTimeout\(\s*['"`]|setInterval\(\s*['"`]/));
check('No hidden calls: no computed property access on global objects', hits(/\b(window|globalThis|self|document|global|location|navigator)\s*\[/));
check('No extension APIs (no messaging, no background, no extension storage)', hits(/\b(chrome|browser)\.\w/));
check('No messaging with page scripts or other windows', hits(/postMessage|BroadcastChannel|MessageChannel|CustomEvent/));
const EXEC_LINES = { 'branch.js': "document.execCommand('insertText', false, p.text);", 'menu.js': "document.execCommand('insertText', false, name);" };
check('No clipboard; execCommand only to insert the prompt (branch.js) and a name in claude.ai\'s rename field (menu.js)',
  [...hits(/clipboard/i), ...hits(/execCommand/).filter((l) => l.text.trim() !== EXEC_LINES[l.file])]);
const CLICK_LINES = { 'branch.js': 'newChatLink.click();', 'menu.js': 'if (el) el.click();' };
check('Never presses Send: no Send button, no form submit; the only clicks are on the New chat link and (menu.js) the Rename item',
  [...hits(/chat-input-send|requestSubmit|\.submit\s*\(/), ...hits(/\.click\s*\(/).filter((l) => !(l.text.trim().endsWith(CLICK_LINES[l.file] || '\0'))),
    ...(hits(/\.click\s*\(/).filter((l) => l.file === 'menu.js').length > 1 ? [{ file: 'menu.js', n: 0, text: 'more than one click in menu.js' }] : [])]);

// Events to the page (0.1.1): only in menu.js, only through pressOn, keyOn and clickOn, only
// these six calls, only to the four TARGETS by their exact selectors.
const DISPATCH_LINES = [
  "el.dispatchEvent(new PointerEvent('pointerdown', o));",
  "el.dispatchEvent(new MouseEvent('mousedown', o));",
  "el.dispatchEvent(new PointerEvent('pointerup', { ...o, buttons: 0 }));",
  "el.dispatchEvent(new MouseEvent('mouseup', { ...o, buttons: 0 }));",
  'for (const type of types) el.dispatchEvent(new KeyboardEvent(type, { key: k, code: k, keyCode: code, which: code, bubbles: true, cancelable: true }));',
];
const EVENT_CALLS = ["pressOn('titleButton')", "pressOn('renameItem')", "clickOn('renameItem')", "keyOn('nameField', 'Enter')", "keyOn('nameField', 'Escape')", "keyOn('menu', 'Escape')"];
const EVENT_DEFS = ['function pressOn(which) {', 'function keyOn(which, k) {', 'function clickOn(which) {'];
const TARGET_LINES = [
  'const TARGETS = {',
  `titleButton: '[data-testid="chat-title-split"] button[aria-haspopup="menu"]',`,
  `menu: '[role="menu"]',`,
  `renameItem: '[role="menu"] [data-testid="rename-chat-trigger"]',`,
  `nameField: 'input[data-testid="name-chat"]',`,
  '};',
];
const LOOKUP_LINE = 'const target = (which) => document.querySelector(TARGETS[which]);';
const menuCode = lines.filter((l) => l.file === 'menu.js');
const menuAt = menuCode.findIndex((l) => l.text.trim() === TARGET_LINES[0]);
check('Events only to claude.ai\'s title menu (menu.js): the title button, its menu (Escape), the exact Rename item, the rename field (Enter, Escape)', [
  ...hits(/dispatchEvent|new (Pointer|Mouse|Keyboard|Input|Focus|Touch|Wheel|Composition|Drag|Clipboard)?Event\s*\(/).filter((l) => !(l.file === 'menu.js' && DISPATCH_LINES.includes(l.text.trim()))),
  ...hits(/\b(pressOn|keyOn|clickOn)\s*\(/).filter((l) => l.file !== 'menu.js'),
  ...menuCode.filter((l) => !EVENT_DEFS.includes(l.text.trim())).flatMap((l) => (l.text.match(/\b(pressOn|keyOn|clickOn)\s*\([^)]*\)/g) || []).filter((c) => !EVENT_CALLS.includes(c)).map((c) => ({ ...l, text: `not an allowed call: ${c}` }))),
  ...(menuAt < 0 || menuCode.slice(menuAt, menuAt + TARGET_LINES.length).map((l) => l.text.trim()).join('\n') !== TARGET_LINES.join('\n') ? [{ file: 'menu.js', n: 0, text: 'TARGETS is not exactly the four selectors' }] : []),
  ...menuCode.filter((l) => /querySelector|getElementBy|closest\s*\(|elementFromPoint/.test(l.text) && l.text.trim() !== LOOKUP_LINE),
  ...menuCode.filter((l) => /textContent|innerText|aria-label|querySelectorAll|\[\d+\]|chat-input/.test(l.text)),
  ...hits(/delete-chat-trigger|share-chat-trigger|star-chat-trigger/),
]);

// The manifest.
const manifest = JSON.parse(fs.readFileSync(path.join(opt.dir, 'manifest.json'), 'utf8'));
const mProblems = [];
const m = (text) => mProblems.push({ file: 'manifest.json', n: 0, text });
if (manifest.manifest_version !== 3) m('manifest_version is not 3');
for (const k of ['permissions', 'optional_permissions', 'host_permissions', 'optional_host_permissions', 'background', 'web_accessible_resources', 'externally_connectable', 'content_security_policy', 'action', 'commands', 'declarative_net_request']) {
  if (k in manifest) m(`has "${k}"`);
}
const scripts = manifest.content_scripts || [];
const matches = scripts.flatMap((c) => c.matches || []);
if (matches.some((x) => x !== 'https://claude.ai/*')) m(`content scripts match ${JSON.stringify(matches)}`);
if (scripts.some((c) => c.world && c.world !== 'ISOLATED')) m('a content script runs in the page\'s own world');
const listed = scripts.flatMap((c) => c.js || []);
for (const f of files) if (!listed.includes(f)) m(`${f} is not listed in content_scripts`);
for (const f of listed) if (!files.includes(f)) m(`${f} is listed but does not exist`);
// One other address: where Firefox (not the extension) looks for updates of the signed version.
const UPDATE_URL = 'https://raw.githubusercontent.com/pthom/zettelbranch/main/updates.json';
const gecko = (manifest.browser_specific_settings || {}).gecko || {};
if ('update_url' in gecko && gecko.update_url !== UPDATE_URL) m(`update_url is ${gecko.update_url}`);
const addresses = JSON.stringify(manifest).match(/https?:\/\/[^"]*/g) || [];
for (const a of addresses) if (a !== 'https://claude.ai/*' && a !== UPDATE_URL) m(`an address: ${a}`);
check('Manifest: MV3, no permissions, no background, claude.ai only (and the update address), every file listed', mProblems);

// Part 2: the commands of AUDIT.md.
const auditMd = fs.readFileSync(path.join(ROOT_DIR, 'AUDIT.md'), 'utf8');
const commands = [...auditMd.matchAll(/```sh\n([\s\S]*?)```/g)].flatMap((m) => m[1].split('\n').filter((l) => l.trim()));
for (const cmd of commands) {
  const r = spawnSync('sh', ['-c', cmd], { cwd: opt.root, encoding: 'utf8' });
  const out = `${r.stdout}${r.stderr}`.trim();
  check(`AUDIT.md prints nothing: ${cmd.length > 90 ? cmd.slice(0, 90) + '…' : cmd}`, out ? out.split('\n').map((text) => ({ file: 'output', n: 0, text })) : []);
}

let failed = 0;
for (const c of checks) {
  console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}`);
  if (!c.pass) {
    failed++;
    for (const o of c.offending.slice(0, 10)) console.log(`      ${o.file}:${o.n}: ${o.text.trim().slice(0, 160)}`);
  }
}
console.log(`\n${checks.length - failed} of ${checks.length} checks passed: ${checks.length - commands.length} in JavaScript, ${commands.length} AUDIT.md commands (${files.length} files: ${files.join(', ')}).`);
process.exitCode = failed ? 1 : 0;
