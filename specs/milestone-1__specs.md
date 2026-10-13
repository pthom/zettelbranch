# Milestone 1 plan

The first version Pascal uses every day: branch any conversation from any message, with a preview, into a new chat that is filled and named with its address. Decided on 2026-10-13 ([milestone-1__questions](done/milestone-1/milestone-1__questions.md): M1-1 = A, M1-2 = C, M1-3 = B with the name editable, M1-4 = A).

Builds on Milestone 0 ([what it established](claude-ai__findings.md#9-checked-on-pascals-account-milestone-0)).

## What you get

1. On any claude.ai conversation, a small "Zettelbranch" button at the bottom right (M1-2). A "Branch from here" button on each message comes later.
2. You pick the branch point: Claude's last reply by default, or any earlier message, yours or Claude's.
3. If the conversation is not in a tree yet, the extension proposes a tree name (from its title, for example `oulipo`) and turns it into the root, `oulipo/1 · <its title>`.
4. A preview shows the exact first message of the branch, with its size. You confirm or cancel.
5. A new chat opens with that message in the box. You read it, change it if you like, and press Send yourself.
6. Once Claude has replied, you open the panel and click "Name this branch" (M1-3). A browser dialog proposes `oulipo/1a · <claude.ai's automatic title>`; you can change the topic, the address part stays. After the rename, a notice says the open tab shows the new name after a reload, with a "Reload now" button (M1-4). Nothing happens on its own.

Not in Milestone 1: a button on each message, the banner (path, siblings, children, summaries), the whole-tree view, cross-references, backlinks, the trigger from the apps, the "summary only" and "last N turns" modes, projects.

## How it works

| Part | Source | How |
|---|---|---|
| The conversation | the API: `GET …/chat_conversations/<id>?tree=True…` | the path from the root to the current leaf; the page only as a fallback, since it holds part of a long chat |
| The registry | the API list | every title that parses as `<tree>/<address> · <topic>`; next free child by segments |
| The prompt | [forking__prompt](forking__prompt.md) | header, flattened transcript, instructions, your message; no summary asked for a first-message branch |
| Message text | the API's message blocks | text and code kept, pasted text too; thinking and tool calls left out (FK-D1); images, files and artifacts become placeholders (`[file: photo.png, not copied]`) |
| The new chat | the app's own New chat link | no page load; the prompt held in memory (DA-D1) |
| Filling the box | one `execCommand('insertText')` call | exact, up to at least 100,000 characters; a warning above that |
| Naming | a browser dialog, then `PUT …/chat_conversations/<id>` | pre-filled `<tree>/<address> · <automatic title>`; the topic can change, the address part must stay; then the reload notice |
| Tree root | a browser dialog for the tree name, then the same `PUT` | pre-filled from the title (`oulipo`); the parent becomes `oulipo/1 · <its title>` |

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

Most of it is a clean rewrite of the spike's tested pieces (`claude-api.js`, `conv.js`, `prompt.js`, the fake claude.ai). `spike/` stays, untouched, until the 0.1.0 release, so its probe panel is at hand if claude.ai changes meanwhile (M1-D5).

## Steps

Each step ends with offline tests passing and a commit. Steps 1 to 3 and 5 to 7 are done (2026-10-13): audit 45/45, unit tests 30/30, end-to-end tests 19/19; build notes in [milestone-1__findings](milestone-1__findings.md). Step 4 (fixtures) is done too. Next: the checklist (step 8, part C below).

1. **Start.** *Done, 98f98e9.* Claude sets up `extension/`, `tests/`, `AUDIT.md`. Before loading the new extension, Pascal turns the spike extension off (not removed) in the Chrome test profile, so the two panels never run together.
2. **API and tree.** `api.js`, `tree.js`, with the audit script and the fake claude.ai. *Done, cf2bb38.*
3. **Conversation.** *Done, 0fc8acf.* `conversation.js`: the path and the text of each message, with placeholders. Tested on fixtures (step 4) and on the fake.
4. **Fixtures (Pascal, about 10 minutes).** One `zbtest/` chat with a code block, a table, a formula, an edited message and a pasted file; Pascal saves its API answer and the conversation list with the browser's developer tools (step-by-step guide then). Claude keeps only the `zbtest/` entries before committing. *Done: saved by Pascal on 2026-10-13, ids replaced by `tests/scrub-fixture.mjs`, 1 of 64 list entries kept; 5 unit tests on it.*
5. **Prompt.** `prompt.js`, from the spike, with flattening and the first-message rule. *Done, faeb448.*
6. **Branch flow and UI.** `branch.js`, `ui.js`: button, message picker, preview, new chat, fill; "Name this branch" with its dialog; the reload notice. *Done, bfd6867.*
6b. **claude.ai's own fork from the last reply (NF-2 = A).** When the branch point is the conversation's last reply, "Open new chat" asks claude.ai to copy the conversation into a new chat (the action probed in P9), names the copy `<tree>/<address> · <topic>` at once, and opens it (a page load). There the panel opens by itself with "Start the branch": it fills the box with the header, the summary request and room for your question, without a transcript, since the messages are already there. Anywhere else, or if claude.ai's fork fails, today's copy. Details: `specs/native-fork__findings.md`.
7. **Audit.** `AUDIT.md` and its greps; the same checks as the spike's, adapted. *Done, 0c39e64.*
8. **Real-page checklist (Pascal, by hand, about 15 minutes).** In the Chrome test profile, in `zbtest/` chats: a root, a branch from a reply, a branch from your own message, a branch of a branch, a long chat.
9. **Firefox.** The same checklist in a separate Firefox profile, the extension loaded from `about:debugging`.
10. **Release 0.1.0.** A tag on GitHub, SHA-256 of each file, install notes for Chrome and Firefox. Then Pascal loads it in his main browser, and `spike/` is deleted (git history keeps it).

## Pascal's session (steps 4 and 8)

About 25 minutes, in the Chrome profile "Zettelbranch test". Every chat is a `zbtest/` chat, deleted at the end.

**A. Load Zettelbranch.**

1. `chrome://extensions`: turn the spike off (its switch; do not remove it).
2. "Load unpacked", pick the repo's `extension/` folder. Chrome may warn about `browser_specific_settings`: that key is for Firefox, ignore it.
3. Reload the claude.ai tab. A "Zettelbranch" pill sits at the bottom right.

**B. The fixture chat (step 4).**

1. New chat. Send: "Reply with a short Python function in a code block, a 2 by 2 Markdown table, and the formula for the area of a circle in LaTeX."
2. Edit your message (the pencil under it), change one word, and send again: this makes a native branch.
3. Send a second message with an image attached (any screenshot), and paste a long text into the box (a few pages copied from anywhere) so that claude.ai shows it as a "Pasted" attachment. Send.
4. Rename the chat by hand: `zbtest/1 · fixture` (sidebar, ⋯, Rename).
5. Save two answers with the developer tools (Cmd+Opt+I, Network tab), then reload the page (Cmd+R):
   - filter `tree=True`; right-click the request, Copy, Copy response; in VS Code, paste into a new file `tests/out/fixture-conversation.json`;
   - filter `chat_conversations_v2`, the same, into `tests/out/fixture-list.json`.

   `tests/out/` is never committed. The list holds all your titles: Claude keeps only the `zbtest/` entries before committing a fixture.

**C. The checklist (step 8).** Write down anything odd; screenshots help. *Done on 2026-10-13: results in `specs/milestone-1__findings.md`, section "Checklist on the real site".*

1. In `zbtest/1 · fixture`, open the pill. The list shows every message, Claude's last reply selected.
2. Click Branch. Read the preview, then "Open new chat". The box holds the text; press Send. After the reply, open the panel, "Name this branch", OK. A notice appears; "Reload now": the sidebar shows `zbtest/1a · …`.
3. Back in `zbtest/1`, pick one of your own messages, Branch: your message is at the end of the box. Send, name it: `zbtest/1b · …`; this time change the topic in the dialog.
4. In `zbtest/1a`, Branch again: `zbtest/1a1`. In the preview, the transcript is one flat list (no transcript inside a transcript).
5. A new chat, one short message, then Branch: a dialog asks the tree name; type `zbtest`. It becomes `zbtest/2 · …`, and its branch `zbtest/2a`.
6. Open one of your own long chats and the pill: the list shows all its messages. Do not branch there (Cancel at the preview).
7. Move between chats with the sidebar: the pill stays.
8. Tell Claude what you saw. Then delete every `zbtest/` chat.

## Rules carried over

- No script or automated browser on claude.ai; real-page checks by Pascal's clicks.
- Test chats are `zbtest/…` and deleted after each check session.
- No credentials, no cookies, no storage of conversation content, no `innerHTML`, no keyboard or input listeners; the network only in `api.js`.
- The extension acts only on a click; nothing happens on its own (M1-3 = B).
