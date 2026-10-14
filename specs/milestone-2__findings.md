# Milestone 2: hints from the first feedback

Feedback gathered by Pascal on 2026-10-14 in a discussion on claude.ai. It includes a live test of 0.1.4: the discussion itself was branched (`zettelbranch/1` → `zettelbranch/1a`). Stored as written, as hints for planning Milestone 2; nothing here is decided unless it says so. Items marked "proposal" still need a decision or a render test. Claude Code's notes, added when storing it, are marked **Note**.

## 1. UI fixes found in the live test (priority order)

1. Replace the native `prompt()` dialogs (tree naming, rename) with an input inside the panel. The browser shows them headed "claude.ai" with a globe icon, so they look like claude.ai itself is asking. That undercuts the trust story and clashes with the panel's styling.
2. Rename field: the label says "the address part stays", but the whole string, address included, is pre-selected, so typing replaces the address too. Show the address as a fixed prefix and make only the topic editable.
3. After the branch is named, collapse the panel to the small Zettelbranch button, or narrow it. It currently hides the right third of Claude's reply.
4. Message previews in "Choose where the branch starts":
   - Strip markdown (message 2 currently shows `**Parent zettelbranch/1 in brief:** We had iter…`).
   - For a branch's first Claude reply, skip the "Parent … in brief" blockquote and preview the start of the answer, since that blockquote is the same opening in every branch.
   - Message 1 already does the right thing: it shows only the question under MY MESSAGE.
   - **Note:** Claude wrote the summary as `> **Parent zettelbranch/1 in brief:**`, in bold. `stripSummary()` and `parseSummary()` in `prompt.js` expect `> Parent`, so the bold version is not recognised: the list shows it, and a branch made from `zettelbranch/1a` would copy the summary instead of dropping it. A small fix (accept bold or italic marks, as the "Branch title:" line already does). **Fixed in 0.1.4** (2026-10-14): the list now shows the start of the answer, and the copy drops the summary.
5. Move the diagnostic line ("Inserted line by line, in 0.8 s: one insertion had lost the line breaks") behind a debug setting. Show users a plain warning only when something actually went wrong.
6. Once Claude has replied, check off or collapse step 1 ("Type your question…") so "Name this branch" is the only obvious next action.
7. Tree-naming dialog: keep the default derived from the chat title (nice touch); move the allowed characters (a-z, 0-9 and -) to a hint under the field.

## 2. Format of a branch's first message

Done: quoted inline-code labels and uppercase section headers (seen working in the live test; Claude's parent summary was accurate and stopped at the right message).

Reference: what the claude.ai user bubble renders

- Rendered: blockquotes, triple-backtick fences (also inside blockquotes), inline code, single line breaks.
- Shown literally: `**bold**`, `*italic*`, `####` headings, list markers, GitHub admonitions (`[!NOTE]`).
- Broken: four-backtick fences.

To verify if not already done:

- The header block (Zettelbranch · address, Path, Forked from) is quoted.
- There are no ▸/◂ arrows in labels. If a glyph is wanted, use ► and ◄, not ▶ and ◀ (iOS may turn those into emoji).
- **Note:** both done in 0.1.4: the header is quoted, and there are no arrows ([transcript-layout__questions](transcript-layout__questions.md)).

## 3. Robustness of pasted history (still open)

- Claude replies often contain fences of four or more backticks, which break the bubble; an unclosed fence swallows every label after it. Option: rewrite them as `~~~` fences. This is untested in the bubble, so run a render test first.
  - **Note:** 0.1.4 already closes a fence left open at the end of its message (three backticks or more, or tildes), so it cannot swallow the labels after it. A closed four-backtick fence still renders badly.
- Markdown tables show as literal pipes. Decide whether to leave them or wrap them in a fence so they align.
- A history line starting with `` > `Me · `` would look like a turn boundary. Keep the address in labels so they stay hard to fake if the first message is ever parsed back (e.g. for the planned banner).
  - **Note:** the first message is already parsed back, when branching from a branch (flattening) and to name it. In 0.1.4 a message line that is exactly a label line gets a backslash in front, and the labels keep the address. A line that only starts like a label is left as is: the parser ignores it, but a reader may take it for a boundary.
- Next render test: in the current layout, a Claude message containing a four-backtick fence, a `~~~` fence, and a small table.

## 4. README

- Replace the opening paragraph ("Long conversations wander…") with this, then keep the `sky/1` example and the rest unchanged:

  > When we think, we open parentheses: a side question, an alternative, a detail worth chasing. In a long conversation, every parenthesis lands in the same thread, and soon nobody remembers where it was opened, or what the original question was. Zettelbranch opens the parenthesis in a new chat instead: branch from any message, and the main thread stays where you left it. Each branch gets a short address, like the cards of Niklas Luhmann's Zettelkasten:

- demo.gif: keep frame 3 (the raw instructions), but give it less screen time than the frames showing results.
- If the UI fixes in section 1 change what the GIF and screenshots show (dialogs, panel), regenerate them before announcing.

## 5. Feature idea: "gather branches" (closing the parenthesis)

- Observation: in a claude.ai chat, Claude can read past chats. Tested in oulipo/1f: "summarize all the Oulipo sessions" worked.
- Idea: a panel button that fills the message box with the links of the current node's children (the extension knows their exact URLs) and asks Claude to read and summarize each. This is more reliable than letting Claude search by topic.
- For the manual: this requires the "Search and reference chats" setting, and past-chat access is scoped (chats inside a Project only see that Project's chats, and the reverse).
- **Note:** this fits the existing rules: the extension only fills the box, and you press Send.

## 6. Communication

Decided:

- Channels: r/ClaudeAI, the Obsidian community (forum or r/ObsidianMD; r/Zettelkasten is close), and a Show HN.
- No essay: the README and GIF are the material.

Message guidelines:

- Lead with the problem (the parenthesis framing), with Zettelkasten, Luhmann and Perec second.
- Main visuals: the tree panel with "you are here", and the sidebar screenshot with branches named by address.
- Make trust a headline: no permissions, one file for network calls, a ready-made prompt for an LLM audit.
- Keep the honesty about fragility ("early version, expect it to break") to invite testers rather than critics.

To consider before posting (proposal): listings on the Chrome Web Store and Mozilla Add-ons. Chrome developer mode loses most casual readers.

Sequencing: fix section 1 items 1–3 and refresh the visuals before announcing, since first impressions come from the GIF and screenshots.

Task: draft one post per channel.

- r/ClaudeAI: the problem plus the demo.
- Obsidian: the Zettelkasten addresses, and the specs being an Obsidian vault.
- HN: the design choice (the tree lives in chat titles, so it survives without the extension) and the audit approach.
