# Status

What is open, and the next steps. Updated by Claude at the end of each session. Finished work leaves this file for the [done log](done/README.md).

**Last update:** 2026-10-13

## Where things are

Milestone 0 is closed ([in brief](done/milestone-0/milestone-0__findings.md#in-brief)); the facts Milestone 1 builds on are in [claude-ai__findings](claude-ai__findings.md#9-checked-on-pascals-account-milestone-0).

Milestone 1 ([plan](milestone-1__specs.md), [build notes](milestone-1__findings.md)): built, tested offline (audit 45/45, unit 35/35, end-to-end 19/19), fixtures from a real chat, and the checklist done by Pascal on the real site: the whole flow works. Found: the sidebar lags behind a rename even after a reload; three small fixes. Open: NF-1, whether to let claude.ai fork the conversation instead of copying it.

## Waiting on Pascal

1. **Answer NF-1** in `specs/native-fork__questions.md` (or in chat).
2. **Clean up:** delete every `zbtest/` chat of the checklist.
3. **Optional:** ask a person at Anthropic about automated tests (draft from Claude).

## Next for Claude

1. Fix what the checklist found: the notice's wording (the sidebar catches up later), the header's quote of a branch's first reply, code-fence marks in quotes and labels.
2. NF-1, as Pascal answers.
3. Then Firefox (step 9) and the 0.1.0 release (step 10).

## Not checked, for later

- What claude.ai's own `summary` field holds (filled for most chats): could feed the banner's one-line summaries.
- The page title's format; an attachment made by a paste.
