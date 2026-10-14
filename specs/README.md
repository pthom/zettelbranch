# Specs vault

This folder is an Obsidian vault holding the spec, findings and open questions for the project. Open `specs/` as a vault in Obsidian; the files also read fine on GitHub.

Claude maintains these files. Pascal answers questions inline and may edit anything.

## Conventions

- **File names:** `<subject>__<kind>.md`. Subjects are lowercase with hyphens. Kinds:
  - `specs`: the spec itself, the source of truth; also a milestone's plan, such as [milestone-0__specs](done/milestone-0/milestone-0__specs.md).
  - `findings`: analysis, risks, facts gathered. Claims about claude.ai's behaviour that have not been checked on the real page are tagged *(to verify)*.
  - `questions`: decisions needed from Pascal.
  - `status`: what is open and the next steps ([zettelbranch__status](zettelbranch__status.md)).
  - `prompt`: text the extension sends to Claude ([forking__prompt](forking__prompt.md)).
  - `finalized`: the note written when a milestone ends: what it delivered, what was decided, what was left open and where it went ([milestone-1__finalized](done/milestone-1/milestone-1__finalized.md)). After the `__finalized.md` notes of Pascal's imgui_bundle plans.
- **Milestones** each have a folder: `milestone-N/` at the top while planned or in progress, `done/milestone-N/` once finished, with its `milestone-N__finalized.md`. The [Milestones](#milestones) table below gives each one's state; Claude updates it when a milestone starts or ends.
- **Questions** have an ID (`AD-1`), a status, context, options with a recommendation, and an empty **Answer:** line. Answer there, in any form ("A", "B, but…", free text). Options are explained in plain words, with what each one changes for Pascal. If a question is unclear, say so on the Answer line and Claude explains or asks in chat.
- **Defaults** at the end of a questions file are choices Claude will apply unless Pascal objects. To object, write under the item.
- **Once answered**, Claude folds the decision into [zettelbranch__specs](zettelbranch__specs.md), sets the status to `decided`, and notes where it went.
- **Done.** The files at the top level hold only live work. When a piece of work is finished, in the same commit:
  - it gets a short entry in the [done log](done/README.md), newest first: date, title, one sentence, commits, a link;
  - it leaves the working files: the status file and a milestone's plan keep only what is open, and a partly done item keeps only its open part;
  - its files move to `done/<work>/` (for example `done/first-review/`) and stay there for history. A questions file moves once all its questions are decided; findings move when nothing in them is still to act on; a milestone's folder moves when it closes. Files inside a live milestone's folder stay there until the milestone closes.
- **Links** are standard Markdown links with relative paths (`[x](file.md)`), which work in Obsidian and on GitHub. Obsidian fixes them when you move a file inside Obsidian; when Claude moves files with git, it rewrites the links and checks that each one resolves.
- **No hard wrapping:** one paragraph or list item per line. Obsidian shows every line break as a break.
- **Pasted screenshots** (`Pasted image ….png`) are temporary: once Claude has dealt with them, a one-line description replaces the embed and the image is deleted.
- **Git:** these files are committed, for transparency. `.obsidian/` (local Obsidian settings) is ignored.

## Milestones

| Milestone | State | What | Files |
|---|---|---|---|
| 0. Probes on the real site | **finished** 2026-10-13 | A spike that settled the unknowns before building: every probe passed | [finalized](done/milestone-0/milestone-0__finalized.md), [plan](done/milestone-0/milestone-0__specs.md), [results](done/milestone-0/milestone-0__findings.md) |
| 1. The extension | **finished** 2026-10-13 | 0.1.0: branch any chat from any message, with a preview, into named branches; the tree in the panel. Followed by 0.1.1 to 0.1.3, outside milestones | [finalized](done/milestone-1/milestone-1__finalized.md), [plan](done/milestone-1/milestone-1__specs.md), [build notes](done/milestone-1/milestone-1__findings.md) |
| 2. Ready for a wider audience | **in progress** since 2026-10-14 | Done: 0.1.4 built, a readable first message (not released yet). The plan is a draft, waiting on M2-1 to M2-4 | [plan (draft)](milestone-2/milestone-2__specs.md), [questions](milestone-2/milestone-2__questions.md), [hints](milestone-2/milestone-2__findings.md), [the layout of 0.1.4](milestone-2/transcript-layout__questions.md) |

## Map

- Spec: [zettelbranch__specs](zettelbranch__specs.md)
- Status: [zettelbranch__status](zettelbranch__status.md)
- Branch prompt: [forking__prompt](forking__prompt.md)
- What public sources say about claude.ai, and what Milestone 0 confirmed on the real site: [claude-ai__findings](claude-ai__findings.md)
- Anthropic's terms and support's answer: [terms__findings](terms__findings.md)
- Why branches made in Firefox could not be named, and the fix in 0.1.3: [firefox-insertion__findings](firefox-insertion__findings.md)
- Milestone 2, in progress: the [plan (draft)](milestone-2/milestone-2__specs.md) and its [questions](milestone-2/milestone-2__questions.md); hints from the first feedback and a live test of 0.1.4 ([milestone-2__findings](milestone-2/milestone-2__findings.md)); a more readable layout for the copied conversation ([transcript-layout__questions](milestone-2/transcript-layout__questions.md))
- Finished work: the [done log](done/README.md). It holds the first review of the spec (findings and questions per subject, all decided), the original design conversation with its check against the vault, Milestone 0 and Milestone 1 (plans, results and their finalized notes; 0.1.0 released).

## Open questions

| ID | Question | File |
|---|---|---|
| M2-1 | What does Milestone 2 cover? | [milestone-2__questions](milestone-2/milestone-2__questions.md) |
| M2-2 | Release 0.1.4 now, or with 0.2.0? | [milestone-2__questions](milestone-2/milestone-2__questions.md) |
| M2-3 | Store listings before the announcement? | [milestone-2__questions](milestone-2/milestone-2__questions.md) |
| M2-4 | Name Perec in the posts? | [milestone-2__questions](milestone-2/milestone-2__questions.md) |

TL-1 and TL-2 (the layout of a branch's first message) are decided; [their file](milestone-2/transcript-layout__questions.md) holds the check of 0.1.4 on claude.ai.

