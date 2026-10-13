# Addressing questions

Context: [addressing__findings](addressing__findings.md).

## AD-1 · Title format

**Status:** decided (2026-10-13). Folded into [spec](zettelbranch__specs.md#core-design).

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

**Answer:** Let's have a quick conversation about this, then you'll update this file.

Decided in chat, 2026-10-13: A. In the spec's example `1b1a · Zettelbranch`, `Zettelbranch` was the topic.

## AD-2 · Turning an existing conversation into a tree root

**Status:** decided (2026-10-13). Folded into [spec](zettelbranch__specs.md#core-design).

When you click "branch from here" in a conversation that is not part of a tree yet:

- **A.** The extension renames it to root `1` (with a tree slug if AD-1 = A), and the new
  chat becomes `1a`. *(recommended)*
- **B.** The extension refuses until you create the root explicitly (a separate "start a
  tree here" action).

**Answer:** Same here

Decided in chat, 2026-10-13: A, rename it.

## AD-3 · Tree identity: names or numbers?

**Status:** open

The original conversation (message 44 of
[zettelbranch__origin-conversation](zettelbranch__origin-conversation.md)) proposed numbering the trees themselves: tree 1, tree 2… with branches as
letters and numbers below. AD-1 chose a tree name instead. Same Oulipo example, branch
`1a1` of the Oulipo tree:

| | Title in the sidebar | Root's title |
|---|---|---|
| **A. Names** (decided in AD-1) | `oulipo/1a1 · Lipogram in E` | `oulipo/1 · Oulipo creative poems` |
| **B. Numbers** (message 44) | `2a1 · Lipogram in E` | `2 · Oulipo creative poems` |

- **A. Names.** You see which tree a title belongs to. Longer titles. Close to Luhmann's
  own notation, which put a section before a slash (`21/3d7a`, message 24).
  *(recommended, slightly)*
- **B. Numbers.** Shorter, pure Luhmann, and the spec's original example
  (`1b1a · Zettelbranch`) already has this form. But a number says nothing about its
  tree: you remember that 2 is Oulipo, or read the topic.

**Answer:**

## Defaults (object if you disagree)

- **AD-D1** · Addresses are permanent: never renumbered, deleted branches leave gaps.
- **AD-D2** · Addresses are parsed into number/letter segments, never compared as string
  prefixes.
- **AD-D3** · The header records the fork point (message number and a short quote).
- **AD-D4** · Duplicate addresses are detected and flagged in the banner, not prevented.
- **AD-D5** · After `z`, letters continue `aa`, `ab`…
- **AD-D6** · The topic part of the title is claude.ai's automatic title; the extension
  only adds the address prefix. Depends on the Milestone 0 rename test (P4 in
  [milestone-0__specs](milestone-0__specs.md)).
