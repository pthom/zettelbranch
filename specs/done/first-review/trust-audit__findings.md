# Trust and audit findings

Review of the "Trust and auditability" section, 2026-10-13.

## Grepping for `fetch` is not enough

A content script can send data out through the page without calling `fetch` or
`XMLHttpRequest`. `AUDIT.md` should also grep for:

| Channel | Patterns |
|---|---|
| Elements that load URLs | `createElement('img'`, `'iframe'`, `'link'`, `'script'`, `.src`, `setAttribute('src'`, `setAttribute('href'` |
| CSS | `url(` |
| Navigation | `location`, `window.open`, `.submit(` |
| Dynamic code | `eval`, `new Function`, `import(`, `setTimeout(` with a string |
| HTML injection | `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `DOMParser`, `document.write` |
| Other extensions | `runtime.sendMessage` with an extension id, `externally_connectable` in the manifest |

Some of these will have legitimate uses (`location` to read the current URL). `AUDIT.md`
lists each hit with a one-line justification.

If DA-1 = A, the allowed network call lives in one file, and the grep proves there is
exactly one call site, to a claude.ai URL.

## "No dependencies" applies to the shipped folder

Playwright, jsdom and web-ext are development tools. Make the layout explicit:

- `extension/`: what ships, zipped as is, no dependencies;
- `tests/`, `package.json`: development only, never shipped.

## Installing in Firefox

- Extensions loaded via `about:debugging` disappear when Firefox restarts.
- A permanent install in normal Firefox needs signing by AMO. Unlisted (self-distributed)
  signing works without a public store listing. This is where `gecko.id` matters.
- Firefox Developer Edition and Nightly can disable the signing requirement.

## Hashes

Stores add signature files to packages (`META-INF/` for AMO, `_metadata/` for the
Chrome Web Store), so a hash of the package will not match. Publishing a SHA-256 for each
source file, as the spec says, is the right choice: users can compare the files in the
installed extension's folder.

## One codebase, no build

- Namespace: `const api = globalThis.browser ?? globalThis.chrome;`
- Background script: avoid one if possible. If needed, declare both
  `background.scripts` (Firefox) and `background.service_worker` (Chrome) in one
  manifest.
- `_locales/` handles French and English UI strings without a build step.

## The preview

The message box itself shows what will be sent, so the preview adds most value when
long text becomes an attachment ([forking__findings](forking__findings.md)).
