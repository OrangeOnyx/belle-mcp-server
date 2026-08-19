# Company-use walkthrough

You run Belle Realty (or any small property-management company). 3-8 staff. You want everyone on the team to have Claude access to portfolio data without SQL literacy and without any risk of destructive writes.

## Setup

1. Deploy the server to Railway or Fly. Set `MCP_TRANSPORT=http`, `MCP_HTTP_TOKEN=<shared-secret>`, `PORT=3939`.
2. Configure Supabase with your production data (or a read-replica).
3. In your team wiki, share the Claude Desktop config snippet with the URL + token.
4. Each teammate pastes it in and restarts Claude Desktop.

## Governance

- **Rate limit** — 60 tool calls per minute per server instance. Bump `MCP_RATE_LIMIT_PER_MIN` if legitimate use requires more.
- **Audit** — every call is logged to `mcp_audit_log` with tool name, args summary, outcome, elapsed ms. Build a Retool or Metabase dashboard on top for weekly review.
- **HITL writes** — `draft_maintenance_response` is your one write. Nobody's AI can send text to a tenant. All tenant-facing replies are approved in your admin UI by a human named in `approved_by`.
- **Read isolation** — the service-role key gives the server full DB access. If you want per-user scoping, add JWT verification in the HTTP transport and filter queries by the caller's `org_id`.

## Sample staff prompts

- Leasing agent: "What suites are vacant across all properties?" → `list_properties` + rent-roll pass.
- Property manager: "Give me every open urgent-priority ticket, sorted by age." → `search_maintenance_tickets`.
- Bookkeeper: "Total monthly rent producing today across the portfolio." → loop `get_rent_roll` across properties, sum.
- Owner (Adam): "Draft a lease-renewal outreach for the four leases expiring in the next 6 months." → Claude reads leases + tenants, produces four drafts as `draft_responses`.

## What you don't get without this

Every team member becomes an intermediary between Claude and your data. They paste spreadsheets, they retype ticket details, they forget to redact PII. This server removes that friction while keeping the write path controlled.
