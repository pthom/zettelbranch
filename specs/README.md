# Specs vault

This folder is an Obsidian vault holding the spec, findings and open questions for the
project. Open `specs/` as a vault in Obsidian; the files also read fine on GitHub.

Claude maintains these files. Pascal answers questions inline and may edit anything.

## Conventions

- **File names:** `<subject>__<kind>.md`. Subjects are lowercase with hyphens. Kinds:
  - `specs`: the spec itself, the source of truth; also sub-plans such as
    [milestone-0__specs](milestone-0__specs.md).
  - `findings`: analysis, risks, facts gathered. Claims about claude.ai's behaviour that
    have not been checked on the real page are tagged *(to verify)*.
  - `questions`: decisions needed from Pascal.
  - `status`: what is open and the next steps
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
- **Done.** The files at the top level hold only live work. When a piece of work is
  finished, in the same commit:
  - it gets a short entry in the [done log](done/README.md), newest first: date, title,
    one sentence, commits, a link;
  - it leaves the working files: the status file and a milestone's plan keep only what
    is open, and a partly done item keeps only its open part;
  - its files move to `done/<work>/` (for example `done/first-review/`) and stay there for
    history. A questions file moves once all its questions are decided; findings move
    when nothing in them is still to act on; a milestone's files move when it closes.
- **Links** are standard Markdown links with relative paths (`[x](file.md)`), which work
  in Obsidian and on GitHub. Obsidian fixes them when you move a file inside Obsidian;
  when Claude moves files with git, it rewrites the links and checks that each one
  resolves.
- **Git:** these files are committed, for transparency. `.obsidian/` (local Obsidian
  settings) is ignored.

## Map

- Spec: [zettelbranch__specs](zettelbranch__specs.md)
- Status: [zettelbranch__status](zettelbranch__status.md)
- Milestone 0: [plan](milestone-0__specs.md), [findings](milestone-0__findings.md)
- Branch prompt draft: [forking__prompt](forking__prompt.md)
- What public sources say about claude.ai, and what the probes confirmed:
  [claude-ai__findings](claude-ai__findings.md)
- Anthropic's terms and support's answer: [terms__findings](terms__findings.md)
- Finished work: the [done log](done/README.md). It holds the first review of the spec
  (findings and questions per subject, all decided) and the original design
  conversation with its check against the vault.

## Open questions

None right now.
