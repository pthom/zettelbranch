# Forking questions

Context: [forking__findings](forking__findings.md).

## FK-1 · Where the parent summary lives

**Status:** decided (2026-10-13). Folded into [spec](../../zettelbranch__specs.md#core-design) and [forking__prompt](../../forking__prompt.md).

- **A.** Your first message carries address, path and fork point. The prompt asks Claude to start its first reply with a summary of the parent in a fixed format. *(recommended)*
- **B.** Before forking, the extension asks for a summary in the parent conversation, then puts it in the header. Costs a turn and adds a message to the parent.
- **C.** No summary in Milestone 1; decide later.

**Answer:** A

## FK-2 · How much context a branch carries

**Status:** decided (2026-10-13). Folded into [spec](../../zettelbranch__specs.md#core-design).

- **A.** Full transcript up to the fork point in Milestone 1; add "summary only" and "last N turns" later. *(recommended)*
- **B.** Offer all three modes from the start.

**Answer:** A

## FK-3 · What branching from your own message means

**Status:** decided (2026-10-13): A, in chat. Folded into the [spec](../../zettelbranch__specs.md#core-design).

- **A.** An alternative to that message: context is everything before it, and your message is pre-filled in the new chat for you to change. *(recommended)*
- **B.** Same as branching from Claude's reply: your message is included in the context, and the new chat answers it.

**Answer:**

## Defaults (object if you disagree)

- **FK-D1** · Content that cannot be copied gets a placeholder (`[artifact: <title>, not copied]`, file names for attachments). Thinking and tool blocks are left out.
- **FK-D2** · The new chat opens inside the parent's project. *Update 2026-10-13: applies to old-style chat projects only. New projects are Claude Code projects, out of scope for now (see the spec's risks).*
- **FK-D3** · Messages are extracted as Markdown (lists, tables, code with language, LaTeX source for math).
- **FK-D4** · The header and the instructions to Claude are in English whatever the UI language, so the extension parses one format. Claude replies in the language of your message. See [forking__prompt](../../forking__prompt.md).
- **FK-D5** · Branching from a branch flattens the transcript into one sequence from the root instead of nesting it. See [forking__prompt](../../forking__prompt.md#transcript).
