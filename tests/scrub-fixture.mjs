// Turns API answers saved by hand into committed fixtures.
//
//   node scrub-fixture.mjs --conversation out/fixture-conversation.json --list out/fixture-list.json
//
// The list keeps only `zbtest/` conversations: every other title is private. Every id is
// replaced by a fake one, the same in both files, so the links between messages and
// between the list and the conversation still hold. Nothing else changes.
import fs from 'node:fs';
import path from 'node:path';
import { args } from './lib.mjs';

const opt = args({
  conversation: 'out/fixture-conversation.json',
  list: 'out/fixture-list.json',
  out: 'fixtures',
  name: 'real',
});

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
const fakes = new Map();
const fake = (id) => {
  if (!fakes.has(id)) fakes.set(id, `f0000000-0000-4000-8000-${String(fakes.size + 1).padStart(12, '0')}`);
  return fakes.get(id);
};
const scrub = (obj) => JSON.parse(JSON.stringify(obj).replace(UUID, fake));

const conv = JSON.parse(fs.readFileSync(opt.conversation, 'utf8'));
const list = JSON.parse(fs.readFileSync(opt.list, 'utf8'));
if (!Array.isArray(conv.chat_messages)) throw new Error('the conversation file has no chat_messages');
if (!Array.isArray(list.data)) throw new Error('the list file has no data array');
if (!String(conv.name).startsWith('zbtest/')) throw new Error('the conversation is not a zbtest/ chat');

const keptList = { ...list, data: list.data.filter((c) => String(c.name).startsWith('zbtest/')) };
const outConv = scrub(conv);
const outList = scrub(keptList);

fs.mkdirSync(opt.out, { recursive: true });
const write = (file, obj) => fs.writeFileSync(path.join(opt.out, file), JSON.stringify(obj, null, 2) + '\n');
write(`${opt.name}-conversation.json`, outConv);
write(`${opt.name}-list.json`, outList);
console.log(`${opt.name}-conversation.json: ${outConv.chat_messages.length} messages`);
console.log(`${opt.name}-list.json: ${outList.data.length} of ${list.data.length} conversations kept (zbtest/ only)`);
console.log(`${fakes.size} ids replaced`);
