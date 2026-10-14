# Milestone 2: your checks on claude.ai

What Pascal does by hand on claude.ai during Milestone 2, in two sessions. Everything else is Claude's, offline ([plan](milestone-2__specs.md#who-does-what)). Each session ends with the pictures to take then ([visuals__specs](visuals__specs.md)).

## Session 1: before 0.2.0 (about 25 minutes, any time now)

Steps 2, 4, 6 and 9 of the plan. Do them in this order; paste each result to Claude in the chat (or say what you saw).

### 1. P12, typing in the panel (Chrome, then Firefox)

Does what you type in a field of Zettelbranch's panel stay there, or does claude.ai take the keys into its own message box? 0.2.0's forms depend on it. Nothing is sent or changed.

1. Chrome test profile, `chrome://extensions`: turn **Zettelbranch off** for now (its button sits where the probe panel's does), and click ⟳ on "Zettelbranch spike". It must show 0.0.12.
2. Open any chat, click "ZB probes" at the bottom right. Section **P12** is at the top. Follow its steps: Start; type `Oulipo / test 1` in field A and press Enter; click "Submit A"; the same with field B; then once more on a new chat.
3. If letters land in claude.ai's box, delete them there. Never send them.
4. Click "Copy results" at the top and paste them to Claude.
5. Firefox test profile: `about:debugging`, "This Firefox", "Load Temporary Add-on…", pick `spike/extension/manifest.json` (and remove or disable the Zettelbranch there for now). Same steps 2 to 4.
6. Afterwards: Zettelbranch back on, the spike off, in both browsers.

What Claude does with it: if field A keeps the keys, 0.2.0's forms need no keyboard listener at all; if only field B does, the forms stop the keys at their own fields (and `AUDIT.md` says so); if neither, Claude comes back with another way.

### 2. Render test (Chrome, Zettelbranch on)

A branch's first message where Claude's copied reply holds the hard cases: a code block in three backticks (A), one in four backticks with a block inside (B), the same in tildes `~~~` (C), a table (D), tildes alone (E).

1. Type in Claude Code: `! pbcopy < /Users/pascal/dvp/OpenSource/ZettenBranch/tests/out/render-probe-4.md`
2. claude.ai: New chat, paste (Cmd+V), Send.
3. Look at your message on screen: which of A, B, C and E show as code boxes, and how does the table D show? A screenshot of your message, or a line per case, to Claude.
4. Once Claude has replied: Zettelbranch, "Name this branch" (the chat becomes `zbtest/9a · …`).

What Claude does with it: if C and E render, a four-backtick block in a copied message becomes a tilde block, so claude.ai shows it as code; tables stay as they are (Defaults of the [questions](milestone-2__questions.md#defaults)).

### 3. "Gather branches", by hand (Chrome, no extension needed)

Can Claude, in a chat, find or open your other chats? This is input for Milestone 3, nothing is built now.

1. New chat. Ask: `List my past chats whose titles start with zbtest/.` Note whether Claude searches your chats, and what it finds.
2. In the same chat, paste the address of `zbtest/9a` (from the address bar) and ask: `Open this chat and summarise it in two sentences.`
3. Rename this chat by hand to `zbtest/gather` (the title at the top, Rename).
4. Tell Claude what happened at 1 and 2 (a screenshot will do). If claude.ai's setting for searching past chats is off, leave it off and say so.

### 4. A fresh Firefox profile: does installing ask for claude.ai?

On your main Firefox, Zettelbranch did not show until you allowed it on claude.ai. A new profile tells whether every newcomer hits this.

1. Firefox: `about:profiles`, "Create a New Profile", name it `zb-fresh`, then "Launch profile in new browser".
2. In that window: open https://github.com/pthom/zettelbranch and click the Firefox install link. **Picture F1:** the "Add Zettelbranch?" prompt (what it asks for). Click Add.
3. Open https://claude.ai (no need to log in). Does the Zettelbranch button show at the bottom right?
4. If not: click the puzzle icon in the toolbar. **Picture F2:** the menu with Zettelbranch and its "Always Allow on claude.ai" (or whatever it shows). Allow, reload: does the button show now?
5. Tell Claude what you saw at 2 to 4. Then close that window; in `about:profiles`, remove `zb-fresh`.

### 5. Pictures to take in this session

Reminder: [visuals__specs](visuals__specs.md#session-1). F1 and F2 from check 4 (the install prompt, and the toolbar's permission menu if the button did not show). Save them in the repository's `tests/out/` folder (Cmd+Shift+5, Options, "Other location…"), not the Desktop, or paste them in the chat.

### 6. Clean up

Delete the `zbtest/` chats (now `zbtest/9a` and `zbtest/gather`, plus the older ones in the status file).

## Session 2: 0.2.0 (about 30 minutes, once Claude has built it)

Written when 0.2.0 is built: check 0.2.0 in Chrome and Firefox, with the open steps of [0.1.4's check](transcript-layout__questions.md#the-check-on-claudeai-014), then the release; and the pictures for the README, the manual, the demo and the Chrome Web Store ([visuals__specs](visuals__specs.md#session-2)).
