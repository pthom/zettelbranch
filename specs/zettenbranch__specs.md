# Zettelbranch

Browser extension (Chrome + Firefox, one codebase, Manifest V3) that turns claude.ai
conversations into a Zettelkasten-style tree: named branches with Luhmann-style
addresses (`1`, `1a`, `1a1`, `1b`...), visible links between them, and explicit
cross-references between distant branches.

Name: *Zettelkasten* (German "box of slips") + *branch* (Git). Inspired by Niklas
Luhmann's card file and Georges Perec's cross-referenced index cards.

Owner: Pascal (pthom), independent open-source developer. He works on other projects
in parallel: **work autonomously, in the background, without taking over his screen.**

Status: idea stage. Nothing exists yet.

## Why

claude.ai already stores each conversation as a tree (editing a message or retrying
creates a sibling), but only exposes it through `< 1/2 >` arrows. Branches are hidden,
easy to lose, unnamed, and cannot be linked. ChatGPT has "Branch in new chat" (a fork
into a separate conversation), but forks are not nested or linked either.

## Core design

**Branching = forking into a new claude.ai conversation.** The user picks a branch
point (any message). The extension extracts the conversation up to that point,
opens a new chat, and pre-fills a prompt containing that context. The user reviews
and sends it.

**State lives in claude.ai, not in the extension.** The extension should be stateless:

- The address goes in the conversation title: `1b1a · Zettelbranch`. The conversation
  list is the registry of the tree: children of `1b1` are the titles starting with `1b1`.
- A header goes in the first message of each branch, written at fork time: address,
  path to root (`1 › 1b › 1b1 › 1b1a`), and a short summary of the parent branch.
  The branch prompt can ask Claude to write that summary itself. Because it is plain
  text in the conversation, it is readable everywhere, including the mobile app,
  without the extension.
- The extension adds the dynamic part as an in-page banner at the top of the
  conversation: path to root, siblings, children, cross-references, each with a
  one-line summary, plus a "show whole tree" link.

A Zettelbranch must remain readable if the extension disappears.

**Cross-references** (renvois): an explicit link from one card to a distant one.
Storage format is an open question (probably an address mention in message text,
e.g. `→ 1a1`, parsed by the extension).

**Trigger from the Claude apps** (desktop/mobile cannot run extensions): the
extension reacts to a special URL marker (e.g. `https://claude.ai/chat/<id>#zb-branch`)
opened in the browser, and starts the branch flow. Resulting conversations sync back
to the apps. Firefox for Android supports extensions, so the same code may work on
mobile.

## Trust and auditability (hard requirements)

A self-audit proves nothing (malicious code can lie about itself), so make external
verification trivial:

- Short, readable code. No dependencies, no bundler, no minification, no build step:
  what is on GitHub is exactly what runs.
- Minimal permissions: claude.ai only. No other host.
- No network calls of any kind (`fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`...).
- No persistent storage of conversation content.
- Never inject conversation text with `innerHTML`; use `textContent` or DOM nodes.
- `AUDIT.md`: lists what the code never does, with the `grep` commands that prove it,
  plus a ready-to-use prompt for asking an LLM to audit the code.
- Before each branch, show a preview of the exact text that will be pasted.
- Releases from tagged GitHub versions, with SHA-256 of each file.

## Lessons from prior art (do not repeat)

`daniel-carvajal/claude-actions-extension` was reviewed and rejected. Its mistakes:
extracting via `document.body.innerText` (pulls in the sidebar), assigning roles by
alternating Human/Claude every 200 characters, dropping lines under 15 chars (kills
code), English-only UI-string filters (Pascal's UI is in French), `innerHTML`
injection, a `background.js` not declared in the manifest. Extract messages from the
DOM containers that distinguish user and assistant turns, independent of UI language.

## Known risks / open questions

- claude.ai DOM is undocumented and changes. Isolate all selectors in one module,
  test them against saved fixtures, fail loudly when they break.
- The sidebar only shows recent conversations. Check early whether the title-based
  registry needs the search or the full conversation list page.
- The message input is a rich-text editor: inserting text so the app's state actually
  updates must be verified on the real page.
- Renaming a conversation title programmatically must go through the UI.
- Chrome and Firefox MV3 differences (host permission grants, `browser` vs `chrome`
  namespace, Firefox needs `browser_specific_settings.gecko.id` for signing).

## Development workflow

1. **Fixtures first.** Pascal provides saved claude.ai pages (Ctrl+S) in
   `tests/fixtures/`: a simple conversation, one with an edited message (branch arrows),
   the conversation list. Build and unit-test extraction offline with jsdom.
2. **Real-page tests** in a dedicated browser profile, never Pascal's main browser:
   Playwright persistent context with `--load-extension` (Chromium), or `web-ext run`
   (Firefox), headless where possible. Pascal logs in once in that profile.
3. **Account hygiene.** Testing creates real conversations and uses Pascal's quota.
   Only work inside a dedicated claude.ai test project; ask before anything else on
   his account. If a CAPTCHA or bot check appears, stop and tell Pascal; never bypass it.
4. **Pascal's manual steps:** provide fixtures, log in to the test profile, load each
   release in his main browser (`chrome://extensions` / `about:debugging`).

## First milestone

Reliable extraction of the conversation (by role, with code blocks intact) from the
fixtures, plus a "branch from here" button that opens a new chat with a previewed,
correctly filled prompt. Addresses, banner, cross-references and app trigger come after.