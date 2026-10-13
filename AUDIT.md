# Auditing Zettelbranch

Zettelbranch is a browser extension that runs on claude.ai. It reads the conversation you are in, and when you click, it opens a new chat with a copy of it (made by claude.ai itself when you branch from the last reply) and renames chats to their tree addresses (`oulipo/1a · …`). It runs in the same page as your conversations, so it could in principle read and send them anywhere. This file shows how to check that it does not.

A program's own claims about itself prove nothing. So the code is kept short and plain, and this file lists what it never does, each with a command that proves it. Run them from the repository's root folder, in a terminal (macOS or Linux). Each command prints nothing when the point holds.

## What runs

Everything that runs is in `extension/`: `manifest.json` and seven scripts, about 1,700 lines in all (`wc -l extension/*`). No build step, no dependencies, no minified code: the files you read are the files the browser runs.

| File | What it does |
|---|---|
| `manifest.json` | Declares the scripts, for `https://claude.ai/*` only. No permissions. |
| `api.js` | The only file that uses the network: five calls to claude.ai's own API, listed at its top, and one page load (the chat claude.ai just copied). |
| `tree.js` | Titles and addresses (`oulipo/1b1`). Pure functions. |
| `conversation.js` | Turns the API's answer (or, as a fallback, the page) into a list of messages. |
| `prompt.js` | Builds the branch's first message, and parses one back. Pure functions. |
| `branch.js` | The flow: read, branch, open the new chat, start it, name it. |
| `ui.js` | The button and the panel, in a Shadow DOM. |
| `content.js` | Loaded last: puts the button on the page; on the page Zettelbranch itself loads (`#zettelbranch`), lets the panel open. |

What it does, and when:

- **Nothing until you click** the "Zettelbranch" button at the bottom right. No timers, no watching of the page. One exception, the end of your own click on Open new chat (below): on the page Zettelbranch loads then, the panel reads that chat and opens by itself.
- **Opening the panel** reads the conversation on screen: `GET /api/organizations` (once, to find your organization) and `GET …/chat_conversations/<id>?tree=True…`.
- **Branch** reads the list of your conversations (`GET …/chat_conversations_v2`, only `uuid` and `name` are kept) to find the next free address. If the chat is not in a tree yet, it asks for a tree name and a confirmation in browser dialogs, then renames the chat (`PUT …/chat_conversations/<id>` with `{"name": …}`).
- **Open new chat, from an earlier message** clicks claude.ai's own New chat link and types the prompt (a quoted transcript) into the message box. You read it and press Send yourself; the extension never does.
- **Open new chat, from the last message (Claude's reply)** asks claude.ai to copy the conversation into a new chat: `POST /claudeai-rpc/…/PerformAction` with `continueBranchAsNewChat` and two ids, the same action as claude.ai's own "continue branch as new chat". It then reads the new chat once a second until the copy is complete (15 seconds at most), renames it, and loads its page, `/chat/<its id>#zettelbranch`. If any of this fails, it falls back to the quoted transcript, and says why.
- **On that page**, and only there (`#zettelbranch`), the panel reads the chat and opens by itself if the branch is still to be started. **Start the branch** types the branch's first message (a header and instructions, no transcript) into the message box. You press Send.
- **Name this branch** renames a branch after a dialog where you can change the name.
- **Renames** go only to `<tree>/<address> · <topic>` titles; `api.js` refuses anything else before any request is made.
- **Nothing is stored**: the prompt waits in the tab's memory until the new chat opens. After claude.ai's copy, the page load wipes that memory: the new page rebuilds everything from claude.ai's own data (its title, its messages, your list of chats).

## The checks

Each command searches the code. The last part of most commands, `grep -vE '^[^:]+:[0-9]+: *//'`, hides comment lines, so the code may say in comments what it does not do. `tests/audit.mjs` runs every command below and the same checks in JavaScript (`cd tests && npm install && npm run audit`).

**1. Network calls only in `api.js`.** No `fetch`, `XMLHttpRequest`, beacon, WebSocket, image or script loads, dynamic imports, new windows or page loads anywhere else (`location.reload()`, behind the Reload now button, reloads the page you are on).

```sh
grep -nE 'fetch *\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|importScripts|new Image|\.src *=|import *\(|window\.open|location\.(assign|replace|href *=)' extension/*.js | grep -v '^extension/api.js:' | grep -vE '^[^:]+:[0-9]+: *//'
```

**2. `api.js` calls `fetch` in one place**, inside `request()`, which first checks the request against its list of five allowed calls, bodies included (`ALLOWED`, at the top of the file).

```sh
[ "$(grep -cE 'fetch *\(' extension/api.js)" = 1 ] || echo 'fetch is called in more than one place'
```

**3. Only GET and PUT, and one POST: claude.ai's copy of a chat.** Never DELETE or PATCH: no message is sent, nothing deleted. `POST` appears once, in the constant `FORK` of `api.js`. Before that request is sent, `request()` checks its body with `isForkBody`: exactly a `header` (the new chat's id, which Zettelbranch picks, and a random `sess_…` id for this one change, in the format claude.ai's page uses; not a login) and `continueBranchAsNewChat` (the chat's id and its last message's id). Anything else is refused. This action creates a chat; it cannot send a message or delete anything.

```sh
grep -niE "['\"](post|delete|patch|head|options)['\"]" extension/*.js | grep -vE '^[^:]+:[0-9]+: *//' | cut -d: -f1,3- | grep -vxF "extension/api.js:  const FORK = { method: 'POST', path: '/claudeai-rpc/anthropic.bard.api.v1alpha.ConversationService/PerformAction' };"
```

**4. One page load: the chat claude.ai just created.** `location.assign` appears once, in `openCreatedChat()` of `api.js`, and loads `/chat/<id>#zettelbranch` where `<id>` is `created`. `created` is set in one place: right after claude.ai accepted the copy, to the new chat's id. `openCreatedChat()` refuses any other id. So the extension never loads any page but a chat it has just had claude.ai make. (`#zettelbranch` never leaves the browser.)

```sh
grep -nE 'location\.(assign|replace)|location\.href *=' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//' | cut -d: -f1,3- | grep -vxF 'extension/api.js:    location.assign(`/chat/${created}#zettelbranch`);'
grep -n 'created = ' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//' | cut -d: -f1,3- | grep -vxF -e 'extension/api.js:  let created = null;' -e 'extension/api.js:    created = newId;'
```

**5. No other host than claude.ai.**

```sh
grep -nE '(https?|wss?)://' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//' | grep -oE "(https?|wss?)://[^ '\"\`)]*" | grep -v '^https://claude.ai$'
```

**6. No cookies, credentials or tokens.** The browser attaches your login to claude.ai's own requests by itself (`credentials: 'same-origin'`); the code never touches it.

```sh
grep -niE 'cookie|sessionKey|authorization|bearer' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
grep -n 'credentials:' extension/*.js | grep -v "credentials: 'same-origin'"
```

**7. No storage of any kind**: no web storage, IndexedDB, extension storage or caches.

```sh
grep -nE 'localStorage|sessionStorage|indexedDB|openDatabase|storage\.|caches\.' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**8. No HTML injection.** Text is put on the page with `textContent` only.

```sh
grep -nE 'innerHTML|outerHTML|insertAdjacentHTML|document\.write|DOMParser|createContextualFragment|srcdoc' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**9. No `innerText`** (so never `document.body.innerText`, which grabs the whole page).

```sh
grep -n 'innerText' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**10. Click listeners only.** No keyboard, input, paste or other listeners: it never reads what you type.

```sh
grep -n 'addEventListener' extension/*.js | grep -v "addEventListener('click'"
grep -nE '\.on[a-z]+ *=' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
grep -nE "['\"](keydown|keyup|keypress|input|beforeinput|change|composition[a-z]*|paste|copy)['\"]" extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**11. No watching of the page**: no MutationObserver or other observers.

```sh
grep -nE 'MutationObserver|IntersectionObserver|ResizeObserver' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**12. Nothing runs on its own.** No repeating timers or frame callbacks. `setTimeout` appears once, in a short wait helper used right after a click: for the new chat or the message box to appear (10 seconds at most), and between the reads of claude.ai's copy (once a second, 15 seconds at most).

```sh
grep -nE 'setInterval|requestAnimationFrame|requestIdleCallback' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
grep -n 'setTimeout' extension/*.js | grep -vF 'const sleep = (ms) => new Promise((r) => setTimeout(r, ms));'
```

**13. The panel opens by itself in one case only:** on the page Zettelbranch loads after claude.ai's copy, whose address ends with `#zettelbranch` (point 4). `content.js` reads `location.hash` once, at load, and only then calls `autoOpen()`, which reads that chat and opens the panel if the branch is still to be started. It types nothing: Start the branch is a click.

```sh
grep -n 'location\.hash' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//' | cut -d: -f1,3- | grep -vxF "extension/content.js:  if (location.hash === '#zettelbranch') globalThis.ZBUi.autoOpen();"
grep -n 'autoOpen' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//' | cut -d: -f1,3- | grep -vxF -e "extension/content.js:  if (location.hash === '#zettelbranch') globalThis.ZBUi.autoOpen();" -e 'extension/ui.js:  function autoOpen() {' -e 'extension/ui.js:  global.ZBUi = { mount, autoOpen };'
```

**14. No code from strings**: no `eval`, `new Function`, or timers given a string.

```sh
grep -nE "eval *\(|new Function|set(Timeout|Interval) *\( *['\"\`]" extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**15. No hidden calls.** No `window['fe' + 'tch']`-style access on global objects, which could slip a forbidden call past the searches above.

```sh
grep -nE '(window|globalThis|self|document|global|location|navigator) *\[' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**16. No extension APIs**: no messaging to a background script, no extension storage.

```sh
grep -nE '(chrome|browser)\.[a-zA-Z]' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**17. No messaging with the page's own scripts or other windows.**

```sh
grep -nE 'postMessage|BroadcastChannel|MessageChannel|dispatchEvent|CustomEvent' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**18. No clipboard.** `execCommand` only types the prompt into the message box, in one place (`fill()` in `branch.js`, used by Open new chat and Start the branch).

```sh
grep -ni 'clipboard' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
grep -n 'execCommand' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//' | grep -vF "document.execCommand('insertText', false, text);"
```

**19. Never presses Send.** No Send button, no key events, no form submit. The only click is on claude.ai's New chat link.

```sh
grep -nE 'chat-input-send|KeyboardEvent|requestSubmit|\.submit *\(' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
grep -n '\.click()' extension/*.js | grep -v 'newChatLink\.click()'
```

**20. The manifest asks for nothing**: no permissions, no background script, no access to other sites, no scripts in the page's own world, and every script is listed.

```sh
grep -nE '"(permissions|optional_permissions|host_permissions|optional_host_permissions|background|web_accessible_resources|externally_connectable|content_security_policy|world)"' extension/manifest.json
grep -n '"matches"' extension/manifest.json | grep -vF '"matches": ["https://claude.ai/*"],'
for f in extension/*.js; do grep -qF "\"$(basename "$f")\"" extension/manifest.json || echo "$f is not in the manifest"; done
```

## What the commands cannot prove

They prove that certain words are absent. Code can be written to dodge a search, so read it too: it is short. The parts that matter most are the top of `api.js` (the five calls, `ALLOWED` with `isForkBody`, and `openCreatedChat()`), and `open()`, `start()` and `fill()` in `branch.js` (what is typed into the message box). An LLM can do a first pass with the prompt below.

They also do not prove that the extension in your browser is this code. Load it from a copy of this repository at a tagged release, and compare the SHA-256 of each file with the ones published with the release.

## A prompt for an LLM audit

Copy the files to the clipboard with their names (macOS; on Linux use `xclip` instead of `pbcopy`):

```console
for f in extension/manifest.json extension/*.js; do printf '\n--- %s\n' "$f"; cat "$f"; done | pbcopy
```

Then paste this prompt, followed by the files:

> You are auditing a browser extension before I install it. It runs on claude.ai, where it can see my private conversations. Its claimed purpose: when I click its button, it copies the conversation into a new chat for me to send (from the last reply, by asking claude.ai to copy the chat itself, then loading the copy's page), and renames chats to tree addresses such as `oulipo/1a · Topic`. Read every file below in full, then answer:
>
> 1. Network: list every request the code can make (method, address, body), and every page it can load. Can any request reach a host other than claude.ai, or carry conversation text anywhere? Could any request send a message to Claude, delete something, or do anything other than rename a conversation and have claude.ai copy the conversation on screen into a new chat?
> 2. Credentials: does it read, store or send cookies, tokens or other credentials?
> 3. Storage: does it keep anything after the tab closes (web storage, IndexedDB, extension storage, caches, files)?
> 4. Actions without a click: does anything run on its own (timers, observers, event listeners other than clicks on its own buttons)? The claimed only exception is the page it loads itself after claude.ai's copy (`#zettelbranch`), where it reads that chat and opens its panel. Does it read what I type?
> 5. The page: does it inject HTML, run code from strings, talk to the page's scripts, or press Send?
> 6. The manifest: which permissions and sites does it ask for?
> 7. Obfuscation: is there any code that hides what it does (string-built property names, encoded strings, unusual indirection)?
> 8. Anything else surprising or risky, and whether the checks listed in AUDIT.md (summarized: network only in api.js, only GET and PUT plus one POST that asks claude.ai to copy a chat, one page load of the chat just created, claude.ai only, no credentials, no storage, no HTML injection, click listeners only, no observers, no repeating timers, the panel opening by itself only on that page, no eval, no extension APIs, never presses Send) hold.
>
> Quote file names and line numbers for every finding. End with a short verdict: safe to install, or not, and why.
