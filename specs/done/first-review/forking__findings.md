# Forking findings

Forking by copying context into a new conversation: the header, the prompt, and what the copy loses. Review of 2026-10-13.

## Who writes the summary?

The spec says the header, including a summary of the parent, is "written at fork time", and also that "the branch prompt can ask Claude to write that summary itself". These contradict each other: if Claude writes it, it is in Claude's first reply, not in the first message. A clean split:

- your first message carries the address, path to root and fork point, all known in advance;
- Claude's first reply starts with the summary in a fixed format the extension can parse.

Decision: FK-1.

## The prompt template does not exist yet

The branch prompt is the most important piece of user-facing text in the project. It should define:

- delimiters around the copied transcript (for example XML-style tags);
- the instruction "this is earlier context; continue from here", so Claude does not comment on or re-answer the transcript;
- the summary format, if Claude writes it;
- the header layout, readable without the extension.

Draft, written against the recommended answers: [forking__prompt](../../forking__prompt.md).

## The copy changes the nature of the context

The child sees the parent as quoted text inside a user message, not as its own earlier turns. It may behave differently: comment on the transcript, re-answer old questions, or treat its own earlier answers as someone else's. The prompt has to handle this.

## What will not come along

| Content | Where it is | Proposed handling |
|---|---|---|
| Artifacts | In a side panel, not in the message *(to verify)* | Placeholder `[artifact: <title>, not copied]` |
| Attachments, images | Files, not text | Placeholder with file name |
| Thinking | Collapsed block | Left out |
| Web search, tool results | Collapsed blocks | Left out, or one-line placeholder |
| Project knowledge, instructions | The project | Kept only if the new chat opens in the same project |
| Model, style settings | Per conversation | Not carried over |

The new chat should open inside the parent's project, not at `/new`. Otherwise project knowledge and instructions are lost, and the "work only in a dedicated test project" rule breaks during testing.

## Cost

Every branch re-sends the full history up to the fork point, so deep trees pay again and again. Possible modes: full transcript, summary only, last N turns. Decision: FK-2.

## Long text in the message box *(to verify)*

claude.ai turns long pasted text into an attachment instead of keeping it in the message box. Whether programmatic insertion does the same is unknown. If it does, the header is no longer plain text at the top of the message. Keeping the header as a short separate part at the top helps either way.

## Inserting text into the message box *(to verify)*

The message box is a rich-text editor, probably ProseMirror. Approaches to test in Milestone 0, in order:

1. a synthetic `paste` event carrying a `DataTransfer` with `text/plain`;
2. `document.execCommand('insertText')` (deprecated, but still fires the right events).

Success means the app's state updates: the send button enables and the sent message contains the full text.

## Extraction format

Convert messages to Markdown, not plain text, so these survive:

- lists, tables, links, headings;
- code blocks, with their language;
- math: KaTeX keeps the LaTeX source in `<annotation encoding="application/x-tex">`.

The page shows only the currently selected path of claude.ai's native tree *(to verify)*, which is exactly the path a branch should copy.

## Branching from your own message vs Claude's reply

- From Claude's reply: context is everything up to that reply, and you write the next prompt.
- From your own message: most likely "an alternative to this message", like editing it. Context is everything before it, and your message is pre-filled for you to change.

Decision: FK-3.
