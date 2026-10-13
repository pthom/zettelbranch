# Firefox insertion findings

Why branches made in Firefox could not be named, and the fix in Zettelbranch 0.1.3. 2026-10-13.

## The bug

Pascal, real Firefox 157 on claude.ai, Zettelbranch 0.1.2, on `oulipo/1c`: "Name this branch" said "This chat does not start with a Zettelbranch header, so it is not a branch."

Zettelbranch fills the new chat's box with one `document.execCommand('insertText', false, prompt)`. In Chrome, each line of the prompt becomes a paragraph of claude.ai's box. In Firefox, claude.ai's box put the whole prompt in one paragraph: the line breaks became spaces, so the sent first message was one long line. The header `Zettelbranch · oulipo/1c` was no longer alone on line 1, so the extension did not read the chat as a branch; the transcript's code blocks were mangled too.

## The probe (P1, spike 0.0.11, commit `6ca291f`)

In Pascal's Firefox, on claude.ai, with P1's 16-line sample (a list and a fenced code block, 199 characters):

| | The box afterwards |
|---|---|
| One `insertText` call | 200 characters, 1 line break, 2 paragraphs: everything on one line |
| Line by line: `insertText` per line, `insertParagraph` between lines, nothing for an empty line | 17 paragraphs, 16 line breaks: everything right, the list and the code block too |

Both ways, Firefox adds an empty paragraph at the top (200 characters for 199).

Offline, a bare Tiptap editor in Playwright's Firefox does not reproduce it (`tests/editor/`): claude.ai's own editor is the cause, and the real thing cannot be tested offline. In a plain editable element, Firefox turns one `insertText` holding line breaks into one paragraph with `<br>` line breaks, where Chromium makes one paragraph per line (seen offline by Claude, 2026-10-13); claude.ai's editor then probably drops those `<br>`. That is a guess, not checked on claude.ai.

## The fix (Zettelbranch 0.1.3, commit `a6b3431`)

- **Insertion** (`branch.js`). First, the fast way, one `insertText` call (`insertOnce`). Then the box's text is compared with the prompt, both without the blank lines at their start and end, so Firefox's empty top line is not a difference. If they differ, the box is emptied (`emptyBox`: the box must have the focus; `selectAll`, then `delete`; then it must be empty) and the prompt typed line by line (`insertLines`). The box is compared again; the warning shows if it still differs. A box that held text before is never touched, as before. The panel says when the second way was used: "Inserted line by line, in 0.6 s: one insertion had lost the line breaks."
- **Reading a first message without line breaks** (`prompt.js`), for branches 0.1.2 made in Firefox (such as Pascal's `oulipo/1c`): the header is read after any blank lines and may be followed by a space; "Path:" and "Forked from:" are looked for anywhere before the transcript; a turn's text may be separated from its tags by a space. Such a branch shows as "Branch oulipo/1c (not named yet)" and can be named.
- **A movable panel** (`ui.js`). Pascal: the panel could hide Claude's reply and the Send button. It moves when you drag its title bar (cursor grab, tooltip "Drag to move"); a drag never starts on its buttons. It stays inside the window, and taller content scrolls inside it. The place is kept in the tab's memory only. The pill stays at the bottom right; the panel opens again where it was dragged.
- **The audit.** `execCommand` is allowed for exactly `insertText`, `insertParagraph`, `selectAll` and `delete`, the last three only in `branch.js`, on the message box (AUDIT.md, checks 3 and 16). Besides clicks, the only listeners are four pointer listeners on the panel's title bar (check 9).

## Numbers

| | 0.1.2 | 0.1.3 |
|---|---|---|
| `extension/` | 1,873 lines | 1,973 lines: branch.js 435 → 481, prompt.js 273 → 279, ui.js 460 → 508 |
| Audit | 64 of 64 | 67 of 67 pass: 20 in JavaScript, 47 AUDIT.md commands. On copies with one planted violation each (run once): `insertParagraph` in `menu.js`, `selectAll` in `menu.js`, a pointer listener on `document`, a key listener on the bar, `ui.bar` pointed at the page: each fails 2 to 4 checks, in JavaScript and in AUDIT.md's commands |
| Unit tests | 55 | 59 of 59 pass. New: a first message with all its line breaks lost (an empty line first, a code fence inside): its header, where it comes from (never from the transcript), its turns and your text, Claude's branch title proposed; comparing the box with the prompt (blank lines at the start and end aside, any other difference counts) |
| End-to-end tests | 31 | 35 of 35 pass, 2 runs in a row. The fake claude.ai can behave as Firefox did (`options.firefox`: one insertion with line breaks gives one paragraph; an empty paragraph at the top). New: in that mode, the box is emptied and filled line by line, exactly, without a warning, the message is sent with its line breaks and the branch is named; a prompt of 105,393 characters (1,152 lines) the same way; a branch whose first message was sent without line breaks is still a branch and is named; dragging the panel. Updated: without that mode, one call and no note. 677 requests, none escaped |
| Real Tiptap editor (`npm run editor`, now part of `npm test`) | | In Playwright's Chromium and Firefox: P1's sample, a branch prompt with code and a table, a prompt of 99,234 characters. One call and line by line both give the exact text, the box empties, and `fill()` keeps the one call. 6 of 6, 3 runs in a row, about 7 s |

Time for the line-by-line way:

| | A prompt of about 100,000 characters (1,150 lines) |
|---|---|
| Fake claude.ai, Chromium (a plain editable element) | 4.8 s in all, the first try included |
| Real Tiptap editor, Chromium | 0.5 s |
| Real Tiptap editor, Firefox | 0.3 s |
| claude.ai's own editor, Firefox | not known: to see on the real site (the panel says it) |

## Choices beyond the brief

1. **The focus is checked** before anything is typed into the box (both ways), and before `selectAll`: `selectAll` and `delete` act where the focus is.
2. **A note when the second way could not run** ("the box could not be emptied"), and the warning as before.
3. **The fake reproduces Firefox in Chromium** through `input` events: Chromium does not send `beforeinput` for `execCommand`, but splits one insertion into one event per line, a line break being an insertion without data; the fake merges each such new paragraph back into the one before.
4. **The panel's height** is limited to what is left below its top once dragged, so it never goes below the window; it scrolls inside.
5. **After a reload** the panel is back at the bottom right (memory only, as asked).
6. **`editor-check.mjs` in `npm test`**: fast (about 7 s) and the same result on 3 runs. It needs Playwright's Firefox (`npx playwright install firefox`).

## To check on the real site (Pascal)

In Firefox (the signed 0.1.3 once Mozilla signs it, or a temporary add-on), then in Chrome, in `zbtest/` chats:

1. Branch, Open new chat: does the panel say "Inserted line by line, in … s"? (In Firefox it should; in Chrome it should not.) Is the box's text right, line by line, with no warning? How many seconds for a long chat?
2. Type a question, Send, then Name this branch: it works, the name proposed by Claude.
3. Open `oulipo/1c` (made by 0.1.2 in Firefox): the panel says "Branch oulipo/1c (not named yet)", and Name this branch works.
4. Drag the panel by its title bar to a place where it hides nothing; Hide, then the pill: it opens where you left it.
