// How the extension's insertion behaves in a real Tiptap editor (ProseMirror, like claude.ai's
// message box), in Playwright's Chromium and Firefox: one insertText call, line by line, and
// fill() (one call, then line by line if the box does not hold the text). Local files only
// (tests/editor/page.html and the bundle it loads); any other request is aborted. It cannot
// show what claude.ai's own editor does: in Pascal's Firefox, one call lost the line breaks
// there (P1, 2026-10-13), while a bare Tiptap editor keeps them.
//
//   npm run editor        (bundles tests/out/editor/tiptap.js first if it is missing)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { chromium, firefox } from 'playwright';
import { EXT_DIR, OUT_DIR, TESTS_DIR, loadIntoWindow } from './lib.mjs';

const BUNDLE = path.join(OUT_DIR, 'editor', 'tiptap.js');
if (!fs.existsSync(BUNDLE)) {
  const r = spawnSync('npx', ['esbuild', 'editor/tiptap-entry.js', '--bundle', '--format=iife', `--outfile=${BUNDLE}`, '--log-level=warning'], { cwd: TESTS_DIR, stdio: 'inherit' });
  if (r.status !== 0) process.exit(1);
}

// The texts: P1's sample (a list, a fenced code block), a branch prompt built by prompt.js
// from messages with code and a table, and a prompt of about 100,000 characters.
const P1 = ['Zettelbranch · zbtest/p1', 'Path: zbtest/p1 (insertion test, P1)', '', 'A list:', '- first item', '- second item', '  - nested item', '', '```python', 'def f(x):', '    if x:', '        return 1', '    return 0', '```', '', 'Reply only with: ok'].join('\n');
const P = loadIntoWindow(['tree.js', 'prompt.js']).ZBPrompt;
const msgs = [
  { n: 1, role: 'user', text: 'Show me a function and a table.' },
  { n: 2, role: 'assistant', text: 'Here:\n\n```js\nfunction f(x) {\n  return x * 2;\n}\n```\n\n| a | b |\n| --- | --- |\n| 1 | 2 |' },
];
const PROMPT = P.build({ tree: 'zbtest', parentTitle: 'zbtest/1 · Root', parentAddress: '1', newAddress: '1a', messages: msgs, fork: 1 }).text + 'What about tables?';
const filler = Array.from({ length: 1100 }, (_, i) => `Line ${String(i + 1).padStart(5, '0')}: a long reply for the size test, the quick brown fox jumps over the lazy dog.`).join('\n');
const BIG = P.build({ tree: 'zbtest', parentTitle: 'zbtest/4 · Big', parentAddress: '4', newAddress: '4a', messages: [{ n: 1, role: 'user', text: 'Write a long text.' }, { n: 2, role: 'assistant', text: filler }], fork: 1 }).text;
const SAMPLES = [['P1 sample', P1], ['branch prompt', PROMPT], ['100k prompt', BIG]];

const page = pathToFileURL(path.join(TESTS_DIR, 'editor', 'page.html')).href;
const rows = [];
let bad = 0;
for (const type of [chromium, firefox]) {
  const browser = await type.launch({ headless: true });
  const p = await browser.newPage();
  await p.route(/^https?:/, (r) => r.abort());
  await p.goto(page);
  await p.addScriptTag({ path: path.join(EXT_DIR, 'branch.js') });
  for (const [name, text] of SAMPLES) {
    const r = await p.evaluate(async (text) => {
      const box = document.querySelector('[data-testid="chat-input"]');
      const ins = window.ZBBranch.insertion;
      const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
      const reset = () => window.editor.commands.clearContent(true);
      const out = {};
      reset();
      let t0 = performance.now();
      ins.insertOnce(box, text);
      await wait(100);
      out.once = { same: ins.same(ins.editorText(box), text), ms: Math.round(performance.now() - t0) };
      out.emptied = ins.emptyBox(box) && !ins.editorText(box).trim();
      reset();
      t0 = performance.now();
      ins.insertLines(box, text);
      await wait(100);
      out.lines = { same: ins.same(ins.editorText(box), text), ms: Math.round(performance.now() - t0) };
      reset();
      t0 = performance.now();
      const f = await ins.fill(box, text);
      out.fill = { method: f.method, same: ins.same(f.inBox, text), ms: Math.round(performance.now() - t0) };
      return out;
    }, text);
    const ok = r.once.same && r.lines.same && r.emptied && r.fill.same;
    if (!ok) bad++;
    rows.push(`${ok ? 'ok  ' : 'FAIL'} ${type.name().padEnd(8)} ${name.padEnd(14)} ${String(text.length).padStart(6)} chars | one call: ${r.once.same ? 'exact' : 'DIFFERS'} ${r.once.ms} ms | emptied: ${r.emptied} | line by line: ${r.lines.same ? 'exact' : 'DIFFERS'} ${r.lines.ms} ms | fill: ${r.fill.method}, ${r.fill.same ? 'exact' : 'DIFFERS'}, ${r.fill.ms} ms`);
  }
  await browser.close();
}
console.log(rows.join('\n'));
console.log(bad ? `\n${bad} of ${rows.length} runs differ.` : `\nAll ${rows.length} runs give the exact text, with both methods, in both browsers.`);
process.exitCode = bad ? 1 : 0;
