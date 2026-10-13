# Data access questions

Context: [data-access__findings](data-access__findings.md).

## DA-1 · May the extension call claude.ai's own API?

**Status:** open. Pascal leans A, once Claude explains in plain terms why it is secure and stable enough. Anthropic support's reply is in [terms__findings](terms__findings.md).

Today the spec says "no network calls of any kind". That rules out banner summaries,
backlinks, a complete registry and the whole-tree view.

- **A.** Allow same-origin calls to claude.ai's own API, isolated in one file, provable
  by grep. Still no other host. *(recommended)*
- **B.** No network. Keep a rebuildable local index (titles, ids, summaries) as a cache.
- **C.** No network, no index. Banner and tree limited to what titles show.

If the original design conversation already settled this, the reasoning would help.

**Answer:** A But convince me that it is secure, And somewhat stable. 

## DA-2 · If A: reads only, or also renaming?

**Status:** decided (2026-10-13): A, applies if DA-1 = A. Noted in the [spec](zettelbranch__specs.md#known-risks--open-questions).

Renaming a conversation through the API is more reliable than driving the UI, but it is
a write.

- **A.** Reads, plus renaming conversations. Nothing else is ever written (no sending
  messages, no deleting). *(recommended)*
- **B.** Reads only. Renaming goes through the UI.

**Answer:** A

## Defaults (object if you disagree)

- **DA-D1** · The prompt reaches the new chat by opening it inside the same page, with no
  storage. If that fails, fall back to `storage.session` (memory only).

> Pascal: That is difficult for me to answer. If you want my output you would need to give me more details. Remain comprehensible, please. 