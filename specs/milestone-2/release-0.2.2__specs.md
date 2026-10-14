# Release 0.2.2: notes

The text of the GitHub release, published on 2026-10-14, without the title line. Why it exists: the Chrome Web Store refused 0.2.1's zip, whose manifest description had 150 characters (the store allows 132, and shows that line under the name, in its search results and on the listing). Pascal chose the new line (his About phrase, option 1 of four) and asked not to upload to Mozilla again: Firefox does not need the change, so it keeps the signed 0.2.1, which holds the same scripts and icon; this release carries that file for the one-click install, and `updates.json` stays at 0.2.1. A unit test now checks the store's limits.

---

**Title:** Zettelbranch 0.2.2

A shorter description, for the Chrome Web Store, which allows 132 characters: "Explore your thoughts and side quests without getting lost: branch claude.ai conversations into a tree of chats (sky/1, sky/1a)." Nothing else changes: the scripts and the icon are those of 0.2.1.

## Install or update

- **Firefox:** nothing to do. Firefox keeps 0.2.1, signed by Mozilla, which differs only by its longer description. This release carries that signed file: [zettelbranch.xpi](https://github.com/pthom/zettelbranch/releases/download/v0.2.2/zettelbranch.xpi) (the same as `zettelbranch-0.2.1.xpi`), then "Continue to Installation" and "Add".
- **Chrome:** unzip `zettelbranch-0.2.2.zip` over the folder you loaded, then click ⟳ on Zettelbranch in `chrome://extensions`. Soon also on the Chrome Web Store.

`SHA256SUMS` lists every file. The scripts and the icon in `zettelbranch-0.2.2.zip` and in the signed `zettelbranch-0.2.1.xpi` are the same byte for byte; only `manifest.json` differs (the version, the description, and Mozilla's formatting).

> **Expect it to break.** Zettelbranch relies on claude.ai's undocumented web interface, which changes often and without notice. When it breaks, please [open an issue](https://github.com/pthom/zettelbranch/issues).

An independent project, not made or endorsed by Anthropic. MIT license.
