// Renders the README's demo GIF from demo/scene.html, offline, in a headless browser:
// one screenshot per frame, then ffmpeg makes the GIF. The scene's screenshots of claude.ai
// are Pascal's, taken by hand (tests/out/demo/frames, not committed).
//
//   node make-demo.mjs         ->  ../docs/images/demo.gif (12 frames a second)
//   node make-demo.mjs --mp4   ->  out/demo/zettelbranch-demo.mp4 (30 frames a second, H.264, for
//                                  social media; not committed)
//   node make-demo.mjs --social ->  out/demo/social-preview.png (the repository's link preview)
//   node make-demo.mjs --store  ->  out/store/screenshot-1.png ... screenshot-5.png (1280 x 800) and
//                                  tile-440x280.png, the Chrome Web Store listing pictures, and
//                                  sheet.png to review them at a glance (not committed)
//   node make-demo.mjs --icons  ->  ../extension/icons/icon-16.png ... icon-128.png, from
//                                  demo/icon-128.svg and demo/icon-small.svg
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const MP4 = process.argv.includes('--mp4');
// --social: the repository's link-preview image (1280 x 640), from demo/social.html.
if (process.argv.includes('--social')) {
  const out = path.join(DIR, 'out', 'demo', 'social-preview.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const b = await chromium.launch({ channel: 'chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 });
  await p.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  await p.goto('file://' + path.join(DIR, 'demo', 'social.html'));
  await p.screenshot({ path: out });
  await b.close();
  console.log(`-> ${path.relative(process.cwd(), out)}`);
  process.exit(0);
}
// --icons: the extension's icon, at the four sizes the manifest lists, on a transparent background.
if (process.argv.includes('--icons')) {
  const dir = path.join(DIR, '..', 'extension', 'icons');
  fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch({ channel: 'chromium', headless: true });
  for (const size of [16, 32, 48, 128]) {
    const svg = path.join(DIR, 'demo', size === 128 ? 'icon-128.svg' : 'icon-small.svg');
    const p = await b.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await p.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
    const src = 'data:image/svg+xml;base64,' + fs.readFileSync(svg).toString('base64');
    await p.setContent(`<style>html,body{margin:0;background:transparent}img{display:block}</style><img src="${src}" width="${size}" height="${size}">`);
    await p.waitForFunction(() => document.images[0].complete && document.images[0].naturalWidth > 0);
    const out = path.join(dir, `icon-${size}.png`);
    await p.screenshot({ path: out, omitBackground: true });
    await p.close();
    console.log(`-> ${path.relative(process.cwd(), out)}`);
  }
  await b.close();
  process.exit(0);
}
// --store: the Chrome Web Store listing pictures, from demo/store.html (one picture per page load,
// store.html?1 ... ?5, ?tile), saved as 24-bit PNG without alpha.
if (process.argv.includes('--store')) {
  const dir = path.join(DIR, 'out', 'store');
  fs.mkdirSync(dir, { recursive: true });
  const pics = [1, 2, 3, 4, 5].map((n) => [String(n), `screenshot-${n}.png`, 1280, 800]);
  pics.push(['tile', 'tile-440x280.png', 440, 280]);
  const b = await chromium.launch({ channel: 'chromium', headless: true });
  for (const [id, name, width, height] of pics) {
    const p = await b.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await p.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
    await p.goto('file://' + path.join(DIR, 'demo', 'store.html') + '?' + id);
    await p.waitForFunction(() => window.ready === true);
    const out = path.join(dir, name);
    await p.screenshot({ path: out });
    await p.close();
    execFileSync('magick', [out, '-background', 'white', '-alpha', 'remove', '-alpha', 'off', 'PNG24:' + out]);
    console.log(`-> ${path.relative(process.cwd(), out)}`);
  }
  await b.close();
  // The contact sheet: the screenshots at half size (640 x 400), the tile at full size, on light grey
  // (Google: assume the tile sits on a light grey background).
  const f = (n) => path.join(dir, n);
  const cell = ['-background', '#e4e4e4', '-gravity', 'center', '-extent', '664x424'];
  execFileSync('magick', [
    '(', f('screenshot-1.png'), f('screenshot-2.png'), f('screenshot-3.png'), '-resize', '640x400', ...cell, '+append', ')',
    '(', f('screenshot-4.png'), f('screenshot-5.png'), '-resize', '640x400', f('tile-440x280.png'), ...cell, '+append', ')',
    '-append', '-bordercolor', '#e4e4e4', '-border', '12', 'PNG24:' + f('sheet.png'),
  ]);
  console.log(`-> ${path.relative(process.cwd(), f('sheet.png'))}`);
  process.exit(0);
}
const FPS = MP4 ? 30 : 12;
const OUT = path.join(DIR, 'out', 'demo', MP4 ? 'render-mp4' : 'render');
const GIF = path.join(DIR, '..', 'docs', 'images', 'demo.gif');
const VIDEO = path.join(DIR, 'out', 'demo', 'zettelbranch-demo.mp4');

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

const input = ['-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', path.join(OUT, '%04d.png')];
const target = MP4 ? VIDEO : GIF;
if (MP4) execFileSync('ffmpeg', [...input, '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', VIDEO]);
// The palette from every frame's whole picture (stats_mode=full), 256 colours: with fewer, or from
// the changes only, the panel's pale green notes turned beige (0.2.0's demo, 4.4 MB).
else execFileSync('ffmpeg', [...input, '-vf', 'split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle', '-loop', '0', GIF]);
console.log(`${n} frames, ${duration} s -> ${path.relative(process.cwd(), target)} (${fs.statSync(target).size} bytes)`);
