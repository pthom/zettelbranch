# Zettelbranch

Browser extension for claude.ai, idea stage. No code yet.

## Start here

1. `specs/zettenbranch__status.md`: current state and next steps.
2. `specs/README.md`: vault conventions and open questions.
3. `specs/zettenbranch__specs.md`: the spec, source of truth.

## The specs vault

`specs/` is an Obsidian vault that Claude maintains.

- Long analyses, reviews and questions go into vault files, not the chat. Chat replies
  stay short and point to the files.
- File names: `<subject>__<kind>.md`, kinds `specs`, `findings`, `questions`, `status`.
  Details in `specs/README.md`.
- When Pascal answers a question: fold the decision into the spec, set the question to
  `decided`, update the README's open-questions table.
- At the end of each session: update `specs/zettenbranch__status.md`. Vault files are
  committed, for transparency.

## Working rules

Copied from the spec's "Development workflow" (see ZB-3 about removing them there).

- Work autonomously, in the background. Never take over Pascal's screen.
- Real-page tests only in a dedicated browser profile, never Pascal's main browser.
- On claude.ai, work only inside the dedicated test project. Ask before doing anything
  else on Pascal's account.
- If a CAPTCHA or bot check appears, stop and tell Pascal. Never bypass it.
