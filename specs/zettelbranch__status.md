# Status

What is open, and the next steps. Updated by Claude at the end of each session. Finished work leaves this file for the [done log](done/README.md).

**Last update:** 2026-10-14, 0.1.4 built offline.

**Repository:** https://github.com/pthom/zettelbranch (public, MIT). Claude pushes only when Pascal asks.

## Where things are

Zettelbranch **0.1.3** is the latest release (2026-10-14), announced by Pascal on X on 2026-10-13 (with 0.1.2).

- **Firefox:** signed by Mozilla (unlisted, add-on 3095566 on addons.mozilla.org), one-click install from the README, automatic updates through `updates.json` in this repository.
- **Chrome:** developer mode ("Load unpacked"), updated by hand; the README tells Chrome users to watch the repository's releases.
- **What 0.1.3 fixed:** in Firefox, claude.ai's box joined the prompt's lines into one, so branches made in Firefox could not be named. Now the box is refilled line by line when that happens, branches made by 0.1.2 are read anyway, and the panel can be dragged by its title bar ([findings](firefox-insertion__findings.md)). Checked by Pascal in Firefox and Chrome.
- **Tests** (0.1.4): audit 67/67, unit 63/63, end-to-end 35/35, a real Tiptap editor in Chromium and Firefox 6/6 (`cd tests && npm test`, offline).
- **The repository:** README with an animated demo, four illustrated steps and one-click install; user manual in `docs/MANUAL.md`; Discussions on; a "Something broke" issue form; private security reports (`SECURITY.md`); a link-preview image.

The story of the day (0.1.0 to 0.1.3, the native fork explored and dropped, the rename through claude.ai's menu, the Firefox fix) is in the [done log](done/README.md). The facts about claude.ai it all builds on: [claude-ai__findings](claude-ai__findings.md#9-checked-on-pascals-account-milestone-0).

## In progress: 0.1.4, a readable first message

Pascal asked on 2026-10-14 for a better rendering of the copied conversation, where claude.ai showed the `<zb-turn>` tags as raw text. Three pasted samples showed what claude.ai renders in your messages (code blocks, inline code and quotes only), and led to TL-1 and TL-2 ([transcript-layout__questions](transcript-layout__questions.md)): each message under a label in a box inside a quote, the section names in capitals, the header quoted, and Claude told that these lines are Zettelbranch's. Branches made before still read.

Built offline (version 0.1.4, not released): all tests pass, including the real Tiptap editor in both browsers. Seen working in a live test on 2026-10-14 (`zettelbranch/1` → `zettelbranch/1a`): the layout renders, and Claude's summary was accurate and stopped at the right message. Found there and fixed: Claude may write the summary in bold (`> **Parent …**`), which `prompt.js` did not recognise ([milestone-2__findings](milestone-2__findings.md), section 1, item 4). Next: the rest of the check (the steps are in the questions file), then the release as usual, with the manual's screenshots and the demo retaken (they still show the tags).

## Waiting on Pascal

1. **Finish checking 0.1.4 on claude.ai** (Chrome and Firefox): [the steps](transcript-layout__questions.md#the-check-on-claudeai-014); steps 2 and 3 were seen in the live test.
2. **Use Zettelbranch for real** and note what bothers you; watch the post's replies, the GitHub issues and Discussions. That feedback sets Milestone 2.
3. **Optional:** reply under the post that 0.1.3 fixes Firefox (draft in chat: "Update: Zettelbranch 0.1.3 fixes branching in Firefox…").
4. **Clean up:** delete the `zbtest/` and `zbtest2/` chats (now also `zbtest/render`).
5. **Optional:** ask a person at Anthropic about automated tests, and about Zettelbranch now that others use it (draft from Claude).

## How a release goes (for the next version)

1. Claude builds and tests offline, Pascal checks on the real site (Firefox and Chrome).
2. Pascal uploads the zip to addons.mozilla.org ("Envoyer une nouvelle version", "À vous de jouer", source code: Non) and saves the signed `.xpi` into `tests/out/` (right-click, "Enregistrer la cible du lien sous…": unlisted files are served only to the signed-in owner).
3. Claude checks the `.xpi` against `extension/`, adds the version to `updates.json` (with its SHA-256), and publishes the GitHub release with the versioned files and the version-free copies `zettelbranch.xpi` and `zettelbranch.zip` (the README's install links point to `releases/latest/download/` with those names), `SHA256SUMS` and the demo video; then verifies the update chain.

## Next for Claude

1. Plan Milestone 2 from Pascal's real use and the first feedback: [milestone-2__findings](milestone-2__findings.md) (UI fixes from a live test, robustness of the copied history, the README's opening, a "gather branches" idea, the communication plan). Other candidates, from the spec and the sessions:
   - the banner in each branch (path, siblings, children, with links);
   - a "Branch from here" button on each message (M1-2 = C);
   - cross-references between distant branches (`→ 2b`) and backlinks;
   - store listings (Mozilla, Chrome Web Store), once the extension has proved stable;
   - a GitHub Pages site, once non-developers can install it, or for an announcement outside GitHub.
2. `spike/` is kept for now: its probe panel served after the build (P9 to P11) and for the Firefox bug (P1, line by line). Delete it when it is no longer useful (git keeps it).

## Not checked, for later

- Firefox applying an update by itself (`updates.json`): the chain is checked from GitHub's side, but no installed copy has updated yet. At the next version, Pascal's installed 0.1.3 should update (or at once: `about:addons`, the gear menu, "Check for Updates").
- What claude.ai's own `summary` field holds (filled for most chats): could feed the banner's one-line summaries.
- The page title's format; an attachment made by a paste.
- Other Chromium browsers (Edge, Brave, Arc), and Firefox for Android.
