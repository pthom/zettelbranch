# Status

What is open, and the next steps. Updated by Claude at the end of each session. Finished work leaves this file for the [done log](done/README.md).

**Last update:** 2026-10-13

**Repository:** https://github.com/pthom/zettelbranch (public). Claude pushes only when Pascal asks.

## Where things are

Zettelbranch 0.1.1 is released (2026-10-13): renames go through claude.ai's own title menu, so the open tab shows the new name at once, with the API as the fallback ([notes](done/milestone-1/rename-api__findings.md#built-into-zettelbranch-011)); a chat opened from the panel's tree opens with the panel. The README has an animated demo and four illustrated steps; a user manual is in `docs/MANUAL.md`. Checked by Pascal in Chrome; the menu rename was seen working in Firefox with the spike (P11), 0.1.1 itself not yet in Firefox.

Milestone 1 (0.1.0) is closed ([plan and build notes](done/milestone-1/milestone-1__specs.md)). The facts about claude.ai it builds on are in [claude-ai__findings](claude-ai__findings.md#9-checked-on-pascals-account-milestone-0).

## Waiting on Pascal

1. **Use 0.1.1 for real** in your main browser (Chrome: "Load unpacked" from a folder you keep; Firefox: a temporary add-on), and note what bothers you. In Firefox, a first rename through the menu checks 0.1.1 there too.
2. **Optional:** post the demo (the MP4 is on the release page; a draft post was given in chat).
3. **Clean up:** delete the `zbtest/` and `zbtest2/` chats.
4. **Optional:** ask a person at Anthropic about automated tests (draft from Claude).

## Next for Claude

1. Plan Milestone 2 from Pascal's real use. Candidates, from the spec and the sessions:
   - the banner in each branch (path, siblings, children, with links);
   - a "Branch from here" button on each message (M1-2 = C);
   - cross-references between distant branches (`→ 2b`) and backlinks;
   - a Firefox version signed by Mozilla (needs Pascal's addons.mozilla.org account);
   - a GitHub Pages site, once non-developers can install it (a signed Firefox version or a store), or for an announcement outside GitHub.
2. `spike/` is kept for now: its probe panel served after the build (P9 to P11). Delete it when it is no longer useful (git keeps it).

## Not checked, for later

- What claude.ai's own `summary` field holds (filled for most chats): could feed the banner's one-line summaries.
- The page title's format; an attachment made by a paste.
