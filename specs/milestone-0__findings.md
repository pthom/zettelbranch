# Milestone 0 findings

Results of the Milestone 0 spike ([milestone-0__specs](milestone-0__specs.md)). Started 2026-10-13.

## Run log

| Date | What ran | claude.ai page loads | Challenge seen | Conversations created |
|---|---|---|---|---|
| 2026-10-13 | Setup: Playwright 1.64.0, Chromium 156.0.8078.4, spike extension and scripts | 0 | n/a | 0 |
| 2026-10-13 | Dry runs on a hand-made sample page, served from disk at the share URL, headless | 0 | n/a | 0 |
| 2026-10-13 | P0 on the files Pascal saved by hand in Firefox (`Claude.html`, `snapshot.json`), offline: jsdom and headless Chromium | 0 | none in the saved page | 0 |

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
- Test project "Zettelbranch tests" created. Its URL is kept in Claude's local memory,
  not in this public repo.
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

## Files Pascal saves

Both go into `spike/out/`, which git ignores.

| File | How |
|---|---|
| `spike/out/share-page.html`, with its folder `spike/out/share-page_files/` | Open the share link. Wait until the conversation shows. Do not scroll. Cmd+S, format "Webpage, Complete", name `share-page`. |
| `spike/out/snapshot.json` | The JSON the page loads. DevTools (Cmd+Opt+I), Network tab, filter `chat_snapshots`, reload the page. Right-click the request, Copy, Copy response. Paste into a new file `snapshot.json`. The request name comes from public notes *(to verify)*. If nothing matches, filter on `b6ff02e2`. |

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
| Write the conversation | `node snapshot-to-md.mjs` | `specs/zettelbranch__origin-conversation.md` |

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

The spike extension has no permissions, no background script, no network calls and no
storage. It never reads, stores or sends credentials or session tokens: no cookies, no
web storage. Check, which found nothing in the code on 2026-10-13:

```
grep -nE "document\.cookie|localStorage|sessionStorage|indexedDB|chrome\.|browser\.|fetch\(|XMLHttpRequest|new WebSocket|sendBeacon|\.innerHTML|outerHTML|\.innerText|insertAdjacentHTML" spike/extension/*.js
```

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

## Files Pascal saves

Both go into `spike/out/`, which git ignores.

| File | How |
|---|---|
| `spike/out/share-page.html`, with its folder `spike/out/share-page_files/` | Open the share link. Wait until the conversation shows. Do not scroll. Cmd+S, format "Webpage, Complete", name `share-page`. |
| `spike/out/snapshot.json` | The JSON the page loads. DevTools (Cmd+Opt+I), Network tab, filter `chat_snapshots`, reload the page. Right-click the request, Copy, Copy response. Paste into a new file `snapshot.json`. The request name comes from public notes *(to verify)*. If nothing matches, filter on `b6ff02e2`. |

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
| Write the conversation | `node snapshot-to-md.mjs` | `specs/zettelbranch__origin-conversation.md` |

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

The spike extension has no permissions, no background script, no network calls and no
storage. It never reads, stores or sends credentials or session tokens: no cookies, no
web storage. Check, which found nothing in the code on 2026-10-13:

```
grep -nE "document\.cookie|localStorage|sessionStorage|indexedDB|chrome\.|browser\.|fetch\(|XMLHttpRequest|new WebSocket|sendBeacon|\.innerHTML|outerHTML|\.innerText|insertAdjacentHTML" spike/extension/*.js
```

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

Pending: waits for Pascal's two files. To fill in:

- whether the saved page renders in headless Chromium with the extension, and how long
  the extraction took (offline, so this measures the saved DOM, not claude.ai);
- the selectors that matched, the turn and list containers;
- extraction against the JSON: message count, role sequence, text similarity, code
  blocks, tables, math, links;
- what was lost or wrong;
- virtualization: whether the saved DOM holds every message. If it holds fewer than the
  JSON, look for rows with `data-index`, absolute positioning or spacer heights
  ([claude-ai__findings](claude-ai__findings.md#2-internal-web-api)). This decides
  whether extraction from the DOM alone can work;
- the snapshot JSON: fields, tree shape (`parent_message_uuid`), shown path or whole
  tree, how artifacts, attachments and tool use appear.

## Files

| Path | What |
|---|---|
| `spike/extension/` | `manifest.json`, `extract.js` (selectors and Markdown conversion, also run by jsdom), `content.js` |
| `spike/p0-read-share.mjs` | Headless browser run, offline |
| `spike/offline-extract.mjs` | jsdom run |
| `spike/compare.mjs` | Comparison with the JSON |
| `spike/inspect-snapshot.mjs` | Shape of the JSON, without account details |
| `spike/snapshot-to-md.mjs` | Writes `zettelbranch__origin-conversation.md` |
| `spike/lib.mjs` | Shared helpers |
| `spike/fixtures/` | Hand-made sample page and JSON |
| `spike/out/sample/page.png` | What the headless browser showed for the sample |
| `spike/out/page.png` | What it shows for the saved share page, after the P0 run |

`spike/out/` is ignored by git. Files there may hold account details from the saved page,
so they stay local.
