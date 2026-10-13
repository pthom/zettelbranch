# Status

What is open, and the next steps. Updated by Claude at the end of each session. Finished work leaves this file for the [done log](done/README.md).

**Last update:** 2026-10-13

## Where things are

Milestone 0 is closed ([in brief](done/milestone-0/milestone-0__findings.md#in-brief)); the facts Milestone 1 builds on are in [claude-ai__findings](claude-ai__findings.md#9-checked-on-pascals-account-milestone-0).

Milestone 1 ([plan](milestone-1__specs.md), [build notes](milestone-1__findings.md)): built, tested offline (audit 45/45, unit 35/35, end-to-end 19/19), fixtures from a real chat, and the checklist done by Pascal on the real site: the whole flow works. Found: the sidebar lags behind a rename even after a reload; three small fixes. The three fixes are made (tests: audit 45/45, unit 36/36, end-to-end 19/19). NF-1 = A: the public notes say claude.ai's own "continue branch as new chat" copies a chat as real messages, images included; the probe (P9) shows it works only through a chat's last message ([findings](native-fork__findings.md)). NF-2 = A: use it from the last reply, the copy elsewhere. Step 6b, built offline (`ba045c4`): from the last reply, Zettelbranch has claude.ai copy the chat, names the copy, loads it, and offers "Start the branch"; elsewhere, or if that fails, the quoted transcript (tests: audit 51/51, unit 47/47, end-to-end 29/29; [build notes](milestone-1__findings.md#claudeais-own-fork-step-6b)).

## Waiting on Pascal

1. **Step 6b on the real site** (about 10 minutes): the seven checks in [milestone-1__findings](milestone-1__findings.md#to-check-on-the-real-site-pascal).
2. **Optional:** ask a person at Anthropic about automated tests (draft from Claude).

## Next for Claude

1. Fix what Pascal's check of step 6b finds.
2. Then Firefox (step 9) and the 0.1.0 release (step 10).

## Not checked, for later

- What claude.ai's own `summary` field holds (filled for most chats): could feed the banner's one-line summaries.
- The page title's format; an attachment made by a paste.
