# Privacy policy

Zettelbranch is a browser extension that branches claude.ai conversations into new chats. It runs only in your browser, only on claude.ai. Last updated: 2026-10-14.

## What it reads, and when

- When you open its panel, it reads the conversation on screen and the list of your conversation titles, through claude.ai's own interface, so that it can show the messages and the tree of your branches.
- While the panel is open, it reads again when you move to another chat.
- It reads nothing when the panel is closed and you do not click it.

## Where it sends what it reads

Only back to claude.ai, and only when you click:

- when you branch, it puts a copy of the conversation into the message box of a new claude.ai chat, which you send yourself;
- when you name a branch, it renames that chat on claude.ai.

It sends nothing to anyone else: no server of the developer, no analytics, no third party. It never sends a message for you and never deletes anything.

## What it stores

Nothing. What it reads stays in the page's memory and is gone when you close or reload the tab. It never reads your claude.ai login, cookies or session tokens.

## Updates

The extension itself never connects anywhere but claude.ai. The browser checks for new versions on its own: the Chrome Web Store for Chrome, and this GitHub repository for the signed Firefox version (`updates.json`).

## Check it yourself

The code is short and open (MIT). [AUDIT.md](AUDIT.md) lists what the code never does, with the commands that prove it; `extension/api.js` holds every network call, four in all, all to claude.ai.

## Contact

Questions: [open an issue](https://github.com/pthom/zettelbranch/issues) on GitHub. Zettelbranch is an independent project, not made or endorsed by Anthropic.
