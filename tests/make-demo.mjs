// Renders the README's demo GIF from demo/scene.html, offline, in a headless browser:
// one screenshot per frame, then ffmpeg makes the GIF. The scene's screenshots of claude.ai
// are Pascal's, taken by hand (tests/out/demo/frames, not committed).
//
//   node make-demo.mjs   ->  ../docs/images/demo.gif
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const FPS = 12;
const OUT = path.join(DIR, 'out', 'demo', 'render');
const GIF = path.join(DIR, '..', 'docs', 'images', 'demo.gif');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 880, height: 800 }, deviceScaleFactor: 1 });
// Local files only.
await page.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
await page.goto('file://' + path.join(DIR, 'demo', 'scene.html'));
await page.waitForFunction(() => window.ready === true);
const duration = await page.evaluate(() => DURATION);
const n = Math.round(duration * FPS);
for (let i = 0; i < n; i++) {
  await page.evaluate((t) => render(t), i / FPS);
  await page.screenshot({ path: path.join(OUT, String(i).padStart(4, '0') + '.png') });
}
await browser.close();

execFileSync('ffmpeg', [
  '-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', path.join(OUT, '%04d.png'),
  '-vf', 'split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle',
  '-loop', '0', GIF,
]);
console.log(`${n} frames, ${duration} s -> ${path.relative(process.cwd(), GIF)} (${fs.statSync(GIF).size} bytes)`);
