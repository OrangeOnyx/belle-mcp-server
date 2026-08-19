# Sample queries

Once Claude Desktop is wired up (see README), try these prompts. Each one exercises a different tool.

## Portfolio browse

> "List all retail properties I manage in Lafayette."

Expected tool call: `list_properties` with `property_type=retail_center`, `city=Lafayette`.

## Rent roll

> "What's the current rent roll for On The Boulevard shopping center? Include occupancy and total monthly rent."

Expected tool call: `get_rent_roll` with the property's UUID.

## Tenant lookup

> "Who's my tenant in Suite 4 at On The Boulevard?"

Expected: `list_properties` → find property → `list_tenants` scoped to property. Or `get_lease` by suite_id.

## Ticket triage

> "Show me every open maintenance ticket sorted by priority, urgent first."

Expected: `search_maintenance_tickets` with `status=open`, then Claude reorders by priority.

## Draft a reply (HITL)

> "Draft a professional response to the urgent electrical ticket at Cajun Fitness. Reference Chad by first name, apologize for the delay, and commit to having a licensed electrician on-site by tomorrow at 10am."

Expected: `search_maintenance_tickets` to find the ticket → `draft_maintenance_response` to save the draft.

The response will include `hitl_notice` reminding you the draft is unapproved and will not be delivered until you approve it in the admin UI.

## Lease expiration audit

> "Which leases expire in the next 12 months across the portfolio?"

Expected: `list_properties` → per property, `get_rent_roll` → filter by `months_until_expiration <= 12`.
