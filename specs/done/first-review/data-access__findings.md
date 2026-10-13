# Data access findings

What the extension can see, and what that allows. Review of 2026-10-13.

## What the extension can see under the current constraints

With no network calls, no storage and no state:

| Source | Visible? |
|---|---|
| The current conversation's page | Yes |
| The sidebar | Yes, but only recent conversations |
| The full conversation list page | Only if the extension navigates there and reads it |
| Other conversations' content | No |

## Features that need more than that

- **Banner summaries** of siblings, children and cross-references: they live in other conversations.
- **Complete registry:** older branches drop out of the sidebar.
- **Next free address:** choosing `1c` or `1d` needs every existing child of `1`.
- **Backlinks** (incoming references), which are the heart of a Zettelkasten: they would require reading every conversation of the tree.
- **"Show whole tree":** needs the complete registry.

## Options

- **A. Allow calls to claude.ai only.** Change "no network calls" to "same-origin reads from claude.ai's own API, all in one file, provable by grep." Nothing leaves the server that already holds the data. Gives the full list, other branches' headers, and possibly renaming without driving the UI. Cost: the API is undocumented and can change. The audit claim becomes "only talks to claude.ai" instead of "never talks to anything."
- **B. Keep a local index.** Store a rebuildable list of address → conversation id, title, summary. claude.ai stays the source of truth, the index is a cache. Bends "no persistent storage of conversation content" for summaries. Cannot cover branches never opened on that machine.
- **C. Stay strict and shrink the features.** The banner shows only what titles reveal, which means putting the summary in the title (sidebar truncates long titles).

Recommendation: **A**. It is the only option that delivers the banner and tree view in full, and "only talks to claude.ai" is still easy to verify. Decision: DA-1.

## Handing the prompt to the new chat

This is the one place where some temporary state is needed: the prompt is built on the parent's page and must appear in the new chat's message box.

- claude.ai is a single-page app. If the new chat opens inside the same page, the content script keeps running and a variable is enough. *(to verify)*
- A new tab needs either `storage.session` (memory only, cleared on browser restart) or the page's own `sessionStorage`. In Chrome, content scripts can use `storage.session` only after a background script calls `setAccessLevel`, which adds a background script.

Default: open the new chat inside the same page, no storage. Both stay compatible with "no persistent storage of conversation content".

## Share links and the API's bot protection

Checked 2026-10-13 with the design conversation's share link, from the command line:

- `/share/<id>` returns the app shell (HTTP 200) with no conversation text. The page's JavaScript then fetches `/api/chat_snapshots/<id>?rendering_mode=messages&render_all_tools=true`.
- That API call, made outside a browser, gets a Cloudflare challenge (HTTP 403, "Just a moment..."). Not bypassed.

So claude.ai's API is guarded against non-browser clients. An extension's same-origin calls run inside a real, logged-in browser, so this should not block DA-1 = A *(to verify)*. It does mean any test or tool outside the browser cannot use the API.
