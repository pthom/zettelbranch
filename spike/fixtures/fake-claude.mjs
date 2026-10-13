// Fake claude.ai for the offline probe tests: the app shell (fixtures/chat-app/), the four
// API endpoints the extension calls, and the app's own /fake/ endpoints. Everything is
// answered from memory by a Playwright route handler; no request leaves the machine.
//
// Seed data: private chats (one with SECRET text, 118 fillers so the list needs 2 pages,
// a 60-message chat with an attachment), and a small zbtest tree: zbtest/1 (with an edited
// message, so the tree has a branch point), zbtest/1a (a real branch, for flattening),
// zbtest/1a1 and zbtest/10 (to check that addresses are compared by segments).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'chat-app');
export const ORG_CHAT = '11111111-1111-4111-8111-111111111111';
export const ORG_API = '22222222-2222-4222-8222-222222222222';
export const ROOT = '00000000-0000-4000-8000-000000000000';
export const SECRETS = ['SECRET-PRIVATE-TEXT', 'ATTACHMENT-SECRET-TEXT', 'Private planning notes', 'Private chat 0', 'Long private chat'];

export function createFakeClaude() {
  let counter = 0;
  const uuid = () => {
    counter++;
    const h = counter.toString(16).padStart(12, '0');
    return `${h.slice(0, 8)}-0000-4000-8000-${h}`;
  };
  let clock = Date.parse('2026-09-01T08:00:00Z');
  const now = () => new Date((clock += 60000)).toISOString();

  const convs = new Map();
  const apiLog = [];

  function newConv(name) {
    const c = { uuid: uuid(), name, created_at: now(), updated_at: null, messages: [], leaf: null };
    c.updated_at = c.created_at;
    convs.set(c.uuid, c);
    return c;
  }
  function add(c, sender, text, opts = {}) {
    const m = {
      uuid: uuid(),
      sender,
      index: c.messages.length,
      parent_message_uuid: opts.parent || c.leaf || ROOT,
      text,
      content: [{ type: 'text', text, citations: [] }],
      attachments: opts.attachments || [],
      files: [],
      files_v2: opts.files || [],
      created_at: now(),
      ...(sender === 'assistant' ? { stop_reason: 'end_turn' } : {}),
    };
    c.messages.push(m);
    if (!opts.offPath) c.leaf = m.uuid;
    c.updated_at = m.created_at;
    return m;
  }
  function pathOf(c) {
    const byId = new Map(c.messages.map((m) => [m.uuid, m]));
    const out = [];
    for (let m = byId.get(c.leaf); m; m = byId.get(m.parent_message_uuid)) out.unshift(m);
    return out;
  }

  // ---------------------------------------------------------------- seed

  const priv = newConv('Private planning notes');
  add(priv, 'human', 'SECRET-PRIVATE-TEXT: my plans for the garden.');
  add(priv, 'assistant', 'Plant the SECRET-PRIVATE-TEXT tomatoes in May.');
  add(priv, 'human', 'And the beans?');
  add(priv, 'assistant', 'In June.');
  for (let i = 1; i <= 118; i++) {
    const c = newConv(`Private chat ${String(i).padStart(3, '0')}`);
    add(c, 'human', `Question ${i}`);
    add(c, 'assistant', `Answer ${i}`);
  }
  const long = newConv('Long private chat');
  for (let i = 1; i <= 60; i++) {
    if (i % 2) {
      add(long, 'human', `Long chat question ${i}`, i === 5
        ? { attachments: [{ file_name: 'notes.txt', file_type: 'text/plain', file_size: 40, extracted_content: 'ATTACHMENT-SECRET-TEXT line one\nline two of the attached notes' }], files: [{ file_kind: 'image', file_name: 'pic.png' }] }
        : {});
    } else {
      add(long, 'assistant', `Long chat answer ${i}`);
    }
  }

  const root = newConv('zbtest/1 · Root topic');
  add(root, 'human', 'What is a Zettelkasten? And how is a literal <zb-turn> tag escaped?');
  const a2 = add(root, 'assistant', 'A Zettelkasten is a box of cards with addresses and links between them.');
  add(root, 'human', 'OLD VERSION of message 3, before an edit', { parent: a2.uuid, offPath: true });
  add(root, 'human', 'How does branching work?', { parent: a2.uuid });
  add(root, 'assistant', 'Branching means continuing a card under a new address.');

  const branch = newConv('zbtest/1a · First branch');
  add(branch, 'human', [
    'Zettelbranch · zbtest/1a',
    'Path: zbtest/1 › 1a',
    'Forked from: zbtest/1 · Root topic, after message 2 (Claude): "A Zettelkasten is a box of cards with addresses and links…"',
    '',
    '<zb-transcript>',
    '<zb-turn branch="1" n="1" role="user">',
    'What is a Zettelkasten? And how is a literal &lt;zb-turn> tag escaped?',
    '</zb-turn>',
    '<zb-turn branch="1" n="2" role="assistant">',
    'A Zettelkasten is a box of cards with addresses and links between them.',
    '</zb-turn>',
    '</zb-transcript>',
    '',
    '<zb-instructions>',
    'The transcript above is our conversation so far, copied from the conversation zbtest/1 up to message 2. (…)',
    '</zb-instructions>',
    '',
    'Tell me about addresses.',
  ].join('\n'));
  add(branch, 'assistant', '> Parent zbtest/1 in brief: We defined a Zettelkasten as a box of linked cards.\n\nAddresses look like 1, 1a, 1a1.');
  add(branch, 'human', 'And letters after z?');
  add(branch, 'assistant', 'They continue with aa, ab.');

  const grand = newConv('zbtest/1a1 · Grandchild');
  add(grand, 'human', 'Grandchild question');
  add(grand, 'assistant', 'Grandchild answer');
  const ten = newConv('zbtest/10 · Sibling root');
  add(ten, 'human', 'Root ten question');
  add(ten, 'assistant', 'Root ten answer');

  // ---------------------------------------------------------------- replies

  function reply(text, attachments) {
    if (/Reply only with the exact text of line 3\./.test(text)) {
      const all = [text, ...attachments.map((a) => a.extracted_content || '')].join('\n');
      const m = /^Line 00003: .*$/m.exec(all);
      return m ? m[0] : 'I cannot find line 3.';
    }
    if (text.startsWith('Zettelbranch · ') && text.includes('<zb-instructions>')) {
      const parent = /"Parent (\S+) in brief:"/.exec(text);
      const own = text.slice(text.indexOf('</zb-instructions>') + '</zb-instructions>'.length).trim();
      return `> Parent ${parent ? parent[1] : '?'} in brief: We talked about card boxes and their addresses. The last point was how branches are named.\n\n${own ? 'Here is my answer to your message.' : ''}`.trim();
    }
    return 'ok';
  }
  function autoTitle(text) {
    if (text.startsWith('Zettelbranch · ') && text.includes('<zb-instructions>')) return 'Auto title of a branch';
    return 'Auto: ' + text.replace(/[^A-Za-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean).slice(0, 4).join(' ');
  }

  // ---------------------------------------------------------------- JSON shapes

  const listItem = (c) => ({ uuid: c.uuid, name: c.name, summary: '', model: 'claude-fake', created_at: c.created_at, updated_at: c.updated_at, is_starred: false, project_uuid: null, current_leaf_message_uuid: c.leaf });
  const convJson = (c) => ({ ...listItem(c), settings: {}, chat_messages: c.messages });
  const byRecent = () => [...convs.values()].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));

  // ---------------------------------------------------------------- route handler

  const json = (route, status, body) =>
    route.fulfill({ status, body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

  async function api(route, req, url) {
    const p = url.pathname;
    const entry = { method: req.method(), path: p.replace(ORG_CHAT, '<org>') + url.search };
    apiLog.push(entry);
    const done = (status, body) => {
      entry.status = status;
      return json(route, status, body);
    };
    if (p === '/api/organizations' && req.method() === 'GET') {
      return done(200, [
        { uuid: ORG_API, name: 'API org', capabilities: ['api'] },
        { uuid: ORG_CHAT, name: 'Personal', capabilities: ['chat', 'claude_pro'] },
      ]);
    }
    const m = /^\/api\/organizations\/([^/]+)\/(chat_conversations_v2|chat_conversations\/([0-9a-f-]{36}))$/.exec(p);
    if (!m) return done(404, { type: 'error', error: { type: 'not_found_error', message: 'Not found' } });
    if (m[1] !== ORG_CHAT) return done(403, { type: 'error', error: { type: 'permission_error', message: 'Invalid authorization' } });
    if (m[2] === 'chat_conversations_v2' && req.method() === 'GET') {
      const limit = Number(url.searchParams.get('limit') || 1000);
      const offset = Number(url.searchParams.get('offset') || 0);
      const all = byRecent();
      return done(200, { data: all.slice(offset, offset + limit).map(listItem), has_more: offset + limit < all.length });
    }
    const c = convs.get(m[3]);
    if (!c) return done(404, { type: 'error', error: { type: 'not_found_error', message: 'Conversation not found' } });
    if (req.method() === 'GET') return done(200, convJson(c));
    if (req.method() === 'PUT') {
      const body = JSON.parse(req.postData() || '{}');
      entry.name = body.name;
      c.name = body.name;
      c.updated_at = now();
      return done(202, listItem(c));
    }
    return done(405, { type: 'error', error: { type: 'method_not_allowed' } });
  }

  async function fake(route, req, url) {
    const p = url.pathname;
    if (p === '/fake/list') return json(route, 200, byRecent().slice(0, 30).map((c) => ({ uuid: c.uuid, name: c.name })));
    let m = /^\/fake\/conv\/([0-9a-f-]{36})$/.exec(p);
    if (m) {
      const c = convs.get(m[1]);
      if (!c) return json(route, 404, {});
      return json(route, 200, { name: c.name, messages: pathOf(c).map((x) => ({ role: x.sender === 'human' ? 'user' : 'assistant', text: x.text, attachments: x.attachments })) });
    }
    if (p === '/fake/send' && req.method() === 'POST') {
      const body = JSON.parse(req.postData());
      const c = body.conversationId ? convs.get(body.conversationId) : newConv('');
      add(c, 'human', body.text, { attachments: body.attachments || [] });
      add(c, 'assistant', reply(body.text, body.attachments || []));
      if (!c.name) c.name = autoTitle(body.text);
      return json(route, 200, { id: c.uuid });
    }
    return json(route, 404, {});
  }

  async function handle(route) {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin !== 'https://claude.ai') {
      await route.abort('blockedbyclient');
      return 'aborted: not claude.ai';
    }
    if (url.pathname.startsWith('/api/')) {
      await api(route, req, url);
      return 'fake api';
    }
    if (url.pathname.startsWith('/fake/')) {
      await fake(route, req, url);
      return 'fake app endpoint';
    }
    if (url.pathname === '/fixture-app/app.js') {
      await route.fulfill({ status: 200, body: fs.readFileSync(path.join(DIR, 'app.js')), headers: { 'content-type': 'text/javascript', 'cache-control': 'no-store' } });
      return 'app.js';
    }
    if (req.resourceType() === 'document' && /^\/(new)?$|^\/chat\/[0-9a-f-]{36}$/.test(url.pathname)) {
      await route.fulfill({ status: 200, body: fs.readFileSync(path.join(DIR, 'index.html')), headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
      return 'app shell';
    }
    await route.abort('blockedbyclient');
    return 'aborted: unknown path';
  }

  const ids = { priv: priv.uuid, long: long.uuid, root: root.uuid, branch: branch.uuid, grand: grand.uuid, ten: ten.uuid };
  return { handle, apiLog, convs, ids, pathOf };
}
