# Milestone 1: finalized

**Finished on 2026-10-13, with the release of 0.1.0.** Started the same day. Written on 2026-10-14, when the vault started showing each milestone's state.

## What it was

The first version Pascal uses every day: branch any conversation from any message, with a preview, into a new chat that is filled and named with its address. Plan: [milestone-1__specs](milestone-1__specs.md); build notes and the real-site checklist: [milestone-1__findings](milestone-1__findings.md).

## What it delivered (0.1.0)

- The Zettelbranch button and panel on claude.ai; the branch point chosen among all messages.
- A tree name proposed for a chat that is not in a tree yet; the chat becomes the root (`oulipo/1 · …`).
- A preview of the branch's first message, then a new chat with that message in the box; you press Send.
- "Name this branch", with Claude's suggested name ("Branch title: …") proposed first.
- The tree in the panel, following the chat on screen.
- Offline tests against a fake claude.ai, and `AUDIT.md`.

Decided along the way: M1-1 to M1-4 ([questions](milestone-1__questions.md)), NF-1 to NF-3 (claude.ai's own fork explored, then dropped, [native-fork](../native-fork/native-fork__findings.md)), RN-1 ([rename-api__findings](rename-api__findings.md)).

## After the milestone

Releases that followed, outside any milestone:

- **0.1.1** (2026-10-13): renames through claude.ai's own title menu, so the open tab shows the new name at once; a user manual and an animated demo ([readme__specs](../readme/readme__specs.md)).
- **0.1.2** (2026-10-13): Firefox version signed by Mozilla, with automatic updates; the public repository and Pascal's first post.
- **0.1.3** (2026-10-14): the Firefox fix (the box lost the line breaks) and a movable panel ([firefox-insertion__findings](../../firefox-insertion__findings.md)).

Details for each: the [done log](../README.md).

## Left open, and where it went

- The first feedback and a live test: [milestone-2__findings](../../milestone-2/milestone-2__findings.md), the start of Milestone 2.
- Items still to check (Firefox's automatic update seen live, other browsers): the [status file](../../zettelbranch__status.md), "Not checked".
- From the original plan, not built yet: a button on each message, the banner, cross-references and backlinks, the shorter transcript modes. They are Milestone 2 candidates in the status file.
