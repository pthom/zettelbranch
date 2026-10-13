# Zettelbranch

Browser extension for claude.ai, idea stage. No code yet.

## Start here

1. `specs/zettelbranch__status.md`: current state and next steps.
2. `specs/README.md`: vault conventions and open questions.
3. `specs/zettelbranch__specs.md`: the spec, source of truth.

## The specs vault

`specs/` is an Obsidian vault that Claude maintains.

- Long analyses, reviews and questions go into vault files, not the chat. Chat replies
  stay short and point to the files.
- File names: `<subject>__<kind>.md`, kinds `specs`, `findings`, `questions`, `status`,
  `prompt`.
  Details in `specs/README.md`.
- When Pascal answers a question: fold the decision into the spec, set the question to
  `decided`, update the README's open-questions table.
- At the end of each session: update `specs/zettelbranch__status.md`. Vault files are
  committed, for transparency.

## Working rules

These rules live only here, not in the spec (ZB-3). Project rules go here; Claude's notes
on how to work with Pascal go in its project memory.

- Work autonomously, in the background. Never take over Pascal's screen.
- No scripts or automated browsers on claude.ai, not even for one page load (Consumer
  Terms; Anthropic support did not clear automated tests, see
  `specs/terms__findings.md`). Tests run offline on files Pascal saves by hand; real-page
  checks are done by Pascal clicking in the dedicated profile.
- The extension never reads, stores or sends claude.ai credentials or session tokens: no
  `cookies` permission, no `document.cookie`.
- Never search or list the home folder (`find ~`…): it triggers macOS privacy prompts.
- Real-page tests only in a dedicated browser profile, never Pascal's main browser.
- On claude.ai, work only inside the dedicated test project. Ask before doing anything
  else on Pascal's account.
- If a CAPTCHA or bot check appears, stop and tell Pascal. Never bypass it. For now this
  includes checks that would clear by themselves ("Just a moment..."): save a screenshot
  and the page, stop, and show them to Pascal. Never fake the user agent, hide
  automation, or use solvers.
