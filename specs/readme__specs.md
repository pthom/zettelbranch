# README and user manual: pictures

Plan of 2026-10-13: a user manual (`docs/MANUAL.md`, drafted) and a nicer README, with still screenshots and a short video turned into a GIF. Taken by Pascal by hand on claude.ai (no script may touch it), with Zettelbranch 0.1.1, on a demo tree in English made for this: `sky`.

## The demo tree

| Address | From | Question |
|---|---|---|
| `sky/1 · Why the sky is blue` | the root (already made: two exchanges, a short answer "for my children") | |
| `sky/1a` | Claude's **first** reply (message 2, which mentions sunsets) | "Why are sunsets red and orange?" |
| `sky/1b` | Claude's last reply (message 4) | "What colour is the sky on Mars?" (the video) |
| `sky/1a1` | inside `sky/1a`, Claude's last reply | "What is the green flash?" |

Ask for short answers, so that each picture holds a whole reply.

## Before shooting

- Chrome test profile, Zettelbranch 0.1.1 loaded (⟳ in `chrome://extensions`), the spike off.
- Collapse claude.ai's sidebar (the icon at the top left), except for the last picture: it hides your other chats and your name at the bottom left.
- The new-chat page greets you by first name ("Evening, Pascal"): leave it out of the frame, or keep it if you do not mind.
- Save every file into the repo's `tests/out/` folder (Cmd+Shift+5, Options, "Other location…"), never the Desktop: Claude reading the Desktop triggers macOS permission prompts.

## The still pictures (Cmd+Shift+4, a selected area)

Pascal pastes them in the chat (full screen is fine); Claude crops them. Received and cropped into `docs/images/`: `start.png`, `choose.png`, `tree-name.png`, `preview.png`, `new-chat.png`, `first-reply.png`, `name.png`, `named.png`, `sidebar.png`. Still to come: the video (`sky/1b`) and `tree.png` (after `sky/1a1`).

1. `choose.png`: `sky/1` with the panel open, **message 2 clicked** (selected), the list and the Branch button visible.
2. Branch: type `sky` as the tree name, OK, OK. Then `preview.png`: the preview, with "Open new chat".
3. Open new chat, type "Why are sunsets red and orange?" at the end of the box. `new-chat.png`: the end of the box with your question, and the panel's two steps. Then Send.
4. `first-reply.png`: Claude's whole first reply: the "Parent sky/1 in brief" summary, the answer, the "Branch title" line.
5. Name this branch, OK.

## The video (Cmd+Shift+5, "Record Selected Portion", 30 to 60 s)

In `sky/1`: open the panel, keep Claude's last reply, Branch, the preview, Open new chat, type "What colour is the sky on Mars?", Send, wait for the reply, Name this branch, OK, the notice and the tree. Do not hurry; Claude will cut the waits and speed it up. Save as `tests/out/demo.mov`.

## The last picture

6. Make `sky/1a1` from `sky/1a` ("What is the green flash?"), name it. Then, with the panel open on `sky/1a1`: `tree.png`, the panel with "Tree sky: 4 chats". If you like, also `sidebar.png`: the sidebar open, cropped to the four `sky/` chats at its top.

## Claude's part

Crop and compress the pictures into `docs/images/`, make `docs/images/demo.gif` from the video (cut the waits, speed up, under about 5 MB), put them in the manual and the README, and show Pascal the result before committing.
