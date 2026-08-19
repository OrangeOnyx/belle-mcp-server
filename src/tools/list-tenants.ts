import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TenantSchema } from '../schemas/domain.js';

export const listTenantsInput = z.object({
  property_id: z.string().uuid().optional(),
  active_only: z.boolean().default(true),
  limit: z.number().int().min(1).max(100).default(50),
});

export async function listTenants(
  supabase: SupabaseClient,
  args: z.infer<typeof listTenantsInput>,
) {
  if (args.property_id) {
    // Join through leases → suites → property
    const { data, error } = await supabase
      .from('leases')
      .select('tenants(*), suites!inner(property_id)')
      .eq('suites.property_id', args.property_id)
      .eq(args.active_only ? 'status' : 'id', args.active_only ? 'executed' : 'id')
      .limit(args.limit);
    if (error) throw new Error(`list_tenants failed: ${error.message}`);
    const tenants = (data ?? [])
      .map((r: { tenants: unknown }) => r.tenants)
      .filter((t): t is Record<string, unknown> => t !== null);
    return z.array(TenantSchema).parse(tenants);
  }

  const { data, error } = await supabase.from('tenants').select('*').limit(args.limit);
  if (error) throw new Error(`list_tenants failed: ${error.message}`);
  return z.array(TenantSchema).parse(data ?? []);
}

export const listTenantsDef = {
  name: 'list_tenants',
  description:
    'List tenants across the portfolio, optionally scoped to a single property. Read-only.',
  inputSchema: {
    type: 'object',
    properties: {
      property_id: { type: 'string', format: 'uuid' },
      active_only: { type: 'boolean', default: true },
      limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
    },
    additionalProperties: false,
  },
} as const;
