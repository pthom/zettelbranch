# Status

What is open, and the next steps. Updated by Claude at the end of each session. Finished work leaves this file for the [done log](done/README.md).

**Last update:** 2026-10-13

**Repository:** https://github.com/pthom/zettelbranch (public, created 2026-10-13). Claude pushes only when Pascal asks.

## Where things are

Milestone 0 is closed ([in brief](done/milestone-0/milestone-0__findings.md#in-brief)); the facts Milestone 1 builds on are in [claude-ai__findings](claude-ai__findings.md#9-checked-on-pascals-account-milestone-0).

Milestone 1 ([plan](milestone-1__specs.md), [build notes](milestone-1__findings.md)): built and tested offline (audit 49/49, unit 52/52, end-to-end 30/30), fixtures from a real chat, and Pascal's checklist on the real site in Chrome: the whole flow works. After Pascal's first real use: guidance after branching, a reminder to name the branch, a name proposed from the branch's first question, "Rename this branch" (`df2a4ff`, offline). Then the tree in the panel (step 6c, `88ebd80`), checked by Pascal on the real site. Then the panel's polish after his second real use (step 6d, `1300f3b`), and his two decisions: the panel follows the chat on screen, Claude suggests the branch's name (step 6e, `a3891bd`), checked by Pascal on the real site, then a clearer notice after naming. Left: Firefox (step 9) and the 0.1.0 release (step 10).

claude.ai's own fork was explored (NF-1 to NF-3): it only continues an earlier version of a chat in a new one, so it was built, checked on the real site, and removed. The quoted copy stays the only way ([done/native-fork](done/native-fork/native-fork__findings.md)).

## Waiting on Pascal

1. **Clean up:** delete the `zbtest/` chats.
2. **Optional:** ask a person at Anthropic about automated tests (draft from Claude).

## Next for Claude

1. Firefox (step 9): the guide is in the plan; Pascal's check.
2. The 0.1.0 release (step 10): install notes and SHA-256 of each file, ready for Pascal's go before anything is tagged or pushed.

## Not checked, for later

- What claude.ai's own `summary` field holds (filled for most chats): could feed the banner's one-line summaries.
- The page title's format; an attachment made by a paste.
