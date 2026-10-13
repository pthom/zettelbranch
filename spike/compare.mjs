// Compares what the content script extracted from the page with the page's own JSON
// (the answer key): message count, role sequence, per-message text similarity after
// normalizing whitespace and Markdown markup, and structural features (code blocks and
// their language, tables, math, links...).
//
//   node compare.mjs [--extracted out/extracted.json] [--snapshot out/snapshot.json] [--out out/compare.json]
import fs from 'node:fs';
import path from 'node:path';
import { args, features, firstDiff, loadSnapshot, normalize, OUT_DIR, roleOf, SAVED_SNAPSHOT, similarity, snapshotText, writeJson } from './lib.mjs';

const defaultExtracted = fs.existsSync(path.join(OUT_DIR, 'extracted.json'))
  ? path.join(OUT_DIR, 'extracted.json')
  : path.join(OUT_DIR, 'extracted-offline.json');
const opt = args({ extracted: defaultExtracted, snapshot: SAVED_SNAPSHOT, out: path.join(OUT_DIR, 'compare.json') });

for (const f of [opt.extracted, opt.snapshot]) {
  if (!fs.existsSync(f)) {
    console.error(`Missing ${f}`);
    process.exit(2);
  }
}
const extracted = JSON.parse(fs.readFileSync(opt.extracted, 'utf8'));
if (!extracted.messages) {
  console.error(`${opt.extracted} holds no messages: ${JSON.stringify(extracted.error || extracted).slice(0, 300)}`);
  process.exit(2);
}
const snap = loadSnapshot(opt.snapshot);

const key = snap.ordered.map((m, i) => {
  const text = snapshotText(m, { placeholders: false });
  return { i, role: roleOf(m), text, norm: normalize(text), feat: features(text) };
});
const got = extracted.messages.map((m, i) => ({ i, role: m.role, text: m.markdown, norm: normalize(m.markdown), feat: features(m.markdown) }));

// ---------------------------------------------------------------- alignment

// Cheap similarity for the alignment: overlap of word sets.
function jaccard(a, b) {
  const x = new Set(a.split(' '));
  const y = new Set(b.split(' '));
  let inter = 0;
  for (const w of x) if (y.has(w)) inter++;
  return x.size + y.size ? inter / (x.size + y.size - inter) : 1;
}

// Monotonic alignment (like a diff) that maximizes total similarity; roles must match.
const N = key.length;
const M = got.length;
const score = Array.from({ length: N + 1 }, () => new Float64Array(M + 1));
const move = Array.from({ length: N + 1 }, () => new Uint8Array(M + 1)); // 1 diag, 2 skip key, 3 skip got
for (let i = 1; i <= N; i++) move[i][0] = 2;
for (let j = 1; j <= M; j++) move[0][j] = 3;
for (let i = 1; i <= N; i++) {
  for (let j = 1; j <= M; j++) {
    let best = score[i - 1][j];
    let mv = 2;
    if (score[i][j - 1] > best) {
      best = score[i][j - 1];
      mv = 3;
    }
    if (key[i - 1].role === got[j - 1].role) {
      const s = score[i - 1][j - 1] + 0.01 + jaccard(key[i - 1].norm, got[j - 1].norm);
      if (s > best) {
        best = s;
        mv = 1;
      }
    }
    score[i][j] = best;
    move[i][j] = mv;
  }
}
const pairs = [];
const missing = [];
const extra = [];
for (let i = N, j = M; i > 0 || j > 0; ) {
  const mv = move[i][j];
  if (mv === 1) pairs.unshift([--i, --j]);
  else if (mv === 2) missing.unshift(--i);
  else extra.unshift(--j);
}

// ---------------------------------------------------------------- per message

const FEATURES = ['codeBlocks', 'codeLangs', 'tableRows', 'headings', 'listItems', 'links', 'inlineCode', 'math', 'artifacts'];
const rows = pairs.map(([i, j]) => {
  const k = key[i];
  const g = got[j];
  const sim = similarity(k.norm, g.norm);
  const diffs = {};
  for (const f of FEATURES) if (k.feat[f] !== g.feat[f]) diffs[f] = { expected: k.feat[f], got: g.feat[f] };
  return {
    key: i + 1,
    extracted: j + 1,
    role: k.role,
    similarity: Math.round(sim * 10000) / 10000,
    chars: { expected: k.text.length, got: g.text.length },
    featureDiffs: diffs,
    firstDiff: sim < 1 ? firstDiff(k.norm, g.norm) : null,
  };
});

const sims = rows.map((r) => r.similarity);
const totals = {};
for (const f of FEATURES.filter((f) => f !== 'codeLangs')) {
  totals[f] = { expected: key.reduce((s, k) => s + k.feat[f], 0), got: got.reduce((s, g) => s + g.feat[f], 0) };
}
const summary = {
  snapshot: { title: snap.title, messages: N, arrayPath: snap.arrayPath, order: snap.tree.method },
  extracted: { file: path.basename(opt.extracted), messages: M, selectors: extracted.selectors },
  matched: pairs.length,
  missingFromExtraction: missing.map((i) => ({ key: i + 1, role: key[i].role, chars: key[i].text.length })),
  extraInExtraction: extra.map((j) => ({ extracted: j + 1, role: got[j].role, chars: got[j].text.length })),
  roleSequence: {
    expected: key.map((k) => (k.role === 'user' ? 'U' : 'A')).join(''),
    got: got.map((g) => (g.role === 'user' ? 'U' : 'A')).join(''),
  },
  similarity: sims.length
    ? {
        mean: Math.round((sims.reduce((a, b) => a + b, 0) / sims.length) * 10000) / 10000,
        min: Math.min(...sims),
        exact: sims.filter((s) => s === 1).length,
        atLeast99: sims.filter((s) => s >= 0.99).length,
        atLeast95: sims.filter((s) => s >= 0.95).length,
        below90: sims.filter((s) => s < 0.9).length,
      }
    : null,
  featureTotals: totals,
};
summary.roleSequence.equal = summary.roleSequence.expected === summary.roleSequence.got;
const mismatches = rows.filter((r) => r.similarity < 0.99 || Object.keys(r.featureDiffs).length);
writeJson(opt.out, { summary, mismatches, rows });

// ---------------------------------------------------------------- print

console.log(`answer key: ${N} messages ("${snap.title}"), extracted: ${M}, matched: ${pairs.length}`);
console.log(`roles equal: ${summary.roleSequence.equal}`);
if (!summary.roleSequence.equal) console.log(`  expected ${summary.roleSequence.expected}\n  got      ${summary.roleSequence.got}`);
if (missing.length) console.log(`missing from extraction: ${missing.map((i) => i + 1).join(', ')}`);
if (extra.length) console.log(`extra in extraction: ${extra.map((j) => j + 1).join(', ')}`);
if (summary.similarity) console.log(`similarity: ${JSON.stringify(summary.similarity)}`);
console.log('feature totals (expected / got):');
for (const [f, v] of Object.entries(totals)) console.log(`  ${f.padEnd(11)} ${String(v.expected).padStart(5)} / ${v.got}${v.expected === v.got ? '' : '   <-- differs'}`);
console.log(`messages with similarity < 0.99 or a feature difference: ${mismatches.length}`);
for (const r of mismatches.slice(0, 40)) {
  const d = Object.entries(r.featureDiffs).map(([f, v]) => `${f} ${v.expected}->${v.got}`).join(', ');
  console.log(`  #${r.key} ${r.role} sim ${r.similarity}${d ? '  ' + d : ''}`);
  if (r.firstDiff) console.log(`      expected: …${r.firstDiff.expected}…\n      got:      …${r.firstDiff.got}…`);
}
console.log(`wrote ${path.relative(process.cwd(), opt.out)}`);
