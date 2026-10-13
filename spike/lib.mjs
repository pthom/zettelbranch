// Shared helpers for the P0 spike scripts. Throwaway code.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SPIKE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const OUT_DIR = path.join(SPIKE_DIR, 'out');
export const EXT_DIR = path.join(SPIKE_DIR, 'extension');
export const PROFILE_DIR = path.join(os.homedir(), '.cache', 'zettelbranch', 'chromium-profile');
export const SHARE_URL = 'https://claude.ai/share/b6ff02e2-cfa2-49f7-a7f5-8557f0ebca66';

// Files Pascal saves by hand in his own browser.
export const SAVED_HTML = path.join(OUT_DIR, 'share-page.html'); // Cmd+S, "Webpage, Complete"
export const SAVED_SNAPSHOT = path.join(OUT_DIR, 'snapshot.json'); // the page's API response

// Minimal `--name value` argument parsing.
export function args(defaults) {
  const out = { ...defaults };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith('--')) continue;
    const key = a[i].slice(2);
    const next = a[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
    } else {
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

// ---------------------------------------------------------------- bot checks

// Signs that a saved page is a bot check rather than the conversation.
export function challengeMarkers(html) {
  const found = [];
  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  if (title && /just a moment|attention required/i.test(title[1])) found.push(`title "${title[1].trim()}"`);
  for (const [re, label] of [
    [/challenges\.cloudflare\.com/i, 'challenges.cloudflare.com'],
    [/id=["']?challenge-form/i, 'challenge form'],
    [/cf-turnstile|turnstile\/v0/i, 'Turnstile'],
    [/hcaptcha\.com|h-captcha/i, 'hCaptcha'],
    [/_cf_chl_opt|cf-chl-/i, 'Cloudflare challenge script'],
  ]) {
    if (re.test(html)) found.push(label);
  }
  return found;
}

// ---------------------------------------------------------------- snapshot (answer key)

// Finds the message array anywhere in the saved JSON: the largest array of objects that
// carry a `sender` (or `role`) field. Tolerates a wrapped or slightly different shape.
export function findMessageArray(json) {
  let best = null;
  let bestPath = null;
  (function walk(v, p) {
    if (Array.isArray(v)) {
      if (v.length && v.every((m) => m && typeof m === 'object' && ('sender' in m || 'role' in m))) {
        if (!best || v.length > best.length) {
          best = v;
          bestPath = p;
        }
      }
      v.forEach((x, i) => walk(x, `${p}[${i}]`));
    } else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) walk(x, p ? `${p}.${k}` : k);
    }
  })(json, '');
  return { messages: best || [], path: bestPath };
}

export const ROOT_PARENT = '00000000-0000-4000-8000-000000000000';

// Orders the messages along the shown path and describes the tree shape.
export function orderMessages(json, messages) {
  const byId = new Map(messages.filter((m) => m.uuid).map((m) => [m.uuid, m]));
  const children = new Map();
  for (const m of messages) {
    const p = m.parent_message_uuid;
    if (p === undefined) continue;
    if (!children.has(p)) children.set(p, []);
    children.get(p).push(m);
  }
  const hasParents = messages.some((m) => m.parent_message_uuid !== undefined);
  const branchPoints = [...children.entries()].filter(([, c]) => c.length > 1).length;
  const leafId = json && (json.current_leaf_message_uuid || null);
  let ordered;
  let method;
  if (leafId && byId.has(leafId)) {
    ordered = [];
    for (let m = byId.get(leafId); m; m = byId.get(m.parent_message_uuid)) ordered.unshift(m);
    method = 'walk from current_leaf_message_uuid';
  } else if (messages.every((m) => typeof m.index === 'number')) {
    ordered = [...messages].sort((a, b) => a.index - b.index);
    method = 'sort by index';
  } else {
    ordered = [...messages];
    method = 'array order';
  }
  // Does each message's parent equal the previous message? Then the array is one chain.
  let chainBreaks = 0;
  if (hasParents) {
    ordered.forEach((m, i) => {
      const expected = i === 0 ? null : ordered[i - 1].uuid;
      if (i > 0 && m.parent_message_uuid !== expected) chainBreaks++;
    });
  }
  const roots = hasParents ? messages.filter((m) => !byId.has(m.parent_message_uuid)).length : null;
  return {
    ordered,
    tree: { method, hasParents, roots, branchPoints, chainBreaks, single_chain: hasParents && branchPoints === 0 && chainBreaks === 0 },
  };
}

export function roleOf(m) {
  const s = m.sender || m.role;
  return s === 'human' || s === 'user' ? 'user' : s === 'assistant' ? 'assistant' : String(s);
}

function artifactPlaceholder(attrs) {
  const t = /title="([^"]*)"/.exec(attrs);
  const id = /identifier="([^"]*)"/.exec(attrs);
  return `[artifact: ${(t && t[1]) || (id && id[1]) || 'untitled'}, not copied]`;
}

// Old-style inline tags in message text, if any.
function replaceInlineTags(text, withPlaceholders) {
  return text
    .replace(/<antArtifact([^>]*)>[\s\S]*?<\/antArtifact>/g, (_, a) => (withPlaceholders ? artifactPlaceholder(a) : ''))
    .replace(/<antThinking>[\s\S]*?<\/antThinking>/g, withPlaceholders ? '[thinking, left out]' : '');
}

// The message as Markdown. With placeholders: one line per non-text part (for the
// origin-conversation file). Without: only what the page renders as message text (for
// the comparison), plus artifact placeholders, which the DOM extractor also writes.
export function snapshotText(m, { placeholders = true } = {}) {
  const parts = [];
  const atts = [...(m.attachments || [])];
  const files = [...(m.files_v2 || m.files || [])];
  if (placeholders) {
    for (const a of atts) {
      const size = a.extracted_content ? `, ${a.extracted_content.length} characters` : '';
      parts.push(`[attachment: ${a.file_name || 'unnamed'}${size}, not copied]`);
    }
    for (const f of files) parts.push(`[file: ${f.file_name || f.file_kind || 'unnamed'}, not copied]`);
  }
  if (Array.isArray(m.content) && m.content.length) {
    for (const b of m.content) {
      if (b.type === 'text') {
        if (b.text) parts.push(replaceInlineTags(b.text, placeholders));
      } else if (b.type === 'tool_use' && b.name === 'artifacts') {
        const inp = b.input || {};
        parts.push(`[artifact: ${inp.title || inp.id || 'untitled'}, not copied]`);
      } else if (!placeholders) {
        continue;
      } else if (b.type === 'thinking' || b.type === 'redacted_thinking') {
        parts.push('[thinking, left out]');
      } else if (b.type === 'tool_use') {
        parts.push(`[tool use: ${b.name || 'unknown'}, left out]`);
      } else if (b.type === 'tool_result') {
        parts.push(`[tool result: ${b.name || 'unknown'}, left out]`);
      } else {
        parts.push(`[${b.type} block, left out]`);
      }
    }
  } else if (typeof m.text === 'string') {
    parts.push(replaceInlineTags(m.text, placeholders));
  }
  return parts.join('\n\n');
}

export function loadSnapshot(file) {
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { messages, path: arrayPath } = findMessageArray(json);
  const { ordered, tree } = orderMessages(json, messages);
  const title = json.snapshot_name || json.name || json.title || (json.conversation && json.conversation.name) || null;
  return { json, arrayPath, messages, ordered, tree, title };
}

// ---------------------------------------------------------------- comparison helpers

// Strips Markdown markup and whitespace differences, so DOM-derived Markdown and the
// source Markdown compare on content.
export function normalize(md) {
  return md
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

// Word-level similarity: 2 * LCS / (|a| + |b|), in [0, 1].
export function similarity(a, b) {
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

// First place where two normalized texts differ, with some context.
export function firstDiff(a, b, width = 80) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length && i === b.length) return null;
  const from = Math.max(0, i - 30);
  return { at: i, expected: a.slice(from, from + width), got: b.slice(from, from + width) };
}

// Structural features of a Markdown text.
export function features(md) {
  const lines = md.split('\n');
  const fenceLines = lines.filter((l) => /^\s*(`{3,}|~{3,})/.test(l));
  const langs = fenceLines.map((l) => /^\s*(?:`{3,}|~{3,})\s*([^\s`]+)/.exec(l)).filter(Boolean).map((m) => m[1].toLowerCase());
  const noCode = md.replace(/^\s*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s*\1\s*$/gm, '');
  return {
    codeBlocks: Math.floor(fenceLines.length / 2),
    codeLangs: langs.sort().join(','),
    tableRows: noCode.split('\n').filter((l) => /^\s*\|.*\|\s*$/.test(l) && !/^\s*\|?\s*:?-{3,}/.test(l)).length,
    headings: (noCode.match(/^\s{0,3}#{1,6}\s/gm) || []).length,
    listItems: (noCode.match(/^\s*([-*+]|\d+[.)])\s+\S/gm) || []).length,
    links: (noCode.match(/\[[^\]]+\]\([^)]+\)/g) || []).length + (noCode.replace(/\[[^\]]+\]\([^)]+\)/g, ' ').match(/(^|[\s(<])https?:\/\/\S+/g) || []).length,
    inlineCode: (noCode.match(/`[^`\n]+`/g) || []).length,
    math: (noCode.match(/\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+\$/g) || []).length,
    artifacts: (md.match(/\[artifact: /g) || []).length,
  };
}
