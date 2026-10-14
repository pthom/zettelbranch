# claude.ai findings

What public sources say about claude.ai and the extension platforms. Desk research of 2026-10-13; nothing checked on the real page.

## 1. Native branching

Context for every section: Anthropic has merged chat and Cowork into "one Claude". It was announced on 2026-09-16 and is rolling out to Pro and Max first, then Team and Free ([Anthropic blog, 2026-09-16](https://claude.com/blog/cowork-is-now-claude)). Several answers below differ between legacy accounts and merged accounts. Which one Pascal's account has is unknown. The most detailed public notes on the merged experience come from the authors of the Claude QoL extension, who reverse-engineered it between 2026-10-06 and 2026-10-10: the [bard README](https://github.com/lugia19/claude-ext-common/blob/main/scripts/bard/README.md) and [bard-rework.md](https://github.com/lugia19/Claude-QoL/blob/main/docs/bard-rework.md), called "the QoL notes" below. They are third-party notes, so everything taken from them is *(to verify)*.

Anthropic's docs:

- The switch is automatic and staged, with no setting: "You don't need to do anything to enable the new experience." It cannot be undone: "Once your account has the new experience, you can't switch back to separate 'Chat' and 'Cowork' options." Until then, the account keeps the separate Chat and Cowork options, which is how to tell which experience an account has. Chats, projects and settings carry over. Incognito chats still open in the previous experience. (Same help article as below, checked 2026-10-13.)
- Pascal's account: most likely already merged as of 2026-10-13. The Claude desktop app shows a single "Chat and Cowork" option next to Code (tooltip seen by Pascal), not two separate options. Pascal does not use "Add from GitHub". Proposed by Claude: build for the merged experience, keep everything that talks to claude.ai in one file, and label each fixture with the experience it came from. In the original design conversation, an edit Pascal made on 2026-10-13 shows `< 2/2 >` arrows, with retry, edit and copy buttons; the shared copy shows only the chosen path.
- The help article on the merged experience lists this under current limitations: "Branching a conversation from an earlier point isn't available." ([help center, updated about 2026-09](https://support.claude.com/en/articles/16761823-claude-cowork-and-chat-are-one-claude)) Its other listed limitations: "Add from GitHub" isn't supported; incognito chats stay in the previous experience, without files or code; search doesn't include older Cowork tasks; Dispatch isn't available to new users. Everything counts toward the plan's usage limits, and long tasks use more.
- What the merge costs Zettelbranch, beyond native branching (details in sections 2 and 4): long pasted text may fall outside the model's context, the new internal API is `v1alpha` and the old one may be retired, and the page first loads only recent messages.
- The release notes up to 2026-10-07 mention no branching, fork or tree feature ([release notes](https://support.claude.com/en/articles/12138966-release-notes)).

What third parties report. Everything in this table is *(to verify)*.

| | Legacy accounts | Merged accounts |
|---|---|---|
| Edit or retry makes a sibling in the stored tree | yes | yes |
| `< 1/2 >` arrows to switch | yes, on the web | only for forks made before the account switched over; newer forks are hidden. **Not confirmed:** on Pascal's merged account, an edit made on 2026-10-13 shows `< 2/2 >` (see below) |
| Fork into a new chat | no | "Continue in a new session" on the "earlier version" banner, so only for old forks |
| Edit and retry in "upgraded" (sandbox) chats | n/a | refused: "Editing and retrying aren't available here yet" |
| Tree view, named branches, links | no | no |

Sources: [claude-code#59029](https://github.com/anthropics/claude-code/issues/59029) (2026-05-14: only the arrows, and the sidebar menu has only Rename / Star / Delete); [XDA, 2026-07-31](https://www.xda-developers.com/claude-lost-hours-of-my-chat-history-overnight-until-figured-where-hidden/) (arrows on the web, nothing in the desktop app); the QoL notes above for the merged column.

The QoL notes also describe a server action, `continue_branch_as_new_chat { source_conversation_id, through_message_id }`. It copies a branch into a new chat. The model gets the history as real earlier turns, and the title, settings and attachments come along. Nothing links the new chat back to its source, and upgraded chats refuse the action *(to verify)*.

Prior art: [Claude QoL](https://github.com/lugia19/Claude-QoL) (191 stars, last commit 2026-10-11, Chrome and Firefox, GPL-3.0) already forks a chat into a new one, verbatim or summarized, and adds branch search and bookmarks. It has no tree view, addresses or cross-references.

Impact: Nothing native names, nests or links branches, so the project is not redundant today. The spec's "Why" needs updating: on merged accounts the `< 1/2 >` arrows disappear for new forks, so forking into new chats becomes the only visible kind of branch. If Anthropic ships a ChatGPT-style fork later, Zettelbranch's value lies in the tree layer (addresses, banner, cross-references), not in the copying. The native fork action would avoid the problem in "The copy changes the nature of the context" (forking__findings, FK-2). Using it, though, is an undocumented write (DA-2). ZB-2: the spike should first check which experience the account has.

## 2. Internal web API

Two APIs coexist *(to verify)*:

- the legacy JSON REST API under `/api/organizations/<org>/…`. It still answers for merged accounts, though the merged web client no longer calls it for conversations. Checked on Pascal's merged account on 2026-10-13 (P5): the list answers;
- a Connect-RPC/protobuf API, `POST /claudeai-rpc/anthropic.bard.api.v1alpha.ConversationService/<Method>`, used by the merged web client. It is `v1alpha` and changes often.

Endpoints. Everything in this table is *(to verify)*, except (a) and (c) in legacy REST, checked on Pascal's merged account on 2026-10-13: `chat_conversations_v2?limit=100&offset=0` returned `{data, has_more}` with all 63 of his conversations in one response (P5); the rename `PUT` works and answers with the whole conversation, new `name` included (P4). The list holds his chats (`platform` `CLAUDE_AI`) and one `VOICE` conversation, no Cowork or Code sessions, and a `summary` for most of them.

| Need | Legacy REST | Merged RPC |
|---|---|---|
| (a) List all conversations | `GET …/chat_conversations_v2?limit=&offset=&starred=&consistency=`. Returns `{data, has_more}`, most recently updated first. Paging is by offset only, with no cursor. Without `limit`, everything comes in one response. | `ListConversations { older_cursor, limit, starred, project_id }` |
| (b) One conversation, whole tree | `GET …/chat_conversations/<id>?tree=True&rendering_mode=messages&render_all_tools=true`, often with `&consistency=strong` | `ReadConversation { conversation_id }`. The JSON codec works. |
| (c) Rename | `PUT …/chat_conversations/<id>` with body `{"name": …}` → 202 | `PerformAction { rename_conversation { title } }` |
| (d) Auto-title | `POST …/chat_conversations/<id>/title` with `{message_content, recent_titles}`. It generates a title. It cannot set one you choose (400 without `message_content`). | none; the server names the chat |
| (e) Projects | List: `GET …/projects?include_harmony_projects=true&limit=`. A project's chats: `GET …/projects/<id>/conversations_v2?limit=&offset=`. New chat in a project: `POST …/chat_conversations {uuid, name, project_uuid}` | Projects stay on legacy REST. A new chat joins a project through `project_id` on its first `send_message`. |

Sources: [jvt.me, 2026-09-04](https://www.jvt.me/posts/2026/09/04/claude-chat-export/) (b); [claude-backup](https://github.com/twilligon/claude-backup/blob/main/claude_backup/__init__.py), pushed 2026-10-03 (a, paging); [agentsview request list](https://github.com/kenn-io/agentsview/blob/main/internal/importer/claude_ai_requests.txt) (a, b); [lm-assist claudeai-session.ts](https://github.com/langmartai/lm-assist/blob/main/core/src/utils/claudeai-session.ts), which says rename and title were checked live on 2026-07-26 (c, d, e); [QoL claude-api.js](https://github.com/lugia19/Claude-QoL/blob/main/content/helpers/claude-api.js) and its exporter, 2026-10-10 (merged column, e); the bard README for the RPC calls.

Auth:

- An HttpOnly `sessionKey` cookie. A same-origin request from the page sends it on its own, with no token or extra header ([paprwork notes, 2026-06-19](https://github.com/Papr-ai/paprwork/blob/main/docs/CLAUDE_CONVERSATIONS_API.md)). Checked on 2026-10-13 (P5): a content script's same-origin `fetch` is answered, and the code never reads a cookie.
- Org id: read the `lastActiveOrg` cookie (QoL, agarwalvishal) or call `GET /api/organizations`. In the second case, pick the org whose capabilities include chat, not `orgs[0]`. Checked on 2026-10-13 (P5): Pascal's account has 2 organizations, 1 with chat. Zettelbranch uses the call, never the cookie.
- The RPC endpoints check `Origin` *(to verify)*. Calls from an extension page or service worker get 403 "origin not allowed". Calls from the page or from a Chrome content script pass. Legacy REST does not check `Origin` (bard README). QoL's Firefox build uses `content.fetch` for the RPC calls, while MDN says `content.fetch` does not exist in MV3. That needs checking.

Well-known projects:

| Project | What it is | Stars | Last commit |
|---|---|---|---|
| [lugia19/Claude-QoL](https://github.com/lugia19/Claude-QoL) | Extension (Chrome, Firefox): fork, search, export. Uses both APIs. | 191 | 2026-10-11 |
| [agarwalvishal/claude-chat-exporter](https://github.com/agarwalvishal/claude-chat-exporter) | Script: tree GET, org from cookie | 717 | 2026-09-09 |
| [socketteer/Claude-Conversation-Exporter](https://github.com/socketteer/Claude-Conversation-Exporter) | Chrome extension: list and tree GET from extension pages, `credentials: 'include'` | 128 | 2026-04-29 |

The DOM holds less than it seems (checked on 2026-10-13, P6: 11 of 80 messages in the page of one of Pascal's chats). The transcript is a virtualized list (TanStack Virtual), so only messages near the viewport exist in the DOM ([chat-export#14, 2026-09-15](https://github.com/Trifall/chat-export/issues/14)). On merged accounts, the page first loads only the latest 30 to 122 messages of the current branch and pages older ones in on scroll (bard README).

Impact: DA-1 option A is practical. A content script needs one same-origin GET for the complete conversation list (the registry) and one for a whole tree with every branch. No new permission is needed. For reads, legacy REST is the better choice: it needs no protobuf, does not check `Origin`, and QoL still reads from it (decision of 2026-10-09). The risk is that it gets retired as the merge goes on. DA-2: rename exists in both APIs. Contradiction with the spec ("Extract messages from the DOM containers") and Milestone 1: in long chats the DOM, and a Ctrl+S fixture, hold only part of the conversation. With DA-1 = A, extraction should come from the tree GET instead.

## 3. Automatic titles

- Legacy accounts: the web client calls `POST …/title` with the first message's content, so the title is generated after the first message *(to verify)* (lm-assist, 2026-07-26).
- Merged accounts: `send_message` has no name field, and the server names the chat itself. QoL renames its forks after the first reply has finished, once `stop_reason` is set *(to verify)* (QoL claude-api.js, 2026-10-10).
- The native fork keeps the source chat's title *(to verify)* (bard-rework.md).
- Does an early manual rename get overwritten? Not found in public sources. Checked on Pascal's merged account on 2026-10-13 (P4): an API rename made before the first reply ended was kept; the phone app shows it. The open web tab kept showing the automatic title until a reload. Anthropic's rename article only gives the manual steps ([help center, 2026-08-10](https://support.claude.com/en/articles/8230524-how-can-i-delete-or-rename-a-conversation)). Reports of renames reverting are about the Claude Code VS Code extension, not claude.ai.

Impact: "Automatic titles" in addressing__findings stays a spike item. The safe pattern is QoL's: rename after the first reply has finished, then read the title back.

## 4. Long pastes

- Anthropic documents no threshold and no setting to keep long text inline. Not found.
- Third-party numbers are weak: "approximately 20,000 characters", with no source ([fast.io, 2026-09-13](https://fast.io/resources/claude-character-limit/)), or just "past a certain length" ([leadsource, 2026-09-17](https://leadsource.co/blog/claude-pasted-text-empty)).
- Userscripts that keep long pastes inline cancel the `paste` event, then re-insert the text with `execCommand('insertText')` in chunks of 500 characters, 50 ms apart ([intellectronica gist, 2025-12-08](https://gist.github.com/intellectronica/96ec4201f2538ac42bcaa93665580b30); [Greasy Fork "Chunked Paste" v1.5](https://greasyfork.org/en/scripts/567635-claude-chunked-paste-bypass-attachment-detection)). This suggests that claude.ai's paste handler does the conversion and that text typed in with `execCommand` stays inline. It does: in one call, 20,000 and 100,000 characters stayed inline text and reached the model (P1, P2, 2026-10-13).
- Merged accounts *(to verify)*, per the bard README of 2026-10-08:
  - text attachments travel inline, up to 4 MB;
  - an attachment too big for the model's context window "upgrades" the chat to a sandbox, and the file is then not in the model's context;
  - in an already upgraded chat, a file over about 25K tokens is not in context.
- A URL parameter can create a text attachment directly (section 6).

Impact: for the "Long text in the message box" and "Inserting text into the message box" findings in forking__findings, insert with `execCommand` rather than a synthetic paste, so the paste handler never runs. FK-2: a full transcript that becomes an attachment may end up partly or entirely outside the model's context on merged accounts.

## 5. The message editor

- It is ProseMirror. Extensions in 2026 target `div.ProseMirror[contenteditable="true"]`, sometimes inside `[data-testid="chat-input"]`, and the Send button is `[data-testid="chat-input-send"]`. Checked on 2026-10-13 (P1): the message box is `[data-testid="chat-input"][contenteditable="true"]` (the test id is on the editable element itself), and the Send button selector holds. Tiptap is likely, because code blocks carry Tiptap's `node-codeBlock` and `data-node-view-content-react`. Not confirmed.
- `execCommand('insertText')` works (P1, 2026-10-13): Send enables, and the sent message is exactly the inserted text, with line breaks, indentation and code fences. Inserted in one call, `- ` and ``` did not turn into a list or a code block.
- How open-source extensions insert text:

| Extension | Method | Last commit |
|---|---|---|
| [chrome-claude-extras](https://github.com/wkusnierczyk/chrome-claude-extras/blob/main/extension/content.js) | Focus, caret to the end, `execCommand('insertText')`, wait for Send to enable. Same trust model as Zettelbranch: no network, no storage, no background. | 2026-10-11 |
| [claude-autocontinue](https://github.com/timothy22000/claude-autocontinue/blob/main/extension/content.js) | `execCommand` `selectAll`, `delete`, `insertText`: "the only reliable way" | 2026-03-17 |
| [PromptDeck](https://github.com/ZahoorCodes/PromptDeck/blob/main/content.js) | `execCommand('insertText')`, falling back to synthetic `beforeinput`/`input` events. A synthetic `paste` with `DataTransfer` only for files. | 2026-08-27 |
| [Claude QoL](https://github.com/lugia19/Claude-QoL/blob/main/content/main/edit-files.js) | `execCommand('insertText')` into the native edit box | 2026-10 |

None of them reaches into the ProseMirror view object.

Impact: "Inserting text into the message box" in forking__findings: swap the order. Try `execCommand('insertText')` first and the synthetic paste only as a fallback, since a paste may trigger the attachment conversion. The success check stays the same: Send enables and the full text is sent.

## 6. Prefill by URL

- Anthropic documents `claude://claude.ai/new?q=…` for the desktop app. It prefills the prompt "so you can review and send it", and `q` is "truncated to roughly 14,000 characters" ([help center, 2026-06-30](https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link)). The article does not cover the web.
- On the web, `https://claude.ai/new?q=…` stopped sending on its own around 2025-10-03 ([claude-code#8827](https://github.com/anthropics/claude-code/issues/8827)), more than 12 months ago. In 2026 it only prefills ([Oasis Security, 2026-03-18](https://www.oasis.security/blog/claude-ai-prompt-injection-data-exfiltration-vulnerability)) *(to verify)*.
- An unofficial README lists more parameters *(to verify)* ([austegard.com, 2026-02-20](https://austegard.com/blog/claudeainew-unofficial-readme.html)):
  - `project=<uuid>` opens the new chat in that project and is silently ignored if the id is invalid;
  - `attachment=<text>` creates a text attachment named "artifact", "e.g. from a browser extension", with no size check;
  - `model`, `incognito` and others;
  - `q` passes a "prefill safety check", and unknown prompts may get an "untrusted prompt" modal.
- No length limit is documented for the web. Cloudflare answers 414 above 32 KB of URI ([Cloudflare docs](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/4xx-client-error/error-414/)).
- The text ends up in browser history. None of this has been checked on merged accounts.

Impact: DA-D1 (the prompt handoff). A URL needs no extension storage and can target the parent's project (FK-D2). But it caps the text at a few thousand to 14K characters, may show a warning modal, and writes conversation content into browser history, which bends "no persistent storage of conversation content". It is fine for a short header, not for a full transcript (FK-2).

## 7. Terms and browser extensions

- No Anthropic statement found about third-party extensions that read or modify claude.ai. The only mention found: the Claude in Chrome troubleshooting page advises disabling other extensions ([help center](https://support.claude.com/en/articles/12902405-claude-in-chrome-troubleshooting)).
- The [Consumer Terms](https://www.anthropic.com/legal/consumer-terms) are effective 2025-10-08: still current, but more than 12 months old. Section 3 forbids:
  - "Except when you are accessing our Services via an Anthropic API Key or where we otherwise explicitly permit it, to access the Services through automated or non-human means, whether through a bot, script, or otherwise."
  - "To crawl, scrape, or otherwise harvest data or information from our Services other than as permitted under these Terms."
  - "To decompile, reverse engineer, disassemble, or otherwise reduce our Services to human-readable form, except when these restrictions are prohibited by applicable law."
  - "… bypassing any of our systems or protective measures."
- The [Usage Policy](https://www.anthropic.com/legal/aup) is effective 2026-11-12. Under "Do Not Abuse Our Platform": "Resell, proxy, or otherwise provide access to Claude through unauthorized means, including services that route requests through consumer subscriptions or misrepresent the product or client being used". Also: "Intentionally bypass or interfere with capabilities, restrictions, or guardrails established within our products".

Impact: the "Terms of use" finding in testing__findings is confirmed. Playwright runs that create conversations are "automated or non-human means". DA-1: the terms do not mention extensions. An extension that reads the user's own data when the user clicks is closer to ordinary use, but calling an undocumented internal API is a grey zone the terms do not address. This is not legal advice.

## 8. Extension platform facts

(a) Chrome MV3:

- `storage.session` holds up to 10 MB in memory and is not exposed to content scripts by default ([Chrome docs, 2026-09-11](https://developer.chrome.com/docs/extensions/reference/api/storage)).
- `chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })` (Chrome 102+) opens it to content scripts ([StorageArea](https://developer.chrome.com/docs/extensions/reference/api/storage/StorageArea)).
- Only privileged extension contexts can call it: the service worker or an extension page. From a content script it fails with "Context cannot set the storage access level" ([Chromium source](https://chromium.googlesource.com/chromium/src/+/main/extensions/browser/api/storage/storage_api.cc)).
- The level is saved in the extension's prefs, so it probably survives restarts (source reading, not tested).

(b) Firefox MV3:

- `storage.session` exists since Firefox 115 and is not exposed to content scripts ([MDN, 2026-10-04](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/session)).
- `setAccessLevel` is not implemented. MDN's compatibility data marks it unsupported ([browser-compat-data](https://github.com/mdn/browser-compat-data/blob/main/webextensions/api/storage.json)), and both tracking bugs are still open: [1724754](https://bugzilla.mozilla.org/show_bug.cgi?id=1724754) (last changed 2026-09-22) and [1823717](https://bugzilla.mozilla.org/show_bug.cgi?id=1823717).
- So a Firefox content script reaches `storage.session` only by messaging a background script.

(c) Both background keys in one manifest: yes, today.

- Chrome 121+ ignores `background.scripts` in MV3 and runs the service worker.
- Firefox 121+ runs `scripts` and ignores `service_worker`.
- Before those versions, Chrome refused to load such an extension, and Firefox (120 and earlier) did not start the background page ([MDN, 2026-09-05](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background)).

(d) Headless Chromium:

- Old headless mode left the Chrome binary in Chrome 132 and lives on as `chrome-headless-shell` ([Chrome blog, 2024-10-23](https://developer.chrome.com/blog/removing-headless-old-from-chrome)). The new headless mode loads extensions; the old one does not.
- Playwright uses the headless shell by default. `channel: 'chromium'` switches to the new headless mode, which "allows to run extensions in headless mode". Extensions work only in a persistent context, with `chromium.launchPersistentContext(dir, { channel: 'chromium', args: ['--disable-extensions-except=<path>', '--load-extension=<path>'] })`. The MV3 extension id comes from `context.serviceWorkers()[0].url()` ([Playwright docs](https://playwright.dev/docs/chrome-extensions); [browsers](https://playwright.dev/docs/browsers)).
- Chrome 137 removed `--load-extension` from branded Google Chrome. It still works in Chromium and Chrome for Testing ([Chromium PSA, 2025-04-04](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/1-g8EFx2BBY)). Playwright says the same for Edge and recommends its bundled Chromium.
- Alternatives:
  - CDP `Extensions.loadUnpacked`, experimental ([protocol](https://chromedevtools.github.io/devtools-protocol/tot/Extensions/));
  - WebDriver BiDi `webExtension.install` with `--remote-debugging-pipe --enable-unsafe-extension-debugging` (Chrome team reply in the PSA thread, 2025-05-12);
  - Puppeteer's `enableExtensions` or `browser.installExtension()` ([Puppeteer docs](https://pptr.dev/guides/chrome-extensions)).

(e) Firefox automation:

- Playwright: "Support for Firefox extensions is outside of the scope for Playwright" (maintainer, 2024-12-03, [#7297](https://github.com/microsoft/playwright/issues/7297)), and Playwright runs only its own patched Firefox. The community workaround [playwright-webextext](https://github.com/ueokande/playwright-webextext) installs a temporary add-on, with partial MV3 support.
- `web-ext run`: `--firefox-profile <dir> --profile-create-if-missing --keep-profile-changes` keeps a logged-in profile. `--start-url` opens a page, and `--arg` passes flags to Firefox ([web-ext reference](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/)). The page does not mention headless. `--arg=-headless` is untested.
- Selenium with geckodriver: `driver.install_addon('<dir>', temporary=True)` takes an unpacked folder, and `-headless` runs Firefox headless ([Selenium docs](https://www.selenium.dev/documentation/webdriver/browsers/firefox/)).
- WebDriver BiDi `webExtension.install` works in Firefox and installs temporarily by default since Firefox 138 ([Mozilla docs](https://firefox-source-docs.mozilla.org/remote/webdriver-bidi/Extensions.html); [newsletter](https://fxdx.dev/firefox-webdriver-newsletter-138/)).
- MV3 host permissions: since Firefox 127 they appear in the install prompt and can be revoked, so the extension should check `permissions.contains` ([Mozilla blog, 2024-05-14](https://blog.mozilla.org/addons/2024/05/14/manifest-v3-updates/), more than 12 months old). Whether a temporary add-on gets the claude.ai grant automatically in automated runs: not found.

Impact: DA-D1's fallback, `storage.session`, needs a background script in both browsers. In Firefox, the content script must also message that background script for every read and write. That makes the same-page default, or a URL, the simpler handoff. testing__findings "Bot checks": the headless Chromium plan holds only with `channel: 'chromium'` (or Chrome for Testing), never branded Chrome. The spec's Firefox path should be `web-ext run` or Selenium, not Playwright. trust-audit__findings "One codebase, no build" is confirmed.

## 9. Checked on Pascal's account (Milestone 0)

Pascal's merged ("one Claude") account, in Chrome, on 2026-10-13, by hand, with the spike's probe panel. Details: [milestone-0__findings](done/milestone-0/milestone-0__findings.md).

| What | Found |
|---|---|
| Organisation | `GET /api/organizations`; take the one whose capabilities include `chat` (Pascal has 2, 1 with chat) |
| Conversation list | `GET …/chat_conversations_v2?limit=100&offset=0` returns `{data, has_more}`: 67 conversations in one request, 0.25 to 0.8 s. Items carry `name`, `summary` (filled for 49 of 67), `current_leaf_message_uuid`, `platform` (`CLAUDE_AI`, `VOICE`), `project_uuid`. No Cowork or Code sessions in it. |
| One conversation | `GET …/chat_conversations/<id>?tree=True&rendering_mode=messages&render_all_tools=true`: the whole tree. Pasted text is in `attachments[].extracted_content`, files in `files_v2`. |
| Rename | `PUT …/chat_conversations/<id>` with `{"name"}`: works before the first reply ends and after the automatic title, answers with the conversation, 0.7 to 0.9 s. The server keeps it (the phone shows it); the open tab shows it only after a reload. |
| Message box, Send | `[data-testid="chat-input"][contenteditable="true"]`, `[data-testid="chat-input-send"]` |
| Insertion | One `execCommand('insertText')` call: exact, line breaks and indentation kept, no Markdown shortcuts. 19,931 characters in 0.1 s, 99,973 in 0.8 s, both inline text that reached the model. |
| New chat | `[data-testid="sidebar"] a[href="/new"][data-row-main-button]`, clicked by the content script: no page load, the script's memory survives |
| Turns on the page | user `[data-testid="user-message"]`, Claude `[data-testid="assistant-message"]` (or `.font-claude-response`); rows `[data-testid="transcript-row"]` with `data-index` and `data-perf-row` (`human`, `assistant`) |
| Virtualization | 11 of 80 messages in the DOM for a long chat |
| Sidebar | `[data-testid="sidebar-recents"] a[href*="/chat/"]`: recent chats only (15 of 67) |
| Bot checks | none, in five sessions by hand |
| Your messages on screen | Markdown in part (pasted sample, 2026-10-14): code blocks with three backticks, inline code and quotes render; bold, italic, headings, lists, `[!NOTE]` admonitions, four-backtick blocks and tag-like text show as typed ([transcript-layout__questions](milestone-2/transcript-layout__questions.md)) |

Not checked: the page title's format, what `summary` holds, an attachment made by a paste, Firefox.
