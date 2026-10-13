# Zettelbranch

A browser extension for [claude.ai](https://claude.ai) that turns conversations into a tree you can find your way in. You branch any conversation from any message into a new chat, and each branch is named with an address, like the cards of Niklas Luhmann's Zettelkasten: `oulipo/1`, `oulipo/1a`, `oulipo/1a1`, `oulipo/1b`…

The name: *Zettelkasten* (German, "box of slips") + *branch*. Also inspired by Georges Perec's card systems and the cross-references that run through his books.

## Status

Early development, not released yet.

- Milestone 0 (finding out what claude.ai allows) is done.
- Milestone 1, the first everyday version, works in Chrome on the real site: branch from any message, a preview of the exact text, a new chat filled with it, the branch named with its address. In progress: guidance after branching, and the tree of a conversation listed in the panel. Not checked in Firefox yet.
- Later: a banner in each branch (path, siblings, children), cross-references between distant branches, a trigger from the Claude apps.

This is an independent project, not made or endorsed by Anthropic. It relies on claude.ai's undocumented web API, which can change at any time.

## Trust

The extension must be easy to audit:

- No permissions, no background script, claude.ai only.
- Network: only claude.ai's own API, all in one file, `extension/api.js`, which lists the four calls it makes: finding your organization, reading your conversation list, reading one conversation, renaming a conversation. It never sends a message and never deletes.
- It never reads, stores or sends your login or session tokens, and stores no conversation content.
- It acts only when you click. It writes into the message box only when you branch, and you press Send yourself.
- [AUDIT.md](AUDIT.md) lists what the code never does, with the `grep` commands that prove it.

## Trying it (developers)

No build step: what is in `extension/` is what runs. Use a separate browser profile.

- Chrome: `chrome://extensions`, turn on Developer mode, "Load unpacked", pick the `extension/` folder.
- Firefox: `about:debugging#/runtime/this-firefox`, "Load Temporary Add-on…", pick `extension/manifest.json`, then allow it on claude.ai.

Tests run offline, against a fake claude.ai: `cd tests && npm install && npm test`.

## Specs

`specs/` is an Obsidian vault with the spec, the decisions and the findings, kept in the open. Start with `specs/zettelbranch__specs.md` and `specs/zettelbranch__status.md`.

## License

Not chosen yet.
