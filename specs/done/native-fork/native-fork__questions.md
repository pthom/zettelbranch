# Native fork questions

Context: Pascal's question during the Milestone 1 checklist (2026-10-13): "we are using new chats instead of forking, i.e. re-editing a message?" What claude.ai offers: `specs/claude-ai__findings.md`, section 1.

## NF-1 · Copy the conversation, or let claude.ai fork it?

**Status:** decided (2026-10-13): A. Pascal: "Let's do a probe about forks." Research and probe in `specs/native-fork__findings.md`.

Today Zettelbranch opens a new chat and puts a copy of the conversation in your first message, as one quoted block of text. Claude reads it as a transcript, not as its own past messages. Images and files do not come along (placeholders).

claude.ai has two forks of its own:

1. **Editing or retrying a message.** It makes a sibling inside the same conversation, behind the `< 1/2 >` arrows. One conversation has one title, so its branches cannot carry their own address, do not show in the sidebar or on the phone, and cannot be linked. That cannot hold a tree of named branches.
2. **"Continue branch as new chat",** a server action seen in claude.ai's code by the authors of the Claude QoL extension; not documented by Anthropic. It copies a conversation up to a chosen message into a **new chat, as real earlier messages**, with images and files. A new chat means its own title, so its own address.

With the second one, a branch would look and behave like a normal chat: the earlier messages show as messages, images survive, and Claude continues naturally. Your first new message would carry only the short header and your question.

Unknowns: whether it works on your account and for any message; it belongs to claude.ai's newer internal API, marked "alpha", which changes often; and it creates a conversation, a kind of write beyond the reads and renames you allowed (DA-2).

- **A.** Claude first reads the public notes on this action (no clicks, nothing on your account). If it looks usable, a short probe by hand: one button in the spike panel, two clicks in a `zbtest/` chat. If it works, Zettelbranch uses it, with today's copy as the fallback when it fails. *(recommended)*
- **B.** Finish Milestone 1 with the copy (it works and is tested), and look at the native action in Milestone 2.
- **C.** Keep the copy only: no undocumented writes beyond renaming.

**Answer:** A

## NF-2 · Use claude.ai's own fork when branching from the last reply?

**Status:** decided (2026-10-13): A. Folded into the plan (`specs/milestone-1__specs.md`, step 6b) and the spec's core design.

The probe showed that claude.ai copies a conversation into a new chat only through its **last** message. Through an earlier message, it refuses.

So there are two kinds of branch:

- **From the last reply** (the panel's default): claude.ai's own copy. The new chat shows the earlier messages as normal messages, images included, and Claude continues from its own turns. Your first message there carries only the header (address, path, fork point), the request for a summary, and your question.
- **From an earlier message, or instead of your own message:** today's copy, one quoted transcript in your first message, images as placeholders.

Options:

- **A.** Use claude.ai's fork from the last reply, today's copy everywhere else, and today's copy also when claude.ai's fork fails (its API is marked "alpha" and may change). Most branches start from the last reply, so most get the better copy. The two kinds look a bit different in the new chat; the header is the same. *(recommended)*
- **B.** Today's copy always: one behaviour everywhere, no "alpha" API, no extra write. Images never come along.
- **C.** Decide later: release 0.1.0 with today's copy, add A in Milestone 2.

What A changes in the work: one more allowed call in `api.js` (the fork, as in the probe), the branch flow choosing between the two, the header found in the first message you send rather than in message 1, and new tests. About a day of offline work, then a short check by hand.

**Answer:** A
