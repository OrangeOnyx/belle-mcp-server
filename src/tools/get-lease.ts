import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { LeaseSchema } from '../schemas/domain.js';

export const getLeaseInput = z.object({
  lease_id: z.string().uuid().optional(),
  suite_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
}).refine(
  (v) => Boolean(v.lease_id || v.suite_id || v.tenant_id),
  { message: 'Provide at least one of lease_id, suite_id, or tenant_id' },
);

export async function getLease(
  supabase: SupabaseClient,
  args: z.infer<typeof getLeaseInput>,
) {
  let q = supabase.from('leases').select('*').limit(1);
  if (args.lease_id) q = q.eq('id', args.lease_id);
  else if (args.suite_id) q = q.eq('suite_id', args.suite_id).eq('status', 'executed');
  else if (args.tenant_id) q = q.eq('tenant_id', args.tenant_id).eq('status', 'executed');
  const { data, error } = await q;
  if (error) throw new Error(`get_lease failed: ${error.message}`);
  const row = (data ?? [])[0];
  if (!row) return null;
  return LeaseSchema.parse(row);
}

export const getLeaseDef = {
  name: 'get_lease',
  description:
    'Fetch a single lease by lease_id, or the active (executed) lease for a suite_id or tenant_id. Read-only. Returns null if no match.',
  inputSchema: {
    type: 'object',
    properties: {
      lease_id: { type: 'string', format: 'uuid' },
      suite_id: { type: 'string', format: 'uuid' },
      tenant_id: { type: 'string', format: 'uuid' },
    },
    additionalProperties: false,
  },
} as const;
