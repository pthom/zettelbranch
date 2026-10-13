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

P0 (reading a saved share page, offline), P1 (inserting text), P3 (new chat without a
reload), P4 (renaming), P5 (the conversation list), P6 (page versus API), P7 (extraction
on a chat page) and P8 (two real branches): results in
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
| P5 (extra) | What does claude.ai's own `summary` field hold? Test chats only. | Know whether it could feed the banner. | Banner |

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
| P2 | Follow the panel's steps: "20k", Send, "Check after sending" and OK; then the same with "100k". The panel opens each new chat itself. | 2 | 2, long |
| P5 | "List conversations": shows the test chats' summaries. Read-only. | 0 | 0 |

2 new chats and 2 sent messages, plus Claude's replies.

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

- Left after the third session: 2 conversations and 2 sent messages (P2's long texts),
  all `zbtest/` chats.
- Each session of probes is logged in [milestone-0__findings](milestone-0__findings.md):
  date, what ran, conversations created.
- Pascal deletes the `zbtest/` chats after each probe session.

## Out of scope

- Firefox. One insertion check there, at the start of Milestone 1.
- Any polished code: `spike/` is deleted when Milestone 1 starts. It stays in git
  history for transparency.
