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
check('No other host than claude.ai',
  lines.filter((l) => (l.text.match(/(https?|wss?):\/\/[^\s'"`)]*/g) || []).some((u) => u !== 'https://claude.ai')));
check('No cookies, no credentials or tokens (requests use credentials: same-origin only)',
  hits(/cookie|sessionKey|Authorization|bearer|credentials:\s*['"](?!same-origin['"])/i));
check('No storage (web storage, IndexedDB, extension storage, caches)',
  hits(/localStorage|sessionStorage|indexedDB|openDatabase|\bstorage\.|caches\./));
check('No HTML injection', hits(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|DOMParser|createContextualFragment|srcdoc/));
check('No innerText (never document.body.innerText)', hits(/\.innerText\b/));
check('Click listeners only (no keyboard, input or other listeners)',
  [...hits(/addEventListener\(\s*(?!['"]click['"])/), ...hits(/\.on[a-z]+\s*=/)]);
check('No keyboard or input listeners',
  hits(/['"](keydown|keyup|keypress|input|beforeinput|change|compositionstart|compositionupdate|compositionend|paste|copy)['"]/));
check('No watching of the page (no MutationObserver or other observers)', hits(/MutationObserver|IntersectionObserver|ResizeObserver/));
check('Nothing runs on its own: no setInterval or frame callbacks; setTimeout only in the short wait helper',
  [...hits(/setInterval|requestAnimationFrame|requestIdleCallback/), ...hits(/setTimeout/).filter((l) => !/const sleep = \(ms\) => new Promise\(\(r\) => setTimeout\(r, ms\)\);/.test(l.text))]);
check('No eval or code from strings', hits(/\beval\s*\(|new Function\s*\(|setTimeout\(\s*['"`]|setInterval\(\s*['"`]/));
check('No hidden calls: no computed property access on global objects', hits(/\b(window|globalThis|self|document|global|location|navigator)\s*\[/));
check('No extension APIs (no messaging, no background, no extension storage)', hits(/\b(chrome|browser)\.\w/));
check('No messaging with page scripts or other windows', hits(/postMessage|BroadcastChannel|MessageChannel|dispatchEvent|CustomEvent/));
check('No clipboard; execCommand only to insert text', [...hits(/clipboard/i), ...hits(/execCommand\(/).filter((l) => !/execCommand\('insertText', false, /.test(l.text))]);
check('Never presses Send: no Send button, no key events, no form submit; the only click is on the New chat link',
  [...hits(/chat-input-send|KeyboardEvent|requestSubmit|\.submit\s*\(/), ...hits(/\.click\s*\(/).filter((l) => !/\bnewChatLink\.click\(\)/.test(l.text))]);

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
check('Manifest: MV3, no permissions, no background, claude.ai only, every file listed', mProblems);

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
