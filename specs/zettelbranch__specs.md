# Zettelbranch

Browser extension (Chrome + Firefox, one codebase, Manifest V3) that turns claude.ai
conversations into a Zettelkasten-style tree: named branches with Luhmann-style
addresses (`1`, `1a`, `1a1`, `1b`...), visible links between them, and explicit
cross-references between distant branches.

Name: *Zettelkasten* (German "box of slips") + *branch* (Git). Inspired by Niklas
Luhmann's card file, with its branching addresses and links between cards, and by
Georges Perec: the keyword card systems he built as a documentalist, and the
cross-references (renvois) that run through his books.

Owner: Pascal (pthom), independent open-source developer. Working rules for Claude
live in `CLAUDE.md` at the repo root, not here.

Status: idea stage. Nothing exists yet.

## Why

claude.ai stores each conversation as a tree (editing a message or retrying creates a
sibling), but only exposes it through `< 1/2 >` arrows. Branches are hidden, easy to
lose, unnamed, and cannot be linked. On the new "one Claude" experience (chat and
Cowork merged, rolling out since 2026-09), "Branching a conversation from an earlier
point isn't available" (Anthropic help center). Third parties report that new edits are
hidden there, but on Pascal's account an edit made on 2026-10-13 still shows its
`< 2/2 >` arrows. ChatGPT has "Branch in new chat" (a fork into a separate
conversation), but forks are not nested or linked either.

Pascal's account is on the new experience, which every account ends up on: it is the
target. See [claude-ai__findings](claude-ai__findings.md).

## Core design

**Branching = forking into a new claude.ai conversation.** The user picks a branch
point (any message). From one of Claude's replies, the new chat continues after it.
From the user's own message, the new chat is an alternative to it: the context is
everything before it, and the message is pre-filled for the user to change (sent
unchanged, it gets a fresh answer). The extension extracts the conversation up to that point,
opens a new chat (in the parent's project, if the parent is in an old-style chat
project), and pre-fills a prompt containing that
context. The user reviews and sends it. The prompt reaches the new chat inside the same
page, held in the extension's memory (works: Milestone 0, P3). If a real page load turns out to be needed, it is
parked in the browser's memory-only session storage, erased when the browser closes.
Never in the address bar, never on disk.

**State lives in claude.ai, not in the extension.** The extension should be stateless:

- The address goes in the conversation title, as `<tree>/<address> · <topic>`, for
  example `oulipo/1a · Writing lipograms` or `zb/1b1a · Zettelbranch`.
  - The tree is a short name (`oulipo`, `zb`) chosen when the tree starts; the preview
    proposes one.
  - The topic is claude.ai's automatic title by default; you can change it when you
    name the branch.
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

**Cross-references** (renvois): an explicit link from one card to a distant one. You
write it in your own messages, as part of a normal prompt: `→ 2b` within a tree,
`→ oulipo/2b` across trees; `->` works too, since `→` is awkward to type. It costs no
extra message and stays readable as plain text. The extension turns it into a link in
sent messages, and a branch's header can carry a "See also" line at fork time.
Backlinks (which branches point here) come from reading the tree's conversations
through the API, only when you ask for them.

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
- Network: only same-origin requests to claude.ai's own API, all in one file that lists
  the few addresses it calls, provable by grep. Reads, plus renaming conversations;
  never sending messages, never deleting. No other host, ever (`fetch`,
  `XMLHttpRequest`, `WebSocket`, `sendBeacon`, image or link loads...).
- The API is undocumented and can change: if an answer does not look as expected, the
  extension says so clearly ("claude.ai changed, Zettelbranch needs an update"). Basic
  branching (copy from the page, fill the new chat) keeps working without the API; only
  the whole tree, banner summaries and backlinks pause.
- Never read, store or send claude.ai credentials or session tokens: no `cookies`
  permission, no `document.cookie`. Anthropic support named this as the line not to
  cross ([terms__findings](terms__findings.md)).
- No persistent storage of conversation content.
- Never inject conversation text with `innerHTML`; use `textContent` or DOM nodes.
- The extension acts only when the user clicks. Nothing is sent automatically.
- It reads messages once they are part of the conversation, never while you type: no
  keyboard or input listeners. It writes into the message box only when you branch.
- `AUDIT.md`: lists what the code never does, with the `grep` commands that prove it,
  plus a ready-to-use prompt for asking an LLM to audit the code.
- Before each branch, show a preview of the exact text that will be pasted.
- Releases from tagged GitHub versions, with SHA-256 of each file. Distribution through
  GitHub only: Chrome users load the folder ("Load unpacked"), Firefox users install a
  Mozilla-signed unlisted `.xpi`. Store listings maybe later: a public listing makes it a
  product others use, no longer just personal use.

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

Also seen in the original conversation: Claude Branch Viewer (the native tree as a map),
Nodea Tree for Claude (imports the tree into Nodea's web app), AI Chat Fork, Tangent. None
has readable addresses, cross-references, or code short enough to audit.

## Known risks / open questions

- claude.ai DOM is undocumented and changes. Isolate all selectors in one module,
  test them against saved fixtures, fail loudly when they break.
- The page renders only part of a long conversation: a virtualized list, 11 of 80
  messages in one of Pascal's chats (Milestone 0, P6). So extraction reads the
  conversation through the API when it answers as expected, and from the page otherwise.
- The sidebar only shows recent conversations (14 of Pascal's 63). The registry reads
  the full list through the API, which returns all of them in one request (Milestone 0,
  P5).
- The message input is a rich-text editor. One `execCommand('insertText')` call works on
  the real page: Send enables, and the sent message is exact, line breaks and indentation
  included, up to at least 100,000 characters, which stay inline and reach the model
  (Milestone 0, P1, P2). A paste would turn long text into an attachment; the extension
  never pastes.
- Renaming goes through the API; the UI is the fallback. An API rename works, even
  before the first reply ends, and survives claude.ai's automatic title (Milestone 0,
  P4). But the open tab keeps showing the old title until it reloads, and Pascal took
  that for a failed rename (P8). So each rename ends with a notice and a "Reload now"
  button (M1-4).
- claude.ai exists in two versions during the rollout, with different internal APIs.
  Everything that talks to claude.ai lives in one file; fixtures record which version
  they come from. The legacy REST API still answers on Pascal's merged account (P5).
- claude.ai projects are being redesigned. On Pascal's account a new project is a
  Claude Code project: one coordinator conversation, with "threads" that Claude starts as
  cloud coding sessions. Zettelbranch targets ordinary chats; chat projects will be
  "upgraded" later, and branching inside them must be looked at then.
- The app trigger needs the conversation's URL: check the simplest way to get it from
  the Claude apps, on desktop and on a phone.
- Chrome and Firefox MV3 differences (host permission grants, `browser` vs `chrome`
  namespace, Firefox needs `browser_specific_settings.gecko.id` for signing).

## Development workflow

No script or automated browser ever touches claude.ai: Anthropic's Consumer Terms
forbid automated access, and support did not clear automated tests
([terms__findings](terms__findings.md)).

1. **Fixtures first.** Throwaway ordinary chats in the test tree `zbtest` (titles start
   with `zbtest/`, deleted after each test session),
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

Done on 2026-10-13: a short spike on the unknowns that could change the design. Every
probe passed. What it established:
[claude-ai__findings](claude-ai__findings.md#9-checked-on-pascals-account-milestone-0);
the plan and the full results are in the [done log](done/README.md). The throwaway code
in `spike/` is deleted when Milestone 1 starts, and stays in git history.

## First milestone

The first everyday version, decided on 2026-10-13 (M1-1 to M1-4). A Zettelbranch button
at the bottom right opens a list of the conversation's messages; you pick the branch
point, read a preview of the exact first message, and a new chat opens with it in the
box. Branches carry their address from the start: the parent becomes a tree root if
needed, and once Claude has replied you click "Name this branch", edit the proposed
name if you like, and a notice offers to reload so the open tab shows it. A button on
each message, the banner, cross-references and the app trigger come later. Plan:
[milestone-1__specs](milestone-1__specs.md).

From Milestone 0: extraction reads the conversation through the API (the page holds only
part of a long chat); the prompt goes into the message box in one `execCommand` call; the
new chat opens through the app's own New chat link, the prompt held in memory.
