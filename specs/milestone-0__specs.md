# Milestone 0 spike

A short spike before Milestone 1, to settle the unknowns that can change the design.
Decided (ZB-2 = A). Context:
[zettelbranch__findings](done/first-review/zettelbranch__findings.md#milestone-order).

Throwaway code in `spike/`, never shipped. Results go to
[milestone-0__findings](milestone-0__findings.md), and each *(to verify)* tag in the vault
is updated.

## No automation on claude.ai

No script or automated browser touches claude.ai, not even for one page load: the
Consumer Terms forbid it, and Anthropic support did not clear automated tests
([terms__findings](terms__findings.md)). So:

- **Offline work** (Claude, in the background): the spike's code runs on pages Pascal
  saved by hand, in a headless browser that serves the saved files with every network
  request blocked.
- **Real-page probes** (Pascal): the spike extension adds a small panel with one button
  per probe. Pascal clicks, the panel shows the result and a "Copy results" button, and
  he pastes the result into `spike/out/` or into the chat.

The probes run in the extension's **content script**, as the real extension will. It
lives in an isolated world: it cannot see page-side JavaScript objects such as the
editor's internals. Testing from the page's own world would prove the wrong thing.

## Done

P0 (reading a saved share page, offline), P1 (inserting text), and the first parts of
P5 (the conversation list) and P4 (renaming): results in
[milestone-0__findings](milestone-0__findings.md),
entries in the [done log](done/README.md). The test setup is done too: the Chrome
profile "Zettelbranch test", the spike extension loaded unpacked, test chats in the
`zbtest` tree.

## Probes left

Ordered by how much the answer can change the design. All run by Pascal's clicks, in
ordinary chats of the `zbtest` tree.

| # | Question | Pass means | Affects |
|---|---|---|---|
| P2 | What happens with long text? Try 5k, 20k, 100k characters. | Know whether and when text becomes an attachment, and whether it stays in the model's context. | [forking__prompt](forking__prompt.md) layout, FK-2 |
| P3 | Can the content script open a new chat without a full page load, and keep its variables? | The prompt reaches the new chat with no storage (DA-D1). | Handoff, DA-D1 |
| P4 (rest) | Renaming works, before and after the automatic title, and the phone shows it. Left: after a reload, does the web page show the new titles too? | The sidebar and the page title show `zbtest/…`. | Addressing, renaming in Milestone 1 |
| P5 (rest) | Does the list find every `zbtest/` chat of a session, and which kinds of conversations does it mix (chats, Cowork, Code sessions)? | Every `zbtest/` chat is listed. | Registry |
| P6 | Does the page hold the text of a pasted attachment, and every message of a long chat? | It can be read from the page, or the API is needed. | Flattening in [forking__prompt](forking__prompt.md), DA-1 |
| P7 | Which DOM containers separate user and assistant turns, independent of UI language? Check with the UI in French and in English. | Stable selectors found; fixtures saved (TS-1). | Milestone 1 extraction |
| P8 | Does Claude follow the draft branch prompt? Two real branches: one from a reply, one from your own message. | Summary in the expected format; no re-answering of the transcript. | [forking__prompt](forking__prompt.md) |

P8 is the only probe that needs Claude to answer well; P2 and P4 need sent messages but
not good replies.

## Running the probes (Pascal)

Everything happens on your clicks, in the "Zettelbranch test" profile. The panel never
sends a message: you press Send yourself.

1. **Reload the extension.** Open `chrome://extensions`, find "Zettelbranch spike
   (Milestone 0 probes)" and click its ⟳ button. The first time: turn on Developer mode,
   click "Load unpacked", pick `spike/extension/`.
2. **Open claude.ai** in the test profile. A small "ZB probes" button sits at the bottom
   right. Click it to open the panel; "Hide" folds it away.
3. **Run the probes in the panel's order.** Each section says what to do; P4 and P8 as
   numbered steps. Stay in the same tab and do not reload between a probe and its check:
   the panel keeps what it inserted, and its results, only in memory. Before any reload,
   click "Copy results" and paste them to Claude.

| Probe | What you do | New chats | Messages you send |
|---|---|---|---|
| P2 | One new chat per button: 5k, 20k, 100k, "Header + transcript". Send each, then "Check after sending", and OK in the rename dialog. | up to 4 | up to 4, long |
| P3 | In a `zbtest/` chat, "Open new chat". Do not send the marker. | 0 | 0 |
| P4 | Step 4 only: reload, look at the sidebar, then "Read title" in `zbtest/1` and in `zbtest/2`. | 0 | 0 |
| P5 | At the end of the session, "List conversations" again. Read-only. | 0 | 0 |
| P6 | Open a long chat, or one with a pasted file, then "Compare page and API". Read-only, any chat. | 0 | 0 |
| P7 | "Run extractor" on a chat, once with the UI in French and once in English. Read-only, any chat. | 0 | 0 |
| P8 | Follow the panel's numbered steps, from `zbtest/2`: two branches, one "from Claude's reply", one "from my own message". | 2 | 2 |

About 6 new chats and 6 sent messages, plus Claude's replies.

4. **Naming.** Test chats get titles that start with `zbtest/`. The panel renames only
   after a dialog that shows the old and the new title: read it, then click OK. The
   probes that type or rename (P1 to P4, P8) refuse to run on any other chat. A chat you
   start from New chat counts as a test chat until you reload, so it must join the test
   tree before that: P1's and P2's checks offer it, as do P4 "Rename now" and P8 "Make
   it a tree root".
5. **Read-only probes** (P5, P6, P7) work on any chat and change nothing. They show
   counts, never message text, and only `zbtest/` titles.
6. **At the end,** click "Copy results" and paste them to Claude. If the copy fails, the
   panel shows the text; select it and copy it by hand.
7. **Clean up:** delete every `zbtest/` chat (in the sidebar, the chat's ⋯ menu, Delete).

If a bot check or an error from claude.ai appears, stop and tell Claude.

## Budget

- Left after the second session: about 6 conversations and 6 sent messages, all
  `zbtest/` chats, with short prompts, except P2's long pastes and P8.
- Each session of probes is logged in [milestone-0__findings](milestone-0__findings.md):
  date, what ran, conversations created.
- Pascal deletes the `zbtest/` chats after each probe session.

## Out of scope

- Firefox. One insertion check there, at the start of Milestone 1.
- Any polished code: `spike/` is deleted when Milestone 1 starts. It stays in git
  history for transparency.
