-- Belle MCP Server — initial schema
-- Portable Postgres. Runs on Supabase and on any modern Postgres.

create extension if not exists "pgcrypto";

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  city text not null,
  state char(2) not null,
  postal_code text not null,
  property_type text not null check (property_type in
    ('retail_center','office','residential_multi','residential_single','mixed_use')),
  total_rsf integer,
  created_at timestamptz not null default now()
);

create table if not exists suites (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  suite_number text not null,
  rsf integer not null,
  status text not null check (status in
    ('vacant','leased','available_soon','under_construction')),
  unique (property_id, suite_number)
);

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  dba text,
  entity_type text,
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text
);

create table if not exists leases (
  id uuid primary key default gen_random_uuid(),
  suite_id uuid not null references suites(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  commencement_date date not null,
  rent_commencement_date date,
  expiration_date date not null,
  base_rent_monthly numeric(12,2) not null,
  cam_monthly numeric(12,2) not null default 0,
  taxes_monthly numeric(12,2) not null default 0,
  insurance_monthly numeric(12,2) not null default 0,
  security_deposit numeric(12,2) not null default 0,
  status text not null check (status in ('draft','executed','expired','terminated'))
);

create index if not exists idx_leases_suite on leases(suite_id);
create index if not exists idx_leases_tenant on leases(tenant_id);

create table if not exists maintenance_tickets (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  suite_id uuid references suites(id) on delete set null,
  tenant_id uuid references tenants(id) on delete set null,
  category text not null check (category in
    ('hvac','plumbing','electrical','roof','structural','pest','signage','landscaping','other')),
  priority text not null check (priority in ('low','medium','high','urgent')),
  status text not null check (status in
    ('open','in_progress','resolved','closed','awaiting_tenant','awaiting_vendor')),
  title text not null,
  description text not null,
  reported_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_tickets_property on maintenance_tickets(property_id);
create index if not exists idx_tickets_status on maintenance_tickets(status);

create table if not exists draft_responses (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references maintenance_tickets(id) on delete cascade,
  proposed_message text not null,
  approved boolean not null default false,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_drafts_ticket on draft_responses(ticket_id);

create table if not exists mcp_audit_log (
  id bigserial primary key,
  tool_name text not null,
  actor_hint text,
  args_summary jsonb not null,
  outcome text not null check (outcome in ('success','error','blocked')),
  error_message text,
  ms_elapsed integer not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_tool on mcp_audit_log(tool_name, created_at desc);
