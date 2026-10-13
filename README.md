# Zettelbranch

A browser extension for [claude.ai](https://claude.ai) that turns conversations into a tree you can find your way in. You branch any conversation from any message into a new chat, and each branch is named with an address, like the cards of Niklas Luhmann's Zettelkasten: `oulipo/1`, `oulipo/1a`, `oulipo/1a1`, `oulipo/1b`…

The name: *Zettelkasten* (German, "box of slips") + *branch*. Also inspired by Georges Perec's card systems and the cross-references that run through his books.

## Status

Version 0.1.0, the first everyday version (2026-10-13). Used by its author on the real site, in Chrome and Firefox.

- **Branch** any conversation from any message: Claude's reply ("continue after it") or your own message ("instead of it"). A preview shows the exact text first.
- **A new chat** opens with the conversation copied into the message box; you add your question and press Send yourself. Claude starts with a short summary of where the parent stood.
- **Addresses:** a conversation becomes the root of a tree (`oulipo/1`) and each branch gets the next address (`oulipo/1a`, `oulipo/1a1`…). Claude suggests a name for the branch; you can change it.
- **The tree** of the current chat is listed in the panel, with links to every branch.

Known limits:

- After a rename, the open tab shows the new name only after a reload, and Firefox's sidebar can take longer. Your other devices show it at once.
- Images, files and artifacts are not copied into a branch: they become placeholders.
- It relies on claude.ai's undocumented web API, which can change at any time.

Later: a banner in each branch (path, siblings, children), a "Branch from here" button on each message, cross-references between distant branches, a trigger from the Claude apps, a signed Firefox version.

This is an independent project, not made or endorsed by Anthropic.

## Trust

The extension must be easy to audit:

- No permissions, no background script, claude.ai only.
- Network: only claude.ai's own API, all in one file, `extension/api.js`, which lists the four calls it makes: finding your organization, reading your conversation list, reading one conversation, renaming a conversation. It never sends a message and never deletes.
- It never reads, stores or sends your login or session tokens, and stores no conversation content.
- Nothing is sent automatically. It writes (renames a chat, fills the message box) only when you click, and you press Send yourself. It reads only when you open its panel or click, and while the panel is open, when you move to another chat.
- [AUDIT.md](AUDIT.md) lists what the code never does, with the `grep` commands that prove it.

## Install

Download `zettelbranch-0.1.0.zip` from the [release](https://github.com/pthom/zettelbranch/releases/tag/v0.1.0) and check it against the SHA-256 sums there, or use the `extension/` folder of this repository at tag `v0.1.0`. No build step: what is in `extension/` is what runs.

- **Chrome:** unzip it into a folder you keep. Open `chrome://extensions`, turn on Developer mode, click "Load unpacked" and pick that folder.
- **Firefox:** open `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on…" and pick the zip (or `manifest.json` in the folder), then allow Zettelbranch on claude.ai (the puzzle icon in the toolbar). Firefox removes a temporary add-on when it quits; a version signed by Mozilla comes later.

Then open claude.ai: a "Zettelbranch" button sits at the bottom right.

## Developers

Tests run offline, against a fake claude.ai: `cd tests && npm install && npm test` (audit, unit tests, end-to-end tests in a headless browser; nothing touches claude.ai).

## Specs

`specs/` is an Obsidian vault with the spec, the decisions and the findings, kept in the open. Start with `specs/zettelbranch__specs.md` and `specs/zettelbranch__status.md`.

## License

[MIT](LICENSE).
