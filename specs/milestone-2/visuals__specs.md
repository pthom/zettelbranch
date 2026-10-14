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

## Session 2

The exact frames are written once 0.2.0 is built and its forms are known. The plan, as in 0.1.1, on the `sky` demo tree:

- Before shooting: delete `sky/1a`, `sky/1b` and `sky/1a1` (they hold the old tags), so that the new branches get the same addresses and the README's text stays true. Keep `sky/1`. Claude's sidebar collapsed, except for the sidebar picture.
- [ ] `sky/1a` from Claude's first reply ("Why are sunsets red and orange?"): `choose`, the tree form when `sky` is not a tree yet (if `sky/1` is already a root, no tree form: Claude says how to show it on another chat), `preview`, `new-chat`, `first-message`, `first-reply`, the naming form, `named`.
- [ ] The demo: `sky/1b` from Claude's last reply ("What colour is the sky on Mars?"), one screenshot at each step, as for the 0.1.1 demo.
- [ ] `sky/1a1` from `sky/1a` ("What is the green flash?"), then `tree` and `sidebar`.
