# Addressing questions

Context: [addressing__findings](addressing__findings.md).

## AD-1 · Title format

**Status:** open

The title is the registry, so its format must be unambiguous to parse, and it must work
with several trees.

- **A.** `<tree>/<address> · <topic>`, for example `zb/1b1a · Cross-references`. The tree
  is a short slug chosen when the root is created. Address first, easy to parse.
  *(recommended)*
- **B.** `<address> · <tree> · <topic>`, for example
  `1b1a · Zettelbranch · Cross-references`. Closer to the spec, but long; the topic gets
  truncated in the sidebar.
- **C.** `<address> · <topic>`, one tree only. Simplest, no multi-tree support.

In the spec's example `1b1a · Zettelbranch`, was `Zettelbranch` the tree or the topic?

**Answer:**

## AD-2 · Turning an existing conversation into a tree root

**Status:** open

When you click "branch from here" in a conversation that is not part of a tree yet:

- **A.** The extension renames it to root `1` (with a tree slug if AD-1 = A), and the new
  chat becomes `1a`. *(recommended)*
- **B.** The extension refuses until you create the root explicitly (a separate "start a
  tree here" action).

**Answer:**

## Defaults (object if you disagree)

- **AD-D1** · Addresses are permanent: never renumbered, deleted branches leave gaps.
- **AD-D2** · Addresses are parsed into number/letter segments, never compared as string
  prefixes.
- **AD-D3** · The header records the fork point (message number and a short quote).
- **AD-D4** · Duplicate addresses are detected and flagged in the banner, not prevented.
- **AD-D5** · After `z`, letters continue `aa`, `ab`…
