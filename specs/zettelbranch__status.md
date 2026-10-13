# Status

Current state of the work and next steps. Updated by Claude at the end of each session.

**Last update:** 2026-10-13

## Done

- First review of [zettelbranch__specs](zettelbranch__specs.md); vault set up
  ([README](README.md)).
- First answers folded into the spec: ZB-1 (files renamed to `zettelbranch__`), ZB-2,
  ZB-3, AD-1, AD-2, FK-1, FK-2, DA-2 (if DA-1 = A), TS-1. The spec's "Why" now covers
  the "one Claude" merge, and its prior art lists Claude QoL.
- Branch prompt draft: [forking__prompt](forking__prompt.md).
- Milestone 0 plan: [milestone-0__specs](milestone-0__specs.md).
- Public research on claude.ai, its internal API and the extension platforms:
  [claude-ai__findings](claude-ai__findings.md).
- Anthropic support asked about the extension; answer and resulting rules in
  [terms__findings](terms__findings.md). Decided: no script or automated browser ever
  touches claude.ai; the extension never touches credentials.
- Pascal's account is most likely already on the "one Claude" experience; it is the
  target.
- Spike P0 done, offline, on the share page Pascal saved by hand: 44 of 44 messages
  extracted, roles right, text 99.9% identical to the JSON. Results in
  [milestone-0__findings](milestone-0__findings.md#results). The original conversation is
  in [zettelbranch__origin-conversation](zettelbranch__origin-conversation.md).
- The vault checked against the original conversation:
  [origin-conversation__findings](origin-conversation__findings.md). Prior art and the
  app-link check added to the spec. AD-3 decided (tree names). Native `< 2/2 >` arrows
  still show on Pascal's merged account.
- All open questions decided in chat with plain explanations (DA-1, DA-D1, TA-1, TS-2,
  FK-3, ZB-3, XR-1) and folded into the spec. The README's open-questions table is empty.

## Waiting on Pascal

1. Nothing right now. Test profile ready (Chrome, "Zettelbranch test"); test
   conversations will be ordinary `zbtest/` chats, deleted by Pascal after each probe
   session.

## Next for Claude

1. Small P0 fixes for Milestone 1: file cards' names, web-search source chips.
2. Build the probe panel of the spike extension (P1 to P8, Pascal clicks). The API calls
   go in one file, reads plus renaming only, no cookies, no typing listeners.

## Session notes

- 2026-10-13: Claude Code warned "transcript saving is off — inherited
  CLAUDE_CODE_CHILD_SESSION marker". Cause: VS Code itself had
  `CLAUDE_CODE_CHILD_SESSION=1` in its environment (probably launched from inside a
  Claude Code session), so every VS Code terminal inherits it and the session cannot be
  resumed. Fix: quit VS Code completely (Cmd+Q) and relaunch it from the Dock or
  Spotlight, or start Claude with `env -u CLAUDE_CODE_CHILD_SESSION claude`.
- 2026-10-13: a subagent's `find ~` set off macOS "access your Desktop" prompts; Pascal
  refused them. Rule added to `CLAUDE.md`: never search the home folder.
- 2026-10-13: the share link's page loads for a plain fetch, but the data it needs
  (`/api/chat_snapshots/…`) is behind a Cloudflare challenge. Not bypassed.
