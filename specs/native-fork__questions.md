# Native fork questions

Context: `specs/native-fork__findings.md` (P9 results). NF-1 (decided A, probe it) is in `specs/done/native-fork/native-fork__questions.md`.

## NF-2 · Use claude.ai's own fork when branching from the last reply?

**Status:** open

The probe showed that claude.ai copies a conversation into a new chat only through its **last** message. Through an earlier message, it refuses.

So there are two kinds of branch:

- **From the last reply** (the panel's default): claude.ai's own copy. The new chat shows the earlier messages as normal messages, images included, and Claude continues from its own turns. Your first message there carries only the header (address, path, fork point), the request for a summary, and your question.
- **From an earlier message, or instead of your own message:** today's copy, one quoted transcript in your first message, images as placeholders.

Options:

- **A.** Use claude.ai's fork from the last reply, today's copy everywhere else, and today's copy also when claude.ai's fork fails (its API is marked "alpha" and may change). Most branches start from the last reply, so most get the better copy. The two kinds look a bit different in the new chat; the header is the same. *(recommended)*
- **B.** Today's copy always: one behaviour everywhere, no "alpha" API, no extra write. Images never come along.
- **C.** Decide later: release 0.1.0 with today's copy, add A in Milestone 2.

What A changes in the work: one more allowed call in `api.js` (the fork, as in the probe), the branch flow choosing between the two, the header found in the first message you send rather than in message 1, and new tests. About a day of offline work, then a short check by hand.

**Answer:**
