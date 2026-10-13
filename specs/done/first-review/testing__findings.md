# Testing findings

Review of the "Development workflow" section, 2026-10-13.

## Fixtures will contain private data

A saved claude.ai page contains:

- the conversation's full content;
- the sidebar, with titles of your other conversations;
- your account name and possibly email, organisation ids.

The repo is meant to be public. Options: build fixture conversations from throwaway content in the test project and scrub the account details, or keep fixtures out of git. Decision: TS-1.

## Fixtures go stale

Unit tests on fixtures stay green while claude.ai changes. The spec's "fail loudly" covers it at runtime: the extension checks its selectors on load and shows a visible warning when they match nothing. Fixtures should be refreshed whenever that happens.

## Bot checks

claude.ai sits behind Cloudflare. Automated browsers, especially headless ones, are likely to hit challenges. (The share link of the design conversation already got one from a plain HTTP fetch.) Plan:

1. try headless Chromium (new headless mode supports extensions) in a persistent Playwright context;
2. if challenged, use a visible window in a separate macOS Space, so it does not take over the screen;
3. if still challenged, stop and tell Pascal (as the spec says).

## Signing in

Google sign-in often refuses browsers controlled by automation. If you use Google to sign in to claude.ai, the test profile should use email-code sign-in instead. Decision: TS-2.

## Terms of use

Anthropic's consumer terms restrict automated access to claude.ai. The extension acting on your clicks is ordinary use; Playwright scripts creating conversations are automated access. Keep automated runs on the real site few and supervised.
