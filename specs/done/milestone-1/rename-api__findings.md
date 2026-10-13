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

Not run yet.

