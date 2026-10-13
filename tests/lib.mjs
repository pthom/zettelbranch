// Shared helpers for the offline tests.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

export const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.dirname(TESTS_DIR);
export const EXT_DIR = path.join(ROOT_DIR, 'extension');
export const OUT_DIR = path.join(TESTS_DIR, 'out');
export const PROFILE_DIR = path.join(OUT_DIR, 'profile'); // a throwaway Chromium profile

// The extension's scripts, in the order the manifest loads them.
export function extensionFiles(dir = EXT_DIR) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  return manifest.content_scripts[0].js;
}

// A jsdom window at a claude.ai address with some extension files run in it, the way the
// browser runs content scripts (plain scripts sharing one global). `before` runs first, to
// set stubs such as `fetch`.
export function loadIntoWindow(files, { url = 'https://claude.ai/new', html = '<!doctype html><html><body></body></html>', before } = {}) {
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const win = dom.window;
  if (before) before(win);
  for (const f of files) win.eval(fs.readFileSync(path.join(EXT_DIR, f), 'utf8') + `\n//# sourceURL=${f}`);
  return win;
}

// `--name value` arguments.
export function args(defaults) {
  const out = { ...defaults };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith('--')) continue;
    const key = a[i].slice(2);
    const next = a[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}
