# Milestone 0 spike

A short spike before Milestone 1, to settle the unknowns that can change the design.
Decided (ZB-2 = A). Context:
[zettelbranch__findings](zettelbranch__findings.md#milestone-order).

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

## P0 · Read a shared conversation

First step, Pascal's idea, fully offline. Pascal saves the share page of the original
design conversation and the JSON it loads; the spike extension extracts the conversation
from the saved page, and the JSON is the answer key. It tests extraction (roles, code
blocks, Markdown) and builds the offline harness the later steps reuse.

Output: the conversation as Markdown in `zettelbranch__origin-conversation.md` (Pascal
decides whether it is committed), and a report in
[milestone-0__findings](milestone-0__findings.md), which also says how to save the two
files.

A share page has no message box and no sidebar, so P0 says nothing about insertion,
renaming or the conversation list.

## What Pascal does first (P1 onwards)

1. **Create the test project** on claude.ai, for example "Zettelbranch tests". Everything
   the probes create stays inside it.
2. **Create a separate browser profile,** for example a Chrome profile named
   "Zettelbranch test", and sign in to claude.ai there, any way you like.
3. **Load the spike extension** in that profile: `chrome://extensions`, turn on
   Developer mode, "Load unpacked", pick `spike/extension/`.
4. **DA-1:** the API probes run only if DA-1 = A.

## Probes

Ordered by how much the answer can change the design. All run by Pascal's clicks, in the
test project.

| # | Question | Pass means | Affects |
|---|---|---|---|
| P1 | Can text be inserted into the message box so the app takes it? Try `execCommand('insertText')` first, a synthetic `paste` only as a fallback (a paste may trigger the attachment conversion). | Send button enables; the sent message holds the full text. | Forking core |
| P2 | What happens with long text? Try 5k, 20k, 100k characters. | Know whether and when text becomes an attachment, and whether it stays in the model's context. | [forking__prompt](forking__prompt.md) layout, FK-2 |
| P3 | Can the content script open a new chat inside the project without a full page load, and keep its variables? | The prompt reaches the new chat with no storage (DA-D1). | Handoff, DA-D1 |
| P4 | Can a title be renamed, and when? Rename before and after claude.ai's automatic title, then reload and check from the mobile app. | The address survives automatic naming. | Addressing, AD-D6 |
| P5 | Can the full conversation list be read? Sidebar, the full list page, and the API if DA-1 = A. | Every conversation of the test project is found. | Registry, DA-1 |
| P6 | Does the page hold the text of a pasted attachment, and every message of a long chat? | It can be read from the page, or the API is needed. | Flattening in [forking__prompt](forking__prompt.md), DA-1 |
| P7 | Which DOM containers separate user and assistant turns, independent of UI language? Check with the UI in French and in English. | Stable selectors found; fixtures saved (TS-1). | Milestone 1 extraction |
| P8 | Does Claude follow the draft branch prompt? Two real branches: one from a reply, one from your own message. | Summary in the expected format; no re-answering of the transcript. | [forking__prompt](forking__prompt.md) |

P8 is the only probe that needs Claude to answer well; P1, P2 and P4 need sent messages
but not good replies.

## Budget

- About 6 conversations and 15 sent messages, all in the test project, with short
  prompts, except P2's long pastes and P8.
- Each session of probes is logged in [milestone-0__findings](milestone-0__findings.md):
  date, what ran, conversations created.
- The spike's conversations are deleted at the end, inside the test project only.

## Out of scope

- Firefox. One insertion check there, at the start of Milestone 1.
- Any polished code: `spike/` is deleted when Milestone 1 starts. It stays in git
  history for transparency.
