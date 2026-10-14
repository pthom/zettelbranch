# Zettelbranch

Branch your [claude.ai](https://claude.ai) conversations into a tree you can find your way in.

![Branching a conversation with Zettelbranch](docs/images/demo.gif)

Long conversations wander: a tangent here, an alternative there, and the thread is lost. Zettelbranch lets you branch a conversation from any message into a new chat, and names each branch with a short address, like the cards of Niklas Luhmann's Zettelkasten:

```
sky/1    · Why the sky is blue
sky/1a   · Why sunsets are red          (a branch of sky/1)
sky/1a1  · The green flash              (a branch of sky/1a)
sky/1b   · The sky on Mars              (another branch of sky/1)
```

Each branch is an ordinary claude.ai chat with its address in its title, so your tree shows in the sidebar, on your phone, everywhere. Zettelbranch only adds a small panel to claude.ai in your browser.

The name: *Zettelkasten* (German, "box of slips") + *branch*. Also inspired by Georges Perec's card systems and the cross-references that run through his books.

## How it works

**1. Choose where the branch starts.** Click the Zettelbranch button, pick a message: one of Claude's replies (the branch continues after it) or one of your own (the branch is an alternative to it).

<img src="docs/images/choose.png" alt="The panel: choose where the branch starts" width="420">

**2. Check the preview, open the new chat.** The new chat receives the conversation so far, with a short header (address, path, where it was forked from). Add your question and press Send yourself.

<img src="docs/images/new-chat.png" alt="The new chat, with the text in the box and the next steps" width="560">

**3. Claude picks up the thread.** Its first reply starts with a summary of where the parent stood, and ends with a suggested name for the branch.

<img src="docs/images/first-reply.png" alt="Claude's first reply: summary, answer, suggested name" width="560">

**4. Name the branch, find your way in the tree.** One click renames the chat `sky/1a · Why sunsets are red`; the panel lists the whole tree, with links.

<img src="docs/images/tree.png" alt="The tree in the panel" width="420"> <img src="docs/images/sidebar.png" alt="The sidebar, with the branches named by address" width="270">

Every step, with more pictures: the [user manual](docs/MANUAL.md).

## Status

Version 0.1.2 (2026-10-13), an early version, used by its author in Chrome and Firefox.

> **Expect it to break.** Zettelbranch relies on claude.ai's undocumented web interface, which Anthropic updates often and without notice. One of these updates will break it, probably soon. When it does, please [open an issue](https://github.com/pthom/zettelbranch/issues).

Known limits:

- Images, files and artifacts are not copied into a branch: they become placeholders.
- Zettelbranch renames a chat through claude.ai's own title menu; if that menu changes, it renames another way, and the open tab then shows the new name only after a reload.

Later: a banner in each branch (path, siblings, children), a "Branch from here" button on each message, cross-references between distant branches, a trigger from the Claude apps.

This is an independent project, not made or endorsed by Anthropic.

## Install

**Firefox** (on a computer, version 140 or later), signed by Mozilla:

1. Click **[Install Zettelbranch for Firefox](https://github.com/pthom/zettelbranch/releases/latest/download/zettelbranch.xpi)**.
2. Firefox says it "prevented this site from asking you to install software": that is expected for an add-on that does not come from Mozilla's store. Click **Continue to Installation**, then **Add**.
3. Allow Zettelbranch on claude.ai: click the puzzle icon in the toolbar, then Zettelbranch.

Firefox then keeps it up to date by itself.

**Chrome** (developer mode, for now):

1. Download **[zettelbranch.zip](https://github.com/pthom/zettelbranch/releases/latest/download/zettelbranch.zip)** and unzip it into a folder you keep.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick that folder.
3. To update later: replace the folder's files with a newer zip, then click ⟳ on Zettelbranch in `chrome://extensions`. Chrome does not check for new versions by itself: to hear about them, click **Watch** at the top of this page, then **Custom**, then **Releases**, and GitHub emails you at each release.

Then open claude.ai: a **Zettelbranch** button sits at the bottom right.

No build step: what is in `extension/` is what runs. Each [release](https://github.com/pthom/zettelbranch/releases/latest) lists the SHA-256 of every file.

## Trust

The extension must be easy to audit:

- No permissions, no background script, claude.ai only. (In Firefox, the signed version lets Firefox itself check this repository on GitHub for updates, about once a day; the extension never does.)
- Network: only claude.ai's own API, all in one file, `extension/api.js`, which lists the four calls it makes: finding your organization, reading your conversation list, reading one conversation, renaming a conversation. It never sends a message and never deletes.
- It never reads, stores or sends your login or session tokens, and stores no conversation content.
- Nothing is sent automatically. It writes (renames a chat, fills the message box) only when you click, and you press Send yourself. To rename, it uses claude.ai's own title menu on the chat on screen: the only page elements it sends events to are that menu's title button, its Rename item and its rename field (plus a click on the New chat link). It reads only when you open its panel or click (a chat opened from the panel's tree opens with the panel), and while the panel is open, when you move to another chat.
- [AUDIT.md](AUDIT.md) lists what the code never does, with the `grep` commands that prove it.

**Don't take our word for it: ask your own LLM.** The code is short (about 2,050 lines, no dependencies, no build step). [AUDIT.md](AUDIT.md#a-prompt-for-an-llm-audit) ends with a ready-to-paste prompt: give it to your favourite LLM with this repository, and it checks that Zettelbranch sends your conversations nowhere but claude.ai, with file names and line numbers for every finding.

## Developers

Tests run offline, against a fake claude.ai: `cd tests && npm install && npm test` (audit, unit tests, end-to-end tests in a headless browser; nothing touches claude.ai).

## Specs

`specs/` is an Obsidian vault with the spec, the decisions and the findings, kept in the open. Start with `specs/zettelbranch__specs.md` and `specs/zettelbranch__status.md`.

## License

[MIT](LICENSE).
