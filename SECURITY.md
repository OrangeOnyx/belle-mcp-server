# Security Policy

## Reporting a vulnerability

If you discover a security issue in `belle-mcp-server`, please **do not** open a public GitHub issue.

Email: adam@adamabdalla.com
Subject line: `[SECURITY] belle-mcp-server: <short description>`

Include:
- A description of the vulnerability
- Steps to reproduce (or a proof-of-concept)
- The version / commit SHA affected
- Your contact info for follow-up

You'll get an acknowledgment within 5 business days. Confirmed issues get a fix and a coordinated disclosure timeline agreed with the reporter.

## Threat model

This server sits between an AI client (Claude Desktop, Cursor, or a custom agent) and a Supabase Postgres database that contains real property-management data — tenants, leases, maintenance tickets. The threats we design against:

| Threat | Defense |
|--------|---------|
| Compromised or hostile agent tries to write data | Only one write tool exists (`draft_maintenance_response`), and it always saves `approved=false`. There is no approve tool on the MCP surface. |
| Prompt injection in a maintenance ticket description tricks the agent | The agent can only propose drafts. A human sees the draft in an admin UI before it reaches a tenant. See `docs/prompt-injection-scenarios.md`. |
| Excessive tool calling (accidental or malicious) drains cost or DBs | In-process sliding-window rate limiter (60/min default, configurable). |
| Credential leak | Service-role key only exists in `.env` and never in client-facing code. The server is the only process that holds it. |
| Silent unauthorized actions | Every tool call is written to `mcp_audit_log` with tool name, args summary, outcome, and timing. |
| SQL injection via tool arguments | All queries use the Supabase JS client's parameterized query builder; no string concatenation into SQL. Every input passes Zod validation before reaching the DB layer. |
| Data exfiltration via tool output | Read tools return typed shapes only (no free-form SELECT), and the domain schema doesn't expose PII fields the agent doesn't need. |

## Threats NOT defended against in this version

These are known gaps. Address them before deploying to production with real data:

1. **HTTP transport authentication is a shared bearer token.** For multi-tenant use, add per-user JWT verification and scope queries by the caller's `org_id`.
2. **Rate limiting is per-process.** Behind a load balancer with multiple instances, an attacker can multiply the limit by the fleet size. Move the limiter to Redis if this matters.
3. **The audit log is not tamper-proof.** Anyone with the service-role key can delete rows. If audit integrity matters, replicate the log to an append-only store (e.g., a separate database, S3 with object lock).
4. **No secret rotation guidance.** If your service-role key is ever exposed, rotate it in Supabase, redeploy, and audit the log for anomalous calls before the rotation timestamp.
5. **Approval flow is out-of-band.** This server intentionally doesn't ship an approval UI. If your approval flow is weak (e.g., anyone with DB access can flip `approved=true`), the HITL gate is only as strong as that.

## What's in scope for reports

- Any way to bypass Zod validation and reach the database layer with malformed input
- Any way to make the write tool commit `approved=true` from an MCP call
- Any way to make the server perform actions not listed in `tools/list`
- Any way to exfiltrate the service-role key through server output
- Rate-limiter bypasses
- Audit-log write bypasses that don't otherwise fail the operation

## What's out of scope

- Issues in dependencies with published patches (please open a PR with the upgrade instead)
- Issues in Supabase itself (report to Supabase)
- Issues in Anthropic's models or the MCP SDK (report to Anthropic / MCP maintainers)
- DoS via legitimate high-volume tool use — configure your rate limit accordingly

## Related

- Prompt injection scenarios: [`docs/prompt-injection-scenarios.md`](docs/prompt-injection-scenarios.md)
- HITL pattern explanation: [`docs/hitl-pattern.md`](docs/hitl-pattern.md)
