// Unit tests: the extension's files run in a jsdom window, as plain scripts, the way the
// browser runs content scripts. No network: api.js gets a stub `fetch`.
//
//   node --test unit.test.mjs
import fs from 'node:fs';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { loadIntoWindow } from './lib.mjs';

const ORG = '11111111-1111-4111-8111-111111111111';
const CONV = 'aaaaaaaa-0000-4000-8000-000000000001';
const SECRET = 'SECRET-PRIVATE-TEXT';

// ---------------------------------------------------------------- tree.js

describe('tree.js', () => {
  const T = loadIntoWindow(['tree.js']).ZBTree;

  test('addresses split into alternating segments', () => {
    assert.deepEqual([...T.parseAddress('1b10')], [1, 'b', 10]);
    assert.deepEqual([...T.parseAddress('12')], [12]);
    assert.deepEqual([...T.parseAddress('1aa3')], [1, 'aa', 3]);
    for (const bad of ['', 'a1', '01', '1b01', '1B', '1-b', null]) assert.equal(T.parseAddress(bad), null, String(bad));
  });

  test('letters go on after z', () => {
    assert.equal(T.indexToLetters(1), 'a');
    assert.equal(T.indexToLetters(26), 'z');
    assert.equal(T.indexToLetters(27), 'aa');
    assert.equal(T.indexToLetters(28), 'ab');
    assert.equal(T.lettersToIndex('aa'), 27);
    for (let i = 1; i < 800; i++) assert.equal(T.lettersToIndex(T.indexToLetters(i)), i);
  });

  test('titles parse into tree, address and topic', () => {
    const t = T.parseTitle('oulipo/1b1 · Writing lipograms');
    assert.deepEqual({ tree: t.tree, address: t.address, topic: t.topic }, { tree: 'oulipo', address: '1b1', topic: 'Writing lipograms' });
    assert.equal(T.parseTitle('zb/1').topic, '');
    for (const typed of ['zbtest/1 . fixture', 'zbtest/1. fixture', 'zbtest/1 - fixture', 'zbtest/1 – fixture']) {
      const h = T.parseTitle(typed);
      assert.deepEqual(h && { tree: h.tree, address: h.address, topic: h.topic }, { tree: 'zbtest', address: '1', topic: 'fixture' }, typed);
    }
    assert.equal(T.parseTitle('zb/1a-b c'), null);
    for (const bad of ['Oulipo and constraints', 'Oulipo/1 · x', 'oulipo/a1 · x', 'oulipo/01 · x', '2026/10 plans', '']) {
      assert.equal(T.parseTitle(bad), null, bad);
    }
    assert.equal(T.formatTitle('oulipo', '1a', 'Lipograms'), 'oulipo/1a · Lipograms');
  });

  test('next child by segments: 1a exists, 1a1 and 10 are not children of 1', () => {
    const titles = ['zb/1 · Root', 'zb/1a · A', 'zb/1a1 · Grandchild', 'zb/10 · Ten', 'other/1b · Other tree', 'Private chat'];
    const c = T.nextChild('zb', T.parseAddress('1'), titles);
    assert.equal(c.address, '1b');
    assert.deepEqual([...c.existingChildren], ['1a']);
    assert.equal(T.nextChild('zb', T.parseAddress('1a'), titles).address, '1a2');
    assert.equal(T.nextChild('zb', T.parseAddress('10'), titles).address, '10a');
    assert.equal(T.nextChild('zb', T.parseAddress('1'), ['zb/1z · z']).address, '1aa');
    assert.equal(T.nextChild('zb', T.parseAddress('1a'), ['zb/1a9 · x', 'zb/1a10 · y']).address, '1a11');
  });

  test('next root', () => {
    assert.equal(T.nextRoot('oulipo', ['zb/1 · x', 'Private']), '1');
    assert.equal(T.nextRoot('zb', ['zb/1 · x', 'zb/10 · y', 'zb/1a · z']), '11');
  });

  test('ancestry', () => assert.deepEqual([...T.ancestry([1, 'b', 1])], ['1', '1b', '1b1']));

  test('tree names', () => {
    assert.equal(T.isTreeName('oulipo'), true);
    assert.equal(T.isTreeName('my-tree2'), true);
    for (const bad of ['', 'Oulipo', 'a b', 'a/b', 'é']) assert.equal(T.isTreeName(bad), false, bad);
  });

  test('tree name proposed from a title', () => {
    assert.equal(T.proposeTreeName('Oulipo and constraints'), 'oulipo');
    assert.equal(T.proposeTreeName('Écriture sous contrainte'), 'ecriture');
    assert.equal(T.proposeTreeName('« Zettelkasten-Methode » für alle'), 'zettelkasten');
    assert.equal(T.proposeTreeName('Self-hosting'), 'self-hosting');
    assert.equal(T.proposeTreeName('???'), 'tree');
    assert.equal(T.proposeTreeName(''), 'tree');
    assert.equal(T.proposeTreeName('日本語'), 'tree');
  });
});

// ---------------------------------------------------------------- api.js

// A stub fetch that answers from `routes` (method + path regexes) and records every call.
function stubApi(routes, url = 'https://claude.ai/chat/' + CONV) {
  const calls = [];
  const win = loadIntoWindow(['tree.js', 'api.js'], {
    url,
    before: (w) => {
      w.fetch = async (u, init = {}) => {
        const method = init.method || 'GET';
        const p = String(u).replace('https://claude.ai', '');
        calls.push({ method, path: p, body: init.body, credentials: init.credentials, headers: init.headers });
        const r = routes.find((x) => x.method === method && x.re.test(p));
        const status = r ? r.status || 200 : 404;
        const body = r ? (typeof r.body === 'function' ? r.body(p, init) : r.body) : { error: 'not found' };
        return { ok: status < 300, status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) };
      };
    },
  });
  return { api: win.ZBApi, calls };
}
const ORGS = { method: 'GET', re: /^\/api\/organizations$/, body: [{ uuid: 'api-org', capabilities: ['api'] }, { uuid: ORG, capabilities: ['chat'] }] };
const convRoute = (body, status) => ({ method: 'GET', re: /chat_conversations\/[0-9a-f-]{36}\?tree=True/, body, status });
const okConv = { uuid: CONV, name: 'zb/1 · Root', current_leaf_message_uuid: 'm2', chat_messages: [{ uuid: 'm1', sender: 'human', content: [] }] };

async function rejectsWith(promise, kind, ApiError) {
  let err;
  try {
    await promise;
  } catch (e) {
    err = e;
  }
  assert.ok(err instanceof ApiError, 'an ApiError: ' + err);
  assert.equal(err.kind, kind);
  return err;
}

describe('api.js', () => {
  test('picks the organization with chat, same-origin requests only', async () => {
    const { api, calls } = stubApi([ORGS, convRoute(okConv)]);
    const conv = await api.getConversation(CONV);
    assert.equal(conv.name, 'zb/1 · Root');
    assert.deepEqual(calls.map((c) => `${c.method} ${c.path}`), [
      'GET /api/organizations',
      `GET /api/organizations/${ORG}/chat_conversations/${CONV}?tree=True&rendering_mode=messages&render_all_tools=true`,
    ]);
    assert.ok(calls.every((c) => c.credentials === 'same-origin'));
    await api.getConversation(CONV);
    assert.equal(calls.filter((c) => c.path === '/api/organizations').length, 1, 'the organization is asked once');
  });

  test('lists every conversation through paging', async () => {
    let n = 0;
    const page = (p) => {
      const offset = Number(/offset=(\d+)/.exec(p)[1]);
      const all = Array.from({ length: 150 }, (_, i) => ({ uuid: 'c' + i, name: i === 3 ? null : 'Chat ' + i, summary: SECRET }));
      n++;
      return { data: all.slice(offset, offset + 100), has_more: offset + 100 < all.length };
    };
    const { api, calls } = stubApi([ORGS, { method: 'GET', re: /chat_conversations_v2\?limit=100&offset=\d+$/, body: page }]);
    const items = await api.listConversations();
    assert.equal(items.length, 150);
    assert.equal(n, 2);
    assert.equal(items[3].name, '');
    assert.deepEqual(Object.keys(items[0]), ['uuid', 'name'], 'only uuid and name are kept');
    assert.ok(calls.every((c) => c.method === 'GET'));
  });

  test('an answer of the wrong shape: "shape" error without message text', async () => {
    const { api } = stubApi([ORGS, convRoute({ uuid: CONV, name: 'x', messages: [{ text: SECRET }] })]);
    const e = await rejectsWith(api.getConversation(CONV), 'shape', api.ApiError);
    assert.match(e.message, /no chat_messages/);
    assert.ok(!JSON.stringify({ m: e.message, d: e.details }).includes(SECRET));
    assert.match(e.details.shape, /messages: array\(1\)/);
  });

  test('a list of the wrong shape, and an answer that is not JSON', async () => {
    let s = stubApi([ORGS, { method: 'GET', re: /chat_conversations_v2/, body: { conversations: [{ title: SECRET }] } }]);
    let e = await rejectsWith(s.api.listConversations(), 'shape', s.api.ApiError);
    assert.ok(!JSON.stringify({ m: e.message, d: e.details }).includes(SECRET));
    s = stubApi([ORGS, convRoute(`<html>${SECRET}</html>`)]);
    e = await rejectsWith(s.api.getConversation(CONV), 'shape', s.api.ApiError);
    assert.ok(!JSON.stringify({ m: e.message, d: e.details }).includes(SECRET));
  });

  test('an error status: "http" error without the body', async () => {
    const { api } = stubApi([ORGS, convRoute({ error: { message: SECRET } }, 500)]);
    const e = await rejectsWith(api.getConversation(CONV), 'http', api.ApiError);
    assert.equal(e.details.status, 500);
    assert.ok(!JSON.stringify({ m: e.message, d: e.details }).includes(SECRET));
    assert.ok(!e.details.path.includes(ORG), 'the organization id is redacted');
  });

  test('renames only to a Zettelbranch title; anything else is refused before any request', async () => {
    const { api, calls } = stubApi([ORGS, { method: 'PUT', re: /chat_conversations\/[0-9a-f-]{36}$/, status: 202, body: (p, init) => JSON.parse(init.body) }]);
    for (const bad of ['Not a tree title', 'zb/1a', 'zb/1a · ', 'zb/1a ·  ', 'Zb/1a · x', 'zb/a1 · x', 'zb/1a · two\nlines', 'zb/1a - x', '', null]) {
      await rejectsWith(api.renameConversation(CONV, bad), 'refused', api.ApiError);
    }
    assert.equal(calls.length, 0, 'no request at all');
    assert.equal(await api.renameConversation(CONV, 'oulipo/1a · Writing lipograms'), 'oulipo/1a · Writing lipograms');
    const put = calls.find((c) => c.method === 'PUT');
    assert.equal(put.path, `/api/organizations/${ORG}/chat_conversations/${CONV}`);
    assert.deepEqual(JSON.parse(put.body), { name: 'oulipo/1a · Writing lipograms' });
  });

  test('a path outside the allowed list is refused before it is sent', async () => {
    const { api, calls } = stubApi([ORGS, convRoute(okConv)]);
    await api.getConversation(CONV);
    const n = calls.length;
    await rejectsWith(api.getConversation('../../other'), 'refused', api.ApiError);
    await rejectsWith(api.getConversation(CONV + '/completion'), 'refused', api.ApiError);
    await rejectsWith(api.renameConversation('x?y', 'zb/1 · x'), 'refused', api.ApiError);
    assert.equal(calls.length, n);
  });

  test('nothing is sent from another site', async () => {
    const { api, calls } = stubApi([ORGS], 'https://example.com/');
    await rejectsWith(api.listConversations(), 'origin', api.ApiError);
    assert.equal(calls.length, 0);
  });

  const MSG = 'bbbbbbbb-0000-4000-8000-000000000004';
  const FORK_PATH = '/claudeai-rpc/anthropic.bard.api.v1alpha.ConversationService/PerformAction';
  const forkRoute = (body, status) => ({ method: 'POST', re: /PerformAction$/, body, status });

  test('the fork: one POST, only continueBranchAsNewChat in its body, the new id chosen here', async () => {
    const { api, calls } = stubApi([ORGS, forkRoute({})]);
    const id = await api.forkConversation(CONV, MSG);
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const post = calls.find((c) => c.method === 'POST');
    assert.equal(post.path, FORK_PATH);
    assert.equal(post.credentials, 'same-origin');
    const body = JSON.parse(post.body);
    assert.match(body.header.mutationId.sessionId, /^sess_[0-9a-f]{24}$/);
    assert.deepEqual(body, {
      header: { conversationId: id, mutationId: { sessionId: body.header.mutationId.sessionId, version: 1 } },
      continueBranchAsNewChat: { sourceConversationId: CONV, throughMessageId: MSG },
    });
    assert.deepEqual({ ...post.headers }, {
      'content-type': 'application/json',
      'connect-protocol-version': '1',
      'x-organization-uuid': ORG,
      'anthropic-client-platform': 'web_claude_ai',
    });
    assert.notEqual(await api.forkConversation(CONV, MSG), id, 'a new id each time');
  });

  test('the fork: bad ids are refused before any request; errors keep the Connect code, never the message', async () => {
    let s = stubApi([ORGS, forkRoute({})]);
    for (const [src, msg] of [['x', MSG], [CONV, 'x'], [CONV, MSG + '/../x'], [null, MSG], [CONV, undefined]]) {
      await rejectsWith(s.api.forkConversation(src, msg), 'refused', s.api.ApiError);
    }
    assert.equal(s.calls.length, 0, 'no request at all');
    s = stubApi([ORGS, forkRoute({ code: 'failed_precondition', message: `${SECRET} This version can't be continued in a new session.` }, 400)]);
    const e = await rejectsWith(s.api.forkConversation(CONV, MSG), 'http', s.api.ApiError);
    assert.equal(e.details.status, 400);
    assert.equal(e.details.code, 'failed_precondition');
    assert.ok(!JSON.stringify({ m: e.message, d: e.details }).includes(SECRET));
    s = stubApi([ORGS, forkRoute({ code: `${SECRET} not a code` }, 500)]);
    assert.equal((await rejectsWith(s.api.forkConversation(CONV, MSG), 'http', s.api.ApiError)).details.code, undefined);
    s = stubApi([ORGS, forkRoute([SECRET])]);
    await rejectsWith(s.api.forkConversation(CONV, MSG), 'shape', s.api.ApiError);
    s = stubApi([ORGS, forkRoute('')]);
    assert.match(await s.api.forkConversation(CONV, MSG), /^[0-9a-f-]{36}$/, 'an empty answer is fine');
  });

  test('openCreatedChat loads no page but the chat the last fork created', async () => {
    const { api } = stubApi([ORGS, forkRoute({})]);
    await rejectsWith(Promise.resolve().then(() => api.openCreatedChat(CONV)), 'refused', api.ApiError);
    await api.forkConversation(CONV, MSG);
    await rejectsWith(Promise.resolve().then(() => api.openCreatedChat(CONV)), 'refused', api.ApiError);
    await rejectsWith(Promise.resolve().then(() => api.openCreatedChat('../settings')), 'refused', api.ApiError);
  });
});

// ---------------------------------------------------------------- conversation.js

describe('conversation.js, from the API', () => {
  const C = loadIntoWindow(['conversation.js']).ZBConversation;
  const msg = (uuid, sender, text, parent, extra = {}) => ({ uuid, sender, parent_message_uuid: parent, content: [{ type: 'text', text }], attachments: [], files: [], files_v2: [], ...extra });

  test('the path follows the current leaf; an edited message\'s old version is left out', () => {
    const conv = {
      current_leaf_message_uuid: 'm5',
      chat_messages: [
        msg('m1', 'human', 'one', 'root', { index: 0 }),
        msg('m2', 'assistant', 'two', 'm1', { index: 1 }),
        msg('m3', 'human', 'OLD three', 'm2', { index: 2 }),
        msg('m4', 'human', 'three', 'm2', { index: 3 }),
        msg('m5', 'assistant', 'four', 'm4', { index: 4 }),
      ],
    };
    assert.deepEqual([...C.fromApi(conv).map((m) => `${m.n} ${m.role} ${m.text}`)], ['1 user one', '2 assistant two', '3 user three', '4 assistant four']);
    delete conv.current_leaf_message_uuid;
    assert.equal(C.pathOf(conv).length, 5, 'without a leaf: every message, by index');
  });

  test('message text: text and pasted text kept, thinking and tools left out, placeholders for the rest', () => {
    const user = {
      sender: 'human',
      content: [{ type: 'text', text: 'Here are my notes and a photo.' }],
      attachments: [{ file_name: 'notes.txt', extracted_content: 'Pasted line one\nPasted line two' }, { file_name: 'report.pdf' }],
      files: [{ file_name: 'photo.png' }],
      files_v2: [{ file_kind: 'image', file_name: 'photo.png' }],
    };
    assert.equal(C.messageText(user), [
      'Here are my notes and a photo.',
      '[file: photo.png, not copied]',
      '[pasted text: notes.txt]\nPasted line one\nPasted line two',
      '[file: report.pdf, not copied]',
    ].join('\n\n'));
    const claude = {
      sender: 'assistant',
      content: [
        { type: 'thinking', thinking: 'THINKING-SECRET-TEXT' },
        { type: 'redacted_thinking', data: 'x' },
        { type: 'text', text: 'I read your **notes**.\n\n```python\nprint(1)\n```' },
        { type: 'tool_use', name: 'artifacts', input: { id: 'plan', title: 'Garden plan', content: 'TOOL-SECRET-TEXT' } },
        { type: 'tool_use', name: 'artifacts', input: { id: 'plan', command: 'update' } },
        { type: 'tool_use', name: 'web_search', input: { query: 'TOOL-SECRET-TEXT' } },
        { type: 'tool_result', content: [{ type: 'text', text: 'TOOL-SECRET-TEXT' }] },
        { type: 'tool_use', name: 'create_file', input: { path: '/mnt/out/report.md', file_text: 'TOOL-SECRET-TEXT' } },
        { type: 'text', text: 'Done.' },
      ],
    };
    assert.equal(C.messageText(claude), [
      'I read your **notes**.\n\n```python\nprint(1)\n```',
      '[artifact: Garden plan, not copied]',
      '[artifact: plan, not copied]',
      '[file: report.md, not copied]',
      'Done.',
    ].join('\n\n'));
    assert.equal(C.messageText({ sender: 'human', content: [], text: 'Old shape' }), 'Old shape');
    assert.equal(C.messageText({ sender: 'human', attachments: [{ file_name: '', extracted_content: 'x' }] }), '[pasted text]\nx');
  });
});

describe('conversation.js, from the page', () => {
  // Hand-made, imitating claude.ai's markup (test ids, rows, Markdown classes, KaTeX).
  const PAGE = `<!doctype html><html><body>
    <nav data-testid="sidebar"><a href="/chat/x">Sidebar title that must not appear</a></nav>
    <div data-testid="transcript-list">
      <div data-testid="transcript-row" data-index="40" data-perf-row="human">
        <div data-testid="file-thumbnail">notes.txt</div>
        <div data-testid="user-message"><p class="whitespace-pre-wrap break-words">First line
  indented line
last line</p></div>
      </div>
      <div data-testid="transcript-row" data-index="41" data-perf-row="assistant">
        <div data-testid="assistant-message"><div class="font-claude-response">
          <div class="thinking-block"><button>Thought for 3 seconds</button><div>THINKING-SECRET-TEXT</div></div>
          <div class="standard-markdown">
            <h2>A <em>title</em></h2>
            <p>Some <strong>bold</strong>, <code>inline</code> and a <a href="https://example.com/x">link</a>. Done.</p>
            <ul><li>one</li><li>two<ul><li>nested</li></ul></li></ul>
            <ol start="3"><li>three</li></ol>
            <div class="relative"><div class="text-xs">python</div><button>Copy</button><pre><code class="language-python">def f(x):
    return x
</code></pre></div>
            <table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>a|b</td></tr></tbody></table>
            <p>Inline <span class="katex"><span class="katex-mathml"><math><semantics><mrow></mrow><annotation encoding="application/x-tex">x^2</annotation></semantics></math></span><span class="katex-html" aria-hidden="true">x2</span></span> math.</p>
            <span class="katex-display"><span class="katex"><span class="katex-mathml"><math><semantics><annotation encoding="application/x-tex">\\int f</annotation></semantics></math></span></span></span>
            <blockquote><p>Quoted</p></blockquote>
            <p><img src="data:," alt="chart"></p>
          </div>
          <div class="artifact-card" data-testid="artifact-block"><svg></svg><span>Garden plan</span><span>Document</span></div>
          <div class="standard-markdown"><p>After the artifact.</p></div>
          <div class="actions"><button>Retry</button><span>Claude can make mistakes.</span></div>
        </div></div>
      </div>
    </div></body></html>`;
  const win = loadIntoWindow(['conversation.js'], { html: PAGE });
  const C = win.ZBConversation;
  const r = C.fromPage(win.document);

  test('finds the messages and numbers them by their rows', () => {
    assert.equal(r.numbered, true);
    assert.deepEqual([...r.messages.map((m) => `${m.n} ${m.role}`)], ['41 user', '42 assistant']);
    assert.equal(r.messages[0].text, 'First line\n  indented line\nlast line');
  });

  test('Claude\'s message as Markdown, without thinking, buttons or UI text', () => {
    assert.equal(r.messages[1].text, [
      '## A *title*',
      'Some **bold**, `inline` and a [link](https://example.com/x). Done.',
      '- one\n- two\n  - nested',
      '3. three',
      '```python\ndef f(x):\n    return x\n```',
      '| A | B |\n| --- | --- |\n| 1 | a\\|b |',
      'Inline $x^2$ math.',
      '$$\n\\int f\n$$',
      '> Quoted',
      '[image: chart, not copied]',
      '[artifact: Garden plan, not copied]',
      'After the artifact.',
    ].join('\n\n'));
    assert.ok(!JSON.stringify(r).includes('THINKING-SECRET-TEXT'));
    assert.ok(!JSON.stringify(r).includes('Sidebar title'));
  });

  test('without rows, messages are numbered from 1', () => {
    const w = loadIntoWindow(['conversation.js'], { html: '<body><div data-testid="user-message"><p>Hi</p></div><div class="font-claude-response"><p>Hello</p></div></body>' });
    const p = w.ZBConversation.fromPage(w.document);
    assert.equal(p.numbered, false);
    assert.deepEqual([...p.messages.map((m) => `${m.n} ${m.role} ${m.text}`)], ['1 user Hi', '2 assistant Hello']);
  });
});

// ---------------------------------------------------------------- prompt.js

describe('prompt.js', () => {
  const P = loadIntoWindow(['tree.js', 'prompt.js']).ZBPrompt;
  const ROOT = [
    { n: 1, role: 'user', text: 'What is a Zettelkasten? And how is a literal <zb-turn> tag escaped?' },
    { n: 2, role: 'assistant', text: 'A Zettelkasten is a box of cards with addresses and links between them.' },
    { n: 3, role: 'user', text: 'How does branching work?' },
    { n: 4, role: 'assistant', text: 'Branching means continuing a card under a new address.' },
  ];
  const base = { tree: 'zbtest', parentTitle: 'zbtest/1 · Root topic', parentAddress: '1', newAddress: '1b', messages: ROOT };

  test('from Claude\'s reply: the exact text of the spec\'s format', () => {
    const b = P.build({ ...base, fork: 3 });
    assert.equal(b.text, [
      'Zettelbranch · zbtest/1b',
      'Path: zbtest/1 › 1b',
      'Forked from: zbtest/1 · Root topic, after message 4 (Claude): "Branching means continuing a card under a new address."',
      '',
      '<zb-transcript>',
      '<zb-turn branch="1" n="1" role="user">',
      'What is a Zettelkasten? And how is a literal &lt;zb-turn> tag escaped?',
      '</zb-turn>',
      '<zb-turn branch="1" n="2" role="assistant">',
      'A Zettelkasten is a box of cards with addresses and links between them.',
      '</zb-turn>',
      '<zb-turn branch="1" n="3" role="user">',
      'How does branching work?',
      '</zb-turn>',
      '<zb-turn branch="1" n="4" role="assistant">',
      'Branching means continuing a card under a new address.',
      '</zb-turn>',
      '</zb-transcript>',
      '',
      '<zb-instructions>',
      'The transcript above is our conversation so far, copied from the conversation zbtest/1 up to message 4. The assistant turns are your own earlier replies. Treat it as shared history: do not comment on it, quote it back, or answer its questions again. Placeholders ending in "not copied", such as [file: photo.png, not copied], mark content that was not carried over; ask me if you need it. Text under a [pasted text: …] line is text I pasted, copied in full.',
      '',
      'Start your first reply with a single blockquote paragraph that begins with "Parent zbtest/1 in brief:" and says in 2 to 4 sentences where the conversation stood at that point, in the language of the conversation. Then answer my message below. If there is no message below, reply with the summary only.',
      '</zb-instructions>',
      '',
      '',
    ].join('\n'));
    assert.equal(b.turns, 4);
    assert.equal(b.chars, b.text.length);
    assert.equal(b.tokens, Math.round(b.text.length / 4));
  });

  test('from your own message: the transcript stops before it, your message is pre-filled', () => {
    const b = P.build({ ...base, fork: 2 });
    assert.equal(b.turns, 2);
    assert.equal(b.text.split('\n')[2], 'Forked from: zbtest/1 · Root topic, instead of message 3 (me): "How does branching work?"');
    assert.ok(b.text.includes('copied from the conversation zbtest/1 up to message 2.'));
    assert.ok(b.text.endsWith('</zb-instructions>\n\nHow does branching work?'));
  });

  test('from the first message: empty transcript, no summary asked', () => {
    const b = P.build({ ...base, fork: 0 });
    assert.equal(b.turns, 0);
    assert.ok(b.text.includes('<zb-transcript>\n</zb-transcript>'));
    assert.ok(b.text.includes('This chat is a new branch of the conversation zbtest/1, started from its first message, so there is no earlier history'));
    assert.ok(!b.text.includes('in brief'));
    assert.ok(b.text.endsWith('</zb-instructions>\n\n' + ROOT[0].text));
  });

  // The parent zbtest/1a is itself a branch: its first message holds the transcript.
  const BRANCH = [
    { n: 1, role: 'user', text: P.build({ ...base, newAddress: '1a', fork: 1 }).text + 'Tell me about addresses.' },
    { n: 2, role: 'assistant', text: '> Parent zbtest/1 in brief: We defined a Zettelkasten.\n> Second line.\n\nAddresses look like 1, 1a, 1a1.' },
    { n: 3, role: 'user', text: 'And letters after z?' },
    { n: 4, role: 'assistant', text: 'They continue with aa, ab.' },
  ];
  const flat = { tree: 'zbtest', parentTitle: 'zbtest/1a · First branch', parentAddress: '1a', newAddress: '1a2', messages: BRANCH };

  test('a branch of a branch is flattened, the summary dropped', () => {
    const b = P.build({ ...flat, fork: 3 });
    assert.equal(b.flattened, true);
    assert.equal(b.turns, 6);
    const back = P.parseBranchMessage(b.text);
    assert.deepEqual([...back.turns.map((t) => `${t.branch}#${t.n} ${t.role}: ${t.text}`)], [
      '1#1 user: What is a Zettelkasten? And how is a literal <zb-turn> tag escaped?',
      '1#2 assistant: A Zettelkasten is a box of cards with addresses and links between them.',
      '1a#1 user: Tell me about addresses.',
      '1a#2 assistant: Addresses look like 1, 1a, 1a1.',
      '1a#3 user: And letters after z?',
      '1a#4 assistant: They continue with aa, ab.',
    ]);
    assert.equal(b.text.split('\n')[1], 'Path: zbtest/1 › 1a › 1a2');
    assert.ok(!b.text.includes('Zettelbranch · zbtest/1a\n'), 'no nested header');
    assert.equal((b.text.match(/<zb-transcript>/g) || []).length, 1, 'no nested transcript');
    assert.ok(b.text.includes('literal &lt;zb-turn> tag'), 'escaping kept');
  });

  test('instead of a branch\'s first message: its inherited history, your text pre-filled', () => {
    const b = P.build({ ...flat, fork: 0 });
    assert.equal(b.turns, 2);
    assert.ok(b.text.includes('the history that the conversation zbtest/1a was branched from, before its first message'));
    assert.ok(b.text.includes('"Parent zbtest/1a in brief:"'));
    assert.equal(b.text.split('\n')[2], 'Forked from: zbtest/1a · First branch, instead of message 1 (me): "Tell me about addresses."');
    assert.ok(b.text.endsWith('</zb-instructions>\n\nTell me about addresses.'));
  });

  test('escaping and parsing back are exact, line breaks and indentation included', () => {
    const tricky = '\n  indented <zb-turn n="9"> and </zb-transcript> and </zb-instructions>\n```\ncode\n```\n';
    const msgs = [{ n: 1, role: 'user', text: tricky }, { n: 2, role: 'assistant', text: 'Reply with &lt;zb- already escaped' }];
    const b = P.build({ ...base, messages: msgs, fork: 1 });
    assert.ok(!/<zb-turn n="9">|<\/zb-transcript> and/.test(b.text));
    const back = P.parseBranchMessage(b.text);
    assert.equal(back.turns[0].text, tricky);
    assert.equal(back.ownText, '');
    assert.equal(back.tree, 'zbtest');
    assert.equal(back.address, '1b');
  });

  test('messages numbered from the page keep their numbers', () => {
    const msgs = [{ n: 31, role: 'user', text: 'Q31' }, { n: 32, role: 'assistant', text: 'A32' }];
    const b = P.build({ ...base, messages: msgs, fork: 1 });
    assert.equal(b.flattened, false);
    assert.ok(b.text.includes('<zb-turn branch="1" n="31" role="user">') && b.text.includes('after message 32 (Claude)') && b.text.includes('up to message 32.'));
  });

  test('header, summary and quote helpers', () => {
    assert.deepEqual({ ...P.parseHeader('Zettelbranch · oulipo/1a\nPath: …') }, { tree: 'oulipo', address: '1a' });
    for (const bad of ['Zettelbranch · oulipo/01', 'Zettelbranch · Oulipo/1', 'zettelbranch · a/1', 'Hello', '']) assert.equal(P.parseHeader(bad), null, bad);
    assert.equal(P.stripSummary('> Parent x in brief: a.\n> b.\n\nAnswer.'), 'Answer.');
    assert.equal(P.stripSummary('> A quote\n\nAnswer.'), '> A quote\n\nAnswer.');
    assert.deepEqual({ ...P.parseSummary('> Parent zb/1 in brief: Two\n> lines.\n\nAnswer') }, { parent: 'zb/1', text: 'Two lines.' });
    assert.equal(P.parseSummary('No quote here'), null);
    assert.equal(P.quote('short'), 'short');
    assert.equal(P.quote('word '.repeat(20)), 'word word word word word word word word word word word word…');
  });

  test('quotes drop code fences and quote markers; a branch\'s first reply is quoted without its summary', () => {
    assert.equal(P.quote('Subject: test\n\n```python\ndef main():\n    pass\n```'), 'Subject: test def main(): pass');
    const first = P.build({ ...base, fork: 3 }).text; // the first message of zbtest/1b
    const summary = '> Parent zbtest/1 in brief: We talked about cards.';
    const at = (reply) => P.build({ tree: 'zbtest', parentTitle: 'zbtest/1b · Topic', parentAddress: '1b', newAddress: '1b1', fork: 1, messages: [{ n: 1, role: 'user', text: first }, { n: 2, role: 'assistant', text: reply }] }).text.split('\n')[2];
    assert.match(at(`${summary}\n\nHere is more about Oulipo.`), /after message 2 \(Claude\): "Here is more about Oulipo\."$/);
    assert.match(at(summary), /after message 2 \(Claude\): "Parent zbtest\/1 in brief: We talked about cards\."$/);
  });

  test('refuses a bad address or a missing message', () => {
    assert.throws(() => P.build({ ...base, newAddress: 'b1', fork: 3 }), /bad address/);
    assert.throws(() => P.build({ ...base, fork: 9 }), /no message/);
  });

  // ---- branches claude.ai copied (step 6b)

  const startOf = (o) => P.buildStart(o).text;
  // zbtest/1b, copied by claude.ai from zbtest/1 through message 4, then started and continued.
  const START_1B = startOf({ tree: 'zbtest', parentTitle: 'zbtest/1 · Root topic', parentAddress: '1', newAddress: '1b', messages: ROOT });
  const NATIVE = [
    ...ROOT.map((m) => ({ ...m })),
    { n: 5, role: 'user', text: START_1B + 'Tell me more.' },
    { n: 6, role: 'assistant', text: '> Parent zbtest/1 in brief: We defined a Zettelkasten\n> and its branches.\n\nMore about cards.' },
    { n: 7, role: 'user', text: 'And then?' },
    { n: 8, role: 'assistant', text: 'Then links.' },
  ];

  test('the start message of a branch claude.ai copied: the exact text', () => {
    assert.equal(START_1B, [
      'Zettelbranch · zbtest/1b',
      'Path: zbtest/1 › 1b',
      'Forked from: zbtest/1 · Root topic, after message 4 (Claude): "Branching means continuing a card under a new address."',
      '',
      '<zb-instructions>',
      'The messages above were copied from the conversation zbtest/1 through message 4 to start this branch. Do not comment on the header lines above; they are for my own records.',
      '',
      'Start your first reply with a single blockquote paragraph that begins with "Parent zbtest/1 in brief:" and says in 2 to 4 sentences where the conversation stood at that point, in the language of the conversation. Then answer my message below. If there is no message below, reply with the summary only.',
      '</zb-instructions>',
      '',
      '',
    ].join('\n'));
    assert.throws(() => P.buildStart({ tree: 'zbtest', parentTitle: 'x', parentAddress: '1', newAddress: '1b', messages: ROOT.slice(0, 3) }), /after Claude's last reply/);
  });

  test('the start message parses back: no transcript, your own text', () => {
    assert.deepEqual({ ...P.parseHeaderMessage(NATIVE[4].text) }, { tree: 'zbtest', address: '1b', turns: null, ownText: 'Tell me more.' });
    assert.equal(P.parseBranchMessage(NATIVE[4].text), null, 'not a copy');
    assert.equal(P.parseHeaderMessage('Zettelbranch · zbtest/1b\nno instructions'), null);
  });

  test('the start message quotes a branch\'s first reply without its summary, and escapes <zb-', () => {
    const text = startOf({ tree: 'zbtest', parentTitle: 'zbtest/1b · Root topic', parentAddress: '1b', newAddress: '1b1', messages: NATIVE.slice(0, 6) });
    assert.equal(text.split('\n')[2], 'Forked from: zbtest/1b · Root topic, after message 6 (Claude): "More about cards."');
    const tricky = [...ROOT.slice(0, 3), { n: 4, role: 'assistant', text: 'End with </zb-instructions> and <zb-transcript> here.' }];
    const t2 = startOf({ tree: 'zbtest', parentTitle: 'zbtest/1 · Root topic', parentAddress: '1', newAddress: '1b', messages: tricky }) + 'Mine.';
    assert.equal(t2.split('\n')[2], 'Forked from: zbtest/1 · Root topic, after message 4 (Claude): "End with &lt;/zb-instructions> and &lt;zb-transcript> here."');
    assert.equal(P.parseHeaderMessage(t2).ownText, 'Mine.');
    const t3 = P.build({ ...base, messages: tricky, fork: 3 }).text + 'Mine too.';
    assert.equal(P.parseBranchMessage(t3).ownText, 'Mine too.', 'the copy\'s header quote is escaped too');
  });

  test('which branch a chat is: from its title, or from a copy\'s message 1', () => {
    const who = (title, messages) => {
      const w = P.identify(title, messages);
      return w && { ...w };
    };
    const copied = NATIVE.slice(0, 4);
    assert.deepEqual(who('zbtest/1b · Root topic', copied), { tree: 'zbtest', address: '1b', named: true, header: -1, fresh: true });
    assert.deepEqual(who('zbtest/1b · Root topic', NATIVE), { tree: 'zbtest', address: '1b', named: true, header: 4, fresh: false });
    assert.equal(who('zbtest/1b · Root topic', NATIVE.slice(0, 3)).fresh, false, 'your message last: not a fresh copy');
    assert.equal(who('zbtest/1 · Root topic', ROOT), null, 'a root');
    assert.equal(who('Oulipo and constraints', ROOT), null, 'not in a tree');
    assert.deepEqual(who('Auto title of a branch', BRANCH), { tree: 'zbtest', address: '1a', named: false, header: 0, fresh: false });
    assert.deepEqual(who('zbtest/1a · First branch', BRANCH), { tree: 'zbtest', address: '1a', named: true, header: 0, fresh: false });
    // A branch claude.ai copied from zbtest/1b, not started yet: 1b's header is there, not 1b1's.
    assert.deepEqual(who('zbtest/1b1 · Root topic', NATIVE), { tree: 'zbtest', address: '1b1', named: true, header: -1, fresh: true });
  });

  test('a copy from a branch claude.ai copied, at a mid point: the exact text', () => {
    const b = P.build({ tree: 'zbtest', parentTitle: 'zbtest/1b · Root topic', parentAddress: '1b', newAddress: '1b1', messages: NATIVE, fork: 5 });
    assert.equal(b.flattened, true);
    assert.equal(b.turns, 6);
    assert.equal(b.text, [
      'Zettelbranch · zbtest/1b1',
      'Path: zbtest/1 › 1b › 1b1',
      'Forked from: zbtest/1b · Root topic, after message 6 (Claude): "More about cards."',
      '',
      '<zb-transcript>',
      '<zb-turn branch="1" n="1" role="user">',
      'What is a Zettelkasten? And how is a literal &lt;zb-turn> tag escaped?',
      '</zb-turn>',
      '<zb-turn branch="1" n="2" role="assistant">',
      'A Zettelkasten is a box of cards with addresses and links between them.',
      '</zb-turn>',
      '<zb-turn branch="1" n="3" role="user">',
      'How does branching work?',
      '</zb-turn>',
      '<zb-turn branch="1" n="4" role="assistant">',
      'Branching means continuing a card under a new address.',
      '</zb-turn>',
      '<zb-turn branch="1b" n="5" role="user">',
      'Tell me more.',
      '</zb-turn>',
      '<zb-turn branch="1b" n="6" role="assistant">',
      'More about cards.',
      '</zb-turn>',
      '</zb-transcript>',
      '',
      '<zb-instructions>',
      'The transcript above is our conversation so far, copied from the conversation zbtest/1b up to message 6. The assistant turns are your own earlier replies. Treat it as shared history: do not comment on it, quote it back, or answer its questions again. Placeholders ending in "not copied", such as [file: photo.png, not copied], mark content that was not carried over; ask me if you need it. Text under a [pasted text: …] line is text I pasted, copied in full.',
      '',
      'Start your first reply with a single blockquote paragraph that begins with "Parent zbtest/1b in brief:" and says in 2 to 4 sentences where the conversation stood at that point, in the language of the conversation. Then answer my message below. If there is no message below, reply with the summary only.',
      '</zb-instructions>',
      '',
      '',
    ].join('\n'));
  });

  const turnsOf = (text) => [...P.parseBranchMessage(text).turns.map((t) => `${t.branch}#${t.n} ${t.role}: ${t.text}`)];

  test('before its header, a branch claude.ai copied holds its parent\'s messages; instead of its header message, your text pre-filled', () => {
    const at2 = P.build({ tree: 'zbtest', parentTitle: 'zbtest/1b · Root topic', parentAddress: '1b', newAddress: '1b1', messages: NATIVE, fork: 1 });
    assert.deepEqual(turnsOf(at2.text), ['1#1 user: What is a Zettelkasten? And how is a literal <zb-turn> tag escaped?', '1#2 assistant: A Zettelkasten is a box of cards with addresses and links between them.']);
    assert.equal(at2.flattened, false, 'no header message copied');
    const instead = P.build({ tree: 'zbtest', parentTitle: 'zbtest/1b · Root topic', parentAddress: '1b', newAddress: '1b1', messages: NATIVE, fork: 4 });
    assert.equal(instead.turns, 4);
    assert.deepEqual(turnsOf(instead.text).map((t) => t.slice(0, 4)), ['1#1 ', '1#2 ', '1#3 ', '1#4 ']);
    assert.equal(instead.text.split('\n')[2], 'Forked from: zbtest/1b · Root topic, instead of message 5 (me): "Tell me more."');
    assert.ok(instead.text.includes('copied from the conversation zbtest/1b up to message 4.'));
    assert.ok(instead.text.endsWith('</zb-instructions>\n\nTell me more.'));
  });

  test('a branch claude.ai copied from another one: flattened in one list, every summary dropped', () => {
    const START_1B1 = startOf({ tree: 'zbtest', parentTitle: 'zbtest/1b · Root topic', parentAddress: '1b', newAddress: '1b1', messages: NATIVE });
    const NESTED = [
      ...NATIVE,
      { n: 9, role: 'user', text: START_1B1 + 'Go deeper.' },
      { n: 10, role: 'assistant', text: '> Parent zbtest/1b in brief: Links between cards.\n\nDeeper.' },
      { n: 11, role: 'user', text: 'Last question?' },
      { n: 12, role: 'assistant', text: 'Last answer.' },
    ];
    const b = P.build({ tree: 'zbtest', parentTitle: 'zbtest/1b1 · Root topic', parentAddress: '1b1', newAddress: '1b1a', messages: NESTED, fork: 9 });
    assert.deepEqual(turnsOf(b.text), [
      '1#1 user: What is a Zettelkasten? And how is a literal <zb-turn> tag escaped?',
      '1#2 assistant: A Zettelkasten is a box of cards with addresses and links between them.',
      '1#3 user: How does branching work?',
      '1#4 assistant: Branching means continuing a card under a new address.',
      '1b#5 user: Tell me more.',
      '1b#6 assistant: More about cards.',
      '1b#7 user: And then?',
      '1b#8 assistant: Then links.',
      '1b1#9 user: Go deeper.',
      '1b1#10 assistant: Deeper.',
    ]);
    assert.equal(b.text.split('\n')[1], 'Path: zbtest/1 › 1b › 1b1 › 1b1a');
    assert.equal((b.text.match(/^Zettelbranch · /gm) || []).length, 1, 'no nested header');
    assert.equal((b.text.match(/<zb-instructions>/g) || []).length, 1, 'no nested instructions');
    assert.ok(!b.text.includes('in brief: Links') && !b.text.includes('in brief: We defined'));
    // Still to be started (1b1 not sent yet): the copied messages keep their branches.
    const fresh = P.build({ tree: 'zbtest', parentTitle: 'zbtest/1b1 · Root topic', parentAddress: '1b1', newAddress: '1b1a', messages: NATIVE, fork: 7 });
    assert.deepEqual(turnsOf(fresh.text).map((t) => t.split(' ')[0]), ['1#1', '1#2', '1#3', '1#4', '1b#5', '1b#6', '1b#7', '1b#8']);
  });

  test('a branch claude.ai copied from a copy: the copy\'s transcript expands in place', () => {
    const START_1A1 = startOf({ tree: 'zbtest', parentTitle: 'zbtest/1a · First branch', parentAddress: '1a', newAddress: '1a1', messages: BRANCH });
    assert.equal(START_1A1.split('\n')[2], 'Forked from: zbtest/1a · First branch, after message 4 (Claude): "They continue with aa, ab."');
    const MIXED = [...BRANCH, { n: 5, role: 'user', text: START_1A1 + 'Native question' }, { n: 6, role: 'assistant', text: '> Parent zbtest/1a in brief: Letters.\n\nNative answer.' }];
    const b = P.build({ tree: 'zbtest', parentTitle: 'zbtest/1a1 · First branch', parentAddress: '1a1', newAddress: '1a1a', messages: MIXED, fork: 5 });
    assert.deepEqual(turnsOf(b.text), [
      '1#1 user: What is a Zettelkasten? And how is a literal <zb-turn> tag escaped?',
      '1#2 assistant: A Zettelkasten is a box of cards with addresses and links between them.',
      '1a#1 user: Tell me about addresses.',
      '1a#2 assistant: Addresses look like 1, 1a, 1a1.',
      '1a#3 user: And letters after z?',
      '1a#4 assistant: They continue with aa, ab.',
      '1a1#5 user: Native question',
      '1a1#6 assistant: Native answer.',
    ]);
    assert.equal(b.text.split('\n')[2], 'Forked from: zbtest/1a1 · First branch, after message 6 (Claude): "Native answer."');
  });
});

// ---------------------------------------------------------------- a real conversation

// `zbtest/1 . fixture`, made and saved by hand by Pascal on 2026-10-13, ids replaced
// (scrub-fixture.mjs). A code block, a table and a formula; an edited message, so two
// branches, the page showing the original; a thinking block; an image.
describe('a real conversation (fixtures/real-*.json)', () => {
  const W = loadIntoWindow(['tree.js', 'conversation.js', 'prompt.js']);
  const T = W.ZBTree;
  const C = W.ZBConversation;
  const P = W.ZBPrompt;
  const read = (f) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8'));
  const conv = read('real-conversation.json');
  const list = read('real-list.json');
  const msgs = C.fromApi(conv);
  const byIndex = (i) => conv.chat_messages.find((m) => m.index === i);
  const blocks = (m, type) => m.content.filter((b) => b.type === type).map((b) => (type === 'thinking' ? b.thinking : b.text)).join('\n');

  test('the path is the branch the page shows: 6 of 8 messages, the edited version left out', () => {
    assert.deepEqual([...msgs.map((m) => m.role)], ['user', 'assistant', 'user', 'assistant', 'user', 'assistant']);
    const edited = blocks(byIndex(6), 'text').trim().slice(0, 40);
    assert.ok(edited.length > 10 && !msgs.some((m) => m.text.includes(edited)));
  });

  test('text kept exactly, with its code block, table and formula', () => {
    for (const i of [0, 1]) assert.ok(msgs[i].text.includes(blocks(byIndex(i), 'text').trim()), `message ${i + 1}`);
    assert.match(msgs[0].text, /```python/);
  });

  test('the thinking block is left out; the image becomes a placeholder', () => {
    // claude.ai sends no thinking text here (`thinking_hidden`), only a summary of it.
    assert.ok(byIndex(1).content.some((b) => b.type === 'thinking'));
    assert.equal(msgs[1].text, blocks(byIndex(1), 'text').trim());
    assert.match(msgs[0].text, /\[file: 1791892880457_image\.png, not copied\]$/);
  });

  test('the hand-typed title is a tree title, and the next branch is 1a', () => {
    const t = T.parseTitle(list.data[0].name);
    assert.deepEqual({ tree: t.tree, address: t.address }, { tree: 'zbtest', address: '1' });
    assert.equal(T.nextChild('zbtest', t.segs, [...list.data.map((c) => c.name)]).address, '1a');
  });

  test('the branch prompt parses back into exactly these messages', () => {
    const b = P.build({ tree: 'zbtest', parentTitle: list.data[0].name, parentAddress: '1', newAddress: '1a', messages: msgs, fork: 5 });
    const back = P.parseBranchMessage(b.text);
    assert.deepEqual([...back.turns.map((t) => t.text)], [...msgs.map((m) => m.text)]);
  });
});
