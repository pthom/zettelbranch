# Milestone 2 plan

**State: draft** (2026-10-14), waiting on Pascal's answers to [milestone-2__questions](milestone-2__questions.md) (M2-1 to M2-4). Milestone 2 is in progress: its first step, 0.1.4, is built. State of every milestone: [the vault's README](../README.md#milestones).

**Goal: ready for a wider audience.** What a newcomer sees first (the panel, the dialogs, the README's pictures) looks clean and trustworthy, installing and updating is easy in both browsers, and then the posts go out. Built from Pascal's real use and the first feedback: [milestone-2__findings](milestone-2__findings.md) (Pascal's brief, sections 1 to 6, and Claude Code's view). The scope proposed here is M2-1 = A; new features wait for Milestone 3.

## What you get

1. **0.1.4, a readable first message** (built): quoted labels instead of tags, Claude told that these lines are Zettelbranch's, a bold summary recognised ([transcript-layout__questions](transcript-layout__questions.md)).
2. **0.2.0, a panel that asks for names itself:**
   - no more browser dialogs headed "claude.ai": the branch name, the tree name and the rename confirmation are small forms inside the panel (hints, section 1, items 1, 2, 7);
   - naming a branch: the address is shown fixed (`oulipo/1a ·`), only the topic is editable, and the panel says where the proposal comes from;
   - naming a tree: the field, the allowed characters as a hint under it, and the root title it will give;
   - the panel closes by itself once the branch is named; the pill keeps the notice as its tooltip (item 3);
   - the list of messages without Markdown marks, and without Claude's summary at the top of a branch's first reply (item 4; the summary part is fixed in 0.1.4);
   - no technical line after "Open new chat" unless something went wrong (item 5);
   - once the new chat is sent, step 1 is checked off, so "Name this branch" is the obvious next action (item 6).
3. **The copied history renders well** with four-backtick code blocks too, if the render test shows that claude.ai renders `~~~` blocks (hints, section 3).
4. **A README for newcomers:** the "parenthesis" opening, fresh screenshots and demo (the panel's new forms, 0.1.4's layout, frame 3 shorter), and the "allow on claude.ai" step shown in a picture (hints, section 4).
5. **Store listings,** as M2-3 decides, so Chrome users get updates automatically.
6. **Posts** drafted for r/ClaudeAI, the Obsidian community and Show HN; Pascal publishes them (hints, section 6).

Not in Milestone 2 (Milestone 3 candidates): the "gather branches" button (probed here, step 9), a button on each message, the banner, cross-references and backlinks, the shorter transcript modes, a website.

## Steps

| # | What | Who | Gives |
|---|---|---|---|
| 1 | Finish checking 0.1.4 ([steps](transcript-layout__questions.md#the-check-on-claudeai-014)), then release it as usual; watch Firefox update 0.1.3 by itself (the first live test of `updates.json`) | Pascal, then Claude | 0.1.4 (if M2-2 = A) |
| 2 | Probe P12 in the spike: a text field inside the panel on the real page. Does typing stay in it, or does claude.ai pull the keys to its own message box? Does Enter submit? | Claude builds, Pascal clicks (2 minutes) | the form design holds, or changes |
| 3 | Build 0.2.0 offline (item 2 of "What you get"): forms, the panel closing, the list, the quiet insertion, the steps. `AUDIT.md` and its checks updated; the end-to-end tests that answered browser dialogs rewritten | Claude | 0.2.0, tested offline |
| 4 | Render test: a Claude message with a four-backtick block, a `~~~` block and a small table, pasted in a `zbtest` chat; then the rewrite rule, if `~~~` renders | Claude prepares, Pascal pastes (2 minutes) | robust copies |
| 5 | Check 0.2.0 on the real page (Chrome, Firefox); release | Pascal, then Claude | 0.2.0 |
| 6 | Install friction: on a fresh Firefox profile, does installing ask for claude.ai, or is "allow on claude.ai" a separate step as Pascal found? Then a picture in the README, or a change to the manifest if one helps | Pascal checks, Claude adapts | an install that works first time |
| 7 | Visuals and docs: the README's new opening; a shot list for Pascal's screenshots; the demo re-rendered; the manual updated | Claude, Pascal's screenshots | the README for newcomers |
| 8 | Store listings (M2-3): texts, images and privacy answers drafted; Pascal creates the accounts and submits | Claude drafts, Pascal submits | listings |
| 9 | "Gather branches" probe, by hand in a chat, no extension: can Claude open a chat from a pasted link? Find one by its address in the title (`oulipo/1a`)? | Pascal (5 minutes) | the input for Milestone 3 |
| 10 | Posts: one draft per channel in a file; Pascal publishes them, a few days apart, after steps 5, 7 and 8 | Claude drafts, Pascal posts | the announcement |
| 11 | Close: the finalized note, the folder to `done/`, the Milestones table | Claude | Milestone 2 finished |

Steps 2, 4, 6 and 9 are short and independent: they can happen in one session of Pascal's.

## The panel's forms (0.2.0)

- **Name this branch:** `oulipo/1a ·` as fixed text, then a field holding the proposed topic, with its source under it ("proposed by Claude", "from your first question"). Buttons: Rename, Cancel. The old and new titles show before you confirm.
- **Tree name:** a field pre-filled from the chat's title (`oulipo`), the hint "a–z, 0–9 and -", and the root title it will give (`oulipo/1 · Oulipo and constraints`). Buttons: Make it a tree, Cancel.
- **Enter submits, without listening to keys.** Each form is a `<form method="dialog">` whose button has a click listener: pressing Enter in a field clicks the form's button (the browser does it), and a `dialog` form never loads a page. So the extension still has only click listeners, plus the panel's drag. It reads a field only when you click its button, and only Zettelbranch's own fields. `AUDIT.md` point 9 says so.
- **The risk** that step 2 checks: key presses inside the panel also reach claude.ai's page, which may move the focus to its message box as you type. If it does, the forms need a keyboard listener that stops those keys at the panel, and `AUDIT.md` says that too.

## Rules carried over

Unchanged from Milestone 1: no script or automated browser on claude.ai; Pascal clicks, in the test profile; test chats in the `zbtest` tree; offline tests against the fake claude.ai and the real Tiptap editor; `AUDIT.md` and its checks kept true; Claude pushes and releases only when Pascal asks.
