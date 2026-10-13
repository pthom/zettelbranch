# Status

What is open, and the next steps. Updated by Claude at the end of each session. Finished work leaves this file for the [done log](done/README.md).

**Last update:** 2026-10-14

**Repository:** https://github.com/pthom/zettelbranch (public). Claude pushes only when Pascal asks.

## Where things are

Zettelbranch 0.1.3 is built offline (2026-10-13, `a6b3431`), an urgent fix for Firefox: claude.ai's box there joined the lines of the prompt into one, so a branch made in Firefox could not be named. Now the prompt goes in line by line when one insertion loses the line breaks, branches made by 0.1.2 in Firefox are read anyway, and the panel can be dragged by its title bar ([notes](firefox-insertion__findings.md)). Offline tests: audit 67/67, unit 59/59, end-to-end 35/35, real Tiptap editor in Chromium and Firefox 6/6. Checked by Pascal in Firefox and Chrome on 2026-10-14; it waits for Mozilla's signature, then its release.

Zettelbranch 0.1.2 is released (2026-10-13): a Firefox version signed by Mozilla (unlisted, add-on 3095566 on addons.mozilla.org, "tentatively approved" by automatic validation), with automatic updates through `updates.json` in this repository; the README says to expect breakage and invites readers to audit the code with their own LLM. Zettelbranch 0.1.1 (2026-10-13): renames go through claude.ai's own title menu, so the open tab shows the new name at once, with the API as the fallback ([notes](done/milestone-1/rename-api__findings.md#built-into-zettelbranch-011)); a chat opened from the panel's tree opens with the panel. The README has an animated demo and four illustrated steps; a user manual is in `docs/MANUAL.md`. Checked by Pascal in Chrome; the menu rename was seen working in Firefox with the spike (P11), 0.1.1 itself not yet in Firefox.

Milestone 1 (0.1.0) is closed ([plan and build notes](done/milestone-1/milestone-1__specs.md)). The facts about claude.ai it builds on are in [claude-ai__findings](claude-ai__findings.md#9-checked-on-pascals-account-milestone-0).

## Waiting on Pascal

1. **Sign 0.1.3:** upload `tests/out/release-0.1.3/zettelbranch-0.1.3.zip` to addons.mozilla.org ("Envoyer une nouvelle version", "À vous de jouer", source code: Non), save the signed `.xpi` into `tests/out/`.
2. **Use 0.1.2 for real** in your main browser (Firefox: the signed `.xpi` from the release; Chrome: "Load unpacked" from a folder you keep), and note what bothers you. In Firefox, a first rename through the menu checks it there too.
3. **Each new version for Firefox:** upload its zip to addons.mozilla.org ("Envoyer une nouvelle version", unlisted), save the signed `.xpi` into `tests/out/`; Claude then updates `updates.json` and the release. Each release also carries `zettelbranch.xpi` and `zettelbranch.zip` (same files, no version in the name): the README's install links point to `releases/latest/download/` with those names. A person at Mozilla may review the add-on at any time.
4. **Optional:** post the demo (the MP4 is on the release page; a draft post was given in chat).
5. **Clean up:** delete the `zbtest/` and `zbtest2/` chats.
6. **Optional:** ask a person at Anthropic about automated tests (draft from Claude).

## Next for Claude

1. Plan Milestone 2 from Pascal's real use. Candidates, from the spec and the sessions:
   - the banner in each branch (path, siblings, children, with links);
   - a "Branch from here" button on each message (M1-2 = C);
   - cross-references between distant branches (`→ 2b`) and backlinks;
   - a listing on addons.mozilla.org (a public store page), once the extension has proved stable;
   - a GitHub Pages site, once non-developers can install it (a signed Firefox version or a store), or for an announcement outside GitHub.
2. `spike/` is kept for now: its probe panel served after the build (P9 to P11). Delete it when it is no longer useful (git keeps it).

## Not checked, for later

- What claude.ai's own `summary` field holds (filled for most chats): could feed the banner's one-line summaries.
- The page title's format; an attachment made by a paste.
