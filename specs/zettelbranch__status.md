# Status

What is open, and the next steps. Updated by Claude at the end of each session. Finished work leaves this file for the [done log](done/README.md).

**Last update:** 2026-10-13

## Where things are

Milestone 0 is closed ([in brief](done/milestone-0/milestone-0__findings.md#in-brief)); the facts Milestone 1 builds on are in [claude-ai__findings](claude-ai__findings.md#9-checked-on-pascals-account-milestone-0).

Milestone 1 ([plan](milestone-1__specs.md), [build notes](milestone-1__findings.md)): built, tested offline (audit 45/45, unit 35/35, end-to-end 19/19), fixtures from a real chat, and the checklist done by Pascal on the real site: the whole flow works. Found: the sidebar lags behind a rename even after a reload; three small fixes. The three fixes are made (tests: audit 45/45, unit 36/36, end-to-end 19/19). NF-1 = A: a look at claude.ai's own fork into a new chat.

## Waiting on Pascal

1. **Clean up:** delete every `zbtest/` chat of the checklist.
2. **Optional:** ask a person at Anthropic about automated tests (draft from Claude).

## Next for Claude

1. NF-1 = A: read the public notes on claude.ai's "continue branch as new chat", then a probe by hand if it looks usable.
3. Then Firefox (step 9) and the 0.1.0 release (step 10).

## Not checked, for later

- What claude.ai's own `summary` field holds (filled for most chats): could feed the banner's one-line summaries.
- The page title's format; an attachment made by a paste.
