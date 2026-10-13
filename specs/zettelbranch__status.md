# Status

What is open, and the next steps. Updated by Claude at the end of each session. Finished work leaves this file for the [done log](done/README.md).

**Last update:** 2026-10-13

**Repository:** https://github.com/pthom/zettelbranch (public). Claude pushes only when Pascal asks.

## Where things are

Zettelbranch 0.1.1 is built offline (2026-10-13, `3052a1e`): renames go through claude.ai's own title menu, so the open tab shows the new name at once, with the API as the fallback ([notes](done/milestone-1/rename-api__findings.md#built-into-zettelbranch-011)); offline tests: audit 63/63, unit 55/55, end-to-end 31/31. It waits for Pascal's check in Chrome and Firefox before its release.

Zettelbranch 0.1.0 is released (2026-10-13): Milestone 1 is closed ([plan and build notes](done/milestone-1/milestone-1__specs.md)). It works in Chrome and Firefox, used by Pascal on his own trees. The facts about claude.ai it builds on are in [claude-ai__findings](claude-ai__findings.md#9-checked-on-pascals-account-milestone-0).

## Waiting on Pascal

1. **Check 0.1.1** in Chrome, then in Firefox (about 10 minutes): name a branch, rename one, make a tree root; the open tab shows each new name at once, without a reload ([the list](done/milestone-1/rename-api__findings.md#to-check-on-the-real-site-pascal)).
2. **Use 0.1.0 for real:** load it in your main browser (Chrome: "Load unpacked" from a folder you keep; Firefox: a temporary add-on until a signed version exists), and note what bothers you.
3. **Clean up:** delete the `zbtest/` and `zbtest2/` chats.
4. **Optional:** ask a person at Anthropic about automated tests (draft from Claude).

## Next for Claude

1. Version 0.1.1: built offline; after Pascal's check in Chrome and Firefox, the release (by the coordinator).
2. Plan Milestone 2 from Pascal's real use. Candidates, from the spec and the sessions:
   - the banner in each branch (path, siblings, children, with links);
   - a "Branch from here" button on each message (M1-2 = C);
   - cross-references between distant branches (`→ 2b`) and backlinks;
   - a Firefox version signed by Mozilla (needs Pascal's addons.mozilla.org account);
3. `spike/` is kept for now: its probe panel served twice after the build (P9, P10). Delete it when it is no longer useful (git keeps it).

## Not checked, for later

- What claude.ai's own `summary` field holds (filled for most chats): could feed the banner's one-line summaries.
- The page title's format; an attachment made by a paste.
