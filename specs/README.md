# Specs vault

This folder is an Obsidian vault holding the spec, review findings and open questions
for the project. Open `specs/` as a vault in Obsidian; the files also read fine on GitHub.

Claude maintains these files. Pascal answers questions inline and may edit anything.

## Conventions

- **File names:** `<subject>__<kind>.md`. Subjects are lowercase with hyphens. Kinds:
  - `specs`: the spec itself, the source of truth; also sub-plans such as
    [milestone-0__specs](milestone-0__specs.md).
  - `findings`: analysis, risks, facts gathered. Claims about claude.ai's behaviour that
    have not been checked on the real page are tagged *(to verify)*.
  - `questions`: decisions needed from Pascal.
  - `status`: current state of the work and next steps
    ([zettelbranch__status](zettelbranch__status.md)).
  - `prompt`: text the extension sends to Claude ([forking__prompt](forking__prompt.md)).
- **Questions** have an ID (`AD-1`), a status, context, options with a recommendation,
  and an empty **Answer:** line. Answer there, in any form ("A", "B, but…", free text).
  Options are explained in plain words, with what each one changes for Pascal. If a
  question is unclear, say so on the Answer line and Claude explains or asks in chat.
- **Defaults** at the end of a questions file are choices Claude will apply unless Pascal
  objects. To object, write under the item.
- **Once answered**, Claude folds the decision into
  [zettelbranch__specs](zettelbranch__specs.md), sets the status to `decided`, and notes
  where it went.
- **Links** are standard Markdown links (`[x](file.md)`), which work in Obsidian and on GitHub.
- **Git:** these files are committed, for transparency. `.obsidian/` (local Obsidian
  settings) is ignored.

## Map

- Spec: [zettelbranch__specs](zettelbranch__specs.md)
- Status: [zettelbranch__status](zettelbranch__status.md)
- Milestone 0: [plan](milestone-0__specs.md), [findings](milestone-0__findings.md)
- Branch prompt draft: [forking__prompt](forking__prompt.md)
- What public sources say about claude.ai: [claude-ai__findings](claude-ai__findings.md)
- Anthropic's terms and support's answer: [terms__findings](terms__findings.md)

| Subject | Findings | Questions |
|---|---|---|
| General | [findings](zettelbranch__findings.md) | [questions](zettelbranch__questions.md) |
| Data access | [findings](data-access__findings.md) | [questions](data-access__questions.md) |
| Addressing | [findings](addressing__findings.md) | [questions](addressing__questions.md) |
| Forking | [findings](forking__findings.md) | [questions](forking__questions.md) |
| Cross-references | [findings](cross-references__findings.md) | [questions](cross-references__questions.md) |
| Trust and audit | [findings](trust-audit__findings.md) | [questions](trust-audit__questions.md) |
| Testing | [findings](testing__findings.md) | [questions](testing__questions.md) |

## Open questions

| ID | Question | Where it stands |
|---|---|---|
| [DA-1](data-access__questions.md) | May the extension call claude.ai's own API? | Pascal leans A; Claude owes a plain explanation (secure? stable?) |
| [DA-D1](data-access__questions.md) | How the prompt reaches the new chat | Pascal asked for a plain explanation |
| [TA-1](trust-audit__questions.md) | Distribution channels | Pascal asked for a plain explanation |
| [TS-2](testing__questions.md) | Sign-in method for the test profile | Probably moot now; Claude proposes C |
| [ZB-3](zettelbranch__questions.md) | `CLAUDE.md` versus Claude's project memory | Rules moved to `CLAUDE.md`; to discuss |
| [FK-3](forking__questions.md) | What branching from your own message means | |
| [XR-1](cross-references__questions.md) | Where cross-references are written | Depends on DA-1 |

Decided on 2026-10-13: ZB-1, ZB-2, ZB-3 (main part), AD-1, AD-2, FK-1, FK-2, DA-2 (if
DA-1 = A), TS-1. Each question file says where the decision went.

## History

- 2026-10-13: vault created from Claude's first review of the spec. Not yet checked
  against the original design conversation (the share link is behind a Cloudflare check).
- 2026-10-13, later: first answers folded into the spec; files renamed to
  `zettelbranch__`. Added the branch prompt draft, the Milestone 0 plan, public research on
  claude.ai, and Anthropic support's answer about the terms. Decided: no script or
  automated browser ever touches claude.ai.
