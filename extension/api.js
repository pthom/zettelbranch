// Zettelbranch: the ONLY file that uses the network.
//
// Same-origin requests to claude.ai's own web API, made from the content script. No host
// permission is needed, and the browser attaches the login by itself: this file never
// reads, stores or sends credentials or session tokens.
//
// Reads, renaming, and claude.ai's own copy of a chat into a new chat. Never sends a
// message, never deletes. The only calls:
//
//   GET  /api/organizations
//   GET  /api/organizations/<org>/chat_conversations_v2?limit=<n>&offset=<n>
//   GET  /api/organizations/<org>/chat_conversations/<id>?tree=True&rendering_mode=messages&render_all_tools=true
//   PUT  /api/organizations/<org>/chat_conversations/<id>      body {"name": "<tree>/<address> · <topic>"}
//   POST /claudeai-rpc/anthropic.bard.api.v1alpha.ConversationService/PerformAction
//        body {"header": {"conversationId": <new id>, "mutationId": {"sessionId": "sess_…", "version": 1}},
//              "continueBranchAsNewChat": {"sourceConversationId": <id>, "throughMessageId": <id>}}
//        claude.ai's "continue branch as new chat": it copies a chat, through its last message,
//        into a new chat whose id Zettelbranch picks. Nothing else may be in the body.
//
// And one page load: openCreatedChat() loads /chat/<id> of the chat that the last copy just
// created, and no other page.
//
// The API is undocumented. Every answer is checked. An error says what went wrong (status,
// the shape of an unexpected answer) but never holds message text.
(function (global) {
  'use strict';

  const ORIGIN = 'https://claude.ai';
  const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  const UUID_RE = new RegExp(`^${UUID}$`);
  const ID = '[A-Za-z0-9_-]{1,80}'; // org ids are uuids today; stay lenient
  // Renames only to Zettelbranch titles: `<tree>/<address> · <topic>`, on one line.
  const TITLE_RE = /^[a-z0-9-]+\/[0-9][0-9a-z]* · \S[^\n]*$/;
  // claude.ai's copy of a chat into a new chat (Connect protocol, JSON).
  const FORK = { method: 'POST', path: '/claudeai-rpc/anthropic.bard.api.v1alpha.ConversationService/PerformAction' };

  // An object with exactly these keys.
  const hasKeys = (o, keys) => !!o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).sort().join() === [...keys].sort().join();
  // The fork's body: the new chat's id and a fresh mutation id, then the action, nothing else.
  const isForkBody = (b) =>
    hasKeys(b, ['header', 'continueBranchAsNewChat']) &&
    hasKeys(b.header, ['conversationId', 'mutationId']) &&
    UUID_RE.test(b.header.conversationId) &&
    hasKeys(b.header.mutationId, ['sessionId', 'version']) &&
    /^sess_[0-9a-f]{24}$/.test(b.header.mutationId.sessionId) &&
    b.header.mutationId.version === 1 &&
    hasKeys(b.continueBranchAsNewChat, ['sourceConversationId', 'throughMessageId']) &&
    UUID_RE.test(b.continueBranchAsNewChat.sourceConversationId) &&
    UUID_RE.test(b.continueBranchAsNewChat.throughMessageId) &&
    b.header.conversationId !== b.continueBranchAsNewChat.sourceConversationId;

  // Every request must match one of these, its body included. Anything else is refused
  // before it is sent.
  const noBody = (b) => b === undefined;
  const ALLOWED = [
    { method: 'GET', re: new RegExp('^/api/organizations$'), body: noBody },
    { method: 'GET', re: new RegExp(`^/api/organizations/${ID}/chat_conversations_v2\\?limit=\\d+&offset=\\d+$`), body: noBody },
    { method: 'GET', re: new RegExp(`^/api/organizations/${ID}/chat_conversations/${UUID}\\?tree=True&rendering_mode=messages&render_all_tools=true$`), body: noBody },
    { method: 'PUT', re: new RegExp(`^/api/organizations/${ID}/chat_conversations/${UUID}$`), body: (b) => hasKeys(b, ['name']) && TITLE_RE.test(b.name) },
    { method: FORK.method, re: new RegExp(`^${FORK.path.replace(/\./g, '\\.')}$`), body: isForkBody },
  ];
  const PAGE_SIZE = 100;
  const MAX_PAGES = 100;

  let orgId = null;
  // The chat the last fork created: the only page openCreatedChat() loads.
  let created = null;

  // kind: 'shape' (claude.ai changed), 'http', 'network', 'refused', 'origin'.
  class ApiError extends Error {
    constructor(kind, message, details) {
      super(message);
      this.name = 'ApiError';
      this.kind = kind;
      this.details = details || {};
    }
  }

  const redact = (path) => (orgId ? path.split(orgId).join('<org>') : path);

  // An error answer's Connect code, such as `failed_precondition`: a word, never its message.
  function errorCode(text) {
    try {
      const j = JSON.parse(text);
      return j && typeof j.code === 'string' && /^[a-z_]{1,40}$/.test(j.code) ? j.code : undefined;
    } catch (e) {
      return undefined;
    }
  }

  async function request(method, path, body, extraHeaders) {
    if (location.origin !== ORIGIN) throw new ApiError('origin', 'not on claude.ai');
    if (!ALLOWED.some((a) => a.method === method && a.re.test(path) && a.body(body))) {
      throw new ApiError('refused', 'request not in the allowed list', { method, path: redact(path) });
    }
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
      throw new ApiError('network', 'claude.ai could not be reached', { method, path: redact(path), error: String(e).slice(0, 100) });
    }
    const details = { method, path: redact(path), status: res.status };
    if (!res.ok) throw new ApiError('http', `claude.ai answered ${res.status}`, { ...details, code: errorCode(text) });
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new ApiError('shape', 'the answer is not JSON', { ...details, chars: text.length });
    }
  }

  // The shape of a value (keys and types), never its content.
  function shapeOf(v, depth = 0) {
    if (v === null || v === undefined) return String(v);
    if (Array.isArray(v)) return depth > 1 ? `array(${v.length})` : `array(${v.length}) of ${v.length ? shapeOf(v[0], depth + 1) : 'nothing'}`;
    if (typeof v === 'object') {
      if (depth > 1) return 'object';
      return '{' + Object.keys(v).slice(0, 20).map((k) => `${k.slice(0, 40)}: ${shapeOf(v[k], depth + 1)}`).join(', ') + '}';
    }
    return typeof v;
  }

  function expect(cond, what, value) {
    if (!cond) throw new ApiError('shape', `unexpected answer: ${what}`, { shape: shapeOf(value).slice(0, 300) });
  }

  // The organization whose capabilities include chat (not simply the first one).
  async function org() {
    if (orgId) return orgId;
    const orgs = await request('GET', '/api/organizations');
    expect(Array.isArray(orgs) && orgs.length > 0, 'organizations is not a non-empty list', orgs);
    expect(orgs.every((o) => o && typeof o.uuid === 'string'), 'an organization has no uuid', orgs[0]);
    const chat = orgs.filter((o) => Array.isArray(o.capabilities) && o.capabilities.includes('chat'));
    expect(chat.length > 0, 'no organization has the chat capability', orgs[0]);
    orgId = chat[0].uuid;
    return orgId;
  }

  // Every conversation (uuid and name), through offset paging.
  async function listConversations() {
    const o = await org();
    const items = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const json = await request('GET', `/api/organizations/${o}/chat_conversations_v2?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`);
      expect(json && Array.isArray(json.data), 'the conversation list has no data array', json);
      const data = json.data;
      expect(data.every((c) => c && typeof c.uuid === 'string' && (typeof c.name === 'string' || c.name === null)), 'a conversation has no uuid or name', data[0]);
      items.push(...data.map((c) => ({ uuid: c.uuid, name: c.name || '' })));
      if (json.has_more !== true || data.length === 0) break;
    }
    return items;
  }

  // One conversation with its whole message tree.
  async function getConversation(id) {
    const o = await org();
    const conv = await request('GET', `/api/organizations/${o}/chat_conversations/${id}?tree=True&rendering_mode=messages&render_all_tools=true`);
    expect(conv && typeof conv === 'object' && (typeof conv.name === 'string' || conv.name === null), 'the conversation has no name', conv);
    expect(Array.isArray(conv.chat_messages), 'the conversation has no chat_messages list', conv);
    expect(conv.chat_messages.every((m) => m && typeof m.uuid === 'string' && (m.sender || m.role)), 'a message has no uuid or sender', conv.chat_messages[0]);
    if (conv.name === null) conv.name = '';
    return conv;
  }

  // Rename, only to a Zettelbranch title. Returns the name claude.ai answered with.
  async function renameConversation(id, name) {
    if (typeof name !== 'string' || !TITLE_RE.test(name)) {
      throw new ApiError('refused', 'Zettelbranch only renames a chat to a <tree>/<address> · <topic> title');
    }
    const o = await org();
    const json = await request('PUT', `/api/organizations/${o}/chat_conversations/${id}`, { name });
    return json && typeof json.name === 'string' ? json.name : null;
  }

  // claude.ai's own copy of the chat `sourceId`, through the message `throughMessageId`
  // (it accepts only the last one), into a new chat. Zettelbranch picks the new chat's id,
  // as claude.ai's page does. claude.ai answers at once; the copy fills in over a few seconds.
  // Returns the new chat's id.
  async function forkConversation(sourceId, throughMessageId) {
    if (!UUID_RE.test(String(sourceId)) || !UUID_RE.test(String(throughMessageId))) {
      throw new ApiError('refused', 'Zettelbranch only asks claude.ai to copy a chat by its id, through a message id');
    }
    const o = await org();
    const newId = crypto.randomUUID();
    // A random id for this one change, in the format claude.ai's page uses. Not a login.
    const sessionId = 'sess_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);
    const body = {
      header: { conversationId: newId, mutationId: { sessionId, version: 1 } },
      continueBranchAsNewChat: { sourceConversationId: sourceId, throughMessageId },
    };
    const json = await request(FORK.method, FORK.path, body, {
      'connect-protocol-version': '1',
      'x-organization-uuid': o,
      'anthropic-client-platform': 'web_claude_ai',
    });
    expect(json === null || (typeof json === 'object' && !Array.isArray(json)), 'the copy\'s answer is not an object', json);
    created = newId;
    return newId;
  }

  // Loads the page of the chat the last fork created (a page load: the tab's memory is
  // lost). The address ends with #zettelbranch, a marker that never leaves the browser: it
  // tells content.js that this page load is Zettelbranch's own. No other page, ever.
  function openCreatedChat(id) {
    if (location.origin !== ORIGIN) throw new ApiError('origin', 'not on claude.ai');
    if (!created || id !== created || !UUID_RE.test(created)) throw new ApiError('refused', 'Zettelbranch only opens the chat claude.ai just created for it');
    location.assign(`/chat/${created}#zettelbranch`);
  }

  global.ZBApi = { listConversations, getConversation, renameConversation, forkConversation, openCreatedChat, ApiError, TITLE_RE };
})(globalThis);
