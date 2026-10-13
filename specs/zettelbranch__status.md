# Status

What is open, and the next steps. Updated by Claude at the end of each session. Finished
work leaves this file for the [done log](done/README.md).

**Last update:** 2026-10-13

## Where things are

Milestone 0 is closed: every probe passed
([in brief](done/milestone-0/milestone-0__findings.md#in-brief)). The facts Milestone 1
builds on are in
[claude-ai__findings](claude-ai__findings.md#9-checked-on-pascals-account-milestone-0).
Next: Milestone 1, not planned yet.

## Waiting on Pascal

1. **Clean up:** delete every `zbtest/` chat (`zbtest/1`, `2`, `2a`, `2b`, `p2-20k`,
   `p2-100k`), and the P1 chat if still there (Claude answered it "ok").
2. **Optional:** ask a person at Anthropic about automated tests (draft from Claude).

## Next for Claude

1. Plan Milestone 1 in `milestone-1__specs.md`: reliable extraction (from the API, with
   the page as fallback) and a "branch from here" button with a preview. Fixtures: saved
   by hand (TS-1), now mostly API answers.
2. A question for Pascal: how the open tab shows a rename made through the API (it looks
   like a failure until the page reloads).
3. When Milestone 1 starts: delete `spike/` (it stays in git history), after Pascal
   removes the spike extension from the test profile.

## Not checked, for later

- What claude.ai's own `summary` field holds (filled for most chats): could feed the
  banner's one-line summaries.
- The page title's format; an attachment made by a paste; Firefox.
