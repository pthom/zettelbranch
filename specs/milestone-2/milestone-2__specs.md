# Milestone 2 plan

**State: decided** (2026-10-14): M2-1 = A, M2-2 = B, M2-3 = B, M2-4 = A ([milestone-2__questions](milestone-2__questions.md)). In progress: 0.2.0 is built offline (2026-10-14), with the layout of 0.1.4; probe P12 is ready; next, Pascal's two sessions on claude.ai ([checks-on-claude-ai__specs](checks-on-claude-ai__specs.md)). State of every milestone: [the vault's README](../README.md#milestones).

**Goal: ready for a wider audience.** What a newcomer sees first (the panel, the dialogs, the README's pictures) looks clean and trustworthy, installing and updating is easy in both browsers, and then the posts go out. Built from Pascal's real use and the first feedback: [milestone-2__findings](milestone-2__findings.md) (Pascal's brief, sections 1 to 6, and Claude Code's view). Scope (M2-1 = A): polish, robustness, pictures, the Chrome Web Store and the posts; new features wait for Milestone 3.

## What you get

1. **A readable first message** (built as 0.1.4, released within 0.2.0, M2-2 = B): quoted labels instead of tags, Claude told that these lines are Zettelbranch's, a bold summary recognised ([transcript-layout__questions](transcript-layout__questions.md)).
2. **0.2.0, a panel that asks for names itself** (and the readable first message of item 1):
   - no more browser dialogs headed "claude.ai": the branch name, the tree name and the rename confirmation are small forms inside the panel (hints, section 1, items 1, 2, 7);
   - naming a branch: the address is shown fixed (`oulipo/1a ·`), only the topic is editable, and the panel says where the proposal comes from;
   - naming a tree: the field, the allowed characters as a hint under it, and the root title it will give;
   - the panel closes by itself once the branch is named; the pill keeps the notice as its tooltip (item 3);
   - the list of messages without Markdown marks, and without Claude's summary at the top of a branch's first reply (item 4; the summary part is fixed in 0.1.4);
   - no technical line after "Open new chat" unless something went wrong (item 5);
   - once the new chat is sent, step 1 is checked off, so "Name this branch" is the obvious next action (item 6).
3. **The copied history renders well** with four-backtick code blocks too, if the render test shows that claude.ai renders `~~~` blocks (hints, section 3).
4. **A README for newcomers:** the "parenthesis" opening, fresh screenshots and demo (the panel's new forms, 0.1.4's layout, frame 3 shorter), and the "allow on claude.ai" step shown in a picture (hints, section 4).
5. **The Chrome Web Store** (M2-3 = B), before the posts, so Chrome users install in one click and get updates automatically. Firefox keeps its signed copy from this repository, which already updates itself.
6. **Posts** drafted for r/ClaudeAI, the Obsidian community and Show HN, leading with the problem, then Luhmann and the Zettelkasten, without Perec (M2-4 = A); Pascal publishes them (hints, section 6).

Not in Milestone 2 (Milestone 3 candidates): the "gather branches" button (probed here, step 9), a button on each message, the banner, cross-references and backlinks, the shorter transcript modes, the Mozilla Add-ons listing (M2-3 = B), a website.

## Steps

| # | What | Who | Gives |
|---|---|---|---|
| 1 | The readable first message, built as 0.1.4 and seen working in a live test. Not released alone (M2-2 = B): the rest of [its check](transcript-layout__questions.md#the-check-on-claudeai-014) joins step 5 | Claude (done), Pascal (step 5) | the layout, in 0.2.0 |
| 2 | Probe P12 in the spike: a text field inside the panel on the real page. Does typing stay in it, or does claude.ai pull the keys to its own message box? Does Enter submit? | Claude builds, Pascal clicks (2 minutes) | the form design holds, or changes |
| 3 | Build 0.2.0 offline (item 2 of "What you get"): forms, the panel closing, the list, the quiet insertion, the steps. `AUDIT.md` and its checks updated; the end-to-end tests that answered browser dialogs rewritten. **Done 2026-10-14:** audit 73/73 (new point 20: no browser dialogs, the panel's fields read only on a click), unit 64/64, end-to-end 35/35 (no browser dialog ever shown; Enter tested), editor 6/6 | Claude | 0.2.0, tested offline |
| 4 | Render test: a Claude message with a four-backtick block, a `~~~` block and a small table, pasted in a `zbtest` chat; then the rewrite rule, if `~~~` renders | Claude prepares, Pascal pastes (2 minutes) | robust copies |
| 5 | Check 0.2.0 on the real page (Chrome, Firefox), with the open steps of 0.1.4's check; release as usual; watch Firefox update 0.1.3 to 0.2.0 by itself (the first live test of `updates.json`) | Pascal, then Claude | 0.2.0 |
| 6 | Install friction: on a fresh Firefox profile, does installing ask for claude.ai, or is "allow on claude.ai" a separate step as Pascal found? Then a picture in the README, or a change to the manifest if one helps | Pascal checks, Claude adapts | an install that works first time |
| 7 | Visuals and docs: the README's new opening; a shot list for Pascal's screenshots ([visuals__specs](visuals__specs.md)); the demo re-rendered; the manual updated (its text done for 0.2.0, the pictures to come). The README's line "Also inspired by Georges Perec's card systems" stays or goes with the new opening (M2-4 is about the posts) | Claude, Pascal's screenshots | the README for newcomers |
| 8 | The Chrome Web Store (M2-3 = B): texts, images and privacy answers drafted, the zip made; Pascal opens the developer account (5 USD, once) and submits; the README's Chrome install then points to the store | Claude drafts, Pascal submits | Chrome in one click, with updates |
| 9 | "Gather branches" probe, by hand in a chat, no extension: can Claude open a chat from a pasted link? Find one by its address in the title (`oulipo/1a`)? | Pascal (5 minutes) | the input for Milestone 3 |
| 10 | Posts: one draft per channel in a file, Luhmann and the Zettelkasten without Perec (M2-4 = A); Pascal publishes them, a few days apart, after steps 5, 7 and 8 | Claude drafts, Pascal posts | the announcement |
| 11 | Close: the finalized note, the folder to `done/`, the Milestones table | Claude | Milestone 2 finished |

Steps 2, 4, 6 and 9 are short and independent: they happen in one session of Pascal's, session 1 of [checks-on-claude-ai__specs](checks-on-claude-ai__specs.md); step 5 is session 2. The pictures each session ends with: [visuals__specs](visuals__specs.md).

## Who does what

Claude does most of the work alone, offline: the 0.2.0 build and its tests, `AUDIT.md`, the probe and the samples to paste, the README, the manual and the demo, the store texts, the posts, the releases on GitHub. Pascal's part is short and cannot be done by Claude (no scripts on claude.ai, his accounts, his name):

- **Two sessions of clicks on claude.ai**, in the test profile ([checks-on-claude-ai__specs](checks-on-claude-ai__specs.md)): steps 2, 4, 6 and 9 (about 25 minutes, any time now), then step 5 (0.2.0 in both browsers, about 30 minutes). Each ends with its pictures for step 7 ([visuals__specs](visuals__specs.md)); Claude reminds him.
- **His accounts:** the Mozilla upload at each release; the Chrome Web Store account and its submission (step 8).
- **Publishing:** the posts (step 10), and saying when to push and release.

## The panel's forms (0.2.0)

- **Name this branch:** `oulipo/1a ·` as fixed text, then a field holding the proposed topic, with its source under it ("proposed by Claude", "from your first question"). Buttons: Rename, Cancel. The old and new titles show before you confirm.
- **Tree name:** a field pre-filled from the chat's title (`oulipo`), the hint "a–z, 0–9 and -", and the root title it will give (`oulipo/1 · Oulipo and constraints`). Buttons: Make it a tree, Cancel.
- **Enter submits, without listening to keys.** Each form is a `<form method="dialog">` whose button has a click listener: pressing Enter in a field clicks the form's button (the browser does it), and a `dialog` form never loads a page. So the extension still has only click listeners, plus the panel's drag. It reads a field only when you click its button, and only Zettelbranch's own fields. `AUDIT.md` point 9 says so.
- **Probe P12** (spike 0.0.12, section P12) has two fields: A without any key listener, as planned; B stopping the keys at the field. Checked offline against three local pages (one that leaves the keys alone, one that moves them to its own box, one that does so before anything else sees them): it tells the three cases apart in Chromium and Firefox. If only B keeps the keys, 0.2.0 stops them at its own fields; if neither does, another way is needed.
- **The risk** that step 2 checks: key presses inside the panel also reach claude.ai's page, which may move the focus to its message box as you type. If it does, the forms need a keyboard listener that stops those keys at the panel, and `AUDIT.md` says that too.

## Rules carried over

Unchanged from Milestone 1: no script or automated browser on claude.ai; Pascal clicks, in the test profile; test chats in the `zbtest` tree; offline tests against the fake claude.ai and the real Tiptap editor; `AUDIT.md` and its checks kept true; Claude pushes and releases only when Pascal asks.
