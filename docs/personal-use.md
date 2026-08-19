# Personal-use walkthrough

You own 2 rental houses and one small commercial suite. You want Claude to answer questions about your own portfolio without you copy-pasting spreadsheets into every chat.

## Setup (30 minutes, one-time)

1. Create a free Supabase project.
2. In the SQL editor, run `supabase/migrations/0001_init.sql`.
3. Clone this repo, `npm install`, `cp .env.example .env`, paste your Supabase URL + service-role key.
4. Insert your own rows (either edit `supabase/seed.ts` or paste SQL directly in the Supabase editor). At minimum: one property, one suite per unit, one tenant per active tenant, one lease per active tenancy.
5. `npm run build`.
6. Add the server to `~/Library/Application Support/Claude/claude_desktop_config.json` per the README.
7. Restart Claude Desktop.

## Example prompts

- "What tenants are on month-to-month at this point?" → Claude calls `list_tenants` + `get_lease`.
- "Draft a firm but professional response to the ticket about the water heater. Reference the tenant by first name, apologize for the delay, and give a specific eta." → Claude calls `search_maintenance_tickets` to find the ticket, then `draft_maintenance_response` to save its proposed reply. **The draft sits in `draft_responses` with `approved=false` until you approve it in your admin UI** (which you'll build next — see the Belle Realty PWA for a reference implementation).
- "Which of my leases are within 90 days of expiration?" → `get_rent_roll` on each property, filtered by `months_until_expiration`.

## The value

You never paste your rent roll into a chat again. Claude works from live data. Every AI-generated tenant reply is a draft you review, not a message that shipped.
