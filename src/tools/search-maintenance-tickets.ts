import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MaintenanceTicketSchema } from '../schemas/domain.js';

export const searchMaintenanceTicketsInput = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed', 'awaiting_tenant', 'awaiting_vendor']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  category: z.enum(['hvac', 'plumbing', 'electrical', 'roof', 'structural', 'pest', 'signage', 'landscaping', 'other']).optional(),
  property_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  reported_after: z.string().optional(), // ISO date
  q: z.string().optional(), // partial text search on title/description
  limit: z.number().int().min(1).max(100).default(25),
});

export async function searchMaintenanceTickets(
  supabase: SupabaseClient,
  args: z.infer<typeof searchMaintenanceTicketsInput>,
) {
  let q = supabase.from('maintenance_tickets').select('*').order('reported_at', { ascending: false }).limit(args.limit);
  if (args.status) q = q.eq('status', args.status);
  if (args.priority) q = q.eq('priority', args.priority);
  if (args.category) q = q.eq('category', args.category);
  if (args.property_id) q = q.eq('property_id', args.property_id);
  if (args.tenant_id) q = q.eq('tenant_id', args.tenant_id);
  if (args.reported_after) q = q.gte('reported_at', args.reported_after);
  if (args.q) q = q.or(`title.ilike.%${args.q}%,description.ilike.%${args.q}%`);
  const { data, error } = await q;
  if (error) throw new Error(`search_maintenance_tickets failed: ${error.message}`);
  return z.array(MaintenanceTicketSchema).parse(data ?? []);
}

export const searchMaintenanceTicketsDef = {
  name: 'search_maintenance_tickets',
  description:
    'Search maintenance tickets by any combination of status, priority, category, property, tenant, reported date, and text query. Read-only. Sorted by most recent first.',
  inputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed', 'awaiting_tenant', 'awaiting_vendor'] },
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
      category: { type: 'string', enum: ['hvac', 'plumbing', 'electrical', 'roof', 'structural', 'pest', 'signage', 'landscaping', 'other'] },
      property_id: { type: 'string', format: 'uuid' },
      tenant_id: { type: 'string', format: 'uuid' },
      reported_after: { type: 'string', description: 'ISO 8601 date' },
      q: { type: 'string', description: 'partial match on title/description' },
      limit: { type: 'number', minimum: 1, maximum: 100, default: 25 },
    },
    additionalProperties: false,
  },
} as const;
