// Zettelbranch spike: the ONLY file that uses the network.
//
// Same-origin requests to claude.ai's own web API, made from the content script. Chrome
// makes content-script requests "on behalf of the web origin that the content script has
// been injected into", under that page's same-origin policy, so no host permission is
// needed, and the browser attaches the login cookie by itself. This file never reads,
// stores or sends credentials or session tokens.
//
// Reads, plus renaming, plus (P9) claude.ai's own fork of a zbtest/ chat into a new chat.
// Never sends a message, never deletes. The only calls:
//
//   GET  /api/organizations
//   GET  /api/organizations/<org>/chat_conversations_v2?limit=<n>&offset=<n>
//   GET  /api/organizations/<org>/chat_conversations/<id>?tree=True&rendering_mode=messages&render_all_tools=true
//   PUT  /api/organizations/<org>/chat_conversations/<id>      body {"name": "zbtest/…"}
//   POST /claudeai-rpc/anthropic.bard.api.v1alpha.ConversationService/PerformAction
//        body: continueBranchAsNewChat only, from a zbtest/ chat (P9, NF-1)
//
// The API is undocumented. Every answer is checked; anything unexpected becomes an error
// with the status and the first 200 characters of the body.
(function (global) {
  'use strict';

  const ORIGIN = 'https://claude.ai';
  const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  const ID = '[A-Za-z0-9_-]{1,80}'; // org ids are uuids today; stay lenient
  // Every request must match one of these. Anything else is refused before it is sent.
  const ALLOWED = [
    { method: 'GET', re: new RegExp('^/api/organizations$') },
    { method: 'GET', re: new RegExp(`^/api/organizations/${ID}/chat_conversations_v2\\?limit=\\d+&offset=\\d+$`) },
    { method: 'GET', re: new RegExp(`^/api/organizations/${ID}/chat_conversations/${UUID}\\?tree=True&rendering_mode=messages&render_all_tools=true$`) },
    { method: 'PUT', re: new RegExp(`^/api/organizations/${ID}/chat_conversations/${UUID}$`) },
    { method: 'POST', re: new RegExp('^/claudeai-rpc/anthropic\\.bard\\.api\\.v1alpha\\.ConversationService/PerformAction$') },
  ];
  const TEST_PREFIX = 'zbtest/';
  const PAGE_SIZE = 100;
  const MAX_PAGES = 100;

  const stats = { requests: 0, ms: 0 };
  let orgCache = null;

  class ApiError extends Error {
    constructor(message, details) {
      super(message);
      this.name = 'ApiError';
      this.details = details;
    }
  }

  const redact = (path) => (orgCache ? path.split(orgCache.id).join('<org>') : path);

  async function request(method, path, body, extraHeaders) {
    if (location.origin !== ORIGIN) throw new ApiError('not on claude.ai', { origin: location.origin });
    if (!ALLOWED.some((a) => a.method === method && a.re.test(path))) {
      throw new ApiError('request not in the allowed list', { method, path: redact(path) });
    }
    const t0 = performance.now();
    let res;
    let text;
    try {
      res = await fetch(ORIGIN + path, {
        method,
        credentials: 'same-origin',
        headers: body ? { 'content-type': 'application/json', ...(extraHeaders || {}) } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      text = await res.text();
    } catch (e) {
      throw new ApiError('network error', { method, path: redact(path), error: String(e) });
    } finally {
      stats.requests++;
      stats.ms += performance.now() - t0;
    }
    const details = { method, path: redact(path), status: res.status, bodyStart: text.slice(0, 200) };
    if (!res.ok) throw new ApiError(`claude.ai answered ${res.status}`, details);
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new ApiError('claude.ai answered with something that is not JSON', details);
    }
  }

  // The shape of a value (keys and types), never its content: an unexpected answer may hold
  // message text from any conversation.
  function shapeOf(v, depth = 0) {
    if (v === null || v === undefined) return String(v);
    if (Array.isArray(v)) return depth > 1 ? `array(${v.length})` : `array(${v.length}) of ${v.length ? shapeOf(v[0], depth + 1) : 'nothing'}`;
    if (typeof v === 'object') {
      if (depth > 1) return 'object';
      return '{' + Object.keys(v).slice(0, 20).map((k) => `${k}: ${shapeOf(v[k], depth + 1)}`).join(', ') + '}';
    }
    return typeof v;
  }

  function expect(cond, what, value) {
    if (!cond) {
      throw new ApiError(`unexpected answer: ${what}. claude.ai may have changed.`, {
        shape: shapeOf(value).slice(0, 300),
      });
    }
  }

  // The organization whose capabilities include chat (not simply the first one).
  async function org() {
    if (orgCache) return orgCache;
    const orgs = await request('GET', '/api/organizations');
    expect(Array.isArray(orgs) && orgs.length > 0, 'organizations is not a non-empty list', orgs);
    expect(orgs.every((o) => o && typeof o.uuid === 'string'), 'an organization has no uuid', orgs[0]);
    const chat = orgs.filter((o) => Array.isArray(o.capabilities) && o.capabilities.includes('chat'));
    expect(chat.length > 0, 'no organization has the chat capability', orgs.map((o) => o.capabilities));
    orgCache = {
      id: chat[0].uuid,
      info: { organizations: orgs.length, withChat: chat.length, capabilities: chat[0].capabilities },
    };
    return orgCache;
  }

  // Every conversation, through offset paging. Items are checked for uuid and name.
  async function listConversations() {
    const o = await org();
    const items = [];
    const t0 = performance.now();
    const r0 = stats.requests;
    let shape = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const json = await request('GET', `/api/organizations/${o.id}/chat_conversations_v2?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`);
      let data;
      let hasMore;
      if (Array.isArray(json)) {
        shape = 'array';
        data = json;
        hasMore = json.length === PAGE_SIZE;
      } else {
        expect(json && Array.isArray(json.data), 'conversation list has no data array', json);
        shape = '{data, has_more}';
        data = json.data;
        hasMore = json.has_more === true;
      }
      expect(data.every((c) => c && typeof c.uuid === 'string' && (typeof c.name === 'string' || c.name === null)), 'a conversation has no uuid or name', data[0]);
      items.push(...data.map((c) => (c.name === null ? { ...c, name: '' } : c)));
      if (!hasMore || data.length === 0) break;
    }
    return { items, shape, requests: stats.requests - r0, ms: Math.round(performance.now() - t0) };
  }

  // One conversation with its whole message tree.
  async function getConversation(id) {
    const o = await org();
    const conv = await request('GET', `/api/organizations/${o.id}/chat_conversations/${id}?tree=True&rendering_mode=messages&render_all_tools=true`);
    expect(conv && typeof conv === 'object' && (typeof conv.name === 'string' || conv.name === null), 'conversation has no name', conv);
    if (conv.name === null) conv.name = '';
    expect(Array.isArray(conv.chat_messages), 'conversation has no chat_messages list', Object.keys(conv || {}));
    expect(conv.chat_messages.every((m) => m && typeof m.uuid === 'string' && (m.sender || m.role)), 'a message has no uuid or sender', conv.chat_messages[0]);
    return conv;
  }

  // Rename. Spike rule: only to names in the test tree.
  async function renameConversation(id, name) {
    if (typeof name !== 'string' || !name.startsWith(TEST_PREFIX)) {
      throw new ApiError('refused: the spike only renames to names starting with zbtest/', { name });
    }
    const o = await org();
    const json = await request('PUT', `/api/organizations/${o.id}/chat_conversations/${id}`, { name });
    return { answer: json && typeof json === 'object' ? { keys: Object.keys(json), name: json.name } : json };
  }

  // P9: claude.ai's own "continue branch as new chat" (Connect JSON). The new chat's id is
  // ours to choose; the answer is empty and the copy fills in over a few seconds. Spike
  // rule: only from a chat in the test tree, so the copy (which keeps the title) is too.
  async function continueAsNewChat(sourceId, sourceTitle, throughMessageId) {
    if (typeof sourceTitle !== 'string' || !sourceTitle.startsWith(TEST_PREFIX)) {
      throw new ApiError('refused: the spike only forks chats whose title starts with zbtest/', {});
    }
    const o = await org();
    const newId = crypto.randomUUID();
    const sessionId = 'sess_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);
    const body = {
      header: { conversationId: newId, mutationId: { sessionId, version: 1 } },
      continueBranchAsNewChat: { sourceConversationId: sourceId, throughMessageId },
    };
    const json = await request('POST', '/claudeai-rpc/anthropic.bard.api.v1alpha.ConversationService/PerformAction', body, {
      'connect-protocol-version': '1',
      'x-organization-uuid': o.id,
      'anthropic-client-platform': 'web_claude_ai',
    });
    return { newId, answer: json === null ? 'empty' : shapeOf(json).slice(0, 200) };
  }

  function errorInfo(e) {
    return e instanceof ApiError ? { error: e.message, ...e.details } : { error: String((e && e.message) || e) };
  }

  global.ZBApi = {
    org: async () => (await org()).info,
    listConversations,
    getConversation,
    renameConversation,
    continueAsNewChat,
    stats: () => ({ requests: stats.requests, ms: Math.round(stats.ms) }),
    errorInfo,
    ApiError,
  };
})(globalThis);
