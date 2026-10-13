# Status

What is open, and the next steps. Updated by Claude at the end of each session. Finished
work leaves this file for the [done log](done/README.md).

**Last update:** 2026-10-13

## Where things are

Milestone 0 spike ([plan](milestone-0__specs.md), [findings](milestone-0__findings.md)):
P0, P1 and P5 done. Left: P2, P3, P4, P6, P7, P8, and P5's re-run once there are
`zbtest/` chats to find.

## Waiting on Pascal

1. **Delete the P1 test chat**, the one Claude answered "ok". Version 0.0.2 left it with
   claude.ai's automatic title, outside the `zbtest` tree; 0.0.3 fixes that.
2. **Reload** the extension (⟳ in `chrome://extensions`; the panel then says 0.0.3) and
   the claude.ai tab.
3. **Next probes**, following
   [Running the probes](milestone-0__specs.md#running-the-probes-pascal). Suggested
   session: P4 (two chats), P8 on P4's chat B (two branches), P3 (sends nothing), then P5
   again at the end. P2, P6 and P7 another time. Then "Copy results" and paste them to
   Claude.

## Next for Claude

1. Read the results, fix the spike offline, record them in
   [milestone-0__findings](milestone-0__findings.md), and update every *(to verify)* tag
   they settle.
2. When the last probe is done: close Milestone 0 (its files to `done/milestone-0/`, an
   entry in the done log), then Milestone 1.
