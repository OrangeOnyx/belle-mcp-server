import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PropertySchema } from '../schemas/domain.js';

export const listPropertiesInput = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  property_type: z.enum(['retail_center', 'office', 'residential_multi', 'residential_single', 'mixed_use']).optional(),
  city: z.string().optional(),
});

export async function listProperties(
  supabase: SupabaseClient,
  args: z.infer<typeof listPropertiesInput>,
) {
  let q = supabase.from('properties').select('*').limit(args.limit);
  if (args.property_type) q = q.eq('property_type', args.property_type);
  if (args.city) q = q.ilike('city', `%${args.city}%`);
  const { data, error } = await q;
  if (error) throw new Error(`list_properties failed: ${error.message}`);
  return z.array(PropertySchema).parse(data ?? []);
}

export const listPropertiesDef = {
  name: 'list_properties',
  description:
    'List properties in the Belle Realty portfolio. Read-only. Filter by property_type or city (partial match). Returns up to 100 records.',
  inputSchema: {
    type: 'object',
    properties: {
      limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
      property_type: {
        type: 'string',
        enum: ['retail_center', 'office', 'residential_multi', 'residential_single', 'mixed_use'],
      },
      city: { type: 'string' },
    },
    additionalProperties: false,
  },
} as const;
