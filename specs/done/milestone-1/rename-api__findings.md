# Rename API findings

Why the sidebar keeps the old name after Zettelbranch renames a chat, and the probe of a fix. Started 2026-10-13.

## The problem

Zettelbranch renames through claude.ai's older API (`PUT …/chat_conversations/<id>`). The server keeps the new name at once: the phone shows it. But the open tab's sidebar keeps the old one: in Chrome until a reload or a few minutes; in Firefox even after a reload, a Shift+Reload and a new tab (Pascal, 2026-10-13). Most likely claude.ai's newer interface keeps a copy of the conversation list in the browser, updated by its own actions or when it fetches the list again; a rename through the older API is not one of its own actions.

## The idea

Rename through claude.ai's newer API, the call its own interface makes: `POST /claudeai-rpc/anthropic.bard.api.v1alpha.ConversationService/PerformAction` with `{ header: { conversationId: <the chat>, mutationId: {…} }, renameConversation: { title } }` (from the Claude QoL authors' notes, `specs/done/native-fork/native-fork__findings.md`). The same kind of change as today, sent the way claude.ai's app sends it. Undocumented and marked "alpha", like the fork.

## The probe (P10)

In the spike's panel, version 0.0.9 (spike commit in the done log once run): two buttons on a `zbtest/` chat, "Rename through the newer API" and, for comparison, "Rename through the older API". Each adds " (new API)" or " (old API)" to the title after a confirm dialog, then reads it back. Only to `zbtest/` titles. Offline: 73 of 73 checks pass, audit 12 of 12.

### Running it (Pascal)

1. In the browser where the sidebar lags most (Firefox), or in Chrome: turn Zettelbranch off and the spike on. In Firefox: `about:debugging`, "Load Temporary Add-on…", pick `spike/extension/manifest.json` (and remove the Zettelbranch temporary add-on, or reload it later). In Chrome: `chrome://extensions`, switch Zettelbranch off and the spike on, ⟳ on the spike. Reload the claude.ai tab; the spike's panel says 0.0.9.
2. Open a `zbtest/` chat, for example `zbtest2/1 · Greeting`.
3. "ZB probes", section P10: "Rename through the newer API", OK. Without reloading, watch the sidebar and the title at the top for about 10 seconds.
4. "Rename through the older API", OK, and watch again.
5. "Copy results", paste them to Claude, with what the sidebar and the top title showed after each.
6. Back to Zettelbranch: the spike off, Zettelbranch on.

## Results

2026-10-13, by Pascal, in Chrome, spike 0.0.9, on `zbtest/1 · Initial greeting`. (A first try on `zbtest2/1 · Greeting` was refused, as designed: `zbtest2/` is not the test tree.)

| | Newer API (`renameConversation`) | Older API (`PUT`) |
|---|---|---|
| Answer | `{}` in 0.5 s | the conversation, in 0.5 s |
| Read back from claude.ai | the new title | the new title |
| Open tab, without reloading: sidebar | old title | old title |
| Open tab, without reloading: title at the top | old title | old title |

So the newer API does not help: **the open tab only shows the changes its own interface makes.** It keeps its own copy of the titles; a rename from outside, through either API, reaches the server (the phone shows it) but not that copy, until claude.ai reloads its list (in Chrome after a reload or a few minutes; in Firefox sometimes not even after a reload).

What is left, to make the open tab show a new name at once:

- **claude.ai's own rename menu** (the title at the top of a chat, then Rename), driven by Zettelbranch: the tab would update as when Pascal renames by hand. But the extension would drive claude.ai's interface (open the menu, fill the field, confirm), which breaks when claude.ai changes it, and must work in French and English. A probe first.
- **Keep today's rename** (the older API, documented by use) and the reload notice, and live with the lag.

## RN-1 · Decision

Decided in chat on 2026-10-13 (Pascal: "A, release 0.1.0. Then note B as a possible improvement for later."): keep today's rename through the older API and the reload notice; the lag is a known limit of 0.1.0. Renaming through claude.ai's own menu stays a possible improvement for later, to try after some real use.

## P11: claude.ai's own rename menu (option B, probed after 0.1.0)

Pascal asked for it on 2026-10-13, after the release. Spike 0.0.10 adds P11: on his click, the panel renames a `zbtest/` chat as by hand: it opens the menu on the title at the top (pointer events first, as menus built with Radix open on a press, then a click), picks the item whose test id or label says Rename (or Renommer), types the name into the field that appears, and confirms with a Save button in a dialog, or else with Enter in that field. It reports what it found at each step, then whether the server, the sidebar and the title at the top show the new name, 1.5 s later.

Safety: it presses Enter only in a plain text field found after picking Rename, never in the message box (refused if the field is inside it or editable text). Offline, against the fake claude.ai (now with a title menu): 78 of 78 checks pass, audit 12 of 12; claude.ai's real menu is unknown until the run.

### Running it (Pascal)

1. Firefox, with the spike as a temporary add-on: `about:debugging`, "Actualiser" (Reload) on the spike; then reload the claude.ai tab. The panel says 0.0.10.
2. Open a `zbtest/` chat, for example `zbtest/1 · Initial greeting (old API)`.
3. "ZB probes", P11: "Rename through claude.ai's menu", OK. Watch the top of the chat and the sidebar.
4. "Copy results", paste them to Claude, with what you saw.

### Results

2026-10-13, by Pascal, Firefox, spike 0.0.10, on `zbtest/1 · Initial greeting (old API)`: **it works.** The server, the sidebar and the title at the top showed `zbtest/1 · Initial greeting (menu)` at once, without a reload (1.9 s in all).

| Step | What claude.ai has |
|---|---|
| Title button | `[data-testid="chat-title-split"] button[aria-haspopup="menu"]` (no test id of its own; 2 buttons in that block) |
| Menu | opens on pointer events (a Radix menu), `role="menu"` |
| Items | `star-chat-trigger`, `rename-chat-trigger`, `share-chat-trigger`, `delete-chat-trigger` (labels in the UI's language: Épingler, Renommer, Partager la conversation, Supprimer) |
| Rename field | `input[data-testid="name-chat"]`, focused when it appears |
| Typing | one `execCommand('insertText')` call: the value is the new title |
| Confirm | Enter in that field |

So option B works: renaming through claude.ai's own menu updates the open tab at once. "Delete" sits next to "Rename" in that menu: the extension must click only the exact `rename-chat-trigger`.

Pascal, the same day: "yes!" to making it the way Zettelbranch renames (version 0.1.1), with today's request as the fallback.

## Built into Zettelbranch 0.1.1

Built offline by Claude on 2026-10-13, commit `3052a1e`; `extension/manifest.json` says 0.1.1. Nothing touched claude.ai: every test ran against the fake claude.ai. Not tagged or released: that waits for Pascal's check in Chrome and Firefox.

### What it does

- **Every rename** Zettelbranch makes (the tree root during Branch, Name this branch, Rename this branch) goes through claude.ai's own title menu, on the chat on screen. The new file `extension/menu.js` does what P11 did, cleanly: it presses the title button (`[data-testid="chat-title-split"] button[aria-haspopup="menu"]`, pointer and mouse events with the main button), waits for the menu (`[role="menu"]`, 1 s), presses and clicks the item whose test id is exactly `rename-chat-trigger`, waits for the field `input[data-testid="name-chat"]` (2 s), checks that it has the focus, selects its text, types the name with one `insertText`, checks the field's value, presses Enter in that field, and waits for the field to close (1 s).
- **Read back.** `branch.js` then reads the name back with the usual `GET` (after 0.3 s, then every 0.6 s, for about 3 s).
- **The fallback.** If the page does not show that chat, if any step of the menu fails, or if claude.ai did not keep the name, Zettelbranch closes what it opened (Escape in the field, Escape on the menu) and renames through the API (`PUT`), as 0.1.0 did, then reads the name back.
- **The notices.** After a menu rename: only "You just created the branch …", "Renamed to …" or "This chat is now the tree root …": the open tab already shows the name, so no reload is offered. After a fallback: 0.1.0's notice, "Reload the page to see the new name." with Reload now (not for a root, as before), and a small line saying why: "Renamed through claude.ai's API: its title menu did not work (no menu opened)."
- **Safety.** `menu.js` is the only file that sends events to claude.ai's page, besides the click on the New chat link in `branch.js`. It sends them through three functions only (`pressOn`, `keyOn`, `clickOn`), to four targets only, each by its exact selector (`TARGETS`), in six calls only: press the title button; press and click the Rename item; Enter and Escape in the field; Escape on the menu. It never looks for an element by its label or its place, and never names the message box, Send or Delete. AUDIT.md (checks 9, 15, 16, 17 and a new 19) and `tests/audit.mjs` allow exactly this.

### Numbers

| | 0.1.0 | 0.1.1 |
|---|---|---|
| `extension/` | 1,739 lines, 7 scripts | 1,864 lines, 8 scripts: menu.js 95 (new), branch.js 410 → 435, ui.js 453 → 458 |
| Audit | 49 of 49 | 63 of 63 pass: 20 in JavaScript, 43 AUDIT.md commands. On copies with one planted violation each (run once): an Enter to the message box through a new target in `menu.js`, an Enter to it from `branch.js`, a click on `delete-chat-trigger`, `TARGETS` pointing at Delete, a click on the item labelled "Rename": each fails 3 to 5 checks, in JavaScript and in AUDIT.md's commands |
| Unit tests | 52 | 55 of 55 pass. New, on a small page imitating the menu in jsdom, with every event recorded: the whole rename sends exactly the 10 expected events; each of five failing steps closes what it opened and never reaches Delete or the message box; no title button, nothing sent; the four targets |
| End-to-end tests | 30 | 31 of 31 pass, 2 runs in a row. The fake claude.ai has the title menu with claude.ai's test ids (opens on pointerdown, four items, the field `name-chat`, Enter saves through the app's own call, then the app updates its own title and sidebar), switches for each failure, and a log of every synthetic event the page received. Seven renames through the menu (root, Name this branch, Rename this branch): no `PUT`, the fake's title and sidebar show the name at once, no reload offered, nothing left open, the message box untouched. Six fallbacks (no title button, no menu, no Rename item, no field, a field that refuses typing, a save that does not stick) and a root through the fallback: the `PUT`, the reload notice with its reason, nothing left open or typed; Reload now then shows the name in the sidebar. Every synthetic event went to the title button, the menu, the exact Rename item, the field, or the New chat link; none to Delete, Share, Star, the message box or Send |

### Choices beyond the brief

1. **A separate file, `menu.js`**, so that every event sent to the page is in one short file, and the audit can prove it by file.
2. **A check of the focus** before typing: if the field does not take the focus, nothing is typed (`insertText` types where the focus is, and the message box must never get it).
3. **The field must close on Enter** within 1 s; if it stays open, Escape, then the fallback.
4. **The reason line** in the fallback's notice, so a check on the real site shows which step failed.
5. **Escape on the menu only if it is still shown**, and on the field only if it is still there.
6. **No click on the title button**, only the press (pointer and mouse events): a click could toggle the menu shut again.
7. **The fake's events log** relies on the page seeing synthetic events as such (`isTrusted` false), which is how browsers mark events sent by script.

### To check on the real site (Pascal)

In the Chrome test profile, then in Firefox (temporary add-on), after ⟳ on Zettelbranch and a reload of the tab, in `zbtest/` chats:

1. Name a new branch: the title at the top and the sidebar show the new name at once, and the notice has no Reload button.
2. Rename this branch on a named branch: the same.
3. Make a new tree root (Branch on a chat outside any tree): the same, and the preview stays.
4. If a notice ever says "Renamed through claude.ai's API: its title menu did not work (…)", tell Claude what it says in brackets.
5. The message box keeps what it had, and Delete is never touched.
