# Transcript layout: questions

Asked by Pascal on 2026-10-14, with a screenshot of a branch's first message: could the copied conversation read better than `<zb-turn branch="1" n="2" role="assistant">` tags, with code blocks or admonitions?

What we know: claude.ai shows your messages as Markdown (the screenshot shows a code block and inline code rendered), but raw HTML-like tags as plain text, so `<details>` or comments cannot hide anything. The first message is long, so claude.ai folds it ("Show more"); the layout matters when you unfold it, and on the phone.

## The check (2 minutes)

1. In the Claude Code prompt, type `! pbcopy < tests/out/render-probe.md` (it puts the sample on the clipboard as plain text).
2. In the test profile, start a new chat, paste, send. Unfold the message ("Show more").
3. Rename the chat `zbtest/render` (delete it with the others later). Tell me which layout you prefer, and what D shows.

The sample shows the same two turns in four layouts. A paste is only a first look: the real check comes with a test build that fills the box the way Zettelbranch does.

## What the check showed

Pascal pasted the sample on 2026-10-14. In your messages, claude.ai renders only part of Markdown:

- **Rendered:** code blocks (three backticks), inline code, quotes (`>`), line breaks as typed.
- **Shown as typed:** bold and italic (`**Me**`), headings (`#### Me`), lists (`- ears`), admonitions (`[!NOTE]`), four-backtick code blocks (C came out garbled), tag-like text (`<zb-turn>`).

So A showed `**Me**` with its stars, B showed `####`, C broke, and D is A with a stray `[!NOTE]` line.

## TL-1 Which layout for the transcript?

**Status:** decided (B: the messages as is, under a label line; the label's style is TL-2)

- **A. A label line, the message quoted** (`**Me** · sky/1, message 3`, then the message with `> ` at the start of each line). Each turn gets a bar on its left; code blocks, bold and lists still render inside. Nothing in a message can be mistaken for a turn boundary, since every line of a message is quoted: no escaping needed. Costs about one token per line.
- **B. A small heading per turn** (`#### Me · sky/1, message 3`), the message as is. Reads like normal text, but a message's own headings compete with the turn headings, and boundaries need escaping, as today.
- **C. A label line, the message in a code block.** Shows the raw Markdown in a monospace font, nothing rendered inside. Long lines probably scroll sideways instead of wrapping (the sample checks it).
- **D. Admonitions** (`> [!NOTE]`, GitHub style). claude.ai probably does not render them, in which case D is A with a stray `[!NOTE]` line (the sample checks it).

**Recommendation** (before the check): A.

**Answer:** "B, but we are limited by claude..." (Pascal, in chat). The messages stay as written; since headings do not render, the label line needs another style (TL-2).

## TL-2 Which style for the label line?

**Status:** decided (B1 and B4 together: a code box inside a quote; built in 0.1.4)

Four styles that claude.ai can render, in `tests/out/render-probe-2.md`: type `! pbcopy < tests/out/render-probe-2.md` in the Claude Code prompt, paste into the `zbtest/render` chat, send, unfold.

- **B1. Label in code:** `` `Me · sky/1, message 3` ``, shown in a small monospace box, like the `<~~~` in the first sample.
- **B2. Label with an emoji:** 🧑 Me / 🤖 Claude, plain text.
- **B3. Label between dashes:** `——— Me · sky/1, message 3 ———`.
- **B4. Label quoted:** the label alone in a quote (with a bar on its left), the message below as is. Claude's summary at the top of its first reply is a quote too, so the two may look alike.

**Recommendation:** B1: the box stands out from the text without needing any rendering claude.ai lacks, and stays readable on the phone. With B, a message line that looks exactly like a label gets escaped, as `<zb-` is today.

**Answer:** a third sample (`tests/out/render-probe-3.md`) put the box inside the quote, with and without small arrows. Pascal passed on Claude's review of it from `zbtest/render`, and Claude Code built what it proposed:

- the label is a code box inside a quote, a blank line after it, then the message as written: the bar and the box mark every boundary, and the messages read as normal text;
- the section names in capitals (`OUR CONVERSATION SO FAR`, `INSTRUCTIONS FOR CLAUDE`, `MY MESSAGE`, which became `MY QUESTION` in 0.2.0), so they do not look like one more message;
- the header quoted too, so it stands apart from the messages (its three lines keep their line breaks);
- no arrows: at that size they read as specks, and "Me" and "Claude" already differ.

Checked offline: in a real Tiptap editor, neither browser turns a line ending with a backtick (or `**bold**`, `---`, `> `, `- `) into formatting, in one call or line by line.

## The check on claude.ai (0.1.4)

Steps 2 and 3 were seen in Pascal's live test on 2026-10-14 (`zettelbranch/1` → `zettelbranch/1a`), with one finding: Claude wrote its summary in bold, which was not recognised (fixed; [milestone-2__findings](milestone-2__findings.md), section 1, item 4).

1. Chrome test profile: `chrome://extensions`, ⟳ on Zettelbranch (it shows 0.1.4). Firefox test profile: `about:debugging`, "Load Temporary Add-on…", `extension/manifest.json`.
2. In a `zbtest` chat with a code block, branch from Claude's last reply, open the new chat, type a question under `MY QUESTION` (0.2.0), send. Unfold the first message: the header, section names and labels have a bar, the labels a box, the messages read as normal text.
3. Claude's reply: starts with "Parent … in brief", reproduces none of the labels, ends with "Branch title: …"; "Name this branch" proposes it.
4. Branch again from the new branch: the preview holds one `OUR CONVERSATION SO FAR`, every message once.
5. On a branch made before (for example `oulipo/1d`), click Branch: the preview shows its history in the new layout. Cancel.
6. The same steps 2 and 3 in Firefox (its box is filled line by line).

## Defaults

Applied in 0.1.4:

- **Claude is told** (your point): the instructions say the label lines were added by Zettelbranch for display, are not part of the messages, and are not to be used in its replies.
- **The outer tags go too:** `<zb-transcript>` and `<zb-instructions>` become label lines in the same style (for example "Our conversation so far", "Instructions for Claude", "My message").
- **A code block left open** in a message (a cut reply) is closed at the end of its turn, so it cannot swallow the next labels.
- **Old branches keep working:** branches made with 0.1.x (tags) are still read, named and flattened.
- **Tested** in the offline tests and in the real Tiptap editor (Chromium and Firefox), including Firefox's line-by-line fill (a line that starts with `> ` or `- ` must stay text in the editor).
- [forking__prompt](../forking__prompt.md) shows the new layout word for word (the unit tests compare it), and the manual describes it. The manual's screenshots and the demo still show the tags: to retake after the check.
