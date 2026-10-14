# Milestone 0: finalized

**Finished on 2026-10-13.** Started and finished the same day. Written on 2026-10-14, when the vault started showing each milestone's state.

## What it was

A short spike before building anything, to settle the unknowns that could change the design (ZB-2 = A): throwaway code in `spike/`, a probe panel that Pascal clicked through in the test profile, no automation on claude.ai. Plan: [milestone-0__specs](milestone-0__specs.md).

## What it established

Every probe passed ([in brief](milestone-0__findings.md#in-brief)):

- claude.ai's own API reads the conversation list and whole conversations, and renames a chat; the page holds only part of a long chat, so the extension reads the API.
- Text inserted with one `execCommand('insertText')` call reaches Claude exactly, up to 100,000 characters, without turning into an attachment.
- The app's own "New chat" link opens a new chat without a page load, so the prompt can travel in memory, with no storage.
- Claude follows the branch prompt: a summary first, the right parent, no re-answering.
- No bot check in five sessions by hand.

The facts Milestone 1 built on are in [claude-ai__findings](../../claude-ai__findings.md#9-checked-on-pascals-account-milestone-0).

## Left open, and where it went

- A rename by the API shows in the open tab only after a reload: solved in 0.1.1 by renaming through claude.ai's own title menu (probe P11, [rename-api__findings](../milestone-1/rename-api__findings.md)).
- `spike/` is kept: its probe panel served again during Milestone 1 (P9 to P11) and for the Firefox bug of 0.1.2. See [the status file](../../zettelbranch__status.md).

## Files

[milestone-0__specs](milestone-0__specs.md) (the plan and the probes), [milestone-0__findings](milestone-0__findings.md) (results and run log). Done log entries: 2026-10-13, from "Test setup, by hand" to "Milestone 0 closed" ([done log](../README.md)).
