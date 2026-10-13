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

  test('the tree in the panel: ordered by segments, never as strings', () => {
    const sorted = ['1', '1a', '1a1', '1a2', '1a10', '1b', '1b1', '1b1a', '1b1b', '1b9', '1b10', '1z', '1aa', '1ab', '2', '2a', '9', '10', '10a'];
    // Reversed, and sorted as strings (1, 10, 10a, 1a, 1a1, 1a10, 1a2…): both come back in tree order.
    for (const input of [[...sorted].reverse(), [...sorted].sort()]) {
      const items = input.map((a, i) => ({ uuid: 'u' + i, name: `zb/${a} · Note ${a}` }));
      assert.deepEqual([...T.treeEntries('zb', items).map((e) => e.address)], sorted);
    }
    assert.ok(T.compareSegs(T.parseAddress('1b10'), T.parseAddress('1b9')) > 0);
    assert.ok(T.compareSegs(T.parseAddress('1b9'), T.parseAddress('1b1a')) > 0);
    assert.ok(T.compareSegs(T.parseAddress('1aa'), T.parseAddress('1z')) > 0, 'letters past z');
    assert.equal(T.compareSegs(T.parseAddress('1a'), T.parseAddress('1a')), 0);
  });

  test('the tree in the panel: depth, other trees and plain titles left out, typed separators, duplicates', () => {
    const items = [
      { uuid: 'r', name: 'zb/1 · Root' },
      { uuid: 'a', name: 'zb/1a - Typed by hand' },
      { uuid: 'g', name: 'zb/1a1 · Grandchild' },
      { uuid: 'd', name: 'zb/1a1 . Same address' },
      { uuid: 'o', name: 'other/1b · Other tree' },
      { uuid: 'p', name: 'Private chat' },
      { uuid: 'n', name: '' },
    ];
    const e = T.treeEntries('zb', items);
    assert.deepEqual([...e.map((x) => `${x.address}|${x.topic}|${x.depth}|${x.uses}`)], ['1|Root|0|1', '1a|Typed by hand|1|1', '1a1|Grandchild|2|2', '1a1|Same address|2|2']);
    assert.ok(e.every((x) => !x.current && !x.unnamed));
    assert.ok(!JSON.stringify(e).includes('Other tree') && !JSON.stringify(e).includes('Private'));
  });

  test('the tree in the panel: the current chat marked, from its own title; a branch not named yet at its address', () => {
    const items = [{ uuid: 'r', name: 'zb/1 · Root' }, { uuid: 'a', name: 'zb/1a · Old name in the list' }, { uuid: 'b', name: 'Root' }];
    const named = T.treeEntries('zb', items, { uuid: 'a', address: '1a', topic: 'New name' });
    assert.deepEqual([...named.map((x) => `${x.address}|${x.topic}|${x.current}`)], ['1|Root|false', '1a|New name|true']);
    const unnamed = T.treeEntries('zb', items, { uuid: 'b', address: '1b', topic: '', unnamed: true });
    assert.deepEqual([...unnamed.map((x) => `${x.address}|${x.current}|${x.unnamed}|${x.depth}`)], ['1|false|false|0', '1a|false|false|1', '1b|true|true|1']);
    const clash = T.treeEntries('zb', items, { uuid: 'b', address: '1a', unnamed: true });
    assert.deepEqual([...clash.map((x) => `${x.address}|${x.uses}|${x.current}`)], ['1|1|false', '1a|2|false', '1a|2|true'], 'an address claimed twice is flagged');
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
        calls.push({ method, path: p, body: init.body, credentials: init.credentials });
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

  test('two reads at once ask for the organization once', async () => {
    const list = { method: 'GET', re: /chat_conversations_v2\?limit=100&offset=0$/, body: { data: [], has_more: false } };
    const { api, calls } = stubApi([ORGS, convRoute(okConv), list]);
    await Promise.all([api.getConversation(CONV), api.listConversations()]);
    assert.equal(calls.filter((c) => c.path === '/api/organizations').length, 1);
    assert.equal(calls.length, 3);
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
      '',
      'If there is a message below, end your first reply with a separate last line: "Branch title:" followed by 3 to 6 words naming what this branch is about, from my message below, in the language of the conversation.',
      '</zb-instructions>',
      '',
      '',
    ].join('\n'));
    assert.equal(b.turns, 4);
    assert.equal(b.chars, b.text.length);
    assert.equal(b.tokens, Math.round(b.text.length / 4));
  });

  test('specs/forking__prompt.md shows the instructions word for word (its line breaks aside)', () => {
    const doc = fs.readFileSync(new URL('../specs/forking__prompt.md', import.meta.url), 'utf8');
    const blocks = [...doc.matchAll(/```\n(<zb-instructions>[\s\S]*?<\/zb-instructions>)\n```/g)].map((m) => m[1]);
    const paragraphs = (t) => t.split(/\n\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim());
    const instr = (t) => '<zb-instructions>' + t.split('<zb-instructions>')[1].split('</zb-instructions>')[0] + '</zb-instructions>';
    const zb = { tree: 'zb', parentTitle: 'zb/1b · T', parentAddress: '1b', newAddress: '1b1', messages: ROOT };
    assert.equal(blocks.length, 2);
    assert.deepEqual(paragraphs(blocks[0]), [...paragraphs(instr(P.build({ ...zb, fork: 3 }).text))], 'a branch with history');
    assert.deepEqual(paragraphs(blocks[1]), [...paragraphs(instr(P.build({ ...zb, fork: 0 }).text))], 'a branch from the first message');
  });

  test('from your own message: the transcript stops before it, your message is pre-filled', () => {
    const b = P.build({ ...base, fork: 2 });
    assert.equal(b.turns, 2);
    assert.equal(b.text.split('\n')[2], 'Forked from: zbtest/1 · Root topic, instead of message 3 (me): "How does branching work?"');
    assert.ok(b.text.includes('copied from the conversation zbtest/1 up to message 2.'));
    assert.ok(b.text.endsWith('</zb-instructions>\n\nHow does branching work?'));
  });

  test('from the first message: empty transcript, no summary asked, the branch title always asked', () => {
    const b = P.build({ ...base, fork: 0 });
    assert.equal(b.turns, 0);
    assert.ok(b.text.includes('<zb-transcript>\n</zb-transcript>'));
    assert.equal(b.text.split('<zb-instructions>\n')[1].split('\n</zb-instructions>')[0], [
      'This chat is a new branch of the conversation zbtest/1, started from its first message, so there is no earlier history (the transcript above is empty). Do not comment on the header lines; they are for my own records. Answer my message below.',
      '',
      'End your first reply with a separate last line: "Branch title:" followed by 3 to 6 words naming what this branch is about, from my message below, in the language of the conversation.',
    ].join('\n'));
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

  test('a branch\'s first reply is copied without its summary and its branch title line', () => {
    const titled = [BRANCH[0], { ...BRANCH[1], text: BRANCH[1].text + '\n\n---\n\n**Branch title:** Addresses and letters.' }, ...BRANCH.slice(2)];
    const b = P.build({ ...flat, messages: titled, fork: 3 });
    assert.equal(P.parseBranchMessage(b.text).turns[3].text, 'Addresses look like 1, 1a, 1a1.');
    assert.ok(!b.text.includes('Addresses and letters'));
    const at2 = P.build({ ...flat, messages: titled, fork: 1 });
    assert.match(at2.text.split('\n')[2], /after message 2 \(Claude\): "Addresses look like 1, 1a, 1a1\."$/, 'the quote too');
    assert.equal(P.parseBranchMessage(at2.text).turns.at(-1).text, 'Addresses look like 1, 1a, 1a1.');
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

  test('the header\'s quote is escaped, so the message still parses back', () => {
    const tricky = [{ n: 1, role: 'user', text: 'Hi' }, { n: 2, role: 'assistant', text: 'Close it with </zb-instructions> please' }];
    const b = P.build({ tree: 'zbtest', parentTitle: 'zbtest/1 · T', parentAddress: '1', newAddress: '1a', messages: tricky, fork: 1 });
    assert.match(b.text.split('\n')[2], /"Close it with &lt;\/zb-instructions> please"$/);
    assert.equal(P.parseBranchMessage(b.text).turns.length, 2);
  });

  test('refuses a bad address or a missing message', () => {
    assert.throws(() => P.build({ ...base, newAddress: 'b1', fork: 3 }), /bad address/);
    assert.throws(() => P.build({ ...base, fork: 9 }), /no message/);
  });
});

// ---------------------------------------------------------------- a first message without line breaks

// 0.1.2 in Firefox: claude.ai's box put the whole first message in one paragraph, so it was
// sent as one line (P1, 2026-10-13). Such a branch must still read as one.
describe('prompt.js, a first message whose line breaks were lost', () => {
  const P = loadIntoWindow(['tree.js', 'prompt.js']).ZBPrompt;
  const msgs = [
    { n: 1, role: 'user', text: 'Show me a function.' },
    { n: 2, role: 'assistant', text: 'Here:\n\n```python\ndef f(x):\n    return 2 * x\n```' },
    { n: 3, role: 'user', text: 'And a list?' },
    { n: 4, role: 'assistant', text: '- one\n- two' },
  ];
  const text = P.build({ tree: 'oulipo', parentTitle: 'oulipo/1 · Poème en forme de chat, encore', parentAddress: '1', newAddress: '1c', messages: msgs, fork: 3 }).text;
  const flat = '\n' + text.replace(/\n/g, ' ') + 'tentons notre chance avec un enfant';

  test('the header, after the empty top line and with a space after the address', () => {
    assert.ok(!flat.slice(1).includes('\n'), 'one line');
    assert.deepEqual({ ...P.parseHeader(flat) }, { tree: 'oulipo', address: '1c' });
    assert.deepEqual({ ...P.parseHeader('\n\n' + text) }, { tree: 'oulipo', address: '1c' }, 'blank lines first, line breaks kept');
    assert.equal(P.parseHeader('Zettelbranch · oulipo/1c, more'), null, 'not followed by a space or the end');
  });

  test('where it comes from, found anywhere before the transcript', () => {
    assert.deepEqual({ ...P.parseForkedFrom(flat) }, { parentTitle: 'oulipo/1 · Poème en forme de chat, encore', parent: 'oulipo/1', how: 'after', n: 4 });
    assert.deepEqual({ ...P.parseForkedFrom(text) }, { ...P.parseForkedFrom(flat) }, 'the same as with its line breaks');
    const quoted = text.replace('</zb-transcript>', 'Forked from: zz/9 · Fake, after message 1 (Claude): "x" </zb-transcript>');
    assert.equal(P.parseForkedFrom(quoted).parent, 'oulipo/1', 'never from the transcript');
  });

  test('its parts: the turns (their line breaks lost too, the code fence inside) and your text', () => {
    const b = P.parseBranchMessage(flat);
    assert.equal(b.address, '1c');
    assert.deepEqual([...b.turns.map((t) => `${t.branch}#${t.n} ${t.role}`)], ['1#1 user', '1#2 assistant', '1#3 user', '1#4 assistant']);
    assert.equal(b.turns[1].text, 'Here:  ```python def f(x):     return 2 * x ```');
    assert.equal(b.ownText, 'tentons notre chance avec un enfant');
    const named = P.proposeTopic('', [{ n: 1, role: 'user', text: flat }, { n: 2, role: 'assistant', text: 'Voici.\n\nBranch title: Un enfant au ballon' }]);
    assert.deepEqual({ ...named }, { topic: 'Un enfant au ballon', from: 'claude' });
  });
});

describe('branch.js, comparing the box with the prompt', () => {
  const same = loadIntoWindow(['branch.js']).ZBBranch.insertion.same;
  test('blank lines at the start and the end do not count; anything else does', () => {
    assert.equal(same('\nZettelbranch · zb/1a\nPath\n\n', 'Zettelbranch · zb/1a\nPath\n\n'), true, 'Firefox\'s empty top line');
    assert.equal(same('a\nb', 'a\nb\n\n'), true);
    assert.equal(same('  a\nb', 'a\nb'), false, 'spaces on the first line count');
    assert.equal(same('a b', 'a\nb'), false, 'a lost line break counts');
    assert.equal(same('a\n\nb', 'a\nb'), false, 'an extra blank line inside counts');
  });
});

// ---------------------------------------------------------------- the name proposal

describe('prompt.js, the topic proposed for a branch\'s name', () => {
  const P = loadIntoWindow(['tree.js', 'prompt.js']).ZBPrompt;
  const ROOT = [
    { n: 1, role: 'user', text: 'Write a poem in the shape of a cat.' },
    { n: 2, role: 'assistant', text: 'Here is a calligram.' },
  ];
  // The first message of oulipo/1a, from Claude's reply 2 of oulipo/1, with `own` typed after it.
  const header = (own = '') => P.build({ tree: 'oulipo', parentTitle: 'oulipo/1 · Poème en forme de chat', parentAddress: '1', newAddress: '1a', messages: ROOT, fork: 1 }).text + own;
  const summary = '> Parent oulipo/1 in brief: We wrote a calligram of a cat.';
  const branch = (own, ...more) => [
    { n: 1, role: 'user', text: header(own) },
    { n: 2, role: 'assistant', text: own ? `${summary}\n\nFish and birds can share a page.` : summary },
    ...more.map((text, i) => ({ n: 3 + i, role: i % 2 ? 'assistant' : 'user', text })),
  ];
  const propose = (title, messages) => ({ ...P.proposeTopic(title, messages) });

  test('where a branch comes from, from its header', () => {
    assert.deepEqual({ ...P.parseForkedFrom(header()) }, { parentTitle: 'oulipo/1 · Poème en forme de chat', parent: 'oulipo/1', how: 'after', n: 2 });
    const own = 'Zettelbranch · zb/1a2b\nPath: zb/1 › 1a › 1a2 › 1a2b\nForked from: zb/1a2 · A, b, c, instead of message 3 (me): "x"';
    assert.deepEqual({ ...P.parseForkedFrom(own) }, { parentTitle: 'zb/1a2 · A, b, c', parent: 'zb/1a2', how: 'instead of', n: 3 });
    const noPath = 'Zettelbranch · zb/1a\nPath?\nForked from: zb/1 · Root, after message 4 (Claude): "x"';
    assert.equal(P.parseForkedFrom(noPath).parent, 'zb/1', 'from the parent\'s title');
    assert.equal(P.parseForkedFrom('Hello'), null);
  });

  test('a first question in the branch, typed after the instructions, wins over claude.ai\'s title', () => {
    const msgs = branch('Et si le chat parlait aux poissons et aux oiseaux ?');
    const want = { topic: 'Et si le chat parlait aux', from: 'question' };
    for (const title of ['Poème en forme de chat', '  poème en  forme de CHAT ', 'oulipo/1 · Poème en forme de chat', 'oulipo/1 . poème en forme de chat', 'oulipo/1a · Poème en forme de chat']) {
      assert.deepEqual(propose(title, msgs), title.startsWith('oulipo/1a') ? { topic: 'Poème en forme de chat', from: 'current' } : want, title);
    }
    assert.deepEqual(propose('', msgs), want, 'no title yet');
    assert.deepEqual(propose('oulipo/1a', msgs), want, 'the address without a topic');
  });

  test('the prompt sent as is: the question asked in the next message', () => {
    const msgs = branch('', 'Fish and birds?', 'They can.');
    assert.deepEqual(propose('Poème en forme de chat', msgs), { topic: 'Fish and birds', from: 'question' });
    const image = branch('', '[file: fish.png, not copied]', 'A fish.', 'And birds, then?');
    assert.deepEqual(propose('', image), { topic: 'And birds, then', from: 'question' }, 'a message with only a placeholder is skipped');
  });

  test('cut at a word: at most 6 words and 50 characters, no trailing punctuation, no placeholders or Markdown', () => {
    assert.equal(P.shortTopic('One two three four five six seven eight.'), 'One two three four five six');
    assert.equal(P.shortTopic('Antidisestablishmentarianism and supercalifragilistic words, really'), 'Antidisestablishmentarianism and');
    assert.equal(P.shortTopic('Pourquoi ?'), 'Pourquoi');
    assert.equal(P.shortTopic('Fish, birds…'), 'Fish, birds');
    assert.equal(P.shortTopic('**Fish** and `birds`!\n\n[file: photo.png, not copied]\n\n[pasted text: notes.txt]\nPASTED'), 'Fish and birds');
    assert.equal(P.shortTopic('x'.repeat(80)), 'x'.repeat(50));
    assert.equal(P.shortTopic('[file: photo.png, not copied]'), '');
    assert.equal(P.shortTopic('  ?! '), '');
  });

  test('claude.ai\'s title describes the parent even when it differs from the parent\'s title: the question still wins', () => {
    // Pascal's second real use: oulipo/1a1, named by claude.ai after oulipo/1a's conversation.
    const msgs = branch('tentons notre chance avec un enfant qui joue au ballon');
    assert.deepEqual(propose('Poèmes visuels d\'un chat et de deux amoureux', msgs), { topic: 'tentons notre chance avec un enfant', from: 'question' });
  });

  test('no question: claude.ai\'s title (an address prefix dropped); no title either: Claude\'s reply; nothing: null', () => {
    assert.deepEqual(propose('Poissons et oiseaux', branch('')), { topic: 'Poissons et oiseaux', from: 'title' });
    assert.deepEqual(propose('zbtest/7 · Poissons', branch('')), { topic: 'Poissons', from: 'title' }, 'another address: its topic');
    assert.deepEqual(propose('', branch('')), { topic: 'We wrote a calligram of a cat', from: 'reply' });
    assert.equal(P.proposeTopic('', [{ n: 1, role: 'user', text: header() }]), null);
    assert.equal(P.proposeTopic('Poème en forme de chat', [{ n: 1, role: 'user', text: 'Not a branch' }, ROOT[1]]), null, 'not a branch');
  });

  test('Claude\'s branch title: the last non-empty line of its first reply, leniently', () => {
    const t = (last) => P.parseBranchTitle(`Here is a calligram.\n\n${last}\n\n`);
    assert.equal(t('Branch title: Un enfant au ballon'), 'Un enfant au ballon', 'plain');
    assert.equal(t('**Branch title:** Un enfant au ballon'), 'Un enfant au ballon', 'bold label');
    assert.equal(t('**Branch title: Un enfant au ballon**'), 'Un enfant au ballon', 'all bold');
    assert.equal(t('*Branch title:* Un enfant au ballon.'), 'Un enfant au ballon', 'italics, a period');
    assert.equal(t('Branch title: "Un enfant au ballon".'), 'Un enfant au ballon', 'quotes and a period');
    assert.equal(t('Branch title: « Un enfant au ballon »'), 'Un enfant au ballon', 'French quotes');
    assert.equal(t('branch Title : Un enfant au ballon'), 'Un enfant au ballon', 'case and spaces');
    assert.equal(t('Branch title: Where do lipograms come from?'), 'Where do lipograms come from?', 'a question mark stays');
    assert.equal(P.parseBranchTitle('Here is a calligram.'), '', 'absent');
    assert.equal(P.parseBranchTitle('Branch title: Not last\n\nMore text after it.'), '', 'not on the last line');
    assert.equal(P.parseBranchTitle('Done.\n\nBranch title:'), '', 'no words');
    assert.equal(P.stripBranchTitle('Answer.\n\nBranch title: X'), 'Answer.');
    assert.equal(P.stripBranchTitle('Answer.\n\n***\n\nBranch title: X\n'), 'Answer.', 'with a rule above it');
    assert.equal(P.stripBranchTitle('Branch title: X\n\nAnswer.'), 'Branch title: X\n\nAnswer.', 'not the last line: kept');
  });

  test('the four sources in order: Claude\'s branch title, your question, claude.ai\'s title, Claude\'s reply', () => {
    const titled = (msgs, last) => [msgs[0], { ...msgs[1], text: `${msgs[1].text}\n\n${last}` }, ...msgs.slice(2)];
    const q = branch('tentons notre chance avec un enfant qui joue au ballon');
    assert.deepEqual(propose('Poèmes visuels d\'un chat', titled(q, 'Branch title: Un enfant au ballon')), { topic: 'Un enfant au ballon', from: 'claude' });
    assert.deepEqual(propose('Poèmes visuels d\'un chat', q), { topic: 'tentons notre chance avec un enfant', from: 'question' });
    assert.deepEqual(propose('Poèmes visuels d\'un chat', branch('')), { topic: 'Poèmes visuels d\'un chat', from: 'title' });
    assert.deepEqual(propose('', branch('')), { topic: 'We wrote a calligram of a cat', from: 'reply' });
    assert.deepEqual(propose('oulipo/1a · Jeux d\'enfants', titled(q, 'Branch title: Un enfant au ballon')), { topic: 'Jeux d\'enfants', from: 'current' }, 'named already: its name first');
    const later = [...branch(''), { n: 3, role: 'user', text: 'Et un enfant ?' }, { n: 4, role: 'assistant', text: 'Oui.\n\nBranch title: Not from the first reply' }];
    assert.deepEqual(propose('', later), { topic: 'Et un enfant', from: 'question' }, 'only the first reply counts');
    assert.equal(P.firstWords(`${summary}\n\nBranch title: X`), 'We wrote a calligram of a cat', 'the reply\'s words leave the title out');
  });

  test('a branch named already: its current name, typed by hand too', () => {
    assert.deepEqual(propose('oulipo/1a · Poisson et oiseau', branch('Fish?')), { topic: 'Poisson et oiseau', from: 'current' });
    assert.deepEqual(propose('oulipo/1a - Poisson et oiseau', branch('Fish?')), { topic: 'Poisson et oiseau', from: 'current' });
    assert.equal(P.namedTopic('oulipo/1a · x', { tree: 'oulipo', address: '1a' }), 'x');
    assert.equal(P.namedTopic('oulipo/1a1 · x', { tree: 'oulipo', address: '1a' }), '');
    assert.equal(P.namedTopic('zb/1a · x', { tree: 'oulipo', address: '1a' }), '');
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

// ---------------------------------------------------------------- menu.js

// A small page imitating claude.ai's title menu (as found in P11), in jsdom: every event that
// reaches an element is recorded. jsdom has no layout and no execCommand: both are stubbed
// (a connected element has a box; insertText replaces the focused field's value, unless it
// is read-only).
describe('menu.js: claude.ai\'s title menu', () => {
  const PAGE = `<!doctype html><html><body>
    <div data-testid="chat-title-split"><button aria-haspopup="menu">zbtest/1 · Old</button><button>Share</button></div>
    <div data-testid="chat-input"><div contenteditable="true" class="ProseMirror"><p>draft</p></div></div>
    <button data-testid="chat-input-send">Send</button>
  </body></html>`;
  function page({ menu = true, renameItem = true, field = true, readonly = false, closesOnEnter = true } = {}) {
    const events = [];
    const win = loadIntoWindow(['menu.js'], {
      url: 'https://claude.ai/chat/aaaaaaaa-0000-4000-8000-000000000001',
      html: PAGE,
      before: (w) => {
        w.Element.prototype.getClientRects = function () { return this.isConnected ? [{}] : []; };
        w.document.execCommand = (cmd, _ui, value) => {
          const f = w.document.activeElement;
          if (cmd !== 'insertText' || !f || f.readOnly) return false;
          f.value = value;
          return true;
        };
      },
    });
    const d = win.document;
    const who = (t) => (t.getAttribute && (t.getAttribute('data-testid') || t.getAttribute('role') || (t.closest('[data-testid]') && t.closest('[data-testid]').getAttribute('data-testid')))) || t.nodeName;
    for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'keydown', 'keypress', 'keyup']) d.addEventListener(type, (e) => events.push(`${type} ${who(e.target)}${e.key ? ' ' + e.key : ''}`), true);
    let open = null;
    const title = d.querySelector('[aria-haspopup="menu"]');
    title.addEventListener('pointerdown', () => {
      if (!menu || open) return;
      open = d.createElement('div');
      open.setAttribute('role', 'menu');
      for (const id of ['star', 'rename', 'share', 'delete']) {
        if (id === 'rename' && !renameItem) continue;
        const item = d.createElement('div');
        item.setAttribute('role', 'menuitem');
        item.setAttribute('data-testid', `${id}-chat-trigger`);
        if (id === 'rename') item.addEventListener('click', () => {
          open.remove();
          open = null;
          if (!field) return;
          const input = d.createElement('input');
          input.setAttribute('data-testid', 'name-chat');
          input.readOnly = readonly;
          input.value = 'zbtest/1 · Old';
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || (e.key === 'Enter' && closesOnEnter)) input.replaceWith(title);
          });
          title.replaceWith(input);
          input.focus();
        });
        open.append(item);
      }
      d.body.append(open);
    });
    d.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) {
        open.remove();
        open = null;
      }
    });
    return { M: win.ZBMenu, d, events };
  }
  const NAME = 'zbtest/1 · New';
  const never = (events) => events.filter((e) => /delete|share|star|chat-input|ProseMirror/.test(e));

  test('the whole rename: the title button, the exact Rename item, the name typed, Enter in the field; nothing else', async () => {
    const { M, d, events } = page();
    assert.deepEqual({ ...(await M.rename(NAME)) }, { ok: true });
    assert.deepEqual(events, [
      'pointerdown chat-title-split', 'mousedown chat-title-split', 'pointerup chat-title-split', 'mouseup chat-title-split',
      'pointerdown rename-chat-trigger', 'mousedown rename-chat-trigger', 'pointerup rename-chat-trigger', 'mouseup rename-chat-trigger', 'click rename-chat-trigger',
      'keydown name-chat Enter',
    ]);
    assert.equal(d.querySelector('[contenteditable]').textContent, 'draft', 'the message box untouched');
  });

  test('each failing step closes what it opened, and never touches Delete or the message box', async () => {
    const cases = [
      [{ menu: false }, 'no menu opened', 0],
      [{ renameItem: false }, 'no Rename item in the menu', 1],
      [{ field: false }, 'no rename field appeared', 0],
      [{ readonly: true }, 'the name could not be typed in the field', 1],
      [{ closesOnEnter: false }, 'the rename field did not close on Enter', 1],
    ];
    for (const [opts, why, escapes] of cases) {
      const { M, d, events } = page(opts);
      assert.deepEqual({ ...(await M.rename(NAME)) }, { ok: false, why }, why);
      assert.deepEqual(never(events), [], why);
      assert.equal(events.filter((e) => e.startsWith('keydown') && e.endsWith('Escape')).length, escapes, `${why}: Escape sent`);
      assert.equal(d.querySelector('[role="menu"]'), null, `${why}: no menu left open`);
      assert.equal(d.querySelector('[data-testid="name-chat"]'), null, `${why}: no field left open`);
    }
    const none = loadIntoWindow(['menu.js'], { html: '<body><div data-testid="chat-input" contenteditable="true"></div></body>' }).ZBMenu;
    assert.deepEqual({ ...(await none.rename(NAME)) }, { ok: false, why: 'no title button' }, 'no title button: nothing sent');
  });

  test('the four targets, by their exact selectors', () => {
    const { M } = page();
    assert.deepEqual({ ...M.TARGETS }, {
      titleButton: '[data-testid="chat-title-split"] button[aria-haspopup="menu"]',
      menu: '[role="menu"]',
      renameItem: '[role="menu"] [data-testid="rename-chat-trigger"]',
      nameField: 'input[data-testid="name-chat"]',
    });
  });
});
