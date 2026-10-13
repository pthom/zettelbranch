// Audit of the spike extension: greps that prove what the code never does.
// Comments are ignored, so the files may say what they do not do.
//
//   node audit.mjs [--dir extension]
// Each check also prints a plain grep a person can run by hand (it may show comment lines).
import fs from 'node:fs';
import path from 'node:path';
import { args, EXT_DIR } from './lib.mjs';

const opt = args({ dir: EXT_DIR });
const NET_FILE = 'claude-api.js';
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
function check(name, offending, grep) {
  checks.push({ name, pass: offending.length === 0, offending, grep });
}

check(
  `Network calls only in ${NET_FILE}`,
  hits(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|importScripts|new Image\b|\.src\s*=|window\.open\s*\(|location\.(assign|replace)\s*\(|location\.href\s*=/, (f) => f !== NET_FILE),
  `grep -nE "fetch\\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|new Image|\\.src *=|window\\.open|location\\.(assign|replace|href *=)" spike/extension/*.js | grep -v ${NET_FILE}`
);
const posts = hits(/['"]POST['"]/);
check(
  `Only GET and PUT, plus one POST in ${NET_FILE} (P9, claude.ai's own fork)`,
  [...hits(/['"](DELETE|PATCH)['"]/), ...posts.filter((l) => l.file !== NET_FILE), ...(posts.length > 2 ? posts : [])],
  `grep -nE "'(POST|DELETE|PATCH)'" spike/extension/*.js`
);
check(
  'No other host than claude.ai',
  lines.filter((l) => (l.text.match(/https?:\/\/[^\s'"`)]*/g) || []).some((u) => u !== 'https://claude.ai')),
  'grep -noE "https?://[^ \'\\"`)]*" spike/extension/*.js | grep -v "https://claude.ai$"'
);
check(
  'No cookies, no credentials',
  hits(/document\.cookie|\bcookies\b|sessionKey|\bAuthorization\b/i),
  'grep -niE "document\\.cookie|cookies|sessionKey|Authorization" spike/extension/*.js'
);
check(
  'No storage (web storage, IndexedDB, extension storage, caches)',
  hits(/localStorage|sessionStorage|indexedDB|\bstorage\.|caches\./),
  'grep -nE "localStorage|sessionStorage|indexedDB|storage\\.|caches\\." spike/extension/*.js'
);
check(
  'No HTML injection',
  hits(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|DOMParser|createContextualFragment/),
  'grep -nE "innerHTML|outerHTML|insertAdjacentHTML|document\\.write|DOMParser|createContextualFragment" spike/extension/*.js'
);
check(
  'No innerText (never document.body.innerText)',
  hits(/\.innerText\b/),
  'grep -n "\\.innerText" spike/extension/*.js'
);
check(
  'No keyboard or input listeners',
  hits(/addEventListener\(\s*['"](keydown|keyup|keypress|input|beforeinput|change|compositionstart|compositionupdate|compositionend)['"]|\.on(keydown|keyup|keypress|input|beforeinput|change)\s*=/),
  'grep -nE "addEventListener\\(.(keydown|keyup|keypress|input|beforeinput|change|composition)|\\.on(key|input|beforeinput|change)" spike/extension/*.js'
);
check(
  'No watching of the page while you type: MutationObserver only in content.js (P0 trigger on share pages)',
  hits(/MutationObserver/, (f) => f !== 'content.js'),
  'grep -n "MutationObserver" spike/extension/*.js'
);
check(
  'No eval or code from strings',
  hits(/\beval\s*\(|new Function\s*\(|setTimeout\(\s*['"`]|setInterval\(\s*['"`]/),
  'grep -nE "eval\\(|new Function|setTimeout\\([\'\\"]|setInterval\\([\'\\"]" spike/extension/*.js'
);
check(
  'No extension APIs (no messaging, no background)',
  hits(/\bchrome\.|\bbrowser\./),
  'grep -nE "chrome\\.|browser\\." spike/extension/*.js'
);

// The manifest.
const manifest = JSON.parse(fs.readFileSync(path.join(opt.dir, 'manifest.json'), 'utf8'));
const mProblems = [];
for (const k of ['permissions', 'optional_permissions', 'host_permissions', 'optional_host_permissions', 'background', 'web_accessible_resources', 'externally_connectable', 'content_security_policy']) {
  if (k in manifest) mProblems.push({ file: 'manifest.json', n: 0, text: `has "${k}"` });
}
const matches = (manifest.content_scripts || []).flatMap((c) => c.matches || []);
if (matches.some((m) => m !== 'https://claude.ai/*')) mProblems.push({ file: 'manifest.json', n: 0, text: `content script matches ${JSON.stringify(matches)}` });
const listed = (manifest.content_scripts || []).flatMap((c) => c.js || []);
for (const f of files) if (!listed.includes(f)) mProblems.push({ file: 'manifest.json', n: 0, text: `${f} is not listed in content_scripts` });
check('Manifest: no permissions, no background, claude.ai only, every file listed', mProblems, 'cat spike/extension/manifest.json');

let failed = 0;
for (const c of checks) {
  console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}`);
  if (!c.pass) {
    failed++;
    for (const o of c.offending.slice(0, 10)) console.log(`      ${o.file}:${o.n}: ${o.text.trim().slice(0, 160)}`);
  }
}
console.log(`\n${checks.length - failed} of ${checks.length} checks passed (${files.length} files: ${files.join(', ')}).`);
console.log('\nBy hand (may also list comment lines):');
for (const c of checks) console.log(`  ${c.grep}`);
process.exit(failed ? 1 : 0);
