# Status

What is open, and the next steps. Updated by Claude at the end of each session. Finished work leaves this file for the [done log](done/README.md).

**Last update:** 2026-10-14, 0.2.0 released, and Firefox's automatic update seen working.

**Repository:** https://github.com/pthom/zettelbranch (public, MIT). Claude pushes only when Pascal asks.

## Where things are

Zettelbranch **0.2.0** is the latest release (2026-10-14): the panel's own forms, a readable first message, new pictures, the demo as a video at the top of the README ([done log](done/README.md)). 0.1.2 and 0.1.3 were announced by Pascal on X on 2026-10-13.

- **Firefox:** signed by Mozilla (unlisted, add-on 3095566 on addons.mozilla.org), one-click install from the README, automatic updates through `updates.json` in this repository. Seen working on 2026-10-14: Pascal's main Firefox went to 0.2.0 on "Rechercher des mises à jour" ("Vos modules ont été mis à jour").
- **Chrome:** developer mode ("Load unpacked"), updated by hand; the README tells Chrome users to watch the repository's releases. The Chrome Web Store comes next (Milestone 2, step 8).
- **Tests** (0.2.1): audit 79/79, unit 65/65, end-to-end 36/36, a real Tiptap editor in Chromium and Firefox 6/6 (`cd tests && npm test`, offline).
- **The repository:** README opening on the demo video (GitHub's player, the GIF as a link), four illustrated steps and one-click install; user manual in `docs/MANUAL.md`; the About text chosen on 2026-10-14; Discussions on; a "Something broke" issue form; private security reports (`SECURITY.md`); a link-preview image.

The story so far (0.1.0 to 0.2.0) is in the [done log](done/README.md). The facts about claude.ai it all builds on: [claude-ai__findings](claude-ai__findings.md#9-checked-on-pascals-account-milestone-0).

## In progress: Milestone 2, ready for a wider audience

Milestones and their state: [the vault's README](README.md#milestones). Milestone 2 started on 2026-10-14; its [plan](milestone-2/milestone-2__specs.md) is decided (M2-1 = A, M2-2 = B, M2-3 = B, M2-4 = A). Steps 1 to 7 and 9 are done: the two sessions on claude.ai, 0.2.0 built, checked and released, the pictures and the demo, the README and the About text. Left: the Chrome Web Store (step 8, which needs an icon first), the posts (step 10), and the close (step 11).

## Waiting on Pascal

1. **Clean up after the sessions:** on claude.ai, delete the test chats of 2026-10-14 (`zbtest/render-2`, `zbtest/gather`, the P12 "Test chat", session 2's `zbtest/1`, `/1a`, `/2`, `/2a`, and the "autumn" chat of the tree-name picture if it is still there) and the older `zbtest/` and `zbtest2/` chats. In the Firefox test profile, turn Zettelbranch back on (it was off since P12): untouched, it should go to 0.2.0 by itself within a day, the test of Firefox's daily check.
2. **The Chrome Web Store account** ([chrome-web-store__specs](milestone-2/chrome-web-store__specs.md)): name and non-trader set; left: add the contact email and click the link Google sends. Privacy answer: A (`PRIVACY.md`, written).
3. **Check 0.2.1** (the icon) in the Chrome test profile: `chrome://extensions`, ⟳ on Zettelbranch, the icon shows; then say when to release it (the Mozilla upload as usual), and submit it to the Chrome Web Store.
4. **Read the posts' drafts** ([posts__specs](milestone-2/posts__specs.md)) and change what does not sound like you.
5. **Use Zettelbranch for real** and note what bothers you; watch the GitHub issues and Discussions. That feedback guides Milestone 3.
6. **Optional:** ask a person at Anthropic about automated tests, and about Zettelbranch now that others use it (draft from Claude).
7. **Pictures** (reminder, as asked on 2026-10-14): the shoot is done; new ones only if the panel changes again before the posts.

## How a release goes (for the next version)

1. Claude builds and tests offline, Pascal checks on the real site (Firefox and Chrome).
2. Pascal uploads the zip to addons.mozilla.org ("Envoyer une nouvelle version", "À vous de jouer", source code: Non) and saves the signed `.xpi` into `tests/out/` (right-click, "Enregistrer la cible du lien sous…": unlisted files are served only to the signed-in owner).
3. Claude checks the `.xpi` against `extension/`, adds the version to `updates.json` (with its SHA-256), and publishes the GitHub release with the versioned files and the version-free copies `zettelbranch.xpi` and `zettelbranch.zip` (the README's install links point to `releases/latest/download/` with those names) and `SHA256SUMS`; then verifies the update chain.
4. Once Zettelbranch is on the Chrome Web Store: Pascal uploads the same zip there too.

The demo video of 0.2.0 lives in that release's notes (Pascal dragged it there, so GitHub keeps it); a new demo would go the same way ([visuals__specs](milestone-2/visuals__specs.md)).

## Next for Claude

1. Milestone 2's [plan](milestone-2/milestone-2__specs.md), in this order:
   - **0.2.1, the icon** (B, chosen by Pascal): built and tested offline; release when Pascal has checked it ([notes](milestone-2/release-0.2.1__specs.md)), then the store submission with its zip;
   - done 2026-10-14: the store's pictures (`tests/demo/store.html`, `node make-demo.mjs --store`, into `tests/out/store/`); `PRIVACY.md` (privacy answer A, Pascal: "ok"); the posts' drafts with answers for the comments ([posts__specs](milestone-2/posts__specs.md));
   - then the close: the finalized note, the folder to `done/`.
2. Milestone 3 candidates, from the spec and the sessions:
   - "gather branches" (Claude can already find and open chats with claude.ai's past-chat tools);
   - where the panel sits on a chat page (open, it covers the right part of the message box and Send, as since 0.1.0);
   - the banner in each branch (path, siblings, children, with links);
   - a "Branch from here" button on each message (M1-2 = C);
   - cross-references between distant branches (`→ 2b`) and backlinks;
   - the Mozilla Add-ons listing (M2-3 = B);
   - a GitHub Pages site, once non-developers can install it, or for an announcement outside GitHub.
3. `spike/` is kept for now (P1, P9 to P12). Delete it when it is no longer useful (git keeps it).

## Not checked, for later

- Firefox's daily update check on its own, without a click (the click runs the same chain, seen working): the Firefox test profile, left alone, should show it.
- What claude.ai's own `summary` field holds (filled for most chats): could feed the banner's one-line summaries.
- The page title's format; an attachment made by a paste.
- Other Chromium browsers (Edge, Brave, Arc), and Firefox for Android.
