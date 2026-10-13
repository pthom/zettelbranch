// Zettelbranch: the ONLY file that uses the network.
//
// Same-origin requests to claude.ai's own web API, made from the content script. No host
// permission is needed, and the browser attaches the login by itself: this file never
// reads, stores or sends credentials or session tokens.
//
// Reads, plus renaming. Never sends a message, never deletes. The only calls:
//
//   GET  /api/organizations
//   GET  /api/organizations/<org>/chat_conversations_v2?limit=<n>&offset=<n>
//   GET  /api/organizations/<org>/chat_conversations/<id>?tree=True&rendering_mode=messages&render_all_tools=true
//   PUT  /api/organizations/<org>/chat_conversations/<id>      body {"name": "<tree>/<address> · <topic>"}
//
// The API is undocumented. Every answer is checked. An error says what went wrong (status,
// the shape of an unexpected answer) but never holds message text.
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
  ];
  // Renames only to Zettelbranch titles: `<tree>/<address> · <topic>`, on one line.
  const TITLE_RE = /^[a-z0-9-]+\/[0-9][0-9a-z]* · \S[^\n]*$/;
  const PAGE_SIZE = 100;
  const MAX_PAGES = 100;

  let orgId = null;
  let orgRead = null; // the organization being read: two reads at once ask for it once

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

  async function request(method, path, body) {
    if (location.origin !== ORIGIN) throw new ApiError('origin', 'not on claude.ai');
    if (!ALLOWED.some((a) => a.method === method && a.re.test(path))) {
      throw new ApiError('refused', 'request not in the allowed list', { method, path: redact(path) });
    }
    let res;
    let text;
    try {
      res = await fetch(ORIGIN + path, {
        method,
        credentials: 'same-origin',
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      text = await res.text();
    } catch (e) {
      throw new ApiError('network', 'claude.ai could not be reached', { method, path: redact(path), error: String(e).slice(0, 100) });
    }
    const details = { method, path: redact(path), status: res.status };
    if (!res.ok) throw new ApiError('http', `claude.ai answered ${res.status}`, details);
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

  // The organization whose capabilities include chat (not simply the first one). Read once
  // per page load; kept in memory only.
  async function readOrg() {
    const orgs = await request('GET', '/api/organizations');
    expect(Array.isArray(orgs) && orgs.length > 0, 'organizations is not a non-empty list', orgs);
    expect(orgs.every((o) => o && typeof o.uuid === 'string'), 'an organization has no uuid', orgs[0]);
    const chat = orgs.filter((o) => Array.isArray(o.capabilities) && o.capabilities.includes('chat'));
    expect(chat.length > 0, 'no organization has the chat capability', orgs[0]);
    orgId = chat[0].uuid;
    return orgId;
  }
  function org() {
    if (orgId) return Promise.resolve(orgId);
    if (!orgRead) orgRead = readOrg().finally(() => (orgRead = null));
    return orgRead;
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

  global.ZBApi = { listConversations, getConversation, renameConversation, ApiError, TITLE_RE };
})(globalThis);
