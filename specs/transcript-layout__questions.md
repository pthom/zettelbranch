# Transcript layout: questions

Asked by Pascal on 2026-10-14, with a screenshot of a branch's first message: could the copied conversation read better than `<zb-turn branch="1" n="2" role="assistant">` tags, with code blocks or admonitions?

What we know: claude.ai shows your messages as Markdown (the screenshot shows a code block and inline code rendered), but raw HTML-like tags as plain text, so `<details>` or comments cannot hide anything. The first message is long, so claude.ai folds it ("Show more"); the layout matters when you unfold it, and on the phone.

## The check (2 minutes)

1. In the Claude Code prompt, type `! pbcopy < tests/out/render-probe.md` (it puts the sample on the clipboard as plain text).
2. In the test profile, start a new chat, paste, send. Unfold the message ("Show more").
3. Rename the chat `zbtest/render` (delete it with the others later). Tell me which layout you prefer, and what D shows.

The sample shows the same two turns in four layouts. A paste is only a first look: the real check comes with a test build that fills the box the way Zettelbranch does.

## TL-1 Which layout for the transcript?

**Status:** open

- **A. A label line, the message quoted** (`**Me** · sky/1, message 3`, then the message with `> ` at the start of each line). Each turn gets a bar on its left; code blocks, bold and lists still render inside. Nothing in a message can be mistaken for a turn boundary, since every line of a message is quoted: no escaping needed. Costs about one token per line.
- **B. A small heading per turn** (`#### Me · sky/1, message 3`), the message as is. Reads like normal text, but a message's own headings compete with the turn headings, and boundaries need escaping, as today.
- **C. A label line, the message in a code block.** Shows the raw Markdown in a monospace font, nothing rendered inside. Long lines probably scroll sideways instead of wrapping (the sample checks it).
- **D. Admonitions** (`> [!NOTE]`, GitHub style). claude.ai probably does not render them, in which case D is A with a stray `[!NOTE]` line (the sample checks it).

**Recommendation:** A. Clear boundaries for both you and Zettelbranch, and the messages keep their formatting.

**Answer:**

## Defaults

Unless you object here, whatever the layout:

- **Claude is told** (your point): the instructions say the layout was added by Zettelbranch for display, that the quoting (or labels) is not part of the messages, and not to use that layout in its replies.
- **The outer tags go too:** `<zb-transcript>` and `<zb-instructions>` become readable lines (for example `**Our conversation so far**` and `**Instructions for Claude**`), and a rule (`---`) separates the instructions from your message.
- **Old branches keep working:** branches made with 0.1.x (tags) are still read, named and flattened.
- **Tested** in the offline tests and in the real Tiptap editor (Chromium and Firefox), including Firefox's line-by-line fill: a line that is only `> ` could turn into a quote block in the editor, so empty quoted lines are written `>`.
- [forking__prompt](forking__prompt.md) is updated with the new layout.
