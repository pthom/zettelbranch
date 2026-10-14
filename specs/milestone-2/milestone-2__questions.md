# Milestone 2: questions

Decisions for the [Milestone 2 plan](milestone-2__specs.md). Context: [milestone-2__findings](milestone-2__findings.md). Answer on the **Answer:** lines, in any form.

## M2-1 What does Milestone 2 cover?

**Status:** open

- **A. Ready for a wider audience:** the panel's forms and fixes, the robustness of the copied history, the README and its pictures, store listings, the posts. New features ("gather branches", a button on each message, the banner, cross-references) wait for Milestone 3. The announcement comes sooner, and on a version people can trust at first sight.
- **B. A, plus "gather branches"** if its probe (step 9) shows that Claude can read the chats Zettelbranch points to. A strong story for the posts ("open a parenthesis, then close it"), but it delays them.
- **C. A, plus a button on each message and the banner.** The most complete version before announcing, and the longest wait.

**Recommendation:** A. Your brief says first impressions come from the panel and the pictures; features can follow once people use it, and their feedback will choose among them.

**Answer:**

## M2-2 Release 0.1.4 now, or with 0.2.0?

**Status:** open

- **A. Now,** once its check is finished: it is built, and your live test showed it working. Firefox users get the readable layout within a day, and we see Firefox update a copy by itself for the first time.
- **B. Together with 0.2.0:** one release instead of two, a few days later.

**Recommendation:** A. Small releases are easier to check, and the automatic update is worth seeing before the announcement.

**Answer:**

## M2-3 Store listings before the announcement?

**Status:** open

What each store gives and costs:

- **Chrome Web Store:** Chrome users install in one click and get updates automatically, instead of developer mode and updates by hand. Needs your Google developer account (a one-time fee of 5 USD), a privacy form, and a review of a few days. The listing must say plainly that Zettelbranch is not made by Anthropic.
- **Mozilla Add-ons, listed:** Firefox already installs in one click and updates itself; a listing adds a public page that Firefox users find by searching. The review can take longer than the automatic one you had; updates then come through addons.mozilla.org instead of this repository.

Options:

- **A. Both,** before the posts.
- **B. Chrome Web Store only,** before the posts; Mozilla's listing later. It fixes the real gap (Chrome updates), and Firefox already works well.
- **C. Neither for now:** announce with developer mode for Chrome.

**Recommendation:** B. "Expect it to break" means fixes must reach people fast, which only Chrome lacks today. Mozilla's listing is a plus that can come later.

**Answer:**

## M2-4 Name Perec in the posts?

**Status:** open

Your brief says "Zettelkasten, Luhmann and Perec second". Perec points to the Oulipo, and on 2026-10-13 you did not want to reveal the poems idea.

- **A. Luhmann and the Zettelkasten only.**
- **B. Luhmann and Perec.**

**Recommendation:** A, unless the poems idea no longer needs to stay private.

**Answer:**

## Defaults

Claude applies these unless you object under the item.

- **0.2.0** is the version number of the panel's rework (a visible change for users).
- **Forms with click listeners only** (`<form method="dialog">`, see the plan), unless probe P12 shows that claude.ai takes the keys.
- **After naming,** the panel closes and the pill's tooltip keeps the notice.
- **The insertion line** shows only when the box does not hold the exact text (as a warning); how it was filled moves to a tooltip.
- **Tables** in the copied history stay as they are.
- **Four-backtick blocks** become `~~~` blocks only if the render test shows that claude.ai renders `~~~` blocks.
- **The README's opening** is the paragraph of your brief, as written.
- **The demo:** frame 3 (the instructions) shorter.
- **The posts,** a few days apart: r/ClaudeAI, then the Obsidian community, then Show HN, so that what the first readers report can be fixed before the next.
