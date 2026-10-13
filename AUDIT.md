# Auditing Zettelbranch

Zettelbranch is a browser extension that runs on claude.ai. It reads the conversation you are in, and when you click, it opens a new chat with a copy of it and renames chats to their tree addresses (`oulipo/1a · …`). It runs in the same page as your conversations, so it could in principle read and send them anywhere. This file shows how to check that it does not.

A program's own claims about itself prove nothing. So the code is kept short and plain, and this file lists what it never does, each with a command that proves it. Run them from the repository's root folder, in a terminal (macOS or Linux). Each command prints nothing when the point holds.

## What runs

Everything that runs is in `extension/`: `manifest.json` and eight scripts, about 1,850 lines in all (`wc -l extension/*`). No build step, no dependencies, no minified code: the files you read are the files the browser runs.

| File | What it does |
|---|---|
| `manifest.json` | Declares the scripts, for `https://claude.ai/*` only. No permissions. For Firefox, the address where Firefox looks for updates (point 18). |
| `api.js` | The only file that uses the network: four calls to claude.ai's own API, listed at its top. |
| `tree.js` | Titles and addresses (`oulipo/1b1`). Pure functions. |
| `conversation.js` | Turns the API's answer (or, as a fallback, the page) into a list of messages. |
| `prompt.js` | Builds the branch's first message, and parses one back. Pure functions. |
| `menu.js` | Renames the chat on screen through claude.ai's own title menu, as you would by hand. The only file that sends events to claude.ai's page (besides the click on the New chat link). |
| `branch.js` | The flow: read, branch, open the new chat, name it. |
| `ui.js` | The button and the panel, in a Shadow DOM. |
| `content.js` | Loaded last: puts the button on the page, nothing else. |

What it does, and when:

- **Nothing until you click** the "Zettelbranch" button at the bottom right. No watching of the page's content.
- **While the panel is open**, it follows the chat on screen: every 0.4 seconds it compares the tab's address with the page it shows, and when you move to another chat it reads that chat, exactly as its refresh button does (reads only, never a write). Hiding the panel stops it.
- **Opening the panel**, and its refresh button, read the conversation on screen: `GET /api/organizations` (once per page load, to find your organization) and `GET …/chat_conversations/<id>?tree=True…`, and at the same time the list of your conversations (`GET …/chat_conversations_v2`, only `uuid` and `name` kept), to show the chat's tree as links. Each link is a plain page load of that chat, its address ending with `#zettelbranch` (a marker that never leaves the browser); on a page loaded with that marker, `content.js` opens the panel at once, which reads as above.
- **Branch** reads the list of your conversations (`GET …/chat_conversations_v2`, only `uuid` and `name` are kept) to find the next free address. If the chat is not in a tree yet, it asks for a tree name and a confirmation in browser dialogs, then renames the chat (`PUT …/chat_conversations/<id>` with `{"name": …}`).
- **Open new chat** clicks claude.ai's own New chat link and types the prompt into the message box. You read it and press Send yourself; the extension never does.
- **Name this branch** renames the new chat after a dialog where you can change the name.
- **Renames** (the tree root during Branch, Name this branch, Rename this branch) go through claude.ai's own title menu on the chat on screen, as you would by hand, so the open tab shows the new name at once: `menu.js` opens the menu on the title, picks the item whose test id is exactly `rename-chat-trigger`, types the name into the field `name-chat` and presses Enter there. The name is then read back (`GET …/chat_conversations/<id>`, a few times within 3 seconds). If any step fails, the extension closes what it opened (Escape) and renames through the API instead (`PUT …/chat_conversations/<id>` with `{"name": …}`), as version 0.1.0 did.
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

**4. No other host than claude.ai.** One line holds another address: SVG's namespace name, `const NS = 'http://www.w3.org/2000/svg';` in `ui.js`, which `createElementNS` needs to draw the refresh icon. It is a name, never fetched; the command lets that exact line through and nothing else.

```sh
grep -nE '(https?|wss?)://' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//' | grep -vF "const NS = 'http://www.w3.org/2000/svg';" | grep -oE "(https?|wss?)://[^ '\"\`)]*" | grep -v '^https://claude.ai$'
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

**9. Click listeners only.** No keyboard, input, paste or other listeners: it never reads what you type. (The one line in `menu.js` that names key events lists those it sends, Enter or Escape: see 19.)

```sh
grep -n 'addEventListener' extension/*.js | grep -v "addEventListener('click'"
grep -nE '\.on[a-z]+ *=' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
grep -nE "['\"](keydown|keyup|keypress|input|beforeinput|change|composition[a-z]*|paste|copy)['\"]" extension/*.js | grep -vE '^[^:]+:[0-9]+: *//' | grep -v '^extension/menu.js:'
grep -nE "['\"](keydown|keyup|keypress|input|beforeinput|change|composition[a-z]*|paste|copy)['\"]" extension/menu.js | grep -vE '^[0-9]+: *//' | grep -vF "const types = k === 'Enter' ? ['keydown', 'keypress', 'keyup'] : ['keydown', 'keyup'];"
```

**10. No watching of the page**: no MutationObserver or other observers.

```sh
grep -nE 'MutationObserver|IntersectionObserver|ResizeObserver' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**11. Nothing runs on its own, but one check while the panel is open.** No frame callbacks. `setTimeout` appears once, in a short wait helper used right after a click (for the new chat to appear, 10 seconds at most). `setInterval` appears once, in `ui.js`: while the panel is open, every 0.4 seconds, `follow()` compares the tab's address with the page the panel shows and, on a change, calls `readOnScreen()`, the same function as the refresh button, which only reads. Hiding the panel stops it (`stopFollowing()`). The commands check that line, the body of `follow()`, and that the refresh button calls `readOnScreen`.

```sh
grep -nE 'requestAnimationFrame|requestIdleCallback' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
grep -n 'setTimeout' extension/*.js | grep -vF 'const sleep = (ms) => new Promise((r) => setTimeout(r, ms));'
[ "$(cat extension/*.js | grep -c 'setInterval')" = 1 ] || echo 'setInterval is not on exactly one line'
grep -n 'setInterval' extension/*.js | grep -vF 'extension/ui.js:' ; grep -n 'setInterval' extension/ui.js | grep -vF 'const startFollowing = () => (watch = watch || setInterval(follow, 400));'
[ "$(grep -A2 -xF '  function follow() {' extension/ui.js | tr -d ' \n')" = "functionfollow(){if(location.pathname!==seenPath)readOnScreen();}" ] || echo 'follow() is not exactly as described'
grep -qF "b.addEventListener('click', readOnScreen);" extension/ui.js || echo 'the refresh button does not call readOnScreen'
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
grep -nE 'postMessage|BroadcastChannel|MessageChannel|CustomEvent' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

**16. No clipboard.** `execCommand` only types: the prompt into the message box (`branch.js`), and a name into claude.ai's rename field (`menu.js`).

```sh
grep -ni 'clipboard' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
grep -n 'execCommand' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//' | grep -vF -e "extension/branch.js:" -e "extension/menu.js:"
grep -n 'execCommand' extension/branch.js | grep -vF "document.execCommand('insertText', false, p.text);"
grep -n 'execCommand' extension/menu.js | grep -vE '^[0-9]+: *//' | grep -vF "document.execCommand('insertText', false, name);"
```

**17. Never presses Send.** No Send button, no form submit. Two clicks only: on claude.ai's New chat link (`branch.js`), and on the Rename item of claude.ai's title menu (`menu.js`, see 19).

```sh
grep -nE 'chat-input-send|requestSubmit|\.submit *\(' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
grep -n '\.click()' extension/*.js | grep -v -e '^extension/branch.js:' -e '^extension/menu.js:'
grep -n '\.click()' extension/branch.js | grep -vF 'newChatLink.click();'
[ "$(grep -c '\.click()' extension/menu.js)" = 1 ] && grep -qF '    if (el) el.click();' extension/menu.js || echo 'menu.js does not click exactly once, in clickOn'
```

**18. The manifest asks for nothing**: no permissions, no background script, no access to other sites, no scripts in the page's own world, and every script is listed. Its only other address (version 0.1.2) is `update_url`, `https://raw.githubusercontent.com/pthom/zettelbranch/main/updates.json`: Firefox itself, not the extension, reads that file about once a day, to install a new signed version when there is one. So Firefox talks to GitHub; the extension still talks only to claude.ai. Chrome ignores it.

```sh
grep -nE '"(permissions|optional_permissions|host_permissions|optional_host_permissions|background|web_accessible_resources|externally_connectable|content_security_policy|world)"' extension/manifest.json
grep -n '"matches"' extension/manifest.json | grep -vF '"matches": ["https://claude.ai/*"],'
grep -noE 'https?://[^"]*' extension/manifest.json | grep -vE ':https://claude\.ai/\*$|:https://raw\.githubusercontent\.com/pthom/zettelbranch/main/updates\.json$'
for f in extension/*.js; do grep -qF "\"$(basename "$f")\"" extension/manifest.json || echo "$f is not in the manifest"; done
```

**19. Events to the page only for claude.ai's own rename menu** (version 0.1.1). Every event the extension sends to claude.ai's page is in `menu.js`, through three short functions, `pressOn` (a press of the main mouse button), `keyOn` (Enter or Escape) and `clickOn`. They reach only four elements, each found by its exact selector in `TARGETS`: the title button in `chat-title-split`, the open menu (Escape only), the item whose test id is exactly `rename-chat-trigger` (never by its label or its place: Delete sits next to it), and the field `name-chat` (Enter or Escape). Only six calls exist: press the title button; press and click the Rename item; Enter and Escape in the field; Escape on the menu. Never anything to the message box (`chat-input`), Send (`chat-input-send`), Delete (`delete-chat-trigger`) or any other element.

```sh
grep -nE 'dispatchEvent|new (Pointer|Mouse|Keyboard|Input|Focus|Touch|Wheel|Composition|Drag|Clipboard)?Event *\(' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//' | grep -v '^extension/menu.js:'
grep -nE 'dispatchEvent|new (Pointer|Mouse|Keyboard|Input|Focus|Touch|Wheel|Composition|Drag|Clipboard)?Event *\(' extension/menu.js | grep -vE '^[0-9]+: *//' | grep -vF -e "el.dispatchEvent(new PointerEvent('pointerdown', o));" -e "el.dispatchEvent(new MouseEvent('mousedown', o));" -e "el.dispatchEvent(new PointerEvent('pointerup', { ...o, buttons: 0 }));" -e "el.dispatchEvent(new MouseEvent('mouseup', { ...o, buttons: 0 }));" -e "for (const type of types) el.dispatchEvent(new KeyboardEvent(type, { key: k, code: k, keyCode: code, which: code, bubbles: true, cancelable: true }));"
grep -nE '(pressOn|keyOn|clickOn) *\(' extension/*.js | grep -v '^extension/menu.js:'
grep -vxF -e '  function pressOn(which) {' -e '  function keyOn(which, k) {' -e '  function clickOn(which) {' extension/menu.js | grep -oE "(pressOn|keyOn|clickOn) *\([^)]*\)" | grep -vxF -e "pressOn('titleButton')" -e "pressOn('renameItem')" -e "clickOn('renameItem')" -e "keyOn('nameField', 'Enter')" -e "keyOn('nameField', 'Escape')" -e "keyOn('menu', 'Escape')"
[ "$(sed -n '/^  const TARGETS = {$/,/^  };$/p' extension/menu.js | tr -d ' \n')" = "constTARGETS={titleButton:'[data-testid=\"chat-title-split\"]button[aria-haspopup=\"menu\"]',menu:'[role=\"menu\"]',renameItem:'[role=\"menu\"][data-testid=\"rename-chat-trigger\"]',nameField:'input[data-testid=\"name-chat\"]',};" ] || echo 'TARGETS is not exactly the four selectors'
grep -nE 'querySelector|getElementBy|closest *\(|elementFromPoint' extension/menu.js | grep -vE '^[0-9]+: *//' | grep -vF 'const target = (which) => document.querySelector(TARGETS[which]);'
grep -nE 'textContent|innerText|aria-label|querySelectorAll|\[[0-9]+\]|chat-input' extension/menu.js | grep -vE '^[0-9]+: *//'
grep -nE 'delete-chat-trigger|share-chat-trigger|star-chat-trigger' extension/*.js | grep -vE '^[^:]+:[0-9]+: *//'
```

## What the commands cannot prove

They prove that certain words are absent. Code can be written to dodge a search, so read it too: it is short. The parts that matter most are the top of `api.js` (the four calls and their checks), `open()` in `branch.js` (what is typed into the message box), and `menu.js` (the events sent to claude.ai's rename menu, about 100 lines). An LLM can do a first pass with the prompt below.

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
> 5. The page: does it inject HTML, run code from strings, talk to the page's scripts, or press Send? Which elements of the page does it send events to (clicks, key or pointer events), and could any of them reach the message box, Send, Delete or anything but claude.ai's rename menu?
> 6. The manifest: which permissions and sites does it ask for?
> 7. Obfuscation: is there any code that hides what it does (string-built property names, encoded strings, unusual indirection)?
> 8. Anything else surprising or risky, and whether the checks listed in AUDIT.md (summarized: network only in api.js, only GET and PUT, claude.ai only, no credentials, no storage, no HTML injection, click listeners only, no observers, one repeating check only while the panel is open, which compares the tab's address and reads as the refresh button does, no eval, no extension APIs, never presses Send, events only to claude.ai's title menu, its exact Rename item and its rename field) hold.
>
> Quote file names and line numbers for every finding. End with a short verdict: safe to install, or not, and why.
