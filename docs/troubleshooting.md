# Troubleshooting

The five failure modes we see most often when someone runs this repo cold.

## 1. `SUPABASE_URL is required` on startup

**Symptom:** Server exits immediately with a Zod validation error.

**Cause:** `.env` not loaded, or the file is present but the process doesn't see it.

**Fix:**
```bash
cp .env.example .env
# Edit .env with real values
# Then confirm they're visible to node:
node -e "require('dotenv').config(); console.log(!!process.env.SUPABASE_URL)"
```
If that prints `true` but the server still fails, you may have a stray `.env.local` or shell export overriding it.

## 2. Every tool call returns "permission denied for schema public"

**Symptom:** Read tools return errors like `permission denied for table properties`.

**Cause:** You used the anon key instead of the service-role key, or Row Level Security is on with no policy that admits the service role.

**Fix:**
- Confirm `SUPABASE_SERVICE_ROLE_KEY` starts with `eyJhbGc...` and matches the "service_role" entry in Supabase → Project Settings → API. The anon key will not work.
- If you enabled RLS on any of these tables, add a policy that allows the service role, or disable RLS for the demo tables: `alter table properties disable row level security;` (do this only for demo/dev environments).

## 3. Claude Desktop doesn't see the tools

**Symptom:** You added the config, restarted Claude Desktop, and no `belle-realty` toolset appears.

**Diagnosis order:**
1. Confirm the path in `claude_desktop_config.json` is **absolute**, not relative or `~/...`.
2. Confirm you ran `npm run build` — Claude Desktop runs `node dist/index.js`, not `tsx src/index.ts`.
3. Check Claude Desktop's MCP log:
   - macOS: `~/Library/Logs/Claude/mcp-server-belle-realty.log`
   - Windows: `%APPDATA%\Claude\logs\`
4. If the log shows the process dying immediately, run the same command from your terminal to see the real error: `node /absolute/path/to/dist/index.js`.

## 4. `Rate limit exceeded` in the middle of a long conversation

**Symptom:** A tool call returns `Rate limit exceeded (60/min). Retry in Xs.` even though it feels like Claude only made a few calls.

**Cause:** Claude Desktop retries and Claude's planner sometimes fans out to several tool calls per user message. 60/min is fine for casual use but tight for exploratory analysis.

**Fix:** Bump the limit in your `.env`:
```
MCP_RATE_LIMIT_PER_MIN=300
```
Restart. If you're on the HTTP transport with multiple clients, consider moving the limiter to Redis (see the note in `src/lib/rate-limit.ts`).

## 5. Audit rows aren't showing up

**Symptom:** `mcp_audit_log` is empty even though tools clearly worked.

**Cause:** Either the table doesn't exist (migration not run) or `MCP_AUDIT_LOG_ENABLED=false`.

**Fix:**
```sql
select count(*) from mcp_audit_log;
```
If that errors, re-run `supabase/migrations/0001_init.sql`. Audit failures never bubble up as tool errors by design — check the server's stderr to see if writes are being rejected silently.

## Node version

Node 20+ required. The `Server` import from `@modelcontextprotocol/sdk` uses features that don't exist in 18. If you get cryptic module-resolution errors, `node --version` first.

## Still stuck?

Open an issue with:
- Output of `node --version` and `npm --version`
- The full `.env` file with secrets replaced by `***`
- The stderr from running `node dist/index.js` directly (not through Claude Desktop)
- Whether the failing operation is a read tool, the write tool, or startup
