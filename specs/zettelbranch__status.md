# Status

What is open, and the next steps. Updated by Claude at the end of each session. Finished
work leaves this file for the [done log](done/README.md).

**Last update:** 2026-10-13

## Where things are

Milestone 0 is closed: every probe passed
([in brief](done/milestone-0/milestone-0__findings.md#in-brief)). The facts Milestone 1
builds on are in
[claude-ai__findings](claude-ai__findings.md#9-checked-on-pascals-account-milestone-0).
Milestone 1 started: [plan](milestone-1__specs.md), its questions decided. Claude builds
the offline steps first (code, fake claude.ai, tests, audit).

## Waiting on Pascal

1. **Clean up:** delete every `zbtest/` chat (`zbtest/1`, `2`, `2a`, `2b`, `p2-20k`,
   `p2-100k`), and the P1 chat if still there (Claude answered it "ok").
2. **Optional:** ask a person at Anthropic about automated tests (draft from Claude).

## Next for Claude

1. Milestone 1, offline steps 1 to 3 and 5 to 7 of the plan: set-up, API and tree,
   conversation, prompt, branch flow and UI, audit.
2. Then Pascal's steps: fixtures (step 4), the real-page checklist (step 8), Firefox
   (step 9).

## Not checked, for later

- What claude.ai's own `summary` field holds (filled for most chats): could feed the
  banner's one-line summaries.
- The page title's format; an attachment made by a paste; Firefox.
