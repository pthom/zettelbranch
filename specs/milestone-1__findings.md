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

Line counts after step 6c, the tree in the panel (`88ebd80`).

| File | Lines | What |
|---|---|---|
| [manifest.json](../extension/manifest.json) | 19 | MV3, scripts on `https://claude.ai/*`, no permissions, no background; `gecko.id` `zettelbranch@pthom.github.io`, Firefox 128 or later |
| [api.js](../extension/api.js) | 140 | The only network file: the four calls, an allowed list checked before each request, renames only to tree titles |
| [tree.js](../extension/tree.js) | 135 | Addresses by segments, titles (` · `, or ` . ` and ` - ` typed by hand), next child, next root, the proposed tree name, a tree's chats in address order |
| [conversation.js](../extension/conversation.js) | 296 | Messages from the API (path, text, placeholders); the page fallback, as Markdown |
| [prompt.js](../extension/prompt.js) | 233 | The prompt of [forking__prompt](forking__prompt.md); parsing it back; the topic proposed for a branch's name |
| [branch.js](../extension/branch.js) | 358 | The flow: read (with the tree), branch, open the new chat, name |
| [ui.js](../extension/ui.js) | 362 | The pill, the panel, the tree, the preview, the steps after Open new chat, the notices |
| [content.js](../extension/content.js) | 7 | Mounts the pill, except on `/share/` pages |
| **extension/** | **1,550** | |
| [AUDIT.md](../AUDIT.md) | 179 | 18 points, 26 commands, what they cannot prove, an LLM prompt |
| `tests/` | 2,038 | Audit, unit and end-to-end tests, the fake claude.ai (`tests/fake/`), real fixtures |

The code uses only standard web APIs, so the same files should run in Chrome and Firefox. Not tried in Firefox yet (step 9).

## How it behaves

As decided in the plan, with these details:

- **Nothing before a click.** The pill is put on the page once, at load. No timers, no watching of the page. Tested: no API call in the 1.5 seconds after a page load.
- **Opening the panel** reads the chat through the API: 2 requests the first time (organization, conversation), 1 after. On a chat of a tree, also the conversation list ([step 6c](#the-tree-in-the-panel-step-6c)).
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
- Fixed the same day: the notice now says the phone shows the new name at once, the title at the top after a reload, the sidebar a few minutes later; the header quotes a branch's first reply without the summary marker; quotes and list labels drop code-fence marks.
- Pascal's question during the checklist: "we are using new chats instead of forking, i.e. re-editing a message?" Yes, by design. See the status file for the follow-up.

## First real use

2026-10-13, by Pascal, on one of his own chats: "Poème en forme de chat" became `oulipo/1 · Poème en forme de chat`, and its branch `oulipo/1a`, about fish and birds.

- **The branch got the parent's name.** claude.ai names a new chat from its first message, which holds the whole parent conversation, so its automatic title was the parent's ("a new story with the old name"). Pascal renamed it by hand: `oulipo/1a · Poisson et oiseau`.
- **No guidance after "Open new chat".** Nothing said to type the question at the end of the box, nor, after Claude's replies, to name the branch with Zettelbranch.
- **Pascal's suggestion:** a name proposed from what the branch is about (here, fish and birds). Possible: the first words of the first question asked in the branch.
- **No navigation between branches.** Intended for Milestone 1; the banner (parent, siblings, children) comes later. Pascal's question: is that intended?

Built offline the same day (`df2a4ff`), not yet checked on the real site: after "Open new chat" the panel shows two steps (type your question at the end of the box, then "Name this branch" once Claude has replied), the hidden panel's pill reads "Zettelbranch: name this branch" until the branch is named, and after a reload the panel opens with "Name this branch" at the top. When claude.ai's title is empty or repeats the parent's, the proposed name comes from the first question asked in the branch, the dialog says where the proposal comes from, and a named branch can be renamed; offline tests: audit 45/45, unit 44/44, end-to-end 21/21.

## The tree in the panel (step 6c)

Built offline by Claude on 2026-10-13, commit `88ebd80`, after Pascal found no way to move from one branch to another. Nothing touched claude.ai.

### What it does

- **When.** The panel opens (on its click) on a chat of a tree: its title is a tree title (` . ` and ` - ` typed by hand count), or it is a branch not named yet, whose header gives the tree and address. It then also reads the conversation list, the call Branch already makes. A chat not in a tree shows no tree and reads no list.
- **What.** A "Tree zbtest: 7 chats" section above the message list: every chat of that tree, one line each, "address · topic", ordered by address segments (numbers as numbers, letters by their index: `1`, `1a`, `1a1`, `1a2`, `1a10`, `1b`, `1z`, `1aa`, `2`, `10`) and indented by depth.
- **Moving.** Every other line is a plain link to `/chat/<uuid>`: a click loads that chat in the same tab, and the panel starts closed there. The current chat is marked "you are here" and is not a link.
- **Flags.** An address used by two or more chats shows "used twice" (or "used 3 times") on each of its lines, all still listed.
- **A branch not named yet.** The tree shows the named chats only, plus the current chat at its header's address, "(not named yet)". Other unnamed branches are not shown: placing them would mean reading their messages.
- **Many chats.** The section scrolls inside the panel: at most 210 pixels high, or 24% of the window's height if that is less, with the current line scrolled into view.
- **Errors.** If the list cannot be read, one line says so ("The tree could not be read (error 500)."; the technical detail in its tooltip), and the rest of the panel works.
- **Read again** reads the chat and the list again. **Name this branch** and **Rename this branch** update the current line from memory: the tree is rebuilt from the list already read, with no new request.
- **Privacy.** Only titles of that tree are kept for the section; never another tree's titles or a plain chat's title.

### Numbers

| | Before | After |
|---|---|---|
| `extension/` | 1,443 lines | 1,550 lines: tree.js 102 → 135, branch.js 328 → 358, ui.js 318 → 362 |
| Audit | 45 of 45 | 45 of 45 pass, unchanged |
| Unit tests | 44 | 47 of 47 pass. New: ordering by segments (input reversed, and sorted as strings: `1b1a` < `1b9` < `1b10`, `1z` < `1aa`), depth, typed separators, other trees and plain titles left out, duplicates, the current chat from its own title, a branch not named yet at its address |
| End-to-end tests | 21 | 25 of 25 pass, 2 runs in a row. New: the tree on a root (order, indent, links, the current line, a duplicate flagged, no other tree's titles, the requests of Read again), on a branch with a link followed, the list failing then Read again bringing it back with a chat made meanwhile, a tree of 25 chats scrolling. Updated: a branch not named yet in the tree; the line after naming and after a rename, with no list read; no list read on a chat not in a tree. 221 requests, none escaped |

Opening the panel on a chat of a tree costs the list's pages on top of the conversation: one request per 100 chats (2 in the fake, which has about 155). Branch still reads the list again, so the next address is never taken from an older list.

### Choices beyond the brief

1. **Where the current chat sits.** For a branch, its header's address, even if claude.ai's title happens to be another tree title (claude.ai could name a branch after its parent's full title, `zbtest/1 · …`). Its line's topic comes from its own title, not from the list, so the line is right after a rename even if the list lags.
2. **A branch not named yet whose address is already taken** by a named chat: both lines show "used twice".
3. **Links** are built only from ids shaped like claude.ai's (uuids); anything else would be listed without a link. The link's topic is underlined on hover.
4. **The fake** got a second `zbtest/1a1` (the duplicate) and a tree `zbmany` of 25 chats, created out of order and older than the zbtest chats, so the sidebar's recent chats and every earlier test stay the same.
5. **AUDIT.md**: besides its line count, its line on opening the panel now says that a chat of a tree also reads the conversation list.

### To check on the real site (Pascal)

In the Chrome test profile, after ⟳ on Zettelbranch in `chrome://extensions` and a reload of the tab:

1. Open the panel in a `zbtest/` chat with branches: the Tree section lists them in order, indented, the current one marked.
2. Click another line: that chat opens in the same tab, as a full page load. Does the sidebar keep its place?
3. In a branch just opened and not named yet: the tree shows it at its address, "(not named yet)". Name it: the line changes without a reload.
4. If you have a tree with many chats: the section scrolls, and the panel still fits the window.

## Second real use

2026-10-13, by Pascal, on `oulipo/1a`: a branch `oulipo/1a1`, his question "tentons notre chance avec un enfant qui joue au ballon", named by hand `oulipo/1a1 · Jeux d'enfants` (Claude answered with a calligram of a child kicking a ball).

- **Opening the panel takes about a second.** Pascal suggests a nice refresh button, a circular-arrow icon with a tooltip.
- **The tree's links work**, but the panel does not follow when he moves to another chat with the sidebar.
- **The two steps after "Open new chat" showed.**
- **The proposed name came from claude.ai's title**, "Poèmes visuels d'un chat et de deux amoureux": claude.ai names a branch from its first message, which holds the parent's transcript, so its title describes the parent, even when it differs from the parent's title. "Not very important" (Pascal).
- **After naming, the panel is confusing:** it offers to branch again with nothing saying this chat is the branch he just made; and the notice should simply say to reload to see the new name in the sidebar. After a reload, everything was right.

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

## claude.ai's own fork (step 6b), removed

*Removed on 2026-10-13 (NF-3): on Pascal's check, claude.ai refused the fork from a chat's last reply. It only continues an earlier version in a new chat (`specs/done/native-fork/native-fork__findings.md`). The code went back to its state before step 6b, keeping one general fix: the header's quote is escaped. The notes below are history; the code is in commit `ba045c4`.*

Built offline by Claude on 2026-10-13, commit `ba045c4`, as decided in NF-2 = A. Nothing touched claude.ai: every test ran against the fake claude.ai.

### What it does

- **From the last message, Claude's reply** (the panel's default), the preview says "claude.ai will copy this conversation into a new chat, named `zbtest/1d · Root topic`. Your first message there:", then shows that message.
- **Open new chat** asks claude.ai for the copy (the `POST` of P9, with only `continueBranchAsNewChat` in its body). It reads the new chat once a second until it has as many messages as this one (15 seconds at most), checks their roles, renames it `<tree>/<address> · <parent's topic>`, reads the name back, and loads the copy's page.
- **On that page** the panel opens by itself, with "Start the branch" and the line about the default model. The click puts the first message in the box: the header and the instructions, no transcript ([forking__prompt](forking__prompt.md#when-claudeai-copied-the-conversation)). You add your text and press Send.
- **Anywhere else**, or **when claude.ai's copy fails**, the quoted transcript, as before. A failure (an error answer, an unexpected answer, a copy not complete after 15 seconds, a copy that differs, a rename that fails) goes straight on to the quoted transcript, with a note such as "claude.ai's own copy failed: HTTP 500 internal; this branch uses a quoted transcript instead."
- **Name this branch** works on any branch chat and proposes the current name. A branch claude.ai copied is named from the start, so the dialog is for changing its topic.
- **Copies from such chats** are flattened into one list, each turn with its branch and place ([the rules](forking__prompt.md#flattening-and-attribution)).

### Numbers

| | Before | After |
|---|---|---|
| `extension/` | 1,316 lines | 1,695 lines: api.js 140 → 218, prompt.js 152 → 255, branch.js 314 → 443, ui.js 286 → 348, content.js 7 → 14 |
| Audit (`npm run audit`) | 45 checks | 51 of 51 pass: 21 in JavaScript, 30 AUDIT.md commands |
| Audit on a copy with one planted violation per check (run once) | | 51 of 51 fail, as they should. A second copy with three subtle plants inside `api.js` (a second page load, `created` set elsewhere, a second POST) fails exactly the 5 new checks. |
| Unit tests | 36 | 47 of 47 pass. New: the fork's request, the start message, which branch a chat is, flattening with golden texts. |
| End-to-end tests | 19 | 29 of 29 pass, 2 runs in a row, about 42 seconds. New: the fork, the page load, the panel opening by itself, Start the branch, naming, flattening from such branches, three failures. 256 requests, none escaped. |

In the fake, the copy shows half its messages for 1.5 seconds, then all. From the click on Open new chat to the panel on the copy's page: about 2.6 seconds.

### Choices beyond the brief

1. **The `#zettelbranch` marker.** The panel opens by itself only on a page whose address ends with `#zettelbranch`, which only Zettelbranch's own page load after the copy has. Without it, the extension would have to read every chat opened by a page load to see whether it is a branch to start: an API call without a click, on every such page. The part after `#` never leaves the browser. On any other load of such a chat, clicking the pill shows "Start the branch" too. If claude.ai drops the marker, the panel does not open by itself, and the pill still works.
2. **The fallback goes all the way.** When claude.ai's copy fails, the quoted transcript goes straight into a new chat's box, without a second preview: you read it there before Send. The note says why, and the size warning shows above 100,000 characters.
3. **A note about a leftover copy.** When claude.ai may have made a copy that Zettelbranch could not finish (too slow, different, not renamed, an unexpected answer), a second note says: if a second chat named like the parent appears, delete it. Zettelbranch never deletes.
4. **What "complete" means.** The copy is accepted when it has exactly as many messages as the source, with the same roles. Texts are not compared, so a small change in how claude.ai stores a message does not cause a fallback.
5. **Error codes.** `api.js` keeps a Connect error code such as `failed_precondition` when it is a plain word, never the error's message. The note shows it: "HTTP 400 failed_precondition".
6. **Every request's body is checked**, not only the POST's: the GETs carry none, the PUT exactly `{"name": …}` with a tree title. `forkConversation` refuses anything but ids before any request; `openCreatedChat` refuses any chat but the one the last fork created.
7. **The header's quote is escaped** (`&lt;zb-`) in both kinds of first message. Before, a copy's quote was not, and a quoted reply holding `</zb-instructions>` would have broken parsing the message back.
8. **Name this branch with the name unchanged:** OK renames nothing and says so.
9. **The copy's topic:** the parent's topic, or `Untitled` if its title has none.
10. **Attribution in a chat with no header message** (a root, or a branch claude.ai copied that is not started yet): its own address. A started branch attributes the copied messages to its parent.
11. **A branch claude.ai copied, not started yet,** still lists its messages and allows Branch.
12. **Tests:** the earlier tests of the quoted transcript that used the last reply now pick an earlier one; the fake's `zbtest/3` and `zbtest/4` got two more messages each for that. The fake refuses a fork through any message but the last of the shown path, as claude.ai does, and has switches for a 500 and for a copy that never fills.
13. **The spec:** its lines on where the header goes and on what the network does now mention claude.ai's copy ([zettelbranch__specs](zettelbranch__specs.md)).

### To check on the real site (Pascal)

In the Chrome test profile, in `zbtest/` chats, after ⟳ on Zettelbranch in `chrome://extensions` and a reload of the tab:

1. Branch from Claude's last reply, Open new chat. Within a few seconds the copy's page loads and the panel opens by itself. If it does not: does the address end with `#zettelbranch`? Then click the pill.
2. The sidebar after that load: one new chat with the branch's name, and no second chat with the parent's title.
3. Start the branch: the box holds the text, with no warning. Add a line, Send. Claude's reply starts with "Parent … in brief:".
4. The new chat's model is the default one; the model menu works.
5. In that branch, after a reply, Branch again from the last reply (a copy of a copy), then from an earlier message: the preview's transcript is one flat list.
6. A long chat (dozens of messages, or images): is the copy complete within 15 seconds? If the note says it was not, tell Claude, and look for a leftover chat with the parent's title.
7. Name this branch in a branch claude.ai copied: the dialog proposes its name; change the topic.
