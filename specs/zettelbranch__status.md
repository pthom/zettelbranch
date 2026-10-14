# Status

What is open, and the next steps. Updated by Claude at the end of each session. Finished work leaves this file for the [done log](done/README.md).

**Last update:** 2026-10-14, Milestone 2 decided; 0.2.0 built offline; Pascal's session 1 ready.

**Repository:** https://github.com/pthom/zettelbranch (public, MIT). Claude pushes only when Pascal asks.

## Where things are

Zettelbranch **0.1.3** is the latest release (2026-10-14), announced by Pascal on X on 2026-10-13 (with 0.1.2).

- **Firefox:** signed by Mozilla (unlisted, add-on 3095566 on addons.mozilla.org), one-click install from the README, automatic updates through `updates.json` in this repository.
- **Chrome:** developer mode ("Load unpacked"), updated by hand; the README tells Chrome users to watch the repository's releases.
- **What 0.1.3 fixed:** in Firefox, claude.ai's box joined the prompt's lines into one, so branches made in Firefox could not be named. Now the box is refilled line by line when that happens, branches made by 0.1.2 are read anyway, and the panel can be dragged by its title bar ([findings](firefox-insertion__findings.md)). Checked by Pascal in Firefox and Chrome.
- **Tests** (0.2.0, not released): audit 76/76, unit 65/65, end-to-end 35/35, a real Tiptap editor in Chromium and Firefox 6/6 (`cd tests && npm test`, offline).
- **The repository:** README with an animated demo, four illustrated steps and one-click install; user manual in `docs/MANUAL.md`; Discussions on; a "Something broke" issue form; private security reports (`SECURITY.md`); a link-preview image.

The story of the day (0.1.0 to 0.1.3, the native fork explored and dropped, the rename through claude.ai's menu, the Firefox fix) is in the [done log](done/README.md). The facts about claude.ai it all builds on: [claude-ai__findings](claude-ai__findings.md#9-checked-on-pascals-account-milestone-0).

## In progress: Milestone 2, ready for a wider audience

Milestones and their state: [the vault's README](README.md#milestones). Milestones 0 and 1 are finished; Milestone 2 started on 2026-10-14. Its [plan](milestone-2/milestone-2__specs.md) is decided (M2-1 = A, M2-2 = B, M2-3 = B, M2-4 = A); its hints are in [milestone-2__findings](milestone-2/milestone-2__findings.md).

Pascal asked on 2026-10-14 for a better rendering of the copied conversation, where claude.ai showed the `<zb-turn>` tags as raw text. Three pasted samples showed what claude.ai renders in your messages (code blocks, inline code and quotes only), and led to TL-1 and TL-2 ([transcript-layout__questions](milestone-2/transcript-layout__questions.md)): each message under a label in a box inside a quote, the section names in capitals, the header quoted, and Claude told that these lines are Zettelbranch's. Branches made before still read.

Built offline (version 0.1.4, not released): all tests pass, including the real Tiptap editor in both browsers. Seen working in a live test on 2026-10-14 (`zettelbranch/1` → `zettelbranch/1a`): the layout renders, and Claude's summary was accurate and stopped at the right message. Found there and fixed: Claude may write the summary in bold (`> **Parent …**`), which `prompt.js` did not recognise ([milestone-2__findings](milestone-2/milestone-2__findings.md), section 1, item 4). Not released alone (M2-2 = B): it ships in 0.2.0, and the rest of its check joins 0.2.0's check.

**0.2.0, built offline on 2026-10-14** (plan step 3), from Pascal's live test: the panel asks for names in its own forms instead of the browser's dialogs headed "claude.ai" (the address fixed, only the topic editable; the tree name with its hint, then the new title before renaming); it closes itself once a branch is named, the button's tooltip saying what was done; the list of messages shows no Markdown marks; how the box was filled shows only when something went wrong; step 1 is checked off once sent. Enter submits a form without any key listener (the browser clicks the form's button). `AUDIT.md` has a point 20: no browser dialogs, the panel's fields read only on a click. The manual's text is updated; its pictures and the demo still show 0.1.x (step 7, [visuals__specs](milestone-2/visuals__specs.md)).

**Ready for Pascal:** probe P12 in the spike (0.0.12), checked offline in Chromium and Firefox against three local pages: a field without key listeners keeps the keys unless the page takes them; does claude.ai? The render sample `tests/out/render-probe-4.md` (four-backtick, tilde and table cases), made by `prompt.js` itself. Both in [session 1](milestone-2/checks-on-claude-ai__specs.md).

## Waiting on Pascal

1. **Session 1 on claude.ai: done** (2026-10-14), [results](milestone-2/checks-on-claude-ai__specs.md#session-1-probes-about-25-minutes-any-time-now). claude.ai takes keys typed in the panel (now stopped at its fields); code blocks render, no rewrite; a fresh Firefox install needs no extra step; Claude can find and open other chats itself. Left: delete the `zbtest/` chats of the session (`zbtest/render-2`, `zbtest/gather`, the P12 "Test chat"), and turn Zettelbranch back on in the Firefox test profile.
2. **Pictures** (reminder, as asked on 2026-10-14): each session ends with its pictures, [visuals__specs](milestone-2/visuals__specs.md); session 1: done (F1 kept in `tests/out/install/`); next: the README's, the manual's and the demo's pictures, with 0.2.0 on the `sky` tree, a separate sitting before the posts.
3. **Session 2 on claude.ai: done** (2026-10-14), everything passed in both browsers ([results](milestone-2/checks-on-claude-ai__specs.md#session-2-020-about-30-minutes-after-session-1)). Next: say when to release 0.2.0 (then the Mozilla upload, as usual). Clean up: the `zbtest/` chats, and in the Firefox test profile turn the installed Zettelbranch back on (the temporary copy goes when Firefox quits): at the release it should update itself to 0.2.0.
4. **Use Zettelbranch for real** and note what bothers you; watch the post's replies, the GitHub issues and Discussions. That feedback guides Milestone 3.
5. **Optional:** reply under the post that 0.1.3 fixes Firefox (draft in chat: "Update: Zettelbranch 0.1.3 fixes branching in Firefox…").
6. **Clean up:** delete the `zbtest/` and `zbtest2/` chats (now also `zbtest/render`).
7. **Optional:** ask a person at Anthropic about automated tests, and about Zettelbranch now that others use it (draft from Claude).

## How a release goes (for the next version)

1. Claude builds and tests offline, Pascal checks on the real site (Firefox and Chrome).
2. Pascal uploads the zip to addons.mozilla.org ("Envoyer une nouvelle version", "À vous de jouer", source code: Non) and saves the signed `.xpi` into `tests/out/` (right-click, "Enregistrer la cible du lien sous…": unlisted files are served only to the signed-in owner).
3. For 0.2.0 only: the repository's About text becomes the one chosen on 2026-10-14 ([milestone-2__specs](milestone-2/milestone-2__specs.md#the-repositorys-about-text)), with `gh repo edit --description`, as the README's new version goes to `main`.
4. Claude checks the `.xpi` against `extension/`, adds the version to `updates.json` (with its SHA-256), and publishes the GitHub release with the versioned files and the version-free copies `zettelbranch.xpi` and `zettelbranch.zip` (the README's install links point to `releases/latest/download/` with those names), `SHA256SUMS` and the demo video; then verifies the update chain.

## Next for Claude

1. Milestone 2's [plan](milestone-2/milestone-2__specs.md). Session 1's results are built into 0.2.0 (keys stopped at the panel's fields, `MY QUESTION`, step 1 explaining it). The README's install step 3 is now a note for when the button does not show. Without waiting: the README's new opening (Pascal's "parenthesis" paragraph), the Chrome Web Store texts and privacy answers, the posts' drafts. After session 2: the release of 0.2.0, then the pictures (step 7). Milestone 3 candidates, from the spec and the sessions:
   - "gather branches" (hints, section 5);
   - the banner in each branch (path, siblings, children, with links);
   - a "Branch from here" button on each message (M1-2 = C);
   - cross-references between distant branches (`→ 2b`) and backlinks;
   - the Mozilla Add-ons listing (M2-3 = B);
   - a GitHub Pages site, once non-developers can install it, or for an announcement outside GitHub.
2. `spike/` is kept for now: its probe panel served after the build (P9 to P11), for the Firefox bug (P1, line by line), and now for P12. Delete it when it is no longer useful (git keeps it).

## Not checked, for later

- Firefox applying an update by itself (`updates.json`): the chain is checked from GitHub's side, but no installed copy has updated yet. At the next version, Pascal's installed 0.1.3 should update (or at once: `about:addons`, the gear menu, "Check for Updates").
- What claude.ai's own `summary` field holds (filled for most chats): could feed the banner's one-line summaries.
- The page title's format; an attachment made by a paste.
- Other Chromium browsers (Edge, Brave, Arc), and Firefox for Android.
