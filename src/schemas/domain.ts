import { z } from 'zod';

/**
 * Zod schemas mirroring the Belle Realty domain model.
 * These correspond 1:1 to the tables created by supabase/migrations/0001_init.sql.
 * Every read tool projects to one of these; every write tool validates input against one.
 */

export const PropertySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string().length(2),
  postal_code: z.string(),
  property_type: z.enum(['retail_center', 'office', 'residential_multi', 'residential_single', 'mixed_use']),
  total_rsf: z.number().int().nullable(),
  created_at: z.string(),
});
export type Property = z.infer<typeof PropertySchema>;

export const SuiteSchema = z.object({
  id: z.string().uuid(),
  property_id: z.string().uuid(),
  suite_number: z.string(),
  rsf: z.number().int(),
  status: z.enum(['vacant', 'leased', 'available_soon', 'under_construction']),
});
export type Suite = z.infer<typeof SuiteSchema>;

export const TenantSchema = z.object({
  id: z.string().uuid(),
  legal_name: z.string(),
  dba: z.string().nullable(),
  entity_type: z.string().nullable(),
  primary_contact_name: z.string().nullable(),
  primary_contact_email: z.string().email().nullable(),
  primary_contact_phone: z.string().nullable(),
});
export type Tenant = z.infer<typeof TenantSchema>;

export const LeaseSchema = z.object({
  id: z.string().uuid(),
  suite_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  commencement_date: z.string(),
  rent_commencement_date: z.string().nullable(),
  expiration_date: z.string(),
  base_rent_monthly: z.number(),
  cam_monthly: z.number(),
  taxes_monthly: z.number(),
  insurance_monthly: z.number(),
  security_deposit: z.number(),
  status: z.enum(['draft', 'executed', 'expired', 'terminated']),
});
export type Lease = z.infer<typeof LeaseSchema>;

export const MaintenanceTicketSchema = z.object({
  id: z.string().uuid(),
  property_id: z.string().uuid(),
  suite_id: z.string().uuid().nullable(),
  tenant_id: z.string().uuid().nullable(),
  category: z.enum(['hvac', 'plumbing', 'electrical', 'roof', 'structural', 'pest', 'signage', 'landscaping', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed', 'awaiting_tenant', 'awaiting_vendor']),
  title: z.string(),
  description: z.string(),
  reported_at: z.string(),
  resolved_at: z.string().nullable(),
});
export type MaintenanceTicket = z.infer<typeof MaintenanceTicketSchema>;

export const DraftResponseSchema = z.object({
  id: z.string().uuid(),
  ticket_id: z.string().uuid(),
  proposed_message: z.string(),
  approved: z.boolean(),
  approved_by: z.string().nullable(),
  approved_at: z.string().nullable(),
  created_at: z.string(),
});
export type DraftResponse = z.infer<typeof DraftResponseSchema>;
