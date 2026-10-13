// Zettelbranch spike: text comparison, browser copy of the logic in spike/lib.mjs and
// spike/compare.mjs. Used by P6 and P7 to compare the page with the API's message path.
// Pure functions, no DOM, no network.
(function (global) {
  'use strict';

  // Strips Markdown markup and whitespace differences, so DOM-derived Markdown and the
  // source Markdown compare on content.
  function normalize(md) {
    return String(md || '')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\[artifact: [^\]]*\]/g, ' ')
      .replace(/^\s*(`{3,}|~{3,})[^\n]*$/gm, ' ')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/^\s*>\s?/gm, '')
      .replace(/^\s*([-*+]|\d+[.)])\s+/gm, '')
      .replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/gm, ' ')
      .replace(/^\s*([-*_]\s*){3,}$/gm, ' ')
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]*)\]\(([^)]*)\)/g, '$1')
      .replace(/\\([\\`*_{}[\]()#+\-.!|<>~$])/g, '$1')
      .replace(/\\\(|\\\)|\\\[|\\\]/g, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/(\*\*|__|~~|[*_`|$])/g, ' ')
      .replace(/[<>]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  // Word-level similarity: 2 * LCS / (|a| + |b|), in [0, 1]. Inputs are normalized.
  function similarity(a, b) {
    const x = a ? a.split(' ') : [];
    const y = b ? b.split(' ') : [];
    if (!x.length && !y.length) return 1;
    if (!x.length || !y.length) return 0;
    let prev = new Uint32Array(y.length + 1);
    let cur = new Uint32Array(y.length + 1);
    for (let i = 1; i <= x.length; i++) {
      for (let j = 1; j <= y.length; j++) {
        cur[j] = x[i - 1] === y[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
      }
      [prev, cur] = [cur, prev];
    }
    return (2 * prev[y.length]) / (x.length + y.length);
  }

  function jaccard(a, b) {
    const x = new Set(a.split(' '));
    const y = new Set(b.split(' '));
    let inter = 0;
    for (const w of x) if (y.has(w)) inter++;
    return x.size + y.size ? inter / (x.size + y.size - inter) : 1;
  }

  // Aligns two lists of {role, text} like a diff, maximizing similarity; roles must match.
  // Returns per-pair similarity plus the indexes missing on either side. No text is returned.
  function align(expected, got) {
    const key = expected.map((m) => ({ role: m.role, norm: normalize(m.text) }));
    const ext = got.map((m) => ({ role: m.role, norm: normalize(m.text) }));
    const N = key.length;
    const M = ext.length;
    const score = Array.from({ length: N + 1 }, () => new Float64Array(M + 1));
    const move = Array.from({ length: N + 1 }, () => new Uint8Array(M + 1));
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
        if (key[i - 1].role === ext[j - 1].role) {
          const s = score[i - 1][j - 1] + 0.01 + jaccard(key[i - 1].norm, ext[j - 1].norm);
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
      if (mv === 1) {
        i--;
        j--;
        pairs.unshift({ expected: i + 1, got: j + 1, role: key[i].role, similarity: Math.round(similarity(key[i].norm, ext[j].norm) * 1000) / 1000 });
      } else if (mv === 2) {
        missing.unshift(--i + 1);
      } else {
        extra.unshift(--j + 1);
      }
    }
    const sims = pairs.map((p) => p.similarity);
    return {
      expected: N,
      got: M,
      matched: pairs.length,
      missing,
      extra,
      rolesEqual: key.map((k) => k.role).join() === ext.map((e) => e.role).join(),
      similarity: sims.length
        ? {
            mean: Math.round((sims.reduce((a, b) => a + b, 0) / sims.length) * 1000) / 1000,
            min: Math.min(...sims),
            exact: sims.filter((s) => s === 1).length,
            below95: pairs.filter((p) => p.similarity < 0.95).map((p) => p.expected),
          }
        : null,
    };
  }

  global.ZBCompare = { normalize, similarity, align };
})(globalThis);
