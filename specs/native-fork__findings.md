# Native fork findings

claude.ai's own "continue branch as new chat", for NF-1 (decided A: read the notes, then probe). Started 2026-10-13.

## What the public notes say

Source: the notes of the Claude QoL authors on claude.ai's newer internal API ([bard-rework.md](https://github.com/lugia19/Claude-QoL/blob/main/docs/bard-rework.md), [bard README](https://github.com/lugia19/claude-ext-common/blob/main/scripts/bard/README.md)), read on 2026-10-13. Third-party notes, so all *(to verify)*. Their code is GPL: read, not copied.

| What | The notes say |
|---|---|
| Call | `POST /claudeai-rpc/anthropic.bard.api.v1alpha.ConversationService/PerformAction`, one request, one answer |
| Action | `continue_branch_as_new_chat { source_conversation_id, through_message_id }` |
| New chat's id | chosen by the caller: a new id in the request's header (`conversation_id`), not the source's |
| Header | also `mutation_id { session_id: "sess_…", version: 1 }` and `display_language` (said to be required for another action; unclear here) |
| Format | protobuf, or Connect's JSON (camelCase field names); HTTP headers `content-type`, `connect-protocol-version: 1`, `x-organization-uuid`, `anthropic-client-platform: web_claude_ai` |
| Who may call | the page, and a Chrome content script (the page's origin); an extension page gets 403 "origin not allowed" |
| Answer | an empty body in about 0.4 s; the copy fills in over the next seconds (an early read saw 12 of 18 messages) |
| Which messages | "through any message, including hidden branches"; whether `through_message_id` itself is included is not said |
| What is copied | the messages, as real messages (new ids, original dates), attachments with new file ids, the title, the settings; the model gets the history as real context |
| What is not | the model (back to the default); no link back to the source |
| Refused | chats "upgraded" to a sandbox: 400 `failed_precondition`, "This version can't be continued in a new session" |
| Renaming | the copy keeps the source's title; a rename after it works (`rename_conversation`, or the legacy `PUT`, which Zettelbranch already uses) |

QoL itself chose not to use it (their decision D8): their own fork also makes summary forks, which this action cannot.

## What it would change for Zettelbranch

- A branch becomes a real copy of the conversation up to the fork point: messages shown as messages, images and pasted files kept, Claude continuing from its own turns.
- The first new message no longer carries the transcript: only the header (address, path, fork point), the request for a summary, and your question.
- Branching from your own message: copy through the message before it, then your message is pre-filled.
- One more write: creating a conversation, through an API marked "alpha". The copy stays as the fallback.

## The probe (P9)

Built in the spike's panel (version 0.0.7), the Milestone 0 tool kept for this (M1-D5). Spike commit in the done log once run.

- One more allowed call in the spike's `claude-api.js`: the `POST` above, with only `continueBranchAsNewChat` in its body, and only from a chat whose title starts with `zbtest/` (the copy keeps that title, so it stays in the test tree).
- "Fork through Claude's last reply" or "Fork through my last message": the new chat's id is chosen by the panel.
- "Read the new chat" reads the copy with the usual API call and compares it with the source: number of messages, roles, exact text of each, new ids, files and attachments, title, model, settings; and whether the "through" message itself is included.
- Offline test against the fake claude.ai: 68 of 68 checks pass, audit 12 of 12. The fake copies at once and includes the through message: an assumption the real run checks.

### Running it (Pascal)

1. `chrome://extensions`: turn Zettelbranch off and the spike on, click ⟳ on the spike (the panel says 0.0.7). Reload the claude.ai tab.
2. Open a `zbtest/` chat with a few messages, ideally one with an image (`zbtest/1 . fixture` if it still exists). Otherwise make one: a message with an image, a reply, a second message, a reply; rename it by hand, for example `zbtest/9 . fork test`.
3. Open "ZB probes", go to P9. Click "Fork through Claude's last reply". Wait about 5 seconds, click "Read the new chat".
4. Click "Fork through my last message", wait, "Read the new chat".
5. "Copy results" at the top, paste them to Claude.
6. Open the new chat with the link (a new tab) and look: are the earlier messages shown as normal messages, is the image there? Optionally send "What did we talk about?" to see Claude continue.
7. Delete the copies (they have the same title as the original) and the other `zbtest/` chats. Turn the spike off and Zettelbranch on again.

## Results

Not run yet.
