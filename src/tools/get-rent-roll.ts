import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

export const getRentRollInput = z.object({
  property_id: z.string().uuid(),
  as_of: z.string().optional(), // ISO date; defaults to today
});

export interface RentRollRow {
  suite_number: string;
  tenant_name: string | null;
  rsf: number;
  base_rent_monthly: number;
  cam_monthly: number;
  taxes_monthly: number;
  insurance_monthly: number;
  total_monthly: number;
  status: string;
  expiration_date: string | null;
  months_until_expiration: number | null;
}

export async function getRentRoll(
  supabase: SupabaseClient,
  args: z.infer<typeof getRentRollInput>,
): Promise<{ property_id: string; as_of: string; rows: RentRollRow[]; total_monthly: number; occupancy_pct: number }> {
  const asOf = args.as_of ?? new Date().toISOString().slice(0, 10);

  // Fetch suites + active leases + tenants for the property in one shot.
  const { data, error } = await supabase
    .from('suites')
    .select(
      `
      suite_number,
      rsf,
      status,
      leases!left(
        base_rent_monthly,
        cam_monthly,
        taxes_monthly,
        insurance_monthly,
        expiration_date,
        status,
        commencement_date,
        tenants(legal_name, dba)
      )
    `,
    )
    .eq('property_id', args.property_id);

  if (error) throw new Error(`get_rent_roll failed: ${error.message}`);

  const rows: RentRollRow[] = (data ?? []).map((suite: {
    suite_number: string;
    rsf: number;
    status: string;
    leases: Array<{
      base_rent_monthly: number;
      cam_monthly: number;
      taxes_monthly: number;
      insurance_monthly: number;
      expiration_date: string;
      status: string;
      commencement_date: string;
      tenants: { legal_name: string; dba: string | null } | null;
    }>;
  }) => {
    const activeLease = (suite.leases ?? []).find(
      (l) => l.status === 'executed' && l.commencement_date <= asOf && l.expiration_date >= asOf,
    );
    const tenant = activeLease?.tenants ?? null;
    const base = activeLease?.base_rent_monthly ?? 0;
    const cam = activeLease?.cam_monthly ?? 0;
    const tax = activeLease?.taxes_monthly ?? 0;
    const ins = activeLease?.insurance_monthly ?? 0;
    let months: number | null = null;
    if (activeLease?.expiration_date) {
      const exp = new Date(activeLease.expiration_date);
      const now = new Date(asOf);
      months = Math.max(0, Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    }
    return {
      suite_number: suite.suite_number,
      tenant_name: tenant?.dba ?? tenant?.legal_name ?? null,
      rsf: suite.rsf,
      base_rent_monthly: base,
      cam_monthly: cam,
      taxes_monthly: tax,
      insurance_monthly: ins,
      total_monthly: base + cam + tax + ins,
      status: activeLease ? 'occupied' : suite.status,
      expiration_date: activeLease?.expiration_date ?? null,
      months_until_expiration: months,
    };
  });

  const total_monthly = rows.reduce((s, r) => s + r.total_monthly, 0);
  const occupiedRsf = rows.filter((r) => r.status === 'occupied').reduce((s, r) => s + r.rsf, 0);
  const totalRsf = rows.reduce((s, r) => s + r.rsf, 0);
  const occupancy_pct = totalRsf > 0 ? Math.round((occupiedRsf / totalRsf) * 1000) / 10 : 0;

  return { property_id: args.property_id, as_of: asOf, rows, total_monthly, occupancy_pct };
}

export const getRentRollDef = {
  name: 'get_rent_roll',
  description:
    'Compute a rent roll snapshot for a single property as of a date (defaults to today). Returns per-suite tenant, rent components, expiration, months until expiration, plus portfolio-level total monthly rent and occupancy percentage. Read-only.',
  inputSchema: {
    type: 'object',
    properties: {
      property_id: { type: 'string', format: 'uuid' },
      as_of: { type: 'string', description: 'ISO 8601 date; defaults to today' },
    },
    required: ['property_id'],
    additionalProperties: false,
  },
} as const;
