# Status

Current state of the work and next steps. Updated by Claude at the end of each session.

**Last update:** 2026-10-13

## Done

- First review of [zettenbranch__specs](zettenbranch__specs.md).
- Vault set up: conventions and map in [README](README.md); findings and questions for
  seven subjects (general, data access, addressing, forking, cross-references, trust and
  audit, testing).
- `.gitignore` (`.obsidian/`, `.DS_Store`) and `CLAUDE.md` at the repo root.
- Spec file itself unchanged so far.

## Waiting on Pascal

1. **Answer the open questions**, starting with DA-1 in
   [data-access__questions](data-access__questions.md). The full list is in the
   [README](README.md#open-questions).
2. **Original design conversation.** The share link
   (`https://claude.ai/share/b6ff02e2-cfa2-49f7-a7f5-8557f0ebca66`) is blocked by a
   Cloudflare bot check for non-browser fetches; not bypassed, per the spec's rule.
   Workaround: open it in your browser, select all, copy, and paste into
   `specs/zettenbranch__origin-conversation.md`. Commit it or not, your choice.

## Next for Claude

1. When the original conversation is available: check every finding against it, mark
   what it already settled, and drop or adjust questions accordingly.
2. As answers come in: fold each decision into the spec, set the question to `decided`,
   update the README's open-questions table.
3. After FK-1: draft the branch prompt in `forking__prompt.md`.
4. If ZB-2 = A: plan the Milestone 0 spike (title renaming and automatic naming, full
   conversation list, message box insertion).

## Session notes

- 2026-10-13: Claude Code warned "transcript saving is off — inherited
  CLAUDE_CODE_CHILD_SESSION marker". Cause: VS Code itself had
  `CLAUDE_CODE_CHILD_SESSION=1` in its environment (probably launched from inside a
  Claude Code session), so every VS Code terminal inherits it and the session cannot be
  resumed. Fix: quit VS Code completely (Cmd+Q) and relaunch it from the Dock or
  Spotlight, or start Claude with `env -u CLAUDE_CODE_CHILD_SESSION claude`.
