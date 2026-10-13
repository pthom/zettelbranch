# Milestone 1 plan

The first version Pascal uses every day: branch any conversation from any message, with
a preview, into a new chat that is filled and named with its address. Draft of
2026-10-13; four choices are open in
[milestone-1__questions](milestone-1__questions.md), and the plan below assumes the
recommended answers.

Builds on Milestone 0
([what it established](claude-ai__findings.md#9-checked-on-pascals-account-milestone-0)).

## What you get

1. On any claude.ai conversation, a small "Branch" button (M1-2).
2. You pick the branch point: Claude's last reply by default, or any earlier message,
   yours or Claude's.
3. If the conversation is not in a tree yet, the extension proposes a tree name (from its
   title, for example `oulipo`) and turns it into the root, `oulipo/1 · <its title>`.
4. A preview shows the exact first message of the branch, with its size. You confirm or
   cancel.
5. A new chat opens with that message in the box. You read it, change it if you like,
   and press Send yourself.
6. Once Claude's first reply and claude.ai's automatic title are there, the branch is
   named `oulipo/1a · <automatic title>` (M1-3), and a notice says how to see the new
   name in the open tab (M1-4).

Not in Milestone 1: the banner (path, siblings, children, summaries), the whole-tree
view, cross-references, backlinks, the trigger from the apps, the "summary only" and
"last N turns" modes, projects.

## How it works

| Part | Source | How |
|---|---|---|
| The conversation | the API: `GET …/chat_conversations/<id>?tree=True…` | the path from the root to the current leaf; the page only as a fallback, since it holds part of a long chat |
| The registry | the API list | every title that parses as `<tree>/<address> · <topic>`; next free child by segments |
| The prompt | [forking__prompt](forking__prompt.md) | header, flattened transcript, instructions, your message; no summary asked for a first-message branch |
| Message text | the API's message blocks | text and code kept, pasted text too; thinking and tool calls left out (FK-D1); images, files and artifacts become placeholders (`[file: photo.png, not copied]`) |
| The new chat | the app's own New chat link | no page load; the prompt held in memory (DA-D1) |
| Filling the box | one `execCommand('insertText')` call | exact, up to at least 100,000 characters; a warning above that |
| Renaming | `PUT …/chat_conversations/<id>` | to `zbtest/…` names only while testing; then any tree |

## Code

Plain files, no build, no dependencies; what is on GitHub is what runs.

| File | What |
|---|---|
| `extension/manifest.json` | MV3, content script on `https://claude.ai/*`, no permissions; a `gecko.id` for Firefox |
| `extension/api.js` | the only network file: the four calls, listed at its top, same-origin |
| `extension/tree.js` | addresses by segments, titles, the registry |
| `extension/conversation.js` | the path, message text and placeholders, from the API; the page fallback |
| `extension/prompt.js` | the branch prompt, and parsing it back |
| `extension/branch.js` | the flow: pick, preview, open, fill, name |
| `extension/ui.js` | the button, the preview, notices; Shadow DOM, `textContent` only |
| `AUDIT.md` | what the code never does, the `grep` commands that prove it, and a prompt for an LLM audit |
| `tests/` | offline tests (Node, Playwright, jsdom): a fake claude.ai, fixtures, the audit script |

Most of it is a clean rewrite of the spike's tested pieces (`claude-api.js`, `conv.js`,
`prompt.js`, the fake claude.ai). `spike/` is deleted when this starts; it stays in git
history.

## Steps

Each step ends with offline tests passing and a commit.

1. **Start.** Pascal removes the spike extension from the Chrome test profile; Claude
   deletes `spike/` and sets up `extension/`, `tests/`, `AUDIT.md`.
2. **API and tree.** `api.js`, `tree.js`, with the audit script and the fake claude.ai.
3. **Conversation.** `conversation.js`: the path and the text of each message, with
   placeholders. Tested on fixtures (step 4) and on the fake.
4. **Fixtures (Pascal, about 10 minutes).** One `zbtest/` chat with a code block, a
   table, a formula, an edited message and a pasted file; Pascal saves its API answer
   and the conversation list with the browser's developer tools (step-by-step guide
   then). Claude keeps only the `zbtest/` entries before committing.
5. **Prompt.** `prompt.js`, from the spike, with flattening and the first-message rule.
6. **Branch flow and UI.** `branch.js`, `ui.js`: button, message picker, preview, new
   chat, fill, name, notice.
7. **Audit.** `AUDIT.md` and its greps; the same checks as the spike's, adapted.
8. **Real-page checklist (Pascal, by hand, about 15 minutes).** In the Chrome test
   profile, in `zbtest/` chats: a root, a branch from a reply, a branch from your own
   message, a branch of a branch, a long chat.
9. **Firefox.** The same checklist in a separate Firefox profile, the extension loaded
   from `about:debugging`.
10. **Release 0.1.0.** A tag on GitHub, SHA-256 of each file, install notes for Chrome and
    Firefox. Then Pascal loads it in his main browser.

## Rules carried over

- No script or automated browser on claude.ai; real-page checks by Pascal's clicks.
- Test chats are `zbtest/…` and deleted after each check session.
- No credentials, no cookies, no storage of conversation content, no `innerHTML`, no
  keyboard or input listeners; the network only in `api.js`.
- The extension acts after a click. The one thing it does afterwards on its own (M1-3):
  read the new chat until Claude's first reply is there, then rename it, for at most a
  few minutes.
