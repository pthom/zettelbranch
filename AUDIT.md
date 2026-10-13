# Auditing Zettelbranch

Zettelbranch is a browser extension that runs on claude.ai. It reads the conversation you are in, and when you click, it opens a new chat with a copy of it and renames chats to their tree addresses (`oulipo/1a · …`). It runs in the same page as your conversations, so it could in principle read and send them anywhere. This file shows how to check that it does not.

A program's own claims about itself prove nothing. So the code is kept short and plain, and this file lists what it never does, each with a command that proves it. Run them from the repository's root folder, in a terminal (macOS or Linux). Each command prints nothing when the point holds.

## What runs

Everything that runs is in `extension/`: `manifest.json` and seven scripts, about 1,450 lines in all (`wc -l extension/*`). No build step, no dependencies, no minified code: the files you read are the files the browser runs.

| File | What it does |
|---|---|
| `manifest.json` | Declares the scripts, for `https://claude.ai/*` only. No permissions. |
| `api.js` | The only file that uses the network: four calls to claude.ai's own API, listed at its top. |
| `tree.js` | Titles and addresses (`oulipo/1b1`). Pure functions. |
| `conversation.js` | Turns the API's answer (or, as a fallback, the page) into a list of messages. |
| `prompt.js` | Builds the branch's first message, and parses one back. Pure functions. |
| `branch.js` | The flow: read, branch, open the new chat, name it. |
| `ui.js` | The button and the panel, in a Shadow DOM. |
| `content.js` | Loaded last: puts the button on the page, nothing else. |

What it does, and when:

- **Nothing until you click** the "Zettelbranch" button at the bottom right. No timers, no watching of the page.
- **Opening the panel** reads the conversation on screen: `GET /api/organizations` (once, to find your organization) and `GET …/chat_conversations/<id>?tree=True…`.
- **Branch** reads the list of your conversations (`GET …/chat_conversations_v2`, only `uuid` and `name` are kept) to find the next free address. If the chat is not in a tree yet, it asks for a tree name and a confirmation in browser dialogs, then renames the chat (`PUT …/chat_conversations/<id>` with `{"name": …}`).
- **Open new chat** clicks claude.ai's own New chat link and types the prompt into the message box. You read it and press Send yourself; the extension never does.
- **Name this branch** renames the new chat after a dialog where you can change the name.
- **Renames** go only to `<tree>/<address> · <topic>` titles; `api.js` refuses anything else before any request is made.
- **Nothing is stored**: the prompt waits in the tab's memory until the new chat opens.

## The checks

Each command searches the code. The last part of most commands, `grep -vE '^[^:]+:[0-9]+: *//'`, hides comment lines, so the code may say in comments what it does not do. `tests/audit.mjs` runs every command below and the same checks in JavaScript (`cd tests && npm install && npm run audit`).

**1. Network calls only in `api.js`.** No `fetch`, `XMLHttpRequest`, beacon, WebSocket, image or script loads, dynamic imports, new windows or page loads anywhere else.

```sh
grep -nE 'fetch *\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|importScripts|new Image|\.src *=|import *\(|window\.open|location\.(assign|replace|href *=)' extension/*.js | grep -v '^extension/api.js:' | grep -vE '^[^:]+:[0-9]+: *//'
```

**2. `api.js` calls `fetch` in one place**, inside `request()`, which first checks the request against its list of four allowed calls (`ALLOWED`, at the top of the file).

```sh
[ "$(grep -cE 'fetch *\(' extension/api.js)" = 1 ] || echo 'fetch is called in more than one place'
```

**3. Only GET and PUT.** Never POST, DELETE or PATCH: no message is sent, nothing deleted.

```sh
grep -niE "['\"](post|delete|patch|head|options)['\"]" extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**4. No other host than claude.ai.**

```sh
grep -nE '(https?|wss?)://' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//' | grep -oE "(https?|wss?)://[^ '\"\`)]*" | grep -v '^https://claude.ai$'
```

**5. No cookies, credentials or tokens.** The browser attaches your login to claude.ai's own requests by itself (`credentials: 'same-origin'`); the code never touches it.

```sh
grep -niE 'cookie|sessionKey|authorization|bearer' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
grep -n 'credentials:' extension/*.js | grep -v "credentials: 'same-origin'"
```

**6. No storage of any kind**: no web storage, IndexedDB, extension storage or caches.

```sh
grep -nE 'localStorage|sessionStorage|indexedDB|openDatabase|storage\.|caches\.' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**7. No HTML injection.** Text is put on the page with `textContent` only.

```sh
grep -nE 'innerHTML|outerHTML|insertAdjacentHTML|document\.write|DOMParser|createContextualFragment|srcdoc' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**8. No `innerText`** (so never `document.body.innerText`, which grabs the whole page).

```sh
grep -n 'innerText' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**9. Click listeners only.** No keyboard, input, paste or other listeners: it never reads what you type.

```sh
grep -n 'addEventListener' extension/*.js | grep -v "addEventListener('click'"
grep -nE '\.on[a-z]+ *=' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
grep -nE "['\"](keydown|keyup|keypress|input|beforeinput|change|composition[a-z]*|paste|copy)['\"]" extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**10. No watching of the page**: no MutationObserver or other observers.

```sh
grep -nE 'MutationObserver|IntersectionObserver|ResizeObserver' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**11. Nothing runs on its own.** No repeating timers or frame callbacks. `setTimeout` appears once, in a short wait helper used right after a click (for the new chat to appear, 10 seconds at most).

```sh
grep -nE 'setInterval|requestAnimationFrame|requestIdleCallback' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
grep -n 'setTimeout' extension/*.js | grep -vF 'const sleep = (ms) => new Promise((r) => setTimeout(r, ms));'
```

**12. No code from strings**: no `eval`, `new Function`, or timers given a string.

```sh
grep -nE "eval *\(|new Function|set(Timeout|Interval) *\( *['\"\`]" extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**13. No hidden calls.** No `window['fe' + 'tch']`-style access on global objects, which could slip a forbidden call past the searches above.

```sh
grep -nE '(window|globalThis|self|document|global|location|navigator) *\[' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**14. No extension APIs**: no messaging to a background script, no extension storage.

```sh
grep -nE '(chrome|browser)\.[a-zA-Z]' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**15. No messaging with the page's own scripts or other windows.**

```sh
grep -nE 'postMessage|BroadcastChannel|MessageChannel|dispatchEvent|CustomEvent' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**16. No clipboard.** `execCommand` only types the prompt into the message box.

```sh
grep -ni 'clipboard' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
grep -n 'execCommand' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//' | grep -vF "document.execCommand('insertText', false, p.text);"
```

**17. Never presses Send.** No Send button, no key events, no form submit. The only click is on claude.ai's New chat link.

```sh
grep -nE 'chat-input-send|KeyboardEvent|requestSubmit|\.submit *\(' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
grep -n '\.click()' extension/*.js | grep -v 'newChatLink\.click()'
```

**18. The manifest asks for nothing**: no permissions, no background script, no access to other sites, no scripts in the page's own world, and every script is listed.

```sh
grep -nE '"(permissions|optional_permissions|host_permissions|optional_host_permissions|background|web_accessible_resources|externally_connectable|content_security_policy|world)"' extension/manifest.json
grep -n '"matches"' extension/manifest.json | grep -vF '"matches": ["https://claude.ai/*"],'
for f in extension/*.js; do grep -qF "\"$(basename "$f")\"" extension/manifest.json || echo "$f is not in the manifest"; done
```

## What the commands cannot prove

They prove that certain words are absent. Code can be written to dodge a search, so read it too: it is short. The parts that matter most are the top of `api.js` (the four calls and their checks) and `open()` in `branch.js` (what is typed into the message box). An LLM can do a first pass with the prompt below.

They also do not prove that the extension in your browser is this code. Load it from a copy of this repository at a tagged release, and compare the SHA-256 of each file with the ones published with the release.

## A prompt for an LLM audit

Copy the files to the clipboard with their names (macOS; on Linux use `xclip` instead of `pbcopy`):

```console
for f in extension/manifest.json extension/*.js; do printf '\n--- %s\n' "$f"; cat "$f"; done | pbcopy
```

Then paste this prompt, followed by the files:

> You are auditing a browser extension before I install it. It runs on claude.ai, where it can see my private conversations. Its claimed purpose: when I click its button, it copies the conversation into a new chat for me to send, and renames chats to tree addresses such as `oulipo/1a · Topic`. Read every file below in full, then answer:
>
> 1. Network: list every request the code can make (method, address, body). Can any request reach a host other than claude.ai, or carry conversation text anywhere? Could any request send a message to Claude, delete something, or change anything other than a conversation's title?
> 2. Credentials: does it read, store or send cookies, tokens or other credentials?
> 3. Storage: does it keep anything after the tab closes (web storage, IndexedDB, extension storage, caches, files)?
> 4. Actions without a click: does anything run on its own (timers, observers, event listeners other than clicks on its own buttons)? Does it read what I type?
> 5. The page: does it inject HTML, run code from strings, talk to the page's scripts, or press Send?
> 6. The manifest: which permissions and sites does it ask for?
> 7. Obfuscation: is there any code that hides what it does (string-built property names, encoded strings, unusual indirection)?
> 8. Anything else surprising or risky, and whether the checks listed in AUDIT.md (summarized: network only in api.js, only GET and PUT, claude.ai only, no credentials, no storage, no HTML injection, click listeners only, no observers, no repeating timers, no eval, no extension APIs, never presses Send) hold.
>
> Quote file names and line numbers for every finding. End with a short verdict: safe to install, or not, and why.
