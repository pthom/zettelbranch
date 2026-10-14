# Branch prompt

The text the extension puts in the new chat's message box when you branch. First written on 2026-10-13; the layout of 0.1.4 on 2026-10-14. Built on the decisions FK-1 = A (Claude writes the summary), FK-2 = A (full transcript), FK-3 = A (branching from your message replaces it) and AD-1 = A (`<tree>/<address>` titles). Context: [forking__findings](done/first-review/forking__findings.md), [forking__questions](done/first-review/forking__questions.md).

## Layout

The first message of a branch has four parts, in this order:

1. **Header.** Three or four quoted lines, readable without the extension, including in the mobile app.
2. **Transcript.** The conversation from the root of the tree to the fork point, each message under a label line.
3. **Instructions** for Claude.
4. **Your message.** Empty, with the cursor there. When you branch from your own message (FK-3 = A), your old message is pre-filled here for you to change.

Long material goes first and the question last: Anthropic's long-context advice, and it puts the cursor where you type.

Long text stays inline: inserted with one `execCommand` call, 100,000 characters stayed plain text and reached the model (Milestone 0, P2). Only a paste turns long text into a "Pasted" attachment, and the extension never pastes. So the whole prompt goes in at once.

**How it looks** (TL-1, TL-2, 2026-10-14, [transcript-layout__questions](milestone-2/transcript-layout__questions.md)). In your messages, claude.ai shows only code blocks, inline code and quotes; bold, headings, lists and tags show as typed. So every line Zettelbranch adds is a quote (a bar on its left), and the section names and message labels are inline code inside it (a small box): the messages themselves read as normal text between them. Before 0.1.4, the parts were tags (`<zb-transcript>`, `<zb-turn>`, `<zb-instructions>`), shown as raw text; such branches are still read.

```
> Zettelbranch · zb/1b1
> Path: zb/1 › 1b › 1b1
> Forked from: zb/1b · Backlinks with the API, after message 4 (Claude): "Backlinks need every…"

> `OUR CONVERSATION SO FAR`

> `Me · zb/1, message 1`

Can the extension see conversations older than the sidebar shows?

> `Claude · zb/1, message 2`

Not without reading the full list page or the API. …

> `INSTRUCTIONS FOR CLAUDE`

The transcript above is our conversation so far, …

> `MY MESSAGE`

```

Each part is separated from the next by a blank line, and so is each label from its message.

## Header

```
> Zettelbranch · zb/1b1
> Path: zb/1 › 1b › 1b1
> Forked from: zb/1b · Backlinks with the API, after message 4 (Claude): "Backlinks need every…"
> See also: → zb/2a, → zb/1a3
```

- **Line 1:** product name, tree, address. The extension finds branch conversations by this line. Name per ZB-1, `zb/` per AD-1.
- **Line 2:** path from the root.
- **Line 3:** the parent's full title, the fork point, and the first 60 characters of the fork message, on one line, cut at a word. When you branch from your own message: `instead of message 5 (me): "What about…"`.
- **Line 4,** only if there are links: cross-references known at fork time (XR-1 = A). Not built yet.

Messages are numbered along the path the page shows, both roles counted, starting at 1. The quote is there because the numbers shift if the parent's native tree is switched to another path later.

The header has no topic. The topic in the title is proposed when you name the branch: claude.ai's automatic title, or the first words of your first question in the branch when that title repeats the parent's; you can change it.

## Transcript

```
> `OUR CONVERSATION SO FAR`

> `Me · zb/1, message 1`

Can the extension see conversations older than the sidebar shows?

> `Claude · zb/1, message 2`

Not without reading the full list page or the API. …

…

> `Me · zb/1b, message 1`

How would backlinks work with option A?

> `Claude · zb/1b, message 2`

Backlinks need every conversation of the tree. …
```

- Each label says who wrote the message (`Me` or `Claude`), which conversation and which message it comes from, so later references like `zb/1b#4` stay possible.
- Message text is Markdown, copied as is (FK-D3). Content that was not copied gets a placeholder (FK-D1).
- With nothing before the fork point (a branch from a chat's first message), the transcript's section is left out: the instructions come right after the header.
- **Flattening.** A branch's first message contains its own transcript. When you branch from a branch, the extension does not nest that transcript inside the new one. It parses the first message back into the earlier turns plus your own text, and lists them in one flat sequence from the root. Claude's summary at the top of the branch's first reply is dropped: with the full transcript it says nothing new. So is the "Branch title:" line at its bottom ([below](#claudes-first-reply)). A branch made before 0.1.4 (tags) is flattened the same way. If parsing fails, the first message is copied as is, nested; worse, but still correct.
- **Escaping.** A message line that looks exactly like a label line (likely only in conversations about this very prompt) gets one backslash in front (`` \> `MY MESSAGE` ``), one more if it had some already. The extension removes one when parsing back.
- **A code block left open** in a message (a reply cut short) is closed at the end of that message, so that it does not take in the labels and the instructions that follow.

## Instructions

`zb/1b` and `4` are filled in by the extension. Each paragraph is one line in the message.

```
> `INSTRUCTIONS FOR CLAUDE`

The transcript above is our conversation so far, copied from the conversation zb/1b up to message 4. Zettelbranch added the quoted lines (the header, the section names in capitals, and the label before each message, which says who wrote it, in which conversation and its number) for display: they are not part of the conversation, so do not reproduce them in your replies. The messages labelled Claude are your own earlier replies. Treat it as shared history: do not comment on it, quote it back, or answer its questions again. Placeholders ending in "not copied", such as [file: photo.png, not copied], mark content that was not carried over; ask me if you need it. Text under a [pasted text: …] line is text I pasted, copied in full.

Start your first reply with a single blockquote paragraph that begins with "Parent zb/1b in brief:" and says in 2 to 4 sentences where the conversation stood at that point, in the language of the conversation. Then answer my message below. If there is no message below, reply with the summary only.

If there is a message below, end your first reply with a separate last line: "Branch title:" followed by 3 to 6 words naming what this branch is about, from my message below, in the language of the conversation.
```

The first paragraph tells Claude that the quoted lines are Zettelbranch's, so that it reads through them and does not imitate them (Pascal, 2026-10-14). The second exists only if FK-1 = A. With FK-1 = B the summary is in the header instead; with C it is gone. The third asks for the branch's name (step 6e).

When nothing comes before the fork point (a branch from a chat's first message), there is no transcript and nothing to summarise. Your message is always there, pre-filled, so the branch title is asked without a condition. The instructions then say only:

```
> `INSTRUCTIONS FOR CLAUDE`

This chat is a new branch of the conversation zb/1b, started from its first message, so there is no earlier history. Do not comment on the quoted lines above and below; Zettelbranch added them for my own records. Answer my message below.

End your first reply with a separate last line: "Branch title:" followed by 3 to 6 words naming what this branch is about, from my message below, in the language of the conversation.
```

The texts are those of `extension/prompt.js` (`instructions()`), word for word, and the unit tests hold them.

Seen in Milestone 0 (P8): asked for a summary anyway, Claude summarised an empty transcript ("copied up to message 0").

The instructions are in English whatever the UI language, so the extension parses one format. Claude replies in the language of your message.

## Claude's first reply

```
> Parent zb/1b in brief: Backlinks need the text of every conversation in the tree, so
> they depend on DA-1. With the API allowed, the extension can read each branch's first
> message and build the links. The open point was cost and freshness.

<the answer to your message>

Branch title: Backlinks for option A
```

Seen in Milestone 0 (P8, 2026-10-13): Claude followed it. The blockquote came first, with the right parent, in 2 sentences, and was the whole reply when no message followed.

The extension reads this blockquote for the banner's "where this came from". The banner lists siblings and children by their titles, not by these summaries: a summary describes the parent at the fork point, not the branch itself.

Parsing is lenient. The extension takes the first blockquote of the first reply that starts with `Parent`, bold or italic marks aside (Claude wrote `> **Parent zettelbranch/1 in brief:**` on 2026-10-14). If there is none, the banner shows no summary; nothing else breaks.


The last line, here `Branch title: Backlinks for option A` (on Pascal's `oulipo/1a1`, it would read `Branch title: Un enfant au ballon`), is Claude's suggestion for the branch's name (Pascal, 2026-10-13): claude.ai's automatic title describes the parent, since the first message holds its transcript, and the first words of a question rarely make a good name. It is asked only when the first message holds a question; when the question comes in a later message, the proposal falls back to that question's first words.

Parsing is lenient here too. The extension takes the last non-empty line of the first reply after the header message; if it reads `Branch title:` and some words, those words are the suggestion. Bold or italic marks, quotes and a final period are dropped (`**Branch title:** "Un enfant au ballon".` gives `Un enfant au ballon`). Anywhere else in the reply, the line is not taken. "Name this branch" proposes, in order: the branch's current name if it has one, Claude's branch title, the first words of your first question in the branch, claude.ai's title, the first words of Claude's reply.

## What the extension parses

The header message is message 1 in a copy. In a branch claude.ai copied, it is the first message of yours that starts with the branch's header, after the copied messages ([below](#when-claudeai-copied-the-conversation)).

| Item | Where | How |
|---|---|---|
| Tree, address | The header message, line 1 (and the title, in a branch claude.ai copied) | `^(> )?Zettelbranch · ([a-z0-9-]+)/([0-9a-z]+)$` |
| Path | The header message, line 2 | after `Path: `, split on ` › ` |
| Parent, fork point | The header message, line 3 | after `Forked from: ` |
| Cross-references | The header message, line 4; any message | `→ <address>` or `→ <tree>/<address>` |
| Earlier turns | The header message of a copy | the label lines between `OUR CONVERSATION SO FAR` and `INSTRUCTIONS FOR CLAUDE`, each message being the text up to the next label (before 0.1.4: `<zb-turn>` elements inside `<zb-transcript>`) |
| Your own text | The header message | everything after the `MY MESSAGE` label (before 0.1.4: after `</zb-instructions>`) |
| Summary | The reply after the header message | first blockquote starting with `Parent` |
| Branch title | The same reply, its last non-empty line | `Branch title: (.+)`, bold or italic marks, quotes and a final period dropped: "Name this branch" proposes it first; dropped from the reply when it is copied into another branch |

If the transcript became an attachment, reading it back needs the attachment's text. The API holds it (`extracted_content`); the page only while that message is on screen (Milestone 0, P6). So it is read through the API.

## When claude.ai copies the conversation

Not used. A start message for branches that claude.ai copies itself was designed and built (step 6b), then removed: claude.ai only continues an earlier version in a new chat, never a conversation from where it stands (NF-3, `specs/done/native-fork/native-fork__findings.md`). The design is in commit `ba045c4`.

## Size

Every branch re-sends the whole path from the root. The preview shows the size in characters and an estimated token count, and warns above 100,000 characters, the largest size tested (Milestone 0). The "summary only" and "last N turns" modes (FK-2) are where this goes later.

## Open points

- Whether Claude follows "do not answer its questions again" reliably, especially when the last copied turn is your own unanswered question. In P8 it did not re-answer anything, on a two-message transcript. Test with longer real branches in Milestone 1.
- How the quoted lines look in the mobile app *(to verify)*. On the web, checked with a pasted sample (2026-10-14).
