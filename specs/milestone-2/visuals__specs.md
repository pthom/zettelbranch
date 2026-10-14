# Milestone 2: the pictures

Pascal asked on 2026-10-14 to be reminded, during Milestone 2, to take the pictures that update the visuals. They are his, taken by hand on claude.ai (no script may touch it); Claude crops them, lays them out and renders the demo offline. Plan step 7 ([milestone-2__specs](milestone-2__specs.md#steps)); the sessions are in [checks-on-claude-ai__specs](checks-on-claude-ai__specs.md). How the 0.1.1 pictures were made: [readme__specs](../done/readme/readme__specs.md).

**Reminder:** each session on claude.ai ends with the pictures listed for it below. The status file keeps the reminder until every row is ticked.

## Why they change

The pictures of 0.1.1 show what 0.2.0 changes: the copied conversation in `<zb-turn>` tags (now quoted labels), the browser dialogs headed "claude.ai" (now forms inside the panel), the panel staying open after naming (now it closes), Markdown marks in the list of messages. A newcomer judges the extension by them (hints, section 4).

## What is there, and what happens to it

| Picture | Shows | Used in | In 0.2.0 |
|---|---|---|---|
| `demo.gif` (14 screenshots) | one branch, start to finish | README, manual | retaken whole; step 3 (the new chat, typing) shorter |
| `start.png` | a chat with the Zettelbranch button | manual | kept |
| `choose.png` | the panel, the branch point chosen | README, manual | retaken (the list without Markdown marks) |
| `tree-name.png` | the browser dialog naming a tree | manual | replaced: the panel's tree form |
| `preview.png` | the preview of the first message | manual | retaken (quoted labels) |
| `new-chat.png` | the filled box and the two steps | README, manual | retaken (quoted labels, no technical line) |
| `first-reply.png` | Claude's first reply | README, manual | retaken (with the first message above it, as claude.ai now shows it) |
| `name.png` | the browser dialog naming a branch | manual | replaced: the panel's naming form |
| `named.png` | after naming | manual | retaken (the panel closes; the button keeps the notice) |
| `tree.png` | the tree in the panel | README, manual | kept, or retaken with the new branches |
| `sidebar.png` | the sidebar with the `sky/` chats | README, manual | kept, or retaken with the new branches |
| new: `install-firefox.png` | Firefox's "Add Zettelbranch" prompt, listing access to claude.ai | README (install), if it helps | taken in session 1 |
| new: `first-message.png` | the branch's first message on screen: header, labels, your question | README | session 2 |
| Chrome Web Store: up to 5 screenshots (1280 x 800) and a small tile (440 x 280) | | the store listing (step 8) | Claude composes them from the pictures of session 2 |

## Session 1

- [x] **F1:** the "Add Zettelbranch" prompt in a fresh Firefox profile, which lists access to claude.ai (2026-10-14, `tests/out/install/`).
- [x] **F2:** not needed: the button showed at once.

## Session 2: the shoot (2026-10-14)

With 0.2.0 on the `sky` demo tree, in four parts. Each picture is a screenshot of the Chrome window alone (Cmd+Ctrl+Shift+4, then Space, then click the window: it goes to the clipboard), pasted in the chat with its name. Claude crops them.

**Before shooting**

- Chrome test profile, `chrome://extensions`: ⟳ on Zettelbranch (0.2.0, with the hint changed after session 2), the spike off.
- Close Chrome's "Continue where you left off" bar.
- Keep the Chrome window at the same size and place for every picture, and leave the panel where it opens (bottom right).
- claude.ai's sidebar collapsed (the icon at the top left), except for `sidebar`.
- Delete `sky/1a`, `sky/1b` and `sky/1a1` (they hold the old tags), so that the new branches get the same addresses and the README's text stays true. Keep `sky/1`.

**Part A: stills, `sky/1a` from Claude's first reply**

- [ ] A1 `choose`: `sky/1` with the panel open, message 2 clicked.
- [ ] A2 `preview`: after Branch.
- [ ] A3 `new-chat`: after Open new chat, `Why are sunsets red and orange?` typed under `MY QUESTION`, the panel's steps visible. Then Send.
- [ ] A4 `first-message`: your message on screen (header, section names, labels), as claude.ai shows it folded.
- [ ] A5 `first-reply`: Claude's whole first reply: the summary, the answer, "Branch title: …".
- [ ] A6 `name`: after Name this branch, the form.
- [ ] A7 `named`: after Rename: the panel closed, the new title at the top; the mouse over the Zettelbranch button, its tooltip showing.

**Part B: the demo, `sky/1b` from Claude's last reply**

One screenshot at each step, nothing else moving on screen: B1 `sky/1` with the panel open (Claude's last reply chosen by default); B2 the preview; B3 the new chat, filled; B4 `What colour is the sky on Mars?` typed; B5 Claude's reply, complete; B6 the naming form; B7 after Rename (panel closed, new title); B8 the panel opened again, showing the tree; B9 after clicking `1a` in the tree (that chat, the panel showing where you are); B10 after clicking `1` (back at the root).

**Part C: `tree` and `sidebar`**

- [ ] In `sky/1a`, branch from Claude's last reply: `What is the green flash?`, send, name it (`sky/1a1`).
- [ ] C1 `tree`: the panel on `sky/1a1`, "Tree sky: 4 chats".
- [ ] C2 `sidebar`: the sidebar open, its top showing the four `sky/` chats.

**Part D: `tree-name`**

- [ ] New chat, `Why do leaves change colour in autumn?`, wait for the reply, Zettelbranch, Branch. D1 `tree-name`: the tree form. Then Cancel, and delete this chat.
