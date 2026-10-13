// Unit tests: the extension's files run in a jsdom window, as plain scripts, the way the
// browser runs content scripts. No network: api.js gets a stub `fetch`.
//
//   node --test unit.test.mjs
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
