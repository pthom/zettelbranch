# Data access questions

Context: [data-access__findings](data-access__findings.md).

## DA-1 · May the extension call claude.ai's own API?

**Status:** decided (2026-10-13): A, after the plain explanation below. Folded into the [spec](zettelbranch__specs.md#trust-and-auditability-hard-requirements).

Today the spec says "no network calls of any kind". That rules out banner summaries,
backlinks, a complete registry and the whole-tree view.

- **A.** Allow same-origin calls to claude.ai's own API, isolated in one file, provable
  by grep. Still no other host. *(recommended)*
- **B.** No network. Keep a rebuildable local index (titles, ids, summaries) as a cache.
- **C.** No network, no index. Banner and tree limited to what titles show.

If the original design conversation already settled this, the reasoning would help.

**Answer:** A But convince me that it is secure, And somewhat stable. 

### Plain explanation (Claude, 2026-10-13)

**What it means.** When you use claude.ai, the page keeps asking claude.ai's servers for
data: your conversation list, a conversation's messages, a rename. Those requests are
the "API". Option A lets the extension make the same kind of requests, only to
claude.ai, from inside the page you are on.

**What you get with it:**

- the whole tree, including old branches that dropped out of the sidebar;
- one-line summaries of sibling and child branches in the banner, and backlinks ("who
  points here?");
- reliable copying of long conversations (the page only holds part of them);
- reliable renaming (DA-2).

Without it, the extension sees only what is on your screen.

**Is it secure?**

- **Your data goes nowhere new.** Requests go only to claude.ai, which already holds your
  data. This rests on the code, not on the browser, so it is made easy to check: all
  requests live in one short file, and `AUDIT.md` gives the command that proves there is
  no other place.
- **Your login is never touched.** The browser attaches it to each request by itself;
  the extension never sees or stores it. That is the line Anthropic support drew
  ([terms__findings](terms__findings.md)).
- **It can do very little.** It reads and renames; it never sends a message, never
  deletes. The file lists the few addresses it calls, so anyone can check.
- **Anthropic's answer** called this "personal automation", acceptable.

**Is it stable? Honestly, no.** This API is not public. claude.ai can change it without
warning, especially now: your account uses a new API marked "alpha", and the old one may
be retired. The protections:

- **One file to fix** when claude.ai changes.
- **It fails clearly.** If an answer looks wrong, the extension says "claude.ai changed,
  Zettelbranch needs an update" instead of guessing.
- **Branching keeps working without it.** Copying from the page and filling the new
  chat do not need the API. Only the extras (whole tree, summaries, backlinks) pause
  until the fix.
- **Others manage it.** Claude QoL and several exporters rely on the same API and are
  kept working.

**Recommendation: A,** on exactly those terms: one file, reads plus renaming only, no
access to your login, basic branching that still works when the API breaks.

## DA-2 · If A: reads only, or also renaming?

**Status:** decided (2026-10-13): A. Folded into the [spec](zettelbranch__specs.md#trust-and-auditability-hard-requirements).

Renaming a conversation through the API is more reliable than driving the UI, but it is
a write.

- **A.** Reads, plus renaming conversations. Nothing else is ever written (no sending
  messages, no deleting). *(recommended)*
- **B.** Reads only. Renaming goes through the UI.

**Answer:** A

## Defaults (object if you disagree)

- **DA-D1** · The prompt reaches the new chat by opening it inside the same page, with no
  storage. If that fails, fall back to `storage.session` (memory only).
  **Decided (2026-10-13):** 1, with 2 as the fallback (see below). Folded into the
  [spec](zettelbranch__specs.md#core-design).

> Pascal: That is difficult for me to answer. If you want my output you would need to give me more details. Remain comprehensible, please. 

### DA-D1 in plain words (Claude, 2026-10-13)

**The problem.** You click "Branch from here" in `oulipo/1`. The extension builds the
prompt there. Then a new, empty chat opens, and the prompt must appear in its message
box. The text has to travel from the old conversation to the new chat.

**Three ways:**

1. **Same page** *(default)*. claude.ai does not really load a new page when you open a
   new chat; it swaps the content in place. The extension keeps running, holds the text
   in memory, and types it into the new box. Nothing is written anywhere. To check in
   Milestone 0 (P3).
2. **The browser's temporary shelf** (`storage.session`), if the new chat turns out to
   be a real new page. The extension parks the text there for a moment. It stays in
   memory, is never written to disk, and is erased when the browser closes. Cost: an
   extra piece of extension code (a background script) to audit, a bit clumsier in
   Firefox.
3. **In the address** (`claude.ai/new?q=…`). No extension memory needed. But it is
   capped at about 14,000 characters (too short for a full transcript), may show an
   "untrusted prompt" warning, and the text ends up in your browser history, which is
   stored conversation content. Not used.

In every case the text never leaves your browser.

**Recommendation:** 1, with 2 as the fallback if Milestone 0 shows 1 does not work.