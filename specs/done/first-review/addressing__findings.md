# Addressing findings

Luhmann-style addresses and the title-based registry. Review of 2026-10-13.

## The prefix rule is wrong

The spec says "children of `1b1` are the titles starting with `1b1`". That also matches:

- `1b10`, `1b11`…: siblings of `1b1`, not children;
- `1b1a1`, `1b1a2`…: grandchildren.

Fix: split each address into alternating number and letter segments, then compare segments.

| Address | Segments |
|---|---|
| `1b1` | `[1, b, 1]` |
| `1b10` | `[1, b, 10]` |
| `1b1a` | `[1, b, 1, a]` |

A child has its parent's segments plus exactly one more. Numbers above 9 then parse cleanly. Letters past `z` need a rule (`aa`, `ab`…), rarely needed.

## Several trees

Every tree starts at `1`. In the spec's example `1b1a · Zettelbranch`, it is unclear whether `Zettelbranch` is the tree's name or the branch's topic. With several trees the real key is (tree, address), so the title format must say which part is which. Also:

- the sidebar truncates long titles, so the address should come first;
- the sidebar is ordered by recency, not address, so the tree has to be rebuilt from the titles every time.

Decision: AD-1.

## Automatic titles *(to verify)*

claude.ai names a new conversation itself after the first exchange. If the extension renames before that, the automatic name may overwrite the address. The rename probably has to wait for the automatic title, then be checked. Part of the Milestone 0 spike.

## The fork point is not recorded

`1a` and `1b` may fork from different messages of `1`. The address does not say where. Recording the message number, or a short quote of the message, in the header lets the banner and the tree show where each branch starts.

## Missing rules

- **Adoption:** how an existing conversation becomes root `1`. Probably by renaming it, which touches a conversation the extension did not create. Decision: AD-2.
- **Permanence:** addresses are never renumbered, as in Luhmann's card file. Deleted branches leave gaps. This is what makes it safe to write the path to root once, in the header.
- **Concurrency:** forking from two devices at once can produce two conversations with the same address. Detecting and flagging this is enough; preventing it is not possible without shared state.

## Registry visibility

Choosing the next free address needs every existing child. With the sidebar alone, old children are missed. Depends on DA-1 ([data-access__findings](data-access__findings.md)).
