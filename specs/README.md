# Specs vault

This folder is an Obsidian vault holding the spec, review findings and open questions
for the project. Open `specs/` as a vault in Obsidian; the files also read fine on GitHub.

Claude maintains these files. Pascal answers questions inline and may edit anything.

## Conventions

- **File names:** `<subject>__<kind>.md`. Subjects are lowercase with hyphens. Kinds:
  - `specs`: the spec itself, the source of truth.
  - `findings`: analysis, risks, facts gathered. Claims about claude.ai's behaviour that
    have not been checked on the real page are tagged *(to verify)*.
  - `questions`: decisions needed from Pascal.
  - `status`: current state of the work and next steps
    ([zettenbranch__status](zettenbranch__status.md)).
- **Questions** have an ID (`AD-1`), a status, context, options with a recommendation,
  and an empty **Answer:** line. Answer there, in any form ("A", "B, but…", free text).
- **Defaults** at the end of a questions file are choices Claude will apply unless Pascal
  objects. To object, write under the item.
- **Once answered**, Claude folds the decision into
  [zettenbranch__specs](zettenbranch__specs.md), sets the status to `decided`, and notes
  where it went.
- **Links** are standard Markdown links (`[x](file.md)`), which work in Obsidian and on GitHub.
- **Git:** these files are committed, for transparency. `.obsidian/` (local Obsidian
  settings) is ignored.

## Map

- Spec: [zettenbranch__specs](zettenbranch__specs.md)
- Status: [zettenbranch__status](zettenbranch__status.md)

| Subject | Findings | Questions |
|---|---|---|
| General | [findings](zettenbranch__findings.md) | [questions](zettenbranch__questions.md) |
| Data access | [findings](data-access__findings.md) | [questions](data-access__questions.md) |
| Addressing | [findings](addressing__findings.md) | [questions](addressing__questions.md) |
| Forking | [findings](forking__findings.md) | [questions](forking__questions.md) |
| Cross-references | [findings](cross-references__findings.md) | [questions](cross-references__questions.md) |
| Trust and audit | [findings](trust-audit__findings.md) | [questions](trust-audit__questions.md) |
| Testing | [findings](testing__findings.md) | [questions](testing__questions.md) |

## Open questions

Start with **DA-1**: several other answers depend on it.

| ID | Question | Depends on |
|---|---|---|
| [DA-1](data-access__questions.md) | May the extension call claude.ai's own API? | |
| [DA-2](data-access__questions.md) | If yes, reads only, or also renaming? | DA-1 |
| [ZB-1](zettenbranch__questions.md) | Project name: Zettelbranch or ZettenBranch? | |
| [ZB-2](zettenbranch__questions.md) | Add a Milestone 0 spike on the risky unknowns? | |
| [ZB-3](zettenbranch__questions.md) | Remove agent working rules from the spec (now in CLAUDE.md)? | |
| [AD-1](addressing__questions.md) | Title format | |
| [AD-2](addressing__questions.md) | Turning an existing conversation into a tree root | |
| [FK-1](forking__questions.md) | Where the parent summary lives | |
| [FK-2](forking__questions.md) | How much context a branch carries | |
| [FK-3](forking__questions.md) | What branching from your own message means | |
| [XR-1](cross-references__questions.md) | Where cross-references are written | DA-1 |
| [TA-1](trust-audit__questions.md) | Distribution channels | |
| [TS-1](testing__questions.md) | Fixtures in a public repo | |
| [TS-2](testing__questions.md) | Sign-in method for the test profile | |

## History

- 2026-10-13: vault created from Claude's first review of the spec. Not yet checked
  against the original design conversation (the share link is behind a Cloudflare check).
