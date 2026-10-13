# Status

What is open, and the next steps. Updated by Claude at the end of each session. Finished
work leaves this file for the [done log](done/README.md).

**Last update:** 2026-10-13

## Where things are

Milestone 0 is closed: every probe passed
([in brief](done/milestone-0/milestone-0__findings.md#in-brief)). The facts Milestone 1
builds on are in
[claude-ai__findings](claude-ai__findings.md#9-checked-on-pascals-account-milestone-0).
Milestone 1: the offline steps are built and tested (audit 45/45, unit 30/30,
end-to-end 19/19; [build notes](milestone-1__findings.md)). The fixture chat is saved and tested
(step 4). Next: Pascal's checklist, part C of the
[session](milestone-1__specs.md#pascals-session-steps-4-and-8).

## Waiting on Pascal

1. **Clean up first:** delete every `zbtest/` chat left from Milestone 0 (`zbtest/1`,
   `2`, `2a`, `2b`, `p2-20k`, `p2-100k`), and the P1 chat if still there, so the new
   test tree starts empty.
2. **The Milestone 1 session** (about 25 minutes):
   [load, fixture chat, checklist](milestone-1__specs.md#pascals-session-steps-4-and-8).
3. **Optional:** ask a person at Anthropic about automated tests (draft from Claude).

## Next for Claude

1. After Pascal's checklist: fix what it found.
2. Then Firefox (step 9) and the 0.1.0 release (step 10).

## Not checked, for later

- What claude.ai's own `summary` field holds (filled for most chats): could feed the
  banner's one-line summaries.
- The page title's format; an attachment made by a paste; Firefox.
