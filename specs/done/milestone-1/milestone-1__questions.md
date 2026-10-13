# Milestone 1 questions

Context: [milestone-1__specs](../../milestone-1__specs.md), and what Milestone 0 found ([claude-ai__findings](../../claude-ai__findings.md#9-checked-on-pascals-account-milestone-0)).

## M1-1 · Does Milestone 1 name branches with their address?

**Status:** decided (2026-10-13): A. Folded into the [plan](../../milestone-1__specs.md) and the [spec](../../zettelbranch__specs.md#first-milestone).

The spec's first milestone was "extraction plus a branch button; addresses come after". Milestone 0 showed that renaming works, and the spike already computes addresses correctly (`1a`, `1b`, `1a1`, by segments).

- **A.** Yes: from the first version, a branch is named `oulipo/1a · <topic>`, and a conversation not in a tree yet becomes `oulipo/1 · <its title>`. You get a real tree in your sidebar from day one. *(recommended)*
- **B.** No: Milestone 1 only copies the conversation into a new chat (the header still says where it came from); names come in Milestone 2. Simpler, but until then it is a plain fork, like Claude QoL's.

**Answer:** A

## M1-2 · Where the Branch button lives

**Status:** decided (2026-10-13): C, the button at the bottom right now, a button on each message later. Folded into the [plan](../../milestone-1__specs.md).

- **A.** One small "Branch" button at the bottom right of the page, like the spike's panel. It opens a list of the conversation's messages (number, who wrote it, first words), with Claude's last reply chosen; you pick another if you like. It never touches claude.ai's own page layout, so a claude.ai redesign rarely breaks it. *(recommended for Milestone 1)*
- **B.** A "Branch from here" button on every message, next to claude.ai's own Copy and Retry buttons. The most natural to use, but it plugs into claude.ai's layout: the page only draws the messages near the screen and redraws them as you scroll, so the extension has to keep watching the page to re-add its buttons, and a claude.ai redesign can break it at any time.
- **C.** A first, then B in a later milestone, once the rest is stable.

**Answer:** C

## M1-3 · When the new branch gets its name

**Status:** decided (2026-10-13): B, with the name editable. After Claude's first reply, "Name this branch" in the panel opens a browser dialog pre-filled with `<tree>/<address> · <automatic title>`; the topic can be changed, the address part must stay. Nothing happens on its own. Folded into the [plan](../../milestone-1__specs.md) and the [spec](../../zettelbranch__specs.md#core-design).

The name is `<tree>/<address> · <topic>`, and the topic is claude.ai's automatic title. That title only exists after Claude's first reply. Renaming earlier works (P4), but then the topic would be missing.

- **A.** Automatically: after you press Send, the extension reads the new chat every few seconds until Claude's first reply and the automatic title are there, then renames it. It stops after a few minutes at most. This is the one thing it does without a fresh click, as the end of the branch you started. *(recommended)*
- **B.** With a click: a "Name this branch" button appears once Claude has replied. Nothing happens on its own, but it is one more click for every branch, and a branch you forget to name stays outside the tree.

**Answer:** B, With a possibility to edit the name. 

## M1-4 · How the open tab shows the new name

**Status:** decided (2026-10-13): A. Folded into the [plan](../../milestone-1__specs.md) and the [spec](../../zettelbranch__specs.md#known-risks--open-questions).

When the extension renames a chat through the API, claude.ai keeps the new name (your phone shows it at once), but the open tab keeps showing the old one until you reload the page. A plain reload (Cmd+R) is enough; Shift+Reload is not needed. In P8 this made a rename look like a failure.

- **A.** A short notice after each rename: "Named oulipo/1a · Writing lipograms. claude.ai shows the new name after a reload. [Reload now]". You reload when it suits you. *(recommended)*
- **B.** The extension reloads the page itself right after renaming. The sidebar is always right, but the page jumps while you are reading Claude's first reply.
- **C.** The extension renames through claude.ai's own rename menu instead of the API, as if you had done it by hand, so the tab updates at once. It means driving claude.ai's interface (open the menu, fill the field, confirm), which breaks whenever claude.ai changes that menu.

**Answer:** A

## Defaults (object if you disagree)

- **M1-D1** · The tree name for a new root is asked in a small browser dialog, pre-filled from the conversation's title (for example `oulipo`). A browser dialog, because what you type in it cannot reach claude.ai's page.
- **M1-D2** · Pasted text (claude.ai's "Pasted" attachments) is copied with its message, since Claude saw it. Images, other files and artifacts get a placeholder with their name.
- **M1-D3** · The preview shows the exact text and its size; above 100,000 characters (the largest size tested) it warns before opening the new chat.
- **M1-D4** · Fixtures come from one `zbtest/` chat that Pascal sets up and saves by hand with the browser's developer tools (step 4 of the plan, with a guide). The conversation list is cut down to its `zbtest/` entries before it is committed.
- **M1-D5** · `spike/` is deleted when Milestone 1 starts, after Pascal removes the spike extension from the Chrome test profile. *Updated after Pascal's note below: `spike/` stays until the 0.1.0 release, and its extension is only turned off in the test profile, so its probe panel is still at hand if claude.ai changes during Milestone 1. Deleted after the release; git history keeps it, and one command brings it back (`git checkout <commit> -- spike`).*
- **M1-D6** · The Firefox check comes at the end of Milestone 1, in a separate Firefox profile (Firefox is Pascal's main browser).

Pascal: "Delete the spike only if you're certain you will not need it for testing later." (Answered in M1-D5.)
