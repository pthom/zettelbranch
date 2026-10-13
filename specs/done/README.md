# Done

The log of finished work, newest first. When a piece of work is done, it leaves the
working files (the [status](../zettelbranch__status.md), a milestone's plan) and gets one
short entry here, in the same commit: the date and the title, one sentence on what
changed, the commits, a link. The linked file holds the details. Files whose work is over
move to a folder here, one per piece of work, and stay for history. To find the commit
that added an entry: `git log -S "<a few words of its title>" -- specs/done/README.md`.

- **2026-10-13: Milestone 0 closed**
  ([in brief](milestone-0/milestone-0__findings.md#in-brief)): every probe passed. Last,
  P2: one `execCommand` call keeps 100,000 characters inline, and the model sees them.
  The facts Milestone 1 needs are in
  [claude-ai__findings](../claude-ai__findings.md#9-checked-on-pascals-account-milestone-0);
  the plan and results moved to [milestone-0/](milestone-0/milestone-0__findings.md).
- **2026-10-13: Probes P6, P7 and P8 done**
  ([findings](milestone-0/milestone-0__findings.md#fourth-probe-session-p8s-check-p6-p7)): Claude
  follows the branch prompt (summary first, right parent, no re-answering); the page holds
  only 11 of a long chat's 80 messages, so extraction reads the API; the P0 selectors hold
  on a chat page. A branch from a chat's first message now asks for no summary. Spike
  4b87d1f.
- **2026-10-13: Probes P3, P4 and P5 done**
  ([findings](milestone-0/milestone-0__findings.md#third-probe-session-p8-p3-p5)): a new chat opens
  without a page load and keeps the extension's memory (DA-D1 holds); API renames work
  and survive the automatic title, but the open tab shows them only after a reload; the
  list finds every `zbtest/` chat and holds no Cowork or Code sessions. P4 and P8 became
  numbered steps after Pascal found P8 unclear. Spike 1ef38f7, cf143d4.
- **2026-10-13: First probes on the real site, P5 and P1**
  ([findings](milestone-0/milestone-0__findings.md#first-probe-session-p5-and-p1)): claude.ai's API
  answers on Pascal's merged account (63 conversations in one request; the sidebar shows
  14), and text inserted with `execCommand` is sent exactly, line breaks and indentation
  included. Spike 0.0.3 then puts P1 and P2 chats in the `zbtest` tree. Spike a2302f6.
- **2026-10-13: The vault gets a `done/` folder**, after Pascal's way of working in
  imgui_bundle: finished work leaves the working files for this log. The first review and
  the origin conversation moved here; the status file's "Done" list and the README's
  history became the entries below.
- **2026-10-13: Probe panel (P1 to P8)** in the spike extension, version 0.0.2: offline
  tests 56/56 against a fake claude.ai, audit 12/12
  ([findings](milestone-0/milestone-0__findings.md#probe-panel-p1-to-p8)). 7b9ae42, c5a5c83.
- **2026-10-13: Test setup, by hand**: the Chrome profile "Zettelbranch test". The test
  project was dropped: new claude.ai projects are Claude Code projects, so test chats live
  in the `zbtest` tree ([findings](milestone-0/milestone-0__findings.md#observations-by-hand)).
  8828d66, d15caff, eec2849.
- **2026-10-13: The vault checked against the original design conversation**
  ([findings](origin-conversation/origin-conversation__findings.md)): AD-3 decided (tree
  names), prior art and the app-link check added to the spec, Perec reworded. Native
  `< 2/2 >` arrows still show on Pascal's merged account. 960c868, cb32867, 49a09d3,
  f52e539.
- **2026-10-13: Spike P0, offline**, on the share page Pascal saved by hand: 44 of 44
  messages, roles right, text 99.9% identical to the JSON
  ([findings](milestone-0/milestone-0__findings.md#p0--read-a-shared-conversation)). The
  conversation itself:
  [zettelbranch__origin-conversation](origin-conversation/zettelbranch__origin-conversation.md).
  20403a5.
- **2026-10-13: Every question of the first review decided**, the last ones in chat with
  plain explanations, and folded into the spec. The question files say where each
  decision went ([first-review/](first-review/zettelbranch__questions.md)). 2eccc5e,
  8236dd7.
  - Decided: DA-1 = A (calls to claude.ai's own API), DA-2 = A (reads and renaming),
    DA-D1 (handoff in the same page, else memory-only storage), TA-1 = A (GitHub only),
    TS-1 (fixtures saved by hand), TS-2 = C, FK-1 (Claude writes the parent's summary in its first reply),
    FK-2 = A (the full transcript first, shorter modes later), FK-3 = A, XR-1 = A (`→` in your own messages),
    AD-1, AD-2, AD-3 (tree names), ZB-1 (Zettelbranch), ZB-2 (Milestone 0 first), ZB-3
    (working rules in `CLAUDE.md`).
- **2026-10-13: Anthropic support asked about the extension**
  ([terms__findings](../terms__findings.md)): no script or automated browser ever touches
  claude.ai; the extension never touches credentials. 2eccc5e.
- **2026-10-13: Public research on claude.ai** ([claude-ai__findings](../claude-ai__findings.md)):
  its internal API, the message editor, long pastes, the "one Claude" merge. 2eccc5e.
- **2026-10-13: First review of the spec; vault set up**
  ([first-review/](first-review/zettelbranch__findings.md)): findings and questions per
  subject. 44f5494.
- **2026-10-13: Incidents of the first day**, each closed:
  - a subagent's `find ~` set off macOS "access your Desktop" prompts; Pascal refused
    them. Rule in `CLAUDE.md`: never search the home folder;
  - the share link's data (`/api/chat_snapshots/…`) sits behind a Cloudflare check for
    non-browser clients. Not bypassed; Pascal saved the files by hand;
  - Claude Code warned "transcript saving is off — inherited CLAUDE_CODE_CHILD_SESSION
    marker": VS Code had inherited `CLAUDE_CODE_CHILD_SESSION=1`. Fix: quit VS Code
    (Cmd+Q) and relaunch it from the Dock, or start `env -u CLAUDE_CODE_CHILD_SESSION claude`.
