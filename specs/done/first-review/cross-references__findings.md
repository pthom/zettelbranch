# Cross-references findings

Explicit links between distant branches (Perec's *renvois*). Review of 2026-10-13.

## Writing a link costs a message

The spec suggests storing a cross-reference as `→ 1a1` in message text. Adding one to an
existing conversation means sending a message, which:

- uses quota;
- makes Claude reply;
- clutters the card with bookkeeping.

## Backlinks need every conversation

Outgoing links can be parsed from the current page. Incoming links (which branches point
here?) need the text of every conversation in the tree. Without DA-1 = A, the extension
cannot see them.

## Options

- **Written naturally in your own messages.** You type `→ 1a1` as part of a normal
  prompt; the extension parses and links it. No extra turns. Backlinks need DA-1 = A.
- **In the header at fork time.** A "see also" line written when the branch is created.
  Free, but only for links known at that moment.
- **A register conversation per tree,** like Luhmann's keyword register. Still costs a
  message per link.
- **A local index** (DA-1 = B). No messages, but invisible without the extension, which
  breaks "readable if the extension disappears".

This is the weakest part of the stateless design. Decide it together with DA-1.

## Syntax across trees

With several trees (AD-1), a link needs the tree when it crosses trees: `→ 1a1` within
the same tree, `→ zb/1a1` across.
