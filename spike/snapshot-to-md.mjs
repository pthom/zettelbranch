// Writes the conversation as Markdown from the saved snapshot JSON (the answer key, the
// most faithful source). Message text is kept exactly as in the JSON; non-text parts
// become one-line placeholders. No account details.
//
//   node snapshot-to-md.mjs [--snapshot out/snapshot.json] [--out ../specs/done/origin-conversation/zettelbranch__origin-conversation.md] [--date 2026-10-13]
import fs from 'node:fs';
import path from 'node:path';
import { args, loadSnapshot, roleOf, SAVED_SNAPSHOT, SHARE_URL, SPIKE_DIR, snapshotText } from './lib.mjs';

const opt = args({
  snapshot: SAVED_SNAPSHOT,
  out: path.join(SPIKE_DIR, '..', 'specs', 'done', 'origin-conversation', 'zettelbranch__origin-conversation.md'),
  date: '2026-10-13',
  url: SHARE_URL,
});
if (!fs.existsSync(opt.snapshot)) {
  console.error(`Missing ${opt.snapshot}. Expected the page's API response, saved by hand.`);
  process.exit(2);
}
const snap = loadSnapshot(opt.snapshot);
const lines = [
  '# Original design conversation',
  '',
  `- Share link: ${opt.url}`,
  `- Retrieved: ${opt.date}, from the page's own JSON, saved by hand by Pascal in his browser`,
  `- Title: ${snap.title || '(none)'}`,
  `- Messages: ${snap.ordered.length}`,
  '',
  'Message text is exactly as in the JSON. Non-text parts (thinking, tool use, artifacts,',
  'attachments) are one-line placeholders.',
  '',
];
snap.ordered.forEach((m, i) => {
  lines.push(`## ${i + 1} · ${roleOf(m) === 'user' ? 'Pascal' : 'Claude'}`, '', snapshotText(m, { placeholders: true }).trimEnd(), '');
});
fs.writeFileSync(opt.out, lines.join('\n'));
console.log(`wrote ${path.relative(process.cwd(), opt.out)}: ${snap.ordered.length} messages, title "${snap.title}"`);
