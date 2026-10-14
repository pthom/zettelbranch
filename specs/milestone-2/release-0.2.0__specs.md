# Release 0.2.0: notes

The text of the GitHub release, drafted on 2026-10-14 for Pascal's review, published the same day ([how a release goes](../zettelbranch__status.md#how-a-release-goes-for-the-next-version)), without the title line; the demo video is in its place below the first paragraph. Same shape as 0.1.3's.

---

**Title:** Zettelbranch 0.2.0

The panel now asks for names itself, and a branch's first message reads well in the chat.

(The demo video goes here: Pascal drags `zettelbranch-demo.mp4` into these notes on GitHub after publishing.)

## What's new

- **A readable first message.** claude.ai shows only code blocks and quotes in your messages, so the copied conversation used to appear with raw tags. It is now laid out with small labels (`Me · sky/1, message 1`), section names in capitals, and your question at the end under `MY QUESTION`. Claude is told these lines are Zettelbranch's and does not repeat them. Branches made before still read.
- **No more browser dialogs.** The tree name and the branch name are asked in small forms inside the panel, instead of browser pop-ups headed "claude.ai", which looked as if claude.ai itself was asking. When you name a branch, its address is fixed text and only the topic can change. Enter works, and what you type stays in the panel.
- **The panel steps aside.** It closes once the branch is named (hover the Zettelbranch button to see what was done). In a new branch, if it covers claude.ai's message box and Send button, it moves just above them.
- **Clearer steps.** When the new chat opens, the panel says where to type. Step 1 is checked off once you have sent, and "Name this branch" waits until then.
- **A cleaner list of messages,** without Markdown marks; a branch's first reply shows the start of its answer, not the summary.
- **Quieter:** how the message box was filled shows only when something went wrong.
- **Smaller fixes:** Claude's summary is recognised in bold too; a chat that claude.ai had not titled yet gets its tree name from its title.

Checked by hand in Firefox and Chrome on claude.ai.

## Install or update

- **Firefox:** if you installed 0.1.2 or 0.1.3, Firefox updates it by itself within a day (or now: `about:addons`, the gear menu, "Check for Updates"). Otherwise click [zettelbranch.xpi](https://github.com/pthom/zettelbranch/releases/download/v0.2.0/zettelbranch.xpi), then "Continue to Installation" and "Add".
- **Chrome:** unzip `zettelbranch-0.2.0.zip` over the folder you loaded, then click ⟳ on Zettelbranch in `chrome://extensions`.

`SHA256SUMS` lists every file. The `.xpi`, signed by Mozilla, holds the same scripts byte for byte (Mozilla reformats its copy of `manifest.json`).

**For auditors:** the panel's text fields have key listeners that only stop the keys typed in them, since claude.ai otherwise pulls them into its own message box; they read nothing. [AUDIT.md](https://github.com/pthom/zettelbranch/blob/v0.2.0/AUDIT.md) checks it (point 9), and a new point 20: no browser dialogs, and the panel's fields are read only when you click their button.

> **Expect it to break.** Zettelbranch relies on claude.ai's undocumented web interface, which changes often and without notice. When it breaks, please [open an issue](https://github.com/pthom/zettelbranch/issues).

An independent project, not made or endorsed by Anthropic. MIT license.
