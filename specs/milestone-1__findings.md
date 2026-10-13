# Milestone 1 findings

Build notes for the offline steps of the [Milestone 1 plan](milestone-1__specs.md): steps 1, 2, 3, 5, 6 and 7, done by Claude on 2026-10-13. Steps 4 (fixtures), 8 (real-page checklist), 9 (Firefox) and 10 (release) are Pascal's.

Nothing here touched claude.ai. Every test ran in headless Chromium against a fake claude.ai, with every request answered locally or aborted. `spike/` is untouched.

## In brief

| Step | What | Commit |
|---|---|---|
| 1 | `tests/` set up: Playwright 1.64, jsdom 29, helpers; `tests/out/` ignored | `98f98e9` |
| 2 | `api.js`, `tree.js`, the audit script, the fake claude.ai | `cf2bb38` |
| 3 | `conversation.js`: the path, message text, placeholders, the page fallback | `0fc8acf` |
| 5 | `prompt.js`: the branch prompt, flattening, parsing back | `faeb448` |
| 6 | `branch.js`, `ui.js`, `content.js`: the flow and the panel | `bfd6867` |
| 7 | [AUDIT.md](../AUDIT.md) and its commands | `0c39e64` |

| Tests (`cd tests && npm test`) | Result |
|---|---|
| Audit: 19 checks in JavaScript, plus the 26 commands of AUDIT.md | 45 of 45 pass |
| Audit on a copy with one planted violation per check (run once) | 45 of 45 fail, as they should |
| Unit tests (Node, jsdom): `tree.js`, `api.js` with a stub network, `conversation.js`, `prompt.js` | 30 of 30 pass |
| End-to-end (headless Chromium, the fake claude.ai) | 19 of 19 pass, 5 runs in a row |

## What was built

| File | Lines | What |
|---|---|---|
| [manifest.json](../extension/manifest.json) | 19 | MV3, scripts on `https://claude.ai/*`, no permissions, no background; `gecko.id` `zettelbranch@pthom.github.io`, Firefox 128 or later |
| [api.js](../extension/api.js) | 140 | The only network file: the four calls, an allowed list checked before each request, renames only to `<tree>/<address> · <topic>` |
| [tree.js](../extension/tree.js) | 101 | Addresses by segments, titles, next child, next root, the proposed tree name |
| [conversation.js](../extension/conversation.js) | 296 | Messages from the API (path, text, placeholders); the page fallback, as Markdown |
| [prompt.js](../extension/prompt.js) | 146 | The prompt of [forking__prompt](forking__prompt.md); parsing it back |
| [branch.js](../extension/branch.js) | 314 | The flow: read, branch, open the new chat, name |
| [ui.js](../extension/ui.js) | 285 | The pill, the panel, the preview, the notices |
| [content.js](../extension/content.js) | 7 | Mounts the pill, except on `/share/` pages |
| **extension/** | **1,308** | |
| [AUDIT.md](../AUDIT.md) | 227 | 18 points, 26 commands, what they cannot prove, an LLM prompt |
| `tests/` | 1,589 | Audit, unit and end-to-end tests, the fake claude.ai (`tests/fake/`) |

The code uses only standard web APIs, so the same files should run in Chrome and Firefox. Not tried in Firefox yet (step 9).

## How it behaves

As decided in the plan, with these details:

- **Nothing before a click.** The pill is put on the page once, at load. No timers, no watching of the page. Tested: no API call in the 1.5 seconds after a page load.
- **Opening the panel** reads the chat through the API: 2 requests the first time (organization, conversation), 1 after.
- **Branch** reads the conversation list (2 requests for 127 fake chats) to find the next address. For a chat not in a tree, the tree-name dialog comes first, then the list, then the confirm with old and new title, then the rename and its read-back.
- **The preview** shows the exact text, its size ("1,347 characters, about 337 tokens. 4 messages copied."), and a warning above 100,000 characters.
- **Open new chat** clicks the app's New chat link, waits for the new chat (10 seconds at most), types the prompt with one `insertText` call, and compares the box with the preview. Two end-to-end tests check that the box holds exactly the preview's text.
- **Name this branch** shows in the panel for a branch whose title does not start with its address yet, and right after Open new chat. Every rename is read back, then the notice with Reload now.

## Choices beyond the brief

1. **Instead of a branch's own first message.** Branching from message 1 of a branch (your text in it) keeps the history that branch was started from, and pre-fills your text. The spike dropped that history. The instructions then say the transcript is "the history that the conversation zb/1a was branched from, before its first message".
2. **The message list** shows, for a branch's first message, only your own text (or "(copied history only)"), and for its first reply, the text after Claude's summary. Quote markers (`>`) are dropped from the list.
3. **Message text order:** the text, then file placeholders, then each pasted text under its `[pasted text: notes.txt]` line.
4. **Proposed tree name:** the title's first word that has letters or digits, accents dropped (`Écriture sous contrainte` gives `ecriture`), at most 12 characters, else `tree`.
5. **A chat with no title** that becomes a root is named `<tree>/<n> · Untitled`.
6. **Dialogs:** a wrong tree name or a name that lost its address part is asked again with an explanation, three times at most; then nothing changes.
7. **No title yet:** "Name this branch" proposes the first 8 words of Claude's reply, after the summary (or of the summary, if the reply is only that).
8. **When the API fails,** besides the messages: the title comes from the sidebar entry (or the tab's title), and the next address from the sidebar's recent chats, with a note to check it. Messages are numbered by the page's `data-index`, so a long chat's last 30 messages keep their numbers 31 to 60. Making a tree root still needs the API's rename; if that fails too, the panel says why and nothing else changes.
9. **A draft in the new chat's box:** nothing is inserted, and the panel says to empty the box and click Open new chat again (it then works from the new chat itself).
10. **A panel left open while you move to another chat:** Branch notices, reads the chat now on screen, and asks you to choose again. A "Read again" button does the same.
11. **The pill is not re-mounted.** The spike checked every second whether its panel was still there; that is a timer acting on its own, so Milestone 1 has none.
12. **Errors** say what kind of failure it was ("claude.ai changed, Zettelbranch needs an update." for a wrong shape; the status for an error answer) and a short technical detail: the call and the shape of the answer, never its content.
13. **Extra audit points:** `fetch` in one place only; no computed access on global objects (`window['fe' + 'tch']`); no clipboard; no messaging with the page's scripts; `execCommand` only for `insertText`; the only click is on the New chat link.

## Checklist on the real site

2026-10-13, by Pascal, in the Chrome test profile, Zettelbranch 0.1.0. His notes and six screenshots, summed up here.

| Step | What happened |
|---|---|
| 1. The panel in `zbtest/1 . fixture` | Every message listed, Claude's last reply selected. |
| 2. Branch from Claude's reply | `zbtest/1a`: preview, new chat, the prompt in the box, sent. Claude's reply starts with the summary, right parent. Named `zbtest/1a · Disgressing about oullipos`, the topic edited in the dialog. After "Reload now", and even after Shift+Reload, the title at the top showed the new name but the sidebar did not; the phone did at once. A few minutes later, after more chats were created, the sidebar showed it too. |
| 3. Branch instead of your first message | `zbtest/1b · fork after first message`: the new chat holds only that message, and Claude answers it afresh. That is the design (FK-3): nothing comes before message 1. The image of message 1 came as a placeholder ("everything arrived intact except the image"). |
| 4. Branch of a branch | `zbtest/1a1`: one flat transcript, the 6 turns of branch 1 (1a's only reply was its summary, which is dropped). The header quotes 1a's reply with its summary marker: `"> Parent zbtest/1 in brief: …"`. |
| 5. A new tree | A new chat, then Branch: the tree-name dialog, `zbtest`, the chat renamed `zbtest/2 · New short message`. The sidebar kept "New short message". |
| 6. One of Pascal's long chats | 42 messages listed, the last reply selected, nothing changed. Some labels start with raw code fences (`` ``` ``). |
| 7. Moving between chats | The pill stays. |

What it shows:

- The whole flow works on the real site: list, preview, new chat, fill, send, name, tree root, flattening.
- **The sidebar lags behind an API rename, even after a reload.** The title at the top and the phone are right at once; the sidebar catches up later, apparently when the page reloads its list (for example after a new chat is created). In Milestone 0 (P4) a reload was enough; here it was not. So the notice's "claude.ai shows the new name after a reload" is only half true.
- To fix: the notice's wording; the header's quote of a branch's first reply (drop the summary marker); code-fence marks in quotes and list labels.
- Pascal's question during the checklist: "we are using new chats instead of forking, i.e. re-editing a message?" Yes, by design. See the status file for the follow-up.

## For Pascal

**To check on the real page (step 8):**

- The pill stays when you move between chats. It is mounted once; if it disappears, reload the page and tell Claude.
- After Open new chat, the panel warns if the box differs from the preview ("The message box holds N characters, the preview had M"). If that warning ever shows, tell Claude.
- Chrome may warn "Unrecognized manifest key 'browser_specific_settings'" on its extensions page. That key is for Firefox; the warning is harmless.

**A wording point in the prompt, fixed by Claude after review:** pasted text is copied under a `[pasted text: notes.txt]` line (M1-D2), but the instructions said every text in square brackets marks content not carried over. They now say: 'Placeholders ending in "not copied", such as [file: photo.png, not copied], mark content that was not carried over; ask me if you need it. Text under a [pasted text: …] line is text I pasted, copied in full.' Changed in `prompt.js`, its unit test and [forking__prompt](forking__prompt.md#instructions).

**Firefox (step 9), not tested offline:**

- Whether the panel's styles apply (a constructed stylesheet from a content script; a `<style>` fallback is there if it throws).
- Whether the API answers: Firefox may make a content script's requests as the extension rather than as the page, without your login.
- Firefox asks you to allow the extension on claude.ai (MV3 site access).

**Known limits:**

- In the page fallback, a user message shown as several paragraphs comes back with blank lines between them. Only when the API fails.
- `conversation.js` is tested on hand-made API shapes and pages, and since step 4 on a real conversation (`tests/fixtures/real-*.json`): the shown branch only, text exact with code, table and formula, the thinking left out, the image as a placeholder, the prompt parsing back into the same messages. On Pascal's account the thinking block holds no text (`thinking_hidden`), only a summary of it. Not in the fixture: a pasted text attachment.
