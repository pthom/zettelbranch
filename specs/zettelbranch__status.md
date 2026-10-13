# Status

What is open, and the next steps. Updated by Claude at the end of each session. Finished work leaves this file for the [done log](done/README.md).

**Last update:** 2026-10-13

## Where things are

Milestone 0 is closed ([in brief](done/milestone-0/milestone-0__findings.md#in-brief)); the facts Milestone 1 builds on are in [claude-ai__findings](claude-ai__findings.md#9-checked-on-pascals-account-milestone-0).

Milestone 1 ([plan](milestone-1__specs.md), [build notes](milestone-1__findings.md)): built, tested offline (audit 45/45, unit 35/35, end-to-end 19/19), fixtures from a real chat, and the checklist done by Pascal on the real site: the whole flow works. Found: the sidebar lags behind a rename even after a reload; three small fixes. The three fixes are made (tests: audit 45/45, unit 36/36, end-to-end 19/19). NF-1 = A: the public notes say claude.ai's own "continue branch as new chat" copies a chat as real messages, images included; the probe (P9) is built and waits for Pascal ([findings](native-fork__findings.md)).

## Waiting on Pascal

1. **The fork probe (P9):** `specs/native-fork__findings.md`, section "Running it" (about 5 minutes).
2. **Clean up:** delete every `zbtest/` chat afterwards.
3. **Optional:** ask a person at Anthropic about automated tests (draft from Claude).

## Next for Claude

1. Read the P9 results; if the native fork works, plan its use in Zettelbranch, with the copy as the fallback.
2. Then Firefox (step 9) and the 0.1.0 release (step 10).

## Not checked, for later

- What claude.ai's own `summary` field holds (filled for most chats): could feed the banner's one-line summaries.
- The page title's format; an attachment made by a paste.
