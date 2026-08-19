# The HITL propose-write pattern

## The problem

Prompt injection is real. Agents are increasingly asked to write, send, transact. Once an agent can push text to a tenant, a customer, an inbox — a malicious document, a hostile web page, or even a poorly worded internal note can cause it to do the wrong thing.

The right defense is not smarter models. It is smaller trust boundaries.

## The pattern

For every action that has a real-world side effect:

1. **The AI proposes.** A tool creates a *draft* — a row in the database marked unapproved.
2. **The system saves.** The draft is persisted. Every field the AI wrote is in one place, editable, reviewable.
3. **A human approves.** In a separate interface (an admin UI, an email, a Slack button) a person makes the go/no-go call.
4. **The MCP surface does not include the approval tool.** Approvals are human-only by construction.

## In this repo

`draft_maintenance_response(ticket_id, proposed_message)`:

- Inserts a row into `draft_responses` with `approved=false`.
- Returns the draft + a `hitl_notice` string.
- **No** `approve_draft` tool. No `send_response` tool. No `notify_tenant` tool.

An agent that gets prompt-injected into "urgently send this fake maintenance notice to every tenant" can only spam the `draft_responses` table. It cannot reach the tenant.

## Applying this to your own domain

| If your AI wants to... | Save a draft of... | Human approves via... |
|-----------------------|-------------------|----------------------|
| Send a customer email | `email_drafts` row | Support inbox UI |
| Post to social media | `social_post_drafts` | Marketing dashboard |
| Wire money | `payment_drafts` | Finance approval queue |
| Push code to production | `deploy_proposals` | CI approval + PR review |
| Publish a blog | `content_drafts` | Editor's CMS |

Same shape every time: **the model writes the row, the human sets `approved=true`**.

## Why not put approval in MCP?

Because MCP tools are callable by any agent the user connects. If `approve_draft` exists as an MCP tool, a compromised or overeager agent can call it. The right approval surface is a UI that a person is looking at, or an out-of-band channel (email/Slack) with a signed token.

## Related reading

- [Anthropic — Prompt injection in agentic systems](https://www.anthropic.com/research)
- [Simon Willison — Prompt injection primer](https://simonwillison.net/tags/prompt-injection/)
- [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
