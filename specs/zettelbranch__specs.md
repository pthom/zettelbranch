# Zettelbranch

Browser extension (Chrome + Firefox, one codebase, Manifest V3) that turns claude.ai
conversations into a Zettelkasten-style tree: named branches with Luhmann-style
addresses (`1`, `1a`, `1a1`, `1b`...), visible links between them, and explicit
cross-references between distant branches.

Name: *Zettelkasten* (German "box of slips") + *branch* (Git). Inspired by Niklas
Luhmann's card file and Georges Perec's cross-referenced index cards.

Owner: Pascal (pthom), independent open-source developer. Working rules for Claude
live in `CLAUDE.md` at the repo root, not here.

Status: idea stage. Nothing exists yet.

## Why

claude.ai stores each conversation as a tree (editing a message or retrying creates a
sibling), but only exposes it through `< 1/2 >` arrows. Branches are hidden, easy to
lose, unnamed, and cannot be linked. On the new "one Claude" experience (chat and
Cowork merged, rolling out since 2026-09), it is worse: "Branching a conversation from
an earlier point isn't available" (Anthropic help center), and new edits are reported
to be stored but hidden. ChatGPT has "Branch in new chat" (a fork into a separate
conversation), but forks are not nested or linked either.

Pascal's account is on the new experience, which every account ends up on: it is the
target. See [claude-ai__findings](claude-ai__findings.md).

## Core design

**Branching = forking into a new claude.ai conversation.** The user picks a branch
point (any message). The extension extracts the conversation up to that point,
opens a new chat in the parent's project, and pre-fills a prompt containing that
context. The user reviews and sends it.

**State lives in claude.ai, not in the extension.** The extension should be stateless:

- The address goes in the conversation title, as `<tree>/<address> · <topic>`, for
  example `oulipo/1a · Writing lipograms` or `zb/1b1a · Zettelbranch`.
  - The tree is a short name (`oulipo`, `zb`) chosen when the tree starts; the preview
    proposes one.
  - The topic is claude.ai's automatic title; the extension only adds the prefix.
  - The first branch from a conversation that is not in a tree yet renames it to the
    root, `<tree>/1 · <its title>`. The new chat becomes `<tree>/1a`.
- The conversation list is the registry of the tree. Addresses are split into number
  and letter segments (`1b10` = `[1, b, 10]`): a child has its parent's segments plus
  exactly one more. Never compare addresses as string prefixes.
- Addresses are permanent: never renumbered; deleted branches leave gaps. After `z`,
  letters continue `aa`, `ab`… Duplicate addresses (two devices forking at once) are
  flagged in the banner, not prevented.
- A header goes in the first message of each branch, written at fork time: address,
  path to root (`zb/1 › 1b › 1b1 › 1b1a`), and the fork point (message number and a
  short quote). Because it is plain text in the conversation, it is readable everywhere,
  including the mobile app, without the extension.
- The summary of the parent is written by Claude: the branch prompt asks it to start its
  first reply with a short summary in a fixed format the extension can parse.
- The branch carries the full transcript from the root to the fork point. "Summary only"
  and "last N turns" modes come later. Branching from a branch flattens the transcript
  into one sequence instead of nesting it.
- The extension adds the dynamic part as an in-page banner at the top of the
  conversation: path to root, siblings, children, cross-references, each with a
  one-line summary, plus a "show whole tree" link.

The exact prompt, header and summary formats: [forking__prompt](forking__prompt.md).

A Zettelbranch must remain readable if the extension disappears.

**Cross-references** (renvois): an explicit link from one card to a distant one.
Storage format is an open question (XR-1; probably an address mention in message text,
e.g. `→ 1a1` within a tree and `→ oulipo/1a1` across trees, parsed by the extension).

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
  Under discussion (DA-1): allowing same-origin calls to claude.ai's own API, in one
  file, provable by grep.
- Never read, store or send claude.ai credentials or session tokens: no `cookies`
  permission, no `document.cookie`. Anthropic support named this as the line not to
  cross ([terms__findings](terms__findings.md)).
- No persistent storage of conversation content.
- Never inject conversation text with `innerHTML`; use `textContent` or DOM nodes.
- The extension acts only when the user clicks. Nothing is sent automatically.
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

`lugia19/Claude-QoL` (GPL-3.0) already forks a chat into a new one, verbatim or
summarized, through claude.ai's internal API. It has no addresses, tree or
cross-references. Useful as a reference for how claude.ai behaves; do not copy its code.

## Known risks / open questions

- claude.ai DOM is undocumented and changes. Isolate all selectors in one module,
  test them against saved fixtures, fail loudly when they break.
- The page renders only part of a long conversation (a virtualized list; the new
  experience first loads only recent messages) *(to verify)*. Extraction from the page
  alone may miss messages; the API would not (DA-1).
- The sidebar only shows recent conversations. Check early whether the title-based
  registry needs the search or the full conversation list page.
- The message input is a rich-text editor: inserting text so the app's state actually
  updates must be verified on the real page. Long pasted text may become an attachment,
  and on the new experience may fall outside the model's context *(to verify)*.
- Renaming a conversation title programmatically must go through the UI, unless DA-1
  allows the API (DA-2 = A: reads plus renaming, nothing else).
- claude.ai exists in two versions during the rollout, with different internal APIs.
  Everything that talks to claude.ai lives in one file; fixtures record which version
  they come from.
- Chrome and Firefox MV3 differences (host permission grants, `browser` vs `chrome`
  namespace, Firefox needs `browser_specific_settings.gecko.id` for signing).

## Development workflow

No script or automated browser ever touches claude.ai: Anthropic's Consumer Terms
forbid automated access, and support did not clear automated tests
([terms__findings](terms__findings.md)).

1. **Fixtures first.** Throwaway conversations in a dedicated claude.ai test project,
   saved by hand (Cmd+S, plus the API response when useful), scrubbed of account details
   and sidebar titles, committed in `tests/fixtures/`: a simple conversation, one with
   an edited message, the conversation list. Build and unit-test extraction offline with
   jsdom, and in a headless browser that serves the saved files with all network
   blocked.
2. **Real-page checks by hand.** Pascal loads the extension in a dedicated browser
   profile, never his main one, and clicks through a short checklist.
3. **Pascal's manual steps:** save fixtures, run the real-page checklist, load each
   release in his main browser (`chrome://extensions` / `about:debugging`).

## Milestone 0

A short spike before Milestone 1 on the unknowns that can change the design: title
renaming and automatic naming, reading the full conversation list, inserting text into
the message box (including long text). Throwaway code. Plan:
[milestone-0__specs](milestone-0__specs.md).

## First milestone

Reliable extraction of the conversation (by role, with code blocks intact) from the
fixtures, plus a "branch from here" button that opens a new chat with a previewed,
correctly filled prompt. Addresses, banner, cross-references and app trigger come after.
