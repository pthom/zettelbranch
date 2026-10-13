# Status

What is open, and the next steps. Updated by Claude at the end of each session. Finished
work leaves this file for the [done log](done/README.md).

**Last update:** 2026-10-13

## Where things are

Milestone 0 spike ([plan](milestone-0__specs.md), [findings](milestone-0__findings.md)):
P0, P1, P3, P4 and P5 done; P8's two branches exist. Left: P8's check, P2, P6, P7, and a
look at claude.ai's `summary` field. Spike version 0.0.5.

Pascal finds the hand probes tedious and asked about automating them. The terms forbid
automated access, and support did not clear tests; only a person at Anthropic can
(see [terms__findings](terms__findings.md#open)). The last session is short instead.

## Waiting on Pascal

1. **Reload** the extension (⟳ in `chrome://extensions`; the panel says 0.0.5), then the
   claude.ai tab.
2. **Last probe session**, following
   [Running the probes](milestone-0__specs.md#running-the-probes-pascal):
   - P8: open `zbtest/2a`, "Check summary"; same in `zbtest/2b`;
   - P5: "List conversations";
   - P6 and P7: on one of your own long chats, "Compare page and API", then "Run
     extractor" (read-only);
   - P2: two new chats, "20k" in one, "100k" in the other; Send, then "Check after
     sending" and OK;
   - "Copy results" and paste them to Claude.
3. **Clean up:** delete every `zbtest/` chat, and the P1 chat if still there.
4. **Optional:** ask a person at Anthropic about automated tests (draft from Claude).

## Next for Claude

1. Read the results, fix the spike offline, record them in
   [milestone-0__findings](milestone-0__findings.md), and update every *(to verify)* tag
   they settle.
2. Close Milestone 0 (its files to `done/milestone-0/`, an entry in the done log), then
   Milestone 1. Open design point for it: how the open tab shows a rename.
