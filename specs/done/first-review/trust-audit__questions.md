# Trust and audit questions

Context: [trust-audit__findings](trust-audit__findings.md).

## TA-1 · Distribution channels

**Status:** decided (2026-10-13): A. Folded into the [spec](../../zettelbranch__specs.md#trust-and-auditability-hard-requirements).

- **A.** GitHub tagged releases. Firefox: signed by AMO as unlisted (self-distributed
  `.xpi`). Chrome: load unpacked. *(recommended for now)*
- **B.** Also publish listed on AMO and the Chrome Web Store.
- **C.** GitHub only. Firefox through Developer Edition with signing disabled.

**Answer:** Whoa, I don't know. Give me details in a comprehensible way. 

### In plain words (Claude, 2026-10-13)

The question is how you, and anyone else, install the extension.

**Chrome has two ways:**

- **Chrome Web Store:** a public page, one-click install, automatic updates. Costs a
  one-time $5 developer fee, and Google reviews every version, which can take days.
- **"Load unpacked":** download the folder from GitHub, turn on Developer mode in
  `chrome://extensions`, and load it. Free, no review, it stays installed. No automatic
  updates: you load the new folder yourself.

**Firefox is stricter.** A folder loaded by hand (`about:debugging`) disappears when
Firefox restarts. A permanent install needs Mozilla's signature, in one of two forms:

- **Listed** on addons.mozilla.org: a public page, one-click install, automatic updates,
  reviewed by Mozilla.
- **Unlisted:** Mozilla signs the file, mostly automatically, without a public page. You
  put the signed `.xpi` file on GitHub, and people install it by opening it. Free.

(Firefox Developer Edition can skip signatures, but only developers use it.)

**The options, in those terms:**

- **A.** GitHub only: Chrome users load the folder, Firefox users get the signed
  unlisted file. Free, no store reviews, you stay in control. Less convenient for others.
- **B.** Also public store pages. Easy for others, with automatic updates, but costs
  reviews at every version and store pages to maintain. It also changes the nature of
  the project: Anthropic's support answer leaned on "personal use", and a public store
  listing makes it a product others use.
- **C.** GitHub only, and Firefox users need Developer Edition. Simplest for you,
  unusable for most people.

**Recommendation: A for now.** Decide about stores later, once it works and if people
ask for it.

## Defaults (object if you disagree)

- **TA-D1** · Layout: `extension/` ships as is; `tests/` and `package.json` are
  development only.
- **TA-D2** · `AUDIT.md` covers the extended grep list, with a justification per hit.
- **TA-D3** · `globalThis.browser ?? globalThis.chrome`; no background script unless one
  is needed.
- **TA-D4** · Extension UI in French and English via `_locales/`.
