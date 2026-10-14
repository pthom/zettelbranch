# The posts (drafts)

Plan step 10. Drafted by Claude on 2026-10-14 for Pascal's review, from the hints ([milestone-2__findings](milestone-2__findings.md#6-communication), section 6): lead with the problem (the parenthesis), Luhmann second, no Perec (M2-4 = A), trust as a headline, honest about fragility. Pascal publishes them, a few days apart, once Zettelbranch is on the Chrome Web Store. Each text is in a block, ready to copy; `<CWS link>` is replaced by the store's address once it is published.

## Order and timing (proposal)

1. **r/ClaudeAI** first: the most direct audience, and the first issues come from there.
2. **r/Zettelkasten, or the Obsidian forum** ("Share & showcase"), a few days later.
3. **Show HN** last, once the first reports are fixed: HN readers try things at once, and judge the first impression. A weekday morning, US time, is the usual advice.
4. **X**, optional, the same day as r/ClaudeAI.

Before each post: read the channel's rules for project posts (flair, self-promotion, whether to say how Claude was used in building it).

## r/ClaudeAI

**Title:**

```text
I made a free browser extension that branches claude.ai chats into a tree (sky/1, sky/1a, sky/1a1…) so side questions don't derail the main thread
```

**Media:** the demo video (upload `zettelbranch-demo.mp4`, Reddit plays it), or the tree and sidebar pictures.

**Text:**

```markdown
When I think with Claude, I open parentheses: a side question, an alternative, a detail worth chasing. In one long chat they all land in the same thread, and soon I've lost where I was, or what the original question was.

**Zettelbranch** opens the parenthesis in a new chat instead:

1. Pick any message in the conversation, click Branch.
2. A new chat opens with the conversation so far in the message box. Type your question and press Send yourself (it never sends anything for you).
3. Claude sums up where you were, answers, and suggests a name.
4. The chat is named with its address, like `sky/1a · Why sunsets are red and orange`. A branch of it becomes `sky/1a1`, a second branch of the root `sky/1b`.

The tree lives in the chat titles, so it shows in claude.ai's sidebar, on your phone and in the apps, with or without the extension. The addresses come from Niklas Luhmann's Zettelkasten, the card box where every card had an address like 1a1.

**Since it reads your conversations, it's built to be audited:**

- No permissions. It runs only on claude.ai, in your own page.
- Every network call is in one file, four kinds, all to claude.ai. It never sends a message and never deletes anything. It stores nothing.
- About 2,300 lines, no dependencies, no build step. AUDIT.md has a prompt you can paste into your own LLM to check all this.

**Early version:** it relies on claude.ai's undocumented web interface, so it will break when claude.ai changes. Issues welcome.

Firefox (signed by Mozilla, one click) and Chrome (<CWS link>). Free and open source (MIT): https://github.com/pthom/zettelbranch

Not made by or affiliated with Anthropic.
```

Optional last line, if the subreddit's rules ask how Claude was used (true, and readers like to know): `Built with Claude Code; the design notes are an Obsidian vault in the repo.`

## r/Zettelkasten, or the Obsidian forum

For readers who know Luhmann's addresses. Zettelbranch is not an Obsidian plugin: say so at once, and offer what is there for them (the addressing, and the specs written as an Obsidian vault).

**Title:**

```text
Luhmann-style addresses for AI conversations: branching claude.ai chats into 1, 1a, 1a1
```

**Text:**

```markdown
Luhmann gave each card an address that says where it continues a thought: 1, 1a, 1a1, 1b. A card could branch off any other card, and the address kept the line of thought readable.

Conversations with an AI have the same shape. You open a side question, an alternative, a detail, and in a single chat they all pile up in one thread. So I made **Zettelbranch**, a small browser extension for claude.ai (not an Obsidian plugin): from any message, it opens a new chat that holds the conversation so far, and names it with its address:

    sky/1    · Why the sky is blue
    sky/1a   · Why sunsets are red and orange
    sky/1a1  · The green flash at sunset
    sky/1b   · Colour of the Martian sky

The addresses live in the chat titles, so the tree survives without the extension and shows on every device. In each branch, Claude's first reply sums up where the parent stood, so each branch reads on its own.

What's missing for a real Zettelkasten, and planned: links between distant branches (a `→ 2b` in a message) and backlinks, and a way to "close the parenthesis" by gathering what the branches found.

For Obsidian users: the project's specs are an Obsidian vault in the repo, written with Claude Code, if you're curious how that works in practice.

Free and open source (MIT), Firefox and Chrome: https://github.com/pthom/zettelbranch . Early version: it relies on claude.ai's undocumented web interface and will break now and then. Not affiliated with Anthropic.
```

## Show HN

HN takes plain text (blank lines between paragraphs, no Markdown links), and a title of 80 characters at most.

**Title** (66 characters):

```text
Show HN: Zettelbranch – branch claude.ai conversations into a tree
```

**URL:** `https://github.com/pthom/zettelbranch`

**Text:**

```text
Zettelbranch is a browser extension (Firefox, Chrome) for claude.ai. From any message of a conversation, it opens a new chat that holds the conversation so far, and names it with a tree address: sky/1a is a branch of sky/1, sky/1a1 a branch of sky/1a. The addresses come from Luhmann's Zettelkasten.

Why: in a long chat, every side question lands in the same thread. claude.ai can branch by editing a message, but those branches hide inside one chat behind < 2/2 > arrows, have no names, and don't show in the sidebar.

A few design choices:

- The tree lives in the chat titles ("sky/1a1 · The green flash at sunset"), not in a database. The extension stores nothing; the tree survives without it and shows on every device, in the apps too. Claude can even find a branch by its address with its own past-chat search.

- A branch is an ordinary new chat. Its first message holds the conversation so far, laid out so that claude.ai renders it readably, and the extension only fills the message box: you press Send yourself. Claude's first reply starts with a summary of where the parent stood, which shows at once whether it got the context.

- It reads your conversations, so it is built to be audited: no permissions, a content script on claude.ai only, every network call in one file (four kinds, all to claude.ai, checked against an allow-list), about 2,300 lines, no dependencies, no build step. AUDIT.md lists what the code never does with the grep commands that prove it, and ends with a prompt to give your own LLM.

- Tests run offline against a fake claude.ai, including a real Tiptap editor in Chromium and Firefox. Nothing automated ever touches the real site: claude.ai's terms forbid automated access, so the real-page checks are done by hand.

It relies on claude.ai's undocumented web interface, so it will break when claude.ai changes; that is the main limit. Not affiliated with Anthropic.
```

## X (optional)

```text
Zettelbranch: branch any claude.ai conversation into a new chat that knows everything said so far. Your chats become a tree (sky/1, sky/1a, sky/1a1), right in claude.ai's sidebar.

Now on the Chrome Web Store, and signed for Firefox. Free, open source, built to be audited.

https://github.com/pthom/zettelbranch
```

## Answers ready for the comments

Short, honest answers to the questions that will come. Adapt freely.

**"Is this allowed by Anthropic's terms?"** (HN will ask)

```text
Fair question. Zettelbranch runs in your own page, with your own session, and makes the same kinds of requests the web app makes (four kinds: find your organization, list your chats, read one, rename one), only when you click. It never sends a message for you and never touches your login or cookies. claude.ai's Consumer Terms forbid accessing the site "through automated or non-human means"; they say nothing about browser extensions. I asked Anthropic support before building it. The reply (probably their AI assistant, so guidance, not a permission) said that reading and pre-filling on a click "doesn't seem to involve credential collection or automated sending", and that reading your own chat list through the web app's requests "seems like personal automation". For the same reason, nothing automated ever touches the real site during development: the tests run against a fake claude.ai, and the real-page checks are done by hand.
```

If Pascal wants to add a commitment (his call): `If Anthropic asks me to change or stop it, I will.`

**"Why not claude.ai's own branching (editing a message)?"**

```text
It branches inside one chat: the versions hide behind < 2/2 > arrows, have no names, and don't show in the sidebar. Zettelbranch makes each branch a separate, named chat, so the tree is visible everywhere and each branch can grow its own branches.
```

**"Does it send my conversations anywhere?"**

```text
Only back to claude.ai, into the new chat you open, and only when you click. No server of mine, no analytics, nothing stored. PRIVACY.md says it in plain words, and AUDIT.md shows how to check it in the code (or ask your own LLM with the prompt at its end).
```

**"Does it work in the Claude apps / on my phone?"**

```text
Branching needs the extension, so a desktop browser (Firefox or Chrome). But the tree is in the chat titles, so you see it and can continue any branch everywhere: the apps, your phone.
```

**"Does the new chat get the whole conversation?"**

```text
Yes, the full text up to the message you branch from, each message under a small label. Images, files and artifacts become placeholders. Past about 100,000 characters the preview warns you, since it may fill Claude's context.
```

**"Why the name?"**

```text
Zettelkasten (German, "box of index cards") + branch. Luhmann's card box gave every card an address like 1a1, which says which card it continues.
```
