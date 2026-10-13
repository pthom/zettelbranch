# Trust and audit questions

Context: [trust-audit__findings](trust-audit__findings.md).

## TA-1 · Distribution channels

**Status:** open

- **A.** GitHub tagged releases. Firefox: signed by AMO as unlisted (self-distributed
  `.xpi`). Chrome: load unpacked. *(recommended for now)*
- **B.** Also publish listed on AMO and the Chrome Web Store.
- **C.** GitHub only. Firefox through Developer Edition with signing disabled.

**Answer:**

## Defaults (object if you disagree)

- **TA-D1** · Layout: `extension/` ships as is; `tests/` and `package.json` are
  development only.
- **TA-D2** · `AUDIT.md` covers the extended grep list, with a justification per hit.
- **TA-D3** · `globalThis.browser ?? globalThis.chrome`; no background script unless one
  is needed.
- **TA-D4** · Extension UI in French and English via `_locales/`.
