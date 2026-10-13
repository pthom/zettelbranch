# Status

What is open, and the next steps. Updated by Claude at the end of each session. Finished work leaves this file for the [done log](done/README.md).

**Last update:** 2026-10-13

**Repository:** https://github.com/pthom/zettelbranch (public). Claude pushes only when Pascal asks.

## Where things are

Zettelbranch 0.1.0 is released (2026-10-13): Milestone 1 is closed ([plan and build notes](done/milestone-1/milestone-1__specs.md)). It works in Chrome and Firefox, used by Pascal on his own trees. The facts about claude.ai it builds on are in [claude-ai__findings](claude-ai__findings.md#9-checked-on-pascals-account-milestone-0).

## Waiting on Pascal

1. **Use 0.1.0 for real:** load it in your main browser (Chrome: "Load unpacked" from a folder you keep; Firefox: a temporary add-on until a signed version exists), and note what bothers you.
2. **Clean up:** delete the `zbtest/` and `zbtest2/` chats.
3. **Optional:** ask a person at Anthropic about automated tests (draft from Claude).

## Next for Claude

1. Plan Milestone 2 from Pascal's real use. Candidates, from the spec and the sessions:
   - the banner in each branch (path, siblings, children, with links);
   - a "Branch from here" button on each message (M1-2 = C);
   - cross-references between distant branches (`→ 2b`) and backlinks;
   - a Firefox version signed by Mozilla (needs Pascal's addons.mozilla.org account);
   - renaming through claude.ai's own menu, so the open tab shows a new name at once (RN-1, possible improvement).
2. `spike/` is kept for now: its probe panel served twice after the build (P9, P10). Delete it when it is no longer useful (git keeps it).

## Not checked, for later

- What claude.ai's own `summary` field holds (filled for most chats): could feed the banner's one-line summaries.
- The page title's format; an attachment made by a paste.
