# Origin conversation findings

The vault checked against the original design conversation
([zettelbranch__origin-conversation](zettelbranch__origin-conversation.md)), 2026-10-13.
Message numbers below refer to that file.

## Summary

The first spec is a faithful summary of the conversation: it was written by Claude in
message 42, and nothing in the conversation contradicts it. Since then the vault has
changed four things on purpose, and the conversation holds a few ideas the vault does not
have yet. One of them reopens a decided question (AD-3 below).

## Where the vault now differs from the conversation

| Topic | Conversation | Vault now | Why |
|---|---|---|---|
| Several trees | Message 44: "reserve the top-level numbers (1, 2, 3…) for independent trees", so `2a1` is in tree 2 | AD-1 = A: a tree name, `oulipo/1a` | The numbers option was not offered when AD-1 was decided. Reopened as AD-3 |
| Tests on the real site | Message 40: Playwright or `web-ext run` on claude.ai, logged in once, in a test profile | No script ever touches claude.ai | Consumer Terms, and Anthropic support did not clear it ([terms__findings](../../terms__findings.md)) |
| Distribution | Message 18: "publication on the stores from tagged versions" | TA-1 = A: GitHub only for now | A store listing makes it a product for others; stores maybe later |
| Code size | Message 18: "a single short file", a few hundred lines | Short code in a few small modules (selectors, API calls, UI) | Each risky part isolated in one file, which also makes it easier to audit |

## In the conversation, missing from the vault

- **Other prior art** (messages 2 and 6): Claude Branch Viewer (shows the native tree as
  a map, search, Markdown export), Nodea Tree for Claude (draws the tree, imports it into
  Nodea's web app), AI Chat Fork (one-click fork, ChatGPT, Claude and Gemini), Tangent
  (side conversations). All small, closed or unaudited at the time. Now listed in the
  spec.
- **Getting a conversation's link from the apps** (message 16): the app trigger needs the
  conversation's URL, and the simplest way to get it on desktop and on a phone was left
  to check. Now in the spec's risks.
- **Luhmann's structure cards** (message 36): the banner is meant as an automatically
  generated "structure card" (hub note), Luhmann's entry points listing the important
  cards on a theme. A useful way to explain the banner.
- **Perec's cards were tags, not links** (message 22): his "Peekaboo" system crossed
  keywords, like tags and faceted search; note-to-note links are Luhmann's. The spec's
  line "Georges Perec's cross-referenced index cards" was a bit off (reworded on
  2026-10-13). Perec's cross-
  references are in his books (the index of *La Vie mode d'emploi*). Keyword crossing
  could be a later feature idea.
- **Claude in Chrome** (messages 38 and 40): Anthropic's own browser agent, kept "for
  occasional checks" because it acts in your own browser and session. Since the terms
  forbid automation "except where we otherwise explicitly permit it", Anthropic's own
  agent may be a permitted way to run real-page checks *(to verify; not legal advice)*.
  It works only in Chrome, so a separate Chrome profile could be the test browser while
  Firefox stays your main one. It shows a visible window.

## Native branches on Pascal's account

In message 3 ("Version 2"), Pascal edited a message to try native branching. The JSON
has message indexes 0 to 47 for 44 messages, so four messages are hidden siblings, as an
edit would create.

Checked by Pascal, 2026-10-13: the original conversation shows `< 2/2 >` under message 3
(with retry, edit and copy buttons); the shared copy does not, since a share holds only
the chosen path. So on his merged account, a new edit is still visible as a native
branch. This contradicts the third-party claim that merged accounts hide new forks
([claude-ai__findings](../../claude-ai__findings.md#1-native-branching)). It does not change
the project: the native tree stays unnamed, unlinked and reachable only through the
arrows.

## Already settled by the conversation

| Point | Message | Vault decision |
|---|---|---|
| `Zettelbranch` in `1b1a · Zettelbranch` is the topic | 36 | AD-1 (Pascal confirmed) |
| Claude writes the parent's summary in the branch | 36 | FK-1 = A |
| The extension stores nothing; claude.ai holds the state | 36 | Core design |
| Path shown as `1 › 1b › 1b1 › 1b1a` | 36 | Core design |
| Addresses never renumbered | 24, 44 | AD-D1 |
| Fixtures: a simple conversation, one with an edited message, the conversation list | 38 | TS-1, development workflow |
| Self-audit proves nothing; `AUDIT.md` with greps; preview; SHA-256 | 18 | Trust section |
| Firefox: unlisted signing with `gecko.id`, or Developer Edition | 12 | TA-1 = A |

Not discussed in the conversation: calling claude.ai's API (DA-1), what branching from
your own message means (FK-3), where cross-references are written (XR-1), how much
context a branch carries (FK-2).

## Question raised

AD-3, tree identity: names or numbers? See
[addressing__questions](../first-review/addressing__questions.md#ad-3--tree-identity-names-or-numbers).
