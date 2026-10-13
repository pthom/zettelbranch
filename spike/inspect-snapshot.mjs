// Describes the shape of the saved snapshot JSON (fields, message tree, content block
// types, attachments) without printing account details or message text.
//
//   node inspect-snapshot.mjs [--snapshot out/snapshot.json] [--out out/snapshot-summary.json]
import fs from 'node:fs';
import path from 'node:path';
import { args, loadSnapshot, OUT_DIR, roleOf, ROOT_PARENT, SAVED_SNAPSHOT, snapshotText, writeJson } from './lib.mjs';

const opt = args({ snapshot: SAVED_SNAPSHOT, out: path.join(OUT_DIR, 'snapshot-summary.json') });
if (!fs.existsSync(opt.snapshot)) {
  console.error(`Missing ${opt.snapshot}. Expected the page's API response, saved by hand.`);
  process.exit(2);
}
const snap = loadSnapshot(opt.snapshot);
const { json, ordered } = snap;

const SENSITIVE = /email|account|org|user|creator|created_by|owner|member|name$/i;
const SAFE = new Set(['snapshot_name', 'name', 'title', 'model', 'created_at', 'updated_at', 'summary']);
function shape(v, key, depth) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return `array(${v.length})`;
  if (typeof v === 'object') {
    if (depth > 1) return `object(${Object.keys(v).length} keys)`;
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x, k, depth + 1)]));
  }
  if (SENSITIVE.test(key) && !SAFE.has(key)) return `${typeof v} (redacted)`;
  if (typeof v === 'string') return SAFE.has(key) ? `string: ${v.slice(0, 80)}` : `string(${v.length})`;
  return `${typeof v}: ${v}`;
}

const tally = (arr) => arr.reduce((o, k) => ((o[k] = (o[k] || 0) + 1), o), {});
const msgKeys = tally(snap.messages.flatMap((m) => Object.keys(m)));
const blocks = snap.messages.flatMap((m) => (Array.isArray(m.content) ? m.content : []));
const blockKeys = {};
for (const b of blocks) for (const k of Object.keys(b)) blockKeys[`${b.type}.${k}`] = (blockKeys[`${b.type}.${k}`] || 0) + 1;
const attachments = snap.messages.flatMap((m) => m.attachments || []);
const files = snap.messages.flatMap((m) => [...(m.files || []), ...(m.files_v2 || [])]);
const textField = snap.messages.filter((m) => typeof m.text === 'string');
const textMatchesContent = textField.filter((m) => Array.isArray(m.content) && m.text === m.content.filter((b) => b.type === 'text').map((b) => b.text).join('')).length;
const sizes = ordered.map((m) => snapshotText(m).length);

const summary = {
  topLevel: shape(json, '', 0),
  title: snap.title,
  messageArrayPath: snap.arrayPath,
  messageCount: snap.messages.length,
  tree: snap.tree,
  rootParentIsNullUuid: snap.messages.length ? snap.messages.filter((m) => m.parent_message_uuid === ROOT_PARENT).length : null,
  hasCurrentLeaf: 'current_leaf_message_uuid' in json,
  roles: ordered.map((m) => (roleOf(m) === 'user' ? 'U' : 'A')).join(''),
  indexes: ordered.length ? `${ordered[0].index}..${ordered[ordered.length - 1].index}` : null,
  messageKeys: msgKeys,
  contentBlockTypes: tally(blocks.map((b) => b.type)),
  contentBlockKeys: blockKeys,
  toolUseNames: tally(blocks.filter((b) => b.type === 'tool_use').map((b) => b.name)),
  artifacts: blocks.filter((b) => b.type === 'tool_use' && b.name === 'artifacts').map((b) => ({ command: b.input && b.input.command, type: b.input && b.input.type, title: b.input && b.input.title })),
  inlineArtifactTags: snap.messages.filter((m) => /<antArtifact/.test(m.text || '')).length,
  attachments: { count: attachments.length, keys: tally(attachments.flatMap((a) => Object.keys(a))), types: tally(attachments.map((a) => a.file_type || '?')) },
  files: { count: files.length, keys: tally(files.flatMap((f) => Object.keys(f))), kinds: tally(files.map((f) => f.file_kind || '?')) },
  textField: { messagesWithText: textField.length, equalToJoinedTextBlocks: textMatchesContent },
  truncated: snap.messages.filter((m) => m.truncated).length,
  stopReasons: tally(snap.messages.map((m) => m.stop_reason).filter(Boolean)),
  chars: { total: sizes.reduce((a, b) => a + b, 0), min: Math.min(...sizes), max: Math.max(...sizes) },
};
writeJson(opt.out, summary);
console.log(JSON.stringify(summary, null, 2));
