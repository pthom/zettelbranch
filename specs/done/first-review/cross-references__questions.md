# Cross-references questions

Context: [cross-references__findings](cross-references__findings.md).

## XR-1 · Where cross-references are written

**Status:** decided (2026-10-13): A, in chat. Folded into the [spec](../../zettelbranch__specs.md#core-design).

- **A.** You write `→ 1a1` in your own messages as part of a normal prompt; the extension
  parses and links them, plus "see also" links in the header at fork time. Backlinks
  require DA-1 = A. *(recommended)*
- **B.** A dedicated "add link" action that sends a message to the conversation.
- **C.** A local index only, invisible without the extension.

**Answer:**

## Defaults (object if you disagree)

- **XR-D1** · Syntax `→ <address>` within a tree, `→ <tree>/<address>` across trees
  (follows AD-1). `->` is accepted too.
