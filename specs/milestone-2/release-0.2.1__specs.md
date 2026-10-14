# Release 0.2.1: notes

The text of the GitHub release, drafted and published on 2026-10-14 ([how a release goes](../zettelbranch__status.md#how-a-release-goes-for-the-next-version)), without the title line. Same shape as 0.2.0's, shorter: the icon only, which the Chrome Web Store requires. Released rather than sent to the store alone (Pascal asked why): so that the store's copy can be checked against a tagged release's sums, and one version number means one content everywhere.

---

**Title:** Zettelbranch 0.2.1

Zettelbranch has an icon: the panel's tree on the Zettelbranch button's brown, instead of the grey puzzle piece, in the browser's extension menu and on its extensions page. Nothing else changes.

## Install or update

- **Firefox:** Firefox updates it by itself within a day (or now: `about:addons`, the gear menu, "Check for Updates"). Otherwise click [zettelbranch.xpi](https://github.com/pthom/zettelbranch/releases/download/v0.2.1/zettelbranch.xpi), then "Continue to Installation" and "Add".
- **Chrome:** unzip `zettelbranch-0.2.1.zip` over the folder you loaded, then click ⟳ on Zettelbranch in `chrome://extensions`.

`SHA256SUMS` lists every file. The `.xpi`, signed by Mozilla, holds the same scripts and images byte for byte (Mozilla reformats its copy of `manifest.json`).

**For auditors:** the extension's folder now holds four PNG images (`icons/`, 16 to 128 pixels), listed in the manifest. [AUDIT.md](https://github.com/pthom/zettelbranch/blob/v0.2.1/AUDIT.md), point 18, checks that the folder holds nothing but the manifest, the scripts and these images, and that each image is a PNG.

> **Expect it to break.** Zettelbranch relies on claude.ai's undocumented web interface, which changes often and without notice. When it breaks, please [open an issue](https://github.com/pthom/zettelbranch/issues).

An independent project, not made or endorsed by Anthropic. MIT license.
