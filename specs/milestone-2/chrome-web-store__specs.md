# Chrome Web Store: the listing (draft)

Plan step 8 (M2-3 = B: the Chrome Web Store before the posts). Drafted by Claude on 2026-10-14 for Pascal's review; Pascal creates the developer account and submits. The dashboard's exact questions change from time to time: what is marked *(to verify)* is checked against the dashboard when Pascal opens it.

## What Pascal does

1. **Done 2026-10-14:** the developer account exists (Pascal's Google account, signed up from Firefox; the dashboard shows no item yet, "Limite d'extensions : 0/2"). Left in its "Profil" page: the publisher name, the contact email and its verification, the non-trader declaration. On the way, a sign-in to Chrome itself in the test profile turned on Chrome Sync and installed 11 extensions from Pascal's account there; Pascal removed them and turned sync off the same day, so the test profile holds only Zettelbranch again.
   Originally: sign up at the Chrome Web Store developer dashboard with the Google account to use, pay the one-time 5 USD, and give a contact email (it shows on the listing). Declare a **non-trader** account (a free project, not a business): the EU asks every developer.
2. When this file is approved and the pictures are ready: "New item", upload `zettelbranch-0.2.0.zip` (the release's zip), fill the tabs from the sections below, submit. Google's review takes a few days, sometimes more for a first item.
3. Once published: the README's Chrome install points to the store, and each later release is uploaded there too (one more step in [how a release goes](../zettelbranch__status.md#how-a-release-goes-for-the-next-version)).

## Two things the package needs first (questions)

- **An icon.** The store asks for a 128 x 128 icon, in the package (manifest `icons`) and on the listing *(to verify: whether the package's icon is mandatory)*; Zettelbranch has none, so Chrome and Firefox show a grey puzzle piece. Proposal: Claude draws a simple one, three linked cards in a small tree, in the panel's brown (`#8a4b2a`), as SVG turned into PNG at 16, 32, 48 and 128 px; Pascal picks among two or three drafts. It would ship in 0.2.0 if ready before the release, else in the next version.
- **The Firefox part of the manifest** (`browser_specific_settings`): Chrome ignores it with a warning; the store should accept it *(to verify at upload)*. If not, the store's zip leaves it out, and `AUDIT.md` says why.

## Store listing tab

**Name:** Zettelbranch

**Summary** (132 characters at most; 128):

> Branch claude.ai conversations into new chats with short addresses (sky/1a), so your chats form a tree you can find your way in.

**Description** (plain text, as the store shows it):

> Explore your thoughts and side quests without getting lost.
>
> When we think, we open parentheses: a side question, an alternative, a detail worth chasing. In a long conversation, every parenthesis lands in the same thread, and soon nobody remembers where it was opened. Zettelbranch opens the parenthesis in a new chat instead: branch from any message, and the main thread stays where you left it.
>
> How it works:
> 1. Click the Zettelbranch button on claude.ai and choose where the branch starts: after one of Claude's replies, or instead of one of your messages.
> 2. Zettelbranch opens a new chat holding the conversation so far, with a short header. Type your question and press Send yourself; it never sends anything for you.
> 3. Claude sums up where the conversation stood, answers, and suggests a name.
> 4. The chat is named with its address, like sky/1a · Why sunsets are red and orange. Your chats form a tree, shown in the panel with links, and readable in the sidebar on every device.
>
> The name: Zettelkasten (German, "box of index cards") + branch, after the card boxes of Niklas Luhmann, where every card has an address.
>
> Privacy and trust:
> - No permissions. It runs only on claude.ai, in your own page.
> - It reads a conversation only when you open its panel or click, through claude.ai's own interface, and sends it nowhere but back to claude.ai, into the new chat you open.
> - It stores nothing, never reads your login, and never sends a message or deletes anything.
> - The code is short and open (MIT), with an audit guide: github.com/pthom/zettelbranch
>
> An early version: claude.ai changes often, and Zettelbranch relies on its web interface. When something breaks, please open an issue on GitHub.
>
> Zettelbranch is an independent project, not made or endorsed by Anthropic. Claude and claude.ai are Anthropic's.

**Category:** Productivity, "Workflow & Planning" *(to verify: the store's current categories)*. **Language:** English.

**Graphics** (from the shoot's pictures, composed by Claude, [visuals__specs](visuals__specs.md)):
- the icon, 128 x 128 (above);
- 1 to 5 screenshots, 1280 x 800: the panel choosing where to branch; the new chat with the steps; Claude's first reply; the tree in the panel; the sidebar with the addresses;
- the small promotional tile, 440 x 280: the name and the small `sky/` tree of the demo's title card *(to verify: required or optional)*.

**Links:** homepage and support: `https://github.com/pthom/zettelbranch` (support: its issues).

## Privacy practices tab

**Single purpose:**

> Zettelbranch branches a claude.ai conversation into a new claude.ai chat holding a copy of the conversation so far, and names the chats with tree addresses so that they form a tree.

**Permissions:** none requested. The only access is the content script on `https://claude.ai/*`. Justification, if asked for the site access:

> Zettelbranch works only on claude.ai: when you click, it reads the conversation on screen through claude.ai's own interface, opens a new claude.ai chat with a copy of it, and renames claude.ai chats to their tree addresses. It does nothing on any other site.

**Remote code:** No. All code is in the package; nothing is downloaded or evaluated.

**Data usage.** The form asks which kinds of user data the item collects. Zettelbranch reads the text of your claude.ai conversations (the store's "Website content", and arguably "Personal communications") and sends it only to claude.ai, into your own new chat, when you click; nothing goes to the developer or anyone else, and nothing is stored. Two honest ways to answer:

- **A (recommended).** Tick "Website content" and "Personal communications", with the three certifications (not sold or transferred to third parties; not used for anything but the single purpose; not used for credit), and give a privacy policy: a short `PRIVACY.md` in the repository saying the above. The safe reading: Google's reviewers see that the extension reads conversations, and the form matches it.
- **B.** Tick nothing, on the reading that "collect" means sending data to the developer or a third party, which Zettelbranch never does. Simpler, but a reviewer may read it otherwise and reject or question the item.

**Privacy policy** (for A), to publish as `PRIVACY.md` and link from the form:

> Zettelbranch runs only in your browser, on claude.ai. When you open its panel or click its buttons, it reads the conversation on screen through claude.ai's own interface; when you branch, it puts a copy of that conversation into the message box of a new claude.ai chat, which you send yourself; when you name a branch, it renames the chat on claude.ai. It sends nothing to anyone else: no developer server, no analytics, no third party. It stores nothing: what it reads stays in the tab's memory until the tab closes. It never reads your claude.ai login or cookies. The code is open and short; AUDIT.md lists what it never does, with the commands that prove it.

## Distribution tab

Public, all regions, free.
