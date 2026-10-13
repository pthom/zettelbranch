# Branch prompt (draft)

The text the extension puts in the new chat's message box when you branch. Draft of
2026-10-13. Built on the decisions FK-1 = A (Claude writes the summary), FK-2 = A (full
transcript), FK-3 = A (branching from your message replaces it) and AD-1 = A
(`<tree>/<address>` titles). Context:
[forking__findings](done/first-review/forking__findings.md), [forking__questions](done/first-review/forking__questions.md).

## Layout

The first message of a branch has four parts, in this order:

1. **Header.** Three or four plain lines, readable without the extension, including in
   the mobile app.
2. **Transcript.** The conversation from the root of the tree to the fork point, inside
   `<zb-transcript>` tags.
3. **Instructions** for Claude, inside `<zb-instructions>` tags.
4. **Your message.** Empty, with the cursor there. When you branch from your own
   message (FK-3 = A), your old message is pre-filled here for you to change.

Long material goes first and the question last: Anthropic's long-context advice, and it
puts the cursor where you type.

Long text stays inline: inserted with one `execCommand` call, 100,000 characters stayed
plain text and reached the model (Milestone 0, P2). Only a paste turns long text into a
"Pasted" attachment, and the extension never pastes. So the whole prompt goes in at
once.

## Header

```
Zettelbranch · zb/1b1
Path: zb/1 › 1b › 1b1
Forked from: zb/1b · Backlinks with the API, after message 4 (Claude): "Backlinks need every…"
See also: → zb/2a, → zb/1a3
```

- **Line 1:** product name, tree, address. The extension finds branch conversations by
  this line. Name per ZB-1, `zb/` per AD-1.
- **Line 2:** path from the root.
- **Line 3:** the parent's full title, the fork point, and the first 60 characters of the
  fork message, cut at a word. When you branch from your own message:
  `instead of message 5 (me): "What about…"`.
- **Line 4,** only if there are links: cross-references known at fork time (XR-1 = A).

Messages are numbered along the path the page shows, both roles counted, starting at 1.
The quote is there because the numbers shift if the parent's native tree is switched to
another path later.

The header has no topic. The topic in the title comes from claude.ai's automatic title,
and the extension only adds the `zb/1b1 · ` prefix *(depends on the Milestone 0 rename
test)*.

## Transcript

```
<zb-transcript>
<zb-turn branch="1" n="1" role="user">
Can the extension see conversations older than the sidebar shows?
</zb-turn>
<zb-turn branch="1" n="2" role="assistant">
Not without reading the full list page or the API. …
</zb-turn>
…
<zb-turn branch="1b" n="1" role="user">
How would backlinks work with option A?
</zb-turn>
<zb-turn branch="1b" n="2" role="assistant">
Backlinks need every conversation of the tree. …
</zb-turn>
…
</zb-transcript>
```

- `branch` and `n` say which conversation and which message each turn comes from, so
  later references like `zb/1b#4` stay possible.
- Message text is Markdown (FK-D3). Content that was not copied gets a placeholder
  (FK-D1).
- **Flattening.** A branch's first message contains its own transcript. When you branch
  from a branch, the extension does not nest that transcript inside the new one. It
  parses the first message back into the earlier turns plus your own text, and lists
  them in one flat sequence from the root. Claude's summary at the top of the branch's
  first reply is dropped: with the full transcript it says nothing new. If parsing
  fails, the first message is copied as is, nested; worse, but still correct.
- **Escaping.** Message text containing `<zb-` or `</zb-` (likely in conversations
  about this very prompt) has `<` written as `&lt;` there. The extension reverses it
  when parsing back.

## Instructions

`zb/1b` and `4` are filled in by the extension.

```
<zb-instructions>
The transcript above is our conversation so far, copied from the conversation zb/1b up
to message 4. The assistant turns are your own earlier replies. Treat it as shared
history: do not comment on it, quote it back, or answer its questions again. Text in
square brackets, such as [artifact: …, not copied], marks content that was not carried
over; ask me if you need it.

Start your first reply with a single blockquote paragraph that begins with
"Parent zb/1b in brief:" and says in 2 to 4 sentences where the conversation stood at
that point, in the language of the conversation. Then answer my message below. If there
is no message below, reply with the summary only.
</zb-instructions>
```

The second paragraph exists only if FK-1 = A. With FK-1 = B the summary is in the
header instead; with C it is gone.

When nothing comes before the fork point (a branch from a chat's first message), the
transcript is empty and there is nothing to summarise. The instructions then say only:

```
<zb-instructions>
This chat is a new branch of the conversation zb/1b, started from its first message, so
there is no earlier history (the transcript above is empty). Do not comment on the
header lines; they are for my own records. Answer my message below.
</zb-instructions>
```

Seen in Milestone 0 (P8): asked for a summary anyway, Claude summarised an empty
transcript ("copied up to message 0").

The instructions are in English whatever the UI language, so the extension parses one
format. Claude replies in the language of your message.

## Claude's first reply

```
> Parent zb/1b in brief: Backlinks need the text of every conversation in the tree, so
> they depend on DA-1. With the API allowed, the extension can read each branch's first
> message and build the links. The open point was cost and freshness.

<the answer to your message>
```

Seen in Milestone 0 (P8, 2026-10-13): Claude followed it. The blockquote came first,
with the right parent, in 2 sentences, and was the whole reply when no message followed.

The extension reads this blockquote for the banner's "where this came from". The banner
lists siblings and children by their titles, not by these summaries: a summary describes
the parent at the fork point, not the branch itself.

Parsing is lenient. The extension takes the first blockquote of the first reply that
starts with `Parent`. If there is none, the banner shows no summary; nothing else
breaks.

## What the extension parses

| Item | Where | How |
|---|---|---|
| Tree, address | Message 1, line 1 | `^Zettelbranch · ([a-z0-9-]+)/([0-9a-z]+)$` |
| Path | Message 1, line 2 | after `Path: `, split on ` › ` |
| Parent, fork point | Message 1, line 3 | after `Forked from: ` |
| Cross-references | Message 1, line 4; any message | `→ <address>` or `→ <tree>/<address>` |
| Earlier turns | Message 1 | `<zb-turn>` elements inside `<zb-transcript>` |
| Your own text | Message 1 | everything after `</zb-instructions>` |
| Summary | Message 2 | first blockquote starting with `Parent` |

If the transcript became an attachment, reading it back needs the attachment's text.
The API holds it (`extracted_content`); the page only while that message is on screen
(Milestone 0, P6). So it is read through the API.

## Size

Every branch re-sends the whole path from the root. The preview shows the size in
characters and an estimated token count, and warns above 100,000 characters, the
largest size tested (Milestone 0). The "summary only" and "last N turns" modes (FK-2) are where this goes
later.

## Open points

- Whether Claude follows "do not answer its questions again" reliably, especially when
  the last copied turn is your own unanswered question. In P8 it did not re-answer
  anything, on a two-message transcript. Test with longer real branches in Milestone 1.
- Whether the `<zb-…>` tags show up as raw text in the mobile app (they should, which is
  fine) or get stripped by the renderer *(to verify)*.
