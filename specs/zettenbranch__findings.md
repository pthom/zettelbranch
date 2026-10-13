# General findings

Review of [zettenbranch__specs](zettenbranch__specs.md), 2026-10-13.

## Overall assessment

Strong for an idea-stage spec:

- "A Zettelbranch must remain readable if the extension disappears" is the right
  founding principle.
- The trust section is concrete and testable.
- The lessons from `claude-actions-extension` are specific and actionable.
- The first milestone is well scoped.

Main problem: the three hard constraints (stateless, no network calls, no stored
content) rule out about half the promised features: banner summaries, whole-tree view,
backlinks, a complete registry. See [data-access__findings](data-access__findings.md).

## Milestone order

Extraction is the lowest-risk part. The unknowns that can change the design are:

1. Can a conversation title be renamed reliably, and does it survive claude.ai's
   automatic naming? ([addressing__findings](addressing__findings.md))
2. Can the full conversation list be read, beyond the recent ones in the sidebar?
   ([data-access__findings](data-access__findings.md))
3. Does inserting text into the message box update the page's state, and what happens
   with long text? ([forking__findings](forking__findings.md))

A short Milestone 0 that tests these on the real site would settle them before any
polished code is written. See ZB-2.

## Project name

The folder is `ZettenBranch`, the spec file is `zettenbranch__specs.md`, and the spec
says `Zettelbranch`. The name ends up in the GitHub repo, the Firefox extension ID
(`browser_specific_settings.gecko.id`) and this vault's file prefixes, so it should be
fixed before the repo is published. See ZB-1.

## Spec mixes product and agent instructions

"Work autonomously, in the background", account hygiene, CAPTCHA handling and Pascal's
manual steps are instructions for the agent, not product spec. In a `CLAUDE.md` at the
repo root, every Claude Code session picks them up automatically. See ZB-3.
