# Terms findings

What Anthropic's terms allow for Zettelbranch, and what Anthropic support said. 2026-10-13.

## What the terms say

The Consumer Terms forbid accessing claude.ai "through automated or non-human means, whether through a bot, script, or otherwise", plus scraping, reverse engineering and bypassing protective measures. Exact quotes and links: [claude-ai__findings](claude-ai__findings.md#7-terms-and-browser-extensions).

They say nothing about browser extensions.

## Question sent to Anthropic support

Sent by Pascal on 2026-10-13, from claude.ai → Get help → Send us a message.

> Is a personal browser extension for claude.ai allowed?
>
> I'm building a small open-source browser extension for my own use with claude.ai, and I want to be sure it respects your terms before going further. Could you tell me whether each of these is allowed?
>
> 1. When I click a button, the extension reads the conversation shown on the page and opens a new chat in the same project with that text pre-filled. I review it and send it myself. Nothing is sent automatically.
> 2. Also on my click, the extension reads my own conversation list and conversations through the same requests the claude.ai web app makes (a few requests per click), and renames my conversations to give them tree-style names (for example "1a2 · Topic").
> 3. For development only: a small number of automated browser tests (a headless browser, a few dozen messages per month) on my account or on a dedicated test account. If this is not allowed, I will test by hand only.
>
> The extension never sends data anywhere other than claude.ai, and its code will be public.

## Reply

Received the same day. Probably from Fin, the AI support assistant, not a person: the wording is hedged, the reply was quick, and it suggests confirming details "with our team".

> Thanks for reaching out about your browser extension project. I can provide some guidance based on our policies, though you may want to confirm specific implementation details with our team.
>
> What our policies cover: Our Usage Policy prohibits abusing the platform through activities like jailbreaking, model scraping, or circumventing bans. For developers building products that interact with Claude, we require using API key authentication through Claude Console rather than routing requests through Free, Pro, or Max plan credentials, and we don't permit collecting or storing Claude.ai credentials or session tokens.
>
> Your specific scenarios:
>
> 1. Reading and pre-filling conversations - This appears to be for your personal use and doesn't seem to involve credential collection or automated sending.
> 2. Reading conversation lists via web app requests - Since you're using the same requests the web app makes on your own account, this seems like personal automation rather than credential intermediation.
> 3. Automated testing - The "abuse" prohibition in our Usage Policy could potentially apply to automated interactions, though a few dozen messages monthly for personal development testing seems minimal.
>
> Since your extension is for personal use, doesn't send data elsewhere, and will be open source, it may fall within acceptable personal automation. However, I'd recommend reviewing our full Usage Policy and Commercial Terms to ensure alignment with all provisions.

## What we take from it

Guidance, not a formal permission. It is still a written record that the project asked in good faith, and it should stay in the repo.

| Scenario | Reply | Rule for the project |
|---|---|---|
| 1. Read the page, pre-fill a new chat, on click | No problem seen | Allowed |
| 2. Read your own conversations through the web app's requests; rename | "Personal automation" | Allowed, with the credentials rule below |
| 3. Automated tests on claude.ai | "Could potentially apply… seems minimal" | Not cleared. Testing by hand only, unless a person at Anthropic confirms |

**Credentials rule** (new, from the reply): the extension never collects, reads, stores or sends claude.ai credentials or session tokens. Its same-origin requests rely on the browser attaching the login cookie by itself. In practice:

- no `cookies` permission in the manifest, and no `document.cookie` in the code;
- the organisation id comes from `GET /api/organizations`, not from the `lastActiveOrg` cookie;
- `AUDIT.md` greps for both.

The reply mentions the Commercial Terms, which cover API customers; for a claude.ai account the Consumer Terms apply.

## Open

- Optional: reply in the same support conversation and ask a person to confirm point 3. Nothing is blocked meanwhile.
