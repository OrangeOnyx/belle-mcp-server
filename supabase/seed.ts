/**
 * Seed script for local demos and evals.
 *
 * Run with: npm run db:seed
 *
 * Creates a small but realistic Belle Realty dataset:
 *   - 1 shopping center property (On The Boulevard, Lafayette LA)
 *   - 6 suites (4 leased, 2 vacant)
 *   - 4 tenants
 *   - 4 executed leases
 *   - 5 maintenance tickets in various states
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function seed() {
  console.log('[seed] wiping existing demo data...');
  await supabase.from('draft_responses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('maintenance_tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('leases').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('suites').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('tenants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('properties').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('[seed] inserting property...');
  const { data: prop, error: pErr } = await supabase
    .from('properties')
    .insert({
      name: 'On The Boulevard Shopping Center',
      address: '121 Arnould Blvd',
      city: 'Lafayette',
      state: 'LA',
      postal_code: '70506',
      property_type: 'retail_center',
      total_rsf: 12000,
    })
    .select()
    .single();
  if (pErr || !prop) throw pErr;

  console.log('[seed] inserting suites...');
  const suites = [
    { suite_number: '1', rsf: 2500, status: 'leased' },
    { suite_number: '2', rsf: 1800, status: 'leased' },
    { suite_number: '3', rsf: 2200, status: 'vacant' },
    { suite_number: '4', rsf: 1500, status: 'leased' },
    { suite_number: '5', rsf: 2000, status: 'leased' },
    { suite_number: '6', rsf: 2000, status: 'vacant' },
  ];
  const { data: suiteRows, error: sErr } = await supabase
    .from('suites')
    .insert(suites.map((s) => ({ ...s, property_id: prop.id })))
    .select();
  if (sErr || !suiteRows) throw sErr;

  console.log('[seed] inserting tenants...');
  const tenants = [
    { legal_name: 'ACADIANA COFFEE ROASTERS LLC', dba: 'Acadiana Coffee Roasters', entity_type: 'LLC', primary_contact_name: 'Marc Broussard', primary_contact_email: 'marc@example.com', primary_contact_phone: '337-555-0101' },
    { legal_name: 'BAYOU BOOK STORE INC', dba: 'Bayou Books', entity_type: 'INC', primary_contact_name: 'Renée Hebert', primary_contact_email: 'renee@example.com', primary_contact_phone: '337-555-0102' },
    { legal_name: 'EXAMPLE RETAILER, LLC', dba: 'Example Salon', entity_type: 'LLC', primary_contact_name: 'Jane Sample', primary_contact_email: 'jane@example.com', primary_contact_phone: '337-555-0103' },
    { legal_name: 'CAJUN FITNESS STUDIO LLC', dba: 'Cajun Fitness', entity_type: 'LLC', primary_contact_name: 'Chad Landry', primary_contact_email: 'chad@example.com', primary_contact_phone: '337-555-0104' },
  ];
  const { data: tenantRows, error: tErr } = await supabase.from('tenants').insert(tenants).select();
  if (tErr || !tenantRows) throw tErr;

  console.log('[seed] inserting leases...');
  const leases = [
    { suite: '1', tenant: 0, base: 5000, cam: 729, tax: 469, ins: 156, dep: 6000 },
    { suite: '2', tenant: 1, base: 3600, cam: 525, tax: 338, ins: 113, dep: 4500 },
    { suite: '4', tenant: 2, base: 3125, cam: 438, tax: 281, ins: 94, dep: 4500 },
    { suite: '5', tenant: 3, base: 4000, cam: 583, tax: 375, ins: 125, dep: 5000 },
  ];
  await supabase.from('leases').insert(
    leases.map((l) => ({
      suite_id: suiteRows.find((s) => s.suite_number === l.suite)!.id,
      tenant_id: tenantRows[l.tenant]!.id,
      commencement_date: '2025-01-01',
      rent_commencement_date: '2025-04-01',
      expiration_date: '2027-12-31',
      base_rent_monthly: l.base,
      cam_monthly: l.cam,
      taxes_monthly: l.tax,
      insurance_monthly: l.ins,
      security_deposit: l.dep,
      status: 'executed',
    })),
  );

  console.log('[seed] inserting maintenance tickets...');
  const tickets = [
    { suite: '1', tenant: 0, category: 'hvac', priority: 'high', status: 'open', title: 'HVAC not cooling', description: 'Front-of-house unit blowing warm air since Monday morning.' },
    { suite: '2', tenant: 1, category: 'plumbing', priority: 'medium', status: 'in_progress', title: 'Slow drain in restroom', description: 'Customer restroom sink draining slowly, standing water after use.' },
    { suite: '4', tenant: 2, category: 'signage', priority: 'low', status: 'open', title: 'Exterior sign light out', description: 'Rear letter of storefront sign not illuminating at night.' },
    { suite: '5', tenant: 3, category: 'electrical', priority: 'urgent', status: 'awaiting_vendor', title: 'Panel tripping repeatedly', description: 'Sub-panel serving rear cardio section trips within an hour of morning open.' },
    { suite: null, tenant: null, category: 'roof', priority: 'medium', status: 'resolved', title: 'Roof drain clog', description: 'Rear roof drain overflowed during 3/15 storm. Vendor cleared 3/17.', resolved: true },
  ];
  await supabase.from('maintenance_tickets').insert(
    tickets.map((t) => ({
      property_id: prop.id,
      suite_id: t.suite ? suiteRows.find((s) => s.suite_number === t.suite)!.id : null,
      tenant_id: t.tenant !== null ? tenantRows[t.tenant]!.id : null,
      category: t.category,
      priority: t.priority,
      status: t.status,
      title: t.title,
      description: t.description,
      reported_at: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
      resolved_at: t.resolved ? new Date().toISOString() : null,
    })),
  );

  console.log('[seed] done.');
}

seed().catch((e) => {
  console.error('[seed] failed:', e);
  process.exit(1);
});
