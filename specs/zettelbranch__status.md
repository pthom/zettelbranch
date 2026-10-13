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
- Spike P0 built in `spike/` and tested offline on a hand-made sample, with all network
  blocked. Not yet run on the real page: it waits for Pascal's files.

## Waiting on Pascal

1. **Save the two P0 files** into `spike/out/`: `share-page.html` ("Webpage, Complete",
   without scrolling first) and `snapshot.json`. How: either the DevTools steps in
   [milestone-0__findings](milestone-0__findings.md#files-pascal-saves), or open
   `https://claude.ai/api/chat_snapshots/b6ff02e2-cfa2-49f7-a7f5-8557f0ebca66?rendering_mode=messages&render_all_tools=true`
   in the browser and save it.
2. **Confirm TS-2 = C** (sign in to the test profile any way you like), see
   [testing__questions](testing__questions.md).
3. **FK-3** (branching from your own message).
4. **Conversation:** `CLAUDE.md` versus Claude's project memory (ZB-3).

## Next for Claude

1. Write plain explanations, in the question files, for DA-1 (is calling claude.ai's
   API secure and stable enough?), DA-D1 (how the prompt reaches the new chat) and TA-1
   (how people install the extension).
2. When the P0 files are there: run `cd spike && npm run p0 && node snapshot-to-md.mjs`,
   fix the selectors offline, fill in the P0 results in
   [milestone-0__findings](milestone-0__findings.md).
3. With the original conversation available: check every finding against it, mark what
   it already settled.
4. Build the probe panel of the spike extension (P1 to P8, Pascal clicks).

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
