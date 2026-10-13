// Zettelbranch: titles, addresses and the registry. Pure functions, no DOM, no network.
//
// A title is `<tree>/<address> · <topic>`, for example `oulipo/1b1 · Lipograms`.
// Addresses are split into number and letter segments (`1b10` = [1, 'b', 10]); a child has
// its parent's segments plus exactly one more. Never compared as string prefixes.
// After `z`, letters continue `aa`, `ab`… The registry is the list of every title.
(function (global) {
  'use strict';

  const TREE_RE = /^[a-z0-9-]+$/;

  // '1b10' -> [1, 'b', 10]. Null if not an address.
  function parseAddress(a) {
    if (typeof a !== 'string' || !/^[0-9][0-9a-z]*$/.test(a)) return null;
    const parts = a.match(/[0-9]+|[a-z]+/g);
    const segs = [];
    for (let i = 0; i < parts.length; i++) {
      const isNum = /^[0-9]/.test(parts[i]);
      if (isNum !== (i % 2 === 0)) return null; // must alternate, starting with a number
      if (isNum && parts[i].startsWith('0')) return null;
      segs.push(isNum ? Number(parts[i]) : parts[i]);
    }
    return segs;
  }

  const formatAddress = (segs) => segs.join('');

  // 'a' = 1, 'z' = 26, 'aa' = 27… (like spreadsheet columns).
  function lettersToIndex(s) {
    let n = 0;
    for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 96);
    return n;
  }
  function indexToLetters(n) {
    let s = '';
    while (n > 0) {
      const r = (n - 1) % 26;
      s = String.fromCharCode(97 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  // `oulipo/1b · Topic` -> { tree, address, segs, topic }. Null if not a tree title.
  function parseTitle(title) {
    const m = /^([a-z0-9-]+)\/([0-9][0-9a-z]*)(?:\s+·\s+([\s\S]*))?$/.exec(String(title || '').trim());
    if (!m) return null;
    const segs = parseAddress(m[2]);
    if (!segs) return null;
    return { tree: m[1], address: m[2], segs, topic: m[3] === undefined ? '' : m[3] };
  }

  const formatTitle = (tree, address, topic) => `${tree}/${address} · ${topic}`;

  function isChild(childSegs, parentSegs) {
    if (childSegs.length !== parentSegs.length + 1) return false;
    return parentSegs.every((s, i) => s === childSegs[i]);
  }

  // Next free child address of `parentSegs` among the titles (same tree only).
  function nextChild(tree, parentSegs, titles) {
    const kids = titles.map(parseTitle).filter((t) => t && t.tree === tree && isChild(t.segs, parentSegs));
    const lastIsNumber = typeof parentSegs[parentSegs.length - 1] === 'number';
    let max = 0;
    for (const k of kids) {
      const s = k.segs[k.segs.length - 1];
      max = Math.max(max, lastIsNumber ? lettersToIndex(s) : s);
    }
    const next = lastIsNumber ? indexToLetters(max + 1) : max + 1;
    return { address: formatAddress([...parentSegs, next]), existingChildren: kids.map((k) => k.address) };
  }

  // Next free root number of a tree: 1 for a new tree.
  function nextRoot(tree, titles) {
    let max = 0;
    for (const t of titles.map(parseTitle)) if (t && t.tree === tree && t.segs.length === 1) max = Math.max(max, t.segs[0]);
    return String(max + 1);
  }

  // Addresses from the root down to `segs` itself: [1,'b',1] -> ['1','1b','1b1'].
  function ancestry(segs) {
    return segs.map((_, i) => formatAddress(segs.slice(0, i + 1)));
  }

  const isTreeName = (s) => typeof s === 'string' && TREE_RE.test(s);

  // A tree name proposed from a title: its first word that has letters or digits,
  // lowercased, accents dropped, only a-z 0-9 and -, at most 12 characters. 'tree' if none.
  function proposeTreeName(title) {
    for (const word of String(title || '').split(/\s+/)) {
      const s = word.toLowerCase().normalize('NFD').replace(/[^a-z0-9-]/g, '').slice(0, 12).replace(/^-+|-+$/g, '');
      if (s) return s;
    }
    return 'tree';
  }

  global.ZBTree = {
    parseAddress, formatAddress, lettersToIndex, indexToLetters, parseTitle, formatTitle,
    isChild, nextChild, nextRoot, ancestry, isTreeName, proposeTreeName,
  };
})(globalThis);
