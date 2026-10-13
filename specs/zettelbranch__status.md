# Status

What is open, and the next steps. Updated by Claude at the end of each session. Finished
work leaves this file for the [done log](done/README.md).

**Last update:** 2026-10-13

## Where things are

Milestone 0 spike ([plan](milestone-0__specs.md), [findings](milestone-0__findings.md)):
every probe done except P2 (long text). Optional: a look at claude.ai's own `summary`
field (P5). Spike version 0.0.6.

Pascal finds the hand probes tedious and asked about automating them. The terms forbid
automated access, and support did not clear tests; only a person at Anthropic can
(see [terms__findings](terms__findings.md#open)). P2 is the last hand session.

## Waiting on Pascal

1. **Reload** the extension (⟳ in `chrome://extensions`; the panel must say 0.0.6), then
   the claude.ai tab.
2. **P2**, following the panel's steps: "20k", Send, "Check after sending", OK; then
   the same with "100k". The panel opens each new chat itself.
3. **P5**: "List conversations" (shows the test chats' summaries).
4. "Copy results" and paste them to Claude.
5. **Clean up:** delete every `zbtest/` chat, and the P1 chat if still there.
6. **Optional:** ask a person at Anthropic about automated tests (draft from Claude).

## Next for Claude

1. Record P2, then close Milestone 0: its files to `done/milestone-0/`, an entry in the
   done log, the spike's lessons in the spec.
2. Milestone 1. Open design point: how the open tab shows a rename (an API rename looks
   like a failure until the page reloads).
