# Testing questions

Context: [testing__findings](testing__findings.md).

## TS-1 · Fixtures in a public repo

**Status:** open

- **A.** Create throwaway conversations in the test project, save them, scrub account
  details and sidebar titles, commit. *(recommended)*
- **B.** Use real conversations; fixtures stay out of git.
- **C.** Both: a small scrubbed set committed, a larger private set kept locally.

**Answer:**

## TS-2 · Sign-in method for the test profile

**Status:** open

- **A.** Email code. *(recommended: Google sign-in often refuses automated browsers)*
- **B.** Google.
- **C.** Already use email; nothing to change.

**Answer:**

## Defaults (object if you disagree)

- **TS-D1** · Real-page tests try headless first, then a visible window in a separate
  macOS Space, then stop and ask.
- **TS-D2** · Automated runs on the real site are kept few, and each run is logged in
  findings.
