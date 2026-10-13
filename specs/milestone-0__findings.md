# Milestone 0 findings

Results of the Milestone 0 spike ([milestone-0__specs](milestone-0__specs.md)). Started 2026-10-13.

## Run log

| Date | What ran | claude.ai page loads | Challenge seen | Conversations created |
|---|---|---|---|---|
| 2026-10-13 | Setup: Playwright 1.64.0, Chromium 156.0.8078.4, spike extension and scripts | 0 | n/a | 0 |
| 2026-10-13 | Dry runs on a hand-made sample page, served from disk at the share URL, headless | 0 | n/a | 0 |
| 2026-10-13 | P0 on the files Pascal saved by hand in Firefox (`Claude.html`, `snapshot.json`), offline: jsdom and headless Chromium | 0 | none in the saved page | 0 |
| 2026-10-13 | Probe panel (P1 to P8), offline tests against a fake claude.ai, headless | 0 | n/a | 0 |
| 2026-10-13 | First probe session, by Pascal in the test profile, spike 0.0.2: P5, then P1 | by hand | none | 1 (P1), 1 message sent |

## P0 · Read a shared conversation

### Why offline

P0 runs offline, from two files Pascal saves by hand in his own browser. The spike makes
no automated access to claude.ai, not even one page load. The earlier plan of one or two
headless page loads was dropped before any load.

Why: the Consumer Terms forbid accessing claude.ai "through automated or non-human means,
whether through a bot, script, or otherwise" ([terms__findings](terms__findings.md)).
Pascal chose manual saves (2026-10-13).

So P0 no longer tests whether claude.ai loads in an automated browser, or whether bot
checks appear. That question is still open.

### Observations by hand

Seen by Pascal on the real site, in his own test browser (no automation).

**2026-10-13, setup.**

- Test browser: a separate Chrome profile, "Zettelbranch test", signed in to claude.ai.
  Chrome added Google's default extensions (Drive launcher, Docs Offline) to the new
  profile; Pascal is removing them. The spike extension loads unpacked without problems.
- Test project "Zettelbranch tests" created, then dropped (Pascal deletes it): on his
  account a new project is a **Claude Code project** (beta of 2026-09-17, "Projects
  redesigned: from folder to conversation"). The project is one coordinator
  conversation; Claude itself creates **threads**, each a Claude Code cloud session on its
  own copy of a repository. The user cannot create a thread directly (the "+" in the
  panel only picks views: Threads, Library, Routines). Not a place for test chats.
  Decision: test conversations are ordinary chats in the test tree `zbtest`.
- **Projects work differently on the "one Claude" layout.** The project's address is
  `claude.ai/code/project/chan_…`, even in Chat and Cowork mode, and the same project
  shows in both modes (Chat and Cowork, and Code). The project page has
  its own conversation stream (a welcome message with "Set up from recent work",
  "Connect tools", "Make a plan", then normal messages) and a **Threads** panel: "Claude
  will track your threads here as they start: what's working, what's waiting on you, and
  what's done." The sidebar shows New, Projects, Artifacts, Scheduled, Customize, More,
  and pinned projects.
- Open: inside a project, is a branch a "thread"? Does a thread have a title that can
  be renamed? This decides whether addresses in titles work inside projects (AD-1,
  FK-D2).

### Files Pascal saves

Both go into `spike/out/`, which git ignores.

| File | How |
|---|---|
| `spike/out/share-page.html`, with its folder `spike/out/share-page_files/` | Open the share link. Wait until the conversation shows. Do not scroll. Cmd+S, format "Webpage, Complete", name `share-page`. |
| `spike/out/snapshot.json` | The JSON the page loads. DevTools (Cmd+Opt+I), Network tab, filter `chat_snapshots`, reload the page. Right-click the request, Copy, Copy response. Paste into a new file `snapshot.json`. The request name comes from public notes *(to verify)*. If nothing matches, filter on `b6ff02e2`. |

Firefox saves the page as `Claude.html` with a `Claude_files/` folder; the scripts take
either name by default, or any name with `--html`.

Not scrolling keeps the DOM as the page first renders it, which is what the
virtualization check needs. If Pascal is logged in, the saved page may hold his sidebar
and account name. Those stay in `spike/out/`. The extension in Pascal's own browser could
also change the page, so the extensions that were active matter.

### How it runs

| Step | Command (in `spike/`) | Output in `spike/out/` |
|---|---|---|
| Extract with jsdom | `node offline-extract.mjs` | `extracted-offline.json` |
| Extract in headless Chromium, with the extension | `node p0-read-share.mjs` | `extracted.json`, `page.png`, `requests.json`, `browser-run.json`, `page-served.html` |
| Compare with the JSON | `node compare.mjs` | `compare.json` |
| Describe the JSON | `node inspect-snapshot.mjs` | `snapshot-summary.json` |
| Write the conversation | `node snapshot-to-md.mjs` | `specs/done/origin-conversation/zettelbranch__origin-conversation.md` |

`npm run p0` runs the first four. `npm run sample` runs everything on the hand-made
sample in `spike/fixtures/`.

The browser run:

- Playwright's own Chromium 156 (revision 1248) in the new headless mode
  (`channel: 'chromium'`), on the dedicated profile `~/.cache/zettelbranch/chromium-profile`.
  Never a window.
- A route handler answers every request. It serves the saved page at the share URL with
  its scripts, preload links and inline event handlers removed, so the saved app does not
  run. It serves files from `share-page_files/` and aborts everything else. WebSockets are
  closed without connecting. Service workers are blocked.
- `--host-resolver-rules=MAP * ~NOTFOUND`: no host name resolves, as a second guard.
- The run fails if any request did not go through the route handler.
- The content script does the extraction in the isolated world and writes the result to
  `<html data-zb-p0-result>`. Playwright only reads that attribute.

For P0 (version 0.0.1) the spike extension had no permissions, no background script, no
network calls and no storage. Version 0.0.2 adds the probe panel and one network file,
`claude-api.js`; the rules and their checks are under [Probe panel](#probe-panel-p1-to-p8).
On share pages it still does only the P0 extraction.

### Setup checks

Done on the hand-made sample, 2026-10-13.

| Check | Result |
|---|---|
| Extension loads in the new headless mode | Yes. Playwright adds `--disable-extensions` by default, but `--disable-extensions-except` with `--load-extension` still loads it. |
| Nothing on screen | No window. During a run, macOS lists the browser process as `BackgroundOnly` (`lsappinfo`), so no Dock icon either. |
| Content script runs on `https://claude.ai/share/*` | Yes, in the isolated world. |
| Probe trigger | Works: Playwright sets `data-zb-probe`, the content script answers in `data-zb-probe-result`. |
| Network | 4 requests: 2 served from disk, 2 aborted, 0 unhandled. The page's script and inline handler did not run. |
| jsdom and browser agree | Same Markdown for all 4 messages. |
| Error paths | Missing files: the scripts stop before launching anything. A saved "Just a moment..." page is detected. No selector match: the content script gives up after 30 s and returns its diagnostics. |

The sample is made by hand from memory of claude.ai's class names. It tests the code, not
the selectors.

### Selectors

Candidates, tried in order. All *(to verify)* until the run on the saved page.

| What | Candidates |
|---|---|
| User turn | `[data-testid="user-message"]`, `.font-user-message`, `[data-message-author-role="user"]` |
| Assistant turn | `.font-claude-response`, `.font-claude-message`, `[data-testid="assistant-message"]`, `[data-message-author-role="assistant"]` |
| Assistant message body | `.standard-markdown`, `.progressive-markdown`. Anything else in the message (thinking, tool use) is left out and logged. |
| Code block | `pre`. Language from `code.language-*`, else the short label next to it. |
| Math | `annotation[encoding="application/x-tex"]` inside `.katex` or `.katex-display` |
| Artifact | `[class*="artifact"]`, `[data-testid*="artifact"]` |
| Turn and list containers | Recorded from the page in `diag.turns` and `diag.listContainer` |

### Results

Run on 2026-10-13, offline, on the page Pascal saved in Firefox while logged in as the
chat's owner (the page shows "This is the read-only copy that you shared of your
chat."). The saved name was `Claude.html`; the scripts take `--html out/Claude.html`.

**Extraction matches the JSON.**

| Measure | Result |
|---|---|
| Messages | 44 extracted, 44 in the JSON, all matched |
| Roles | Identical sequence, strictly alternating |
| Text similarity | Mean 0.999, minimum 0.988; 39 of 44 identical |
| Inline code | 40 / 40 |
| jsdom versus headless browser | Same result |
| Network during the browser run | 14 requests: 8 served from disk, 6 aborted, 0 escaped |
| Time | Extraction done 1.7 s after load (saved DOM, not claude.ai) |

The conversation has no code blocks, tables or math, so those are still untested on a
real page.

**Selectors that matched:** user turns `[data-testid="user-message"]`, assistant turns
`.font-claude-response`. The list is `[data-testid="transcript-list"]`; each turn is a
`div[data-test-render-count]`.

**What differed, and fixes:**

- The page shows typographic apostrophes (’) where the source has straight ones ('). The
  comparison now treats them as equal. For branching it does not matter.
- Web-search source chips appear as links in the page (18 links in 5 messages); the JSON
  keeps sources outside the text. Milestone 1 should drop them or turn them into
  footnotes.
- A file Claude created (message 42) shows as a card; the extractor took an icon glyph
  (`\ue0b3`) for its name. To fix: read the file name, not the icon.
- The bot-check detector flagged "hCaptcha" on a normal page: claude.ai's own script
  preloads hcaptcha.com for its login page. Fixed: script and style code is ignored.

**Virtualization:** none on this share page. All 44 messages (35,000 characters) were in
the saved DOM, with no virtual rows or spacers. Chat pages may still differ (P6).

**The JSON** (`/api/chat_snapshots/<id>`):

- `chat_messages` holds a single chain: every message has a `parent_message_uuid`, one
  root, no branch points. So a share holds only the path that was shown, not the whole
  tree.
- Message `index` values run from 0 to 47 for 44 messages: four indexes are missing,
  probably the hidden siblings of edits or retries *(to verify)*.
- Each message has `text` plus `content` blocks: `text` (with `citations`), `tool_use`
  and `tool_result`. Tools seen: `web_search`, `bash_tool`, `memory_read`, `visualize`,
  `show_recommendation_cards`, `create_file`, `present_files`.
- The file created in message 42 is in the `create_file` input (`file_text`). It is the
  first version of the spec.
- `attachments`, `files` and `working_documents` are empty.

## Probe panel (P1 to P8)

Built 2026-10-13, extension version 0.0.2; 0.0.3 after the first session (see
[below](#first-probe-session-p5-and-p1)). Pascal runs the probes by hand on the real site:
see [Running the probes](milestone-0__specs.md#running-the-probes-pascal). No script
touches claude.ai.

### What it is

A small panel at the bottom right of every claude.ai page except share pages. "ZB probes"
opens it. One section per probe: plain instructions, buttons, and the result. "Copy
results" copies every result of the tab as JSON.

| File in `spike/extension/` | What |
|---|---|
| `manifest.json` | MV3, content script on `https://claude.ai/*`, no permissions, no background |
| `extract.js` | Extraction from the page (P0), now also on chat pages |
| `compare.js` | Text comparison, as in P0 |
| `conv.js` | Titles and addresses by segments; the message path and text from the API's tree |
| `claude-api.js` | The only network file: four calls, listed at its top |
| `prompt.js` | The branch prompt, per [forking__prompt](forking__prompt.md) |
| `probes.js` | P1 to P8 and their guards |
| `panel.js` | The panel |
| `content.js` | Share pages: P0. Other pages: the panel |

### Rules it follows

- **Network:** only same-origin requests to claude.ai, all in `claude-api.js`:
  - `GET /api/organizations`, then the organization whose capabilities include chat;
  - `GET …/chat_conversations_v2?limit=100&offset=…`, the list, page by page;
  - `GET …/chat_conversations/<id>?tree=True&rendering_mode=messages&render_all_tools=true`;
  - `PUT …/chat_conversations/<id>` with `{"name": "zbtest/…"}`.

  Any other request is refused before it is sent. Reads and renaming only: it never sends
  a message and never deletes.
- **No host permission needed.** Chrome makes content-script requests "on behalf of the
  web origin that the content script has been injected into", under that page's
  same-origin policy
  ([Chrome docs](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)).
  The browser attaches the login cookie by itself; the code never reads it.
- No cookies, no web storage, no IndexedDB, no `innerHTML`, no keyboard or input
  listeners. In P8 the fork point is set with − and + buttons, so nothing is typed into
  the panel.
- **Write probes** (P1 to P4, P8) run only on a new empty chat, on a chat whose title
  starts with `zbtest/`, or on a chat the tab saw being started from a new chat. The last
  case is needed for P4 (rename before the first reply ends) and to turn a new chat into
  a P8 root. It lasts until the page reloads.
- **Read-only probes** (P5 to P7) run anywhere and say "read-only, nothing is changed".
  Their results hold counts and structure, never message text. P5 shows only `zbtest/`
  titles.
- **Renames** go only to `zbtest/…` names, after a confirm dialog with the old and the new
  title. `claude-api.js` enforces the prefix too.
- **Unexpected answers** become a clear error: the status and the first 200 characters for
  an HTTP error; for an answer of the wrong shape, only its keys and types, so no message
  text leaks into a result.

### Offline tests

`npm run test:probes` (`spike/probe-test.mjs`) runs headless Chromium with the extension
against a fake claude.ai (`spike/fixtures/chat-app/`, `spike/fixtures/fake-claude.mjs`),
answered from memory at claude.ai addresses. Every request is answered locally or
aborted, and the run fails if one escapes. The fake has:

- a message box that enables Send when it holds text, and turns long pastes into an
  attachment chip;
- a New chat link that changes the address without a reload, and a sidebar;
- private chats with secret text, 118 more to force paging, and a 60-message chat that
  shows only its last 30 messages;
- a small `zbtest` tree with an edited message and a real branch.

Result on 2026-10-13: **56 of 56 checks pass.** 86 requests, none escaped. The extension
made 59 GET and 3 PUT calls, all of the four allowed kinds, and every rename went to a
`zbtest/` name. Version 0.0.3: **59 of 59**, 88 requests, 60 GET and 4 PUT.

| Probe | Checked offline |
|---|---|
| Guards | P1, P2, P3, P4 and P8 refuse on a private chat and change nothing. Refusals hold no private text. |
| P1 | The box holds exactly the sample, Send enables, no attachment. The paste fallback works. "Check last sent message" finds the sent text exact. |
| P2 | 5k stays inline; the check finds the full text, and line 3 in the reply. The three-part insert keeps all three parts. 100k inserts in about 1.6 s. |
| P3 | New chat through the app's own link, no reload, the variable survives, the marker is in the box. |
| P4 | Rename after a confirm. The next free root is found by segments (`1` and `10` exist, so `11`). After a reload, the API, the page title and the sidebar agree. |
| P5 | 124 conversations in 2 list requests. Only the 4 `zbtest/` titles shown. The organization with chat is picked over another one. |
| P6 | 60 messages in the API, 30 on the page, and it says so. An attachment's text is in the API but not on the page. |
| P7 | The P0 selectors match. Similarity with the API path: 1.0. The lookups that matched are listed. |
| P8 | Next address `1b`: `1a` exists, and `1a1` and `10` are not children of `1`. Header, transcript and escaping of `<zb-` are right; the old version of an edited message is left out. "From my own message" works; a fork point of the wrong kind is refused. Open and insert, summary check and rename work. A branch parent is flattened. A new chat becomes root `12`. |
| Copy results | The test denies clipboard writes, so the panel shows the JSON instead. The whole log holds no private text. |

Not tested offline: the real clipboard copy. Headless Chrome might share the macOS
clipboard, so the test denies it.

The fake app imitates claude.ai from the saved share page and from public notes. It tests
the code, not claude.ai.

### Audit

`npm run audit` (`spike/audit.mjs`): **12 of 12 checks pass** on 2026-10-13. Comments are
ignored. A copy with six planted violations fails six checks, as it should. The audit
also prints a plain `grep` for each check.

| Check | Result |
|---|---|
| `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`… only in `claude-api.js` | pass |
| Only GET and PUT | pass |
| No host other than `https://claude.ai` | pass |
| No cookies or credentials | pass |
| No web storage, IndexedDB or extension storage | pass |
| No `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` | pass |
| No `innerText` | pass |
| No keyboard or input listeners | pass |
| `MutationObserver` only for the P0 trigger on share pages | pass |
| No `eval` | pass |
| No extension APIs (`chrome.*`) | pass |
| Manifest: no permissions, no background, claude.ai only | pass |

## First probe session: P5 and P1

2026-10-13, by Pascal, in the Chrome profile "Zettelbranch test", spike 0.0.2. No bot
check, no error. The panel showed with its styles, and "Copy results" worked.

### P5 · Conversation list (read-only)

| Measure | Result |
|---|---|
| API on the merged account | Answers. `GET /api/organizations`: 2 organizations, 1 with chat (capabilities `claude_max`, `chat`); the probe picked that one. |
| The list | 63 conversations in **1 request** (`limit=100`), 813 ms. Shape `{data, has_more}`. Oldest created 2024-07-30. |
| Sidebar | 14 chat entries (`[data-testid="sidebar-recents"] a[href*="/chat/"]`). So the sidebar alone misses most of the tree: the registry reads the API list. |
| `zbtest/` chats | 0, as expected before any test chat. |

Fields of a list item: `created_at`, `current_leaf_message_uuid`,
`effective_thinking_mode`, `has_assistant_outputs`, `is_archived`, `is_multiplayer`,
`is_starred`, `is_temporary`, `is_wiggle_enabled`, `last_read_at`, `last_settled_at`,
`latest_assistant_output_at`, `latest_assistant_output_kind`, `live_status`,
`live_status_started_at`, `local_project_id`, `model`, `name`, `needs_input`,
`needs_input_kind`, `platform`, `project`, `project_uuid`, `session_id`, `settings`,
`summary`, `updated_at`, `user_uuid`, `uuid`, `workspace_session_id`,
`workspace_upgraded`.

Worth knowing for Milestone 1:

- `current_leaf_message_uuid`: the end of the branch the user is on, so the path to copy
  can be read without guessing.
- `platform`, `session_id`, `workspace_session_id`, `local_project_id`: the list may mix
  ordinary chats with Cowork or Code sessions. Version 0.0.3 counts the values of these
  fields (never free text), so the next P5 run shows the mix.
- `summary`: a summary field exists. Whether claude.ai fills it, and for which chats, is
  open; 0.0.3 counts how many are non-empty.

### P1 · Insert text

Inserted in a new chat with `execCommand('insertText')`, in one call (8 ms). The sample
holds a header, a nested list and a fenced Python block with indentation: 199
characters, 15 line breaks.

| Measure | Result |
|---|---|
| Message box | `[data-testid="chat-input"][contenteditable="true"]`: the test id is on the editable element itself, not on a wrapper |
| In the box | Exactly the sample: 199 characters, 16 paragraphs, no list, no code block. The editor's Markdown shortcuts did not fire. |
| Send button | `[data-testid="chat-input-send"]`, disabled before, enabled after |
| Attachment | None; no new `data-testid` on the page |
| Sent message (read back through the API) | **Identical** to the sample: line breaks, the 4 indented lines, both fences and the 3 list lines all kept. No attachment, no file. |
| How it shows | claude.ai renders the sent message's code block as a code block; the list lines stay plain lines. |

So the core of forking works on the real page for short text. The synthetic paste is
not needed: "Try paste instead" was not run and stays only as a fallback. Long text is
P2's question.

**Found:** P1's chat kept claude.ai's automatic title, so it was outside the `zbtest`
tree (the panel did not rename it). Pascal deletes it by hand. Fixed in 0.0.3: P1's and
P2's checks then offer to rename the chat to `zbtest/p1 · <automatic title>` or
`zbtest/p2-<size> · …`, after the usual dialog. These names are not addresses, so the
tree probes ignore them. Spike a2302f6.

### Still open for the next clicks

- **Attachment chip:** still unknown; P2's long text should show it. After each
  insertion the probes list every new `data-testid` on the page.
- **Long text:** whether a single large `execCommand` call stays inline (P2).
- **New chat link:** `a[href="/new"]` in the sidebar. Whether a click from the script
  opens the new chat without a reload is P3's question.
- **Rename:** the API's answer, and whether claude.ai's automatic title overwrites an
  early rename (P4).
- **Page title:** format unknown; P4 shows it as is.
- **The list's mix:** chats, Cowork and Code sessions (P5 again, 0.0.3).

## Files

| Path | What |
|---|---|
| `spike/extension/` | The spike extension: P0 extraction and the probe panel (files listed under [Probe panel](#probe-panel-p1-to-p8)) |
| `spike/p0-read-share.mjs` | Headless browser run, offline |
| `spike/offline-extract.mjs` | jsdom run |
| `spike/compare.mjs` | Comparison with the JSON |
| `spike/inspect-snapshot.mjs` | Shape of the JSON, without account details |
| `spike/snapshot-to-md.mjs` | Writes `zettelbranch__origin-conversation.md` |
| `spike/lib.mjs` | Shared helpers |
| `spike/fixtures/` | Hand-made sample page and JSON |
| `spike/out/sample/page.png` | What the headless browser showed for the sample |
| `spike/out/page.png` | What it shows for the saved share page, after the P0 run |
| `spike/probe-test.mjs` | Offline test of the probe panel |
| `spike/audit.mjs` | The audit greps |
| `spike/fixtures/chat-app/`, `spike/fixtures/fake-claude.mjs` | Fake claude.ai for the probe tests |
| `spike/out/probe-test/panel.png` | The panel as the headless browser showed it |
| `spike/out/probe-test/report.json`, `results-log.json` | Test checks, the extension's API calls, the panel's results log |

`spike/out/` is ignored by git. Files there may hold account details from the saved page,
so they stay local.
