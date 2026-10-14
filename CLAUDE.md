# Zettelbranch

Browser extension for claude.ai that branches conversations into a tree. Released on GitHub (0.1.x); the code is in `extension/`, the offline tests in `tests/`.

## Start here

1. `specs/zettelbranch__status.md`: current state and next steps.
2. `specs/README.md`: vault conventions and open questions.
3. `specs/zettelbranch__specs.md`: the spec, source of truth.

## The specs vault

`specs/` is an Obsidian vault that Claude maintains.

- Long analyses, reviews and questions go into vault files, not the chat. Chat replies stay short and point to the files.
- File names: `<subject>__<kind>.md`, kinds `specs`, `findings`, `questions`, `status`, `prompt`. Details in `specs/README.md`.
- When Pascal answers a question: fold the decision into the spec, set the question to `decided`, update the README's open-questions table.
- Milestones: each has a folder, `specs/milestone-N/` while planned or in progress, `specs/done/milestone-N/` once finished. When one starts or ends, update the Milestones table in `specs/README.md`; when one ends, write its `milestone-N__finalized.md` (what it delivered, decisions, what was left open and where it went).
- When a piece of work is done, in the same commit: a short entry in `specs/done/README.md` (newest first); it leaves the working files (the status file and plans keep only what is open); its files move to `specs/done/<work>/` for history, with every link rewritten and checked. Details in `specs/README.md`.
- At the end of each session: update `specs/zettelbranch__status.md`. Vault files are committed, for transparency.
- Never hard-wrap Markdown (vault files, `CLAUDE.md`, `AUDIT.md`): one paragraph or list item per line. Obsidian shows every line break.
- Screenshots Pascal pastes into the vault (`Pasted image ….png`) are temporary: once dealt with, replace the embed by a one-line description and delete the image. Never commit them.

## Working rules

These rules live only here, not in the spec (ZB-3). Project rules go here; Claude's notes on how to work with Pascal go in its project memory.

- Work autonomously, in the background. Never take over Pascal's screen.
- No scripts or automated browsers on claude.ai, not even for one page load (Consumer Terms; Anthropic support did not clear automated tests, see `specs/terms__findings.md`). Tests run offline on files Pascal saves by hand; real-page checks are done by Pascal clicking in the dedicated profile.
- The extension never reads, stores or sends claude.ai credentials or session tokens: no `cookies` permission, no `document.cookie`.
- Never search or list the home folder (`find ~`…): it triggers macOS privacy prompts.
- Real-page tests only in a dedicated browser profile, never Pascal's main browser.
- On claude.ai, test conversations are ordinary chats in the test tree `zbtest`: every test title starts with `zbtest/`, and Pascal deletes them after each probe session. Ask before doing anything else on Pascal's account. (The new claude.ai projects are Claude Code projects whose threads are cloud coding sessions, not chats.)
- If a CAPTCHA or bot check appears, stop and tell Pascal. Never bypass it. For now this includes checks that would clear by themselves ("Just a moment..."): save a screenshot and the page, stop, and show them to Pascal. Never fake the user agent, hide automation, or use solvers.
