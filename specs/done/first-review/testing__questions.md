# Testing questions

Context: [testing__findings](testing__findings.md).

## TS-1 · Fixtures in a public repo

**Status:** decided (2026-10-13), adjusted: fixtures are saved by hand, since no script may touch claude.ai. Folded into [spec](../../zettelbranch__specs.md#development-workflow).

- **A.** Create throwaway conversations in the test project, save them, scrub account
  details and sidebar titles, commit. *(recommended)*
- **B.** Use real conversations; fixtures stay out of git.
- **C.** Both: a small scrubbed set committed, a larger private set kept locally.

**Answer:** A

## TS-2 · Sign-in method for the test profile

**Status:** decided (2026-10-13): C, nothing to change. No automated browser ever signs in; Pascal signs in to the test profile by hand.

- **A.** Email code. *(recommended: Google sign-in often refuses automated browsers)*
- **B.** Google.
- **C.** Already use email; nothing to change.

**Answer:** I would need a conversation about that.

> Claude, 2026-10-13: probably no longer needed. Email code was recommended because
> Google sign-in often refuses automated browsers. Since no automated browser will ever
> touch claude.ai, you sign in to your test profile by hand, any way you like. If you
> agree, this question closes with "C, nothing to change".

## Defaults (object if you disagree)

- ~~**TS-D1** · Real-page tests try headless first, then a visible window in a separate
  macOS Space, then stop and ask.~~ Superseded: no automated real-page tests (see
  [terms__findings](../../terms__findings.md)).
- **TS-D2** · Automated runs on the real site are kept few, and each run is logged in
  findings.
