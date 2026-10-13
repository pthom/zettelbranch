# Forking questions

Context: [forking__findings](forking__findings.md).

## FK-1 · Where the parent summary lives

**Status:** open

- **A.** Your first message carries address, path and fork point. The prompt asks Claude
  to start its first reply with a summary of the parent in a fixed format.
  *(recommended)*
- **B.** Before forking, the extension asks for a summary in the parent conversation,
  then puts it in the header. Costs a turn and adds a message to the parent.
- **C.** No summary in Milestone 1; decide later.

**Answer:**

## FK-2 · How much context a branch carries

**Status:** open

- **A.** Full transcript up to the fork point in Milestone 1; add "summary only" and
  "last N turns" later. *(recommended)*
- **B.** Offer all three modes from the start.

**Answer:**

## FK-3 · What branching from your own message means

**Status:** open

- **A.** An alternative to that message: context is everything before it, and your
  message is pre-filled in the new chat for you to change. *(recommended)*
- **B.** Same as branching from Claude's reply: your message is included in the context,
  and the new chat answers it.

**Answer:**

## Defaults (object if you disagree)

- **FK-D1** · Content that cannot be copied gets a placeholder (`[artifact: <title>, not
  copied]`, file names for attachments). Thinking and tool blocks are left out.
- **FK-D2** · The new chat opens inside the parent's project.
- **FK-D3** · Messages are extracted as Markdown (lists, tables, code with language,
  LaTeX source for math).
