import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DraftResponseSchema } from '../schemas/domain.js';

/**
 * PROPOSE-WRITE tool. This is the only tool in this server that writes to the database,
 * and even here the write is intentionally minimal: it saves a DRAFT with approved=false.
 * The draft never leaves the system until a human approves it through a separate UI or
 * a call to approve_draft (not exposed via MCP by design — approvals should not be automated).
 *
 * This pattern is the point of the whole repo. AI proposes; humans decide.
 */

export const draftMaintenanceResponseInput = z.object({
  ticket_id: z.string().uuid(),
  proposed_message: z.string().min(20).max(4000),
  actor_hint: z.string().max(120).optional(),
});

export async function draftMaintenanceResponse(
  supabase: SupabaseClient,
  args: z.infer<typeof draftMaintenanceResponseInput>,
) {
  // Verify the ticket exists first — do not create orphan drafts.
  const { data: ticket, error: ticketErr } = await supabase
    .from('maintenance_tickets')
    .select('id, status')
    .eq('id', args.ticket_id)
    .maybeSingle();
  if (ticketErr) throw new Error(`draft_maintenance_response verify failed: ${ticketErr.message}`);
  if (!ticket) throw new Error(`draft_maintenance_response: ticket ${args.ticket_id} not found`);

  const { data, error } = await supabase
    .from('draft_responses')
    .insert({
      ticket_id: args.ticket_id,
      proposed_message: args.proposed_message,
      approved: false,
      approved_by: null,
      approved_at: null,
    })
    .select('*')
    .single();

  if (error) throw new Error(`draft_maintenance_response failed: ${error.message}`);

  return {
    draft: DraftResponseSchema.parse(data),
    hitl_notice:
      'This draft has been saved with approved=false. It will not be delivered until a human reviews and approves it through the Belle Realty admin interface. This MCP server intentionally does not expose an approval tool.',
  };
}

export const draftMaintenanceResponseDef = {
  name: 'draft_maintenance_response',
  description:
    'Save a proposed response to a maintenance ticket as an unapproved DRAFT. HITL-gated: the draft is never delivered until a human approves it in the admin UI. Use this to let AI draft tenant replies quickly while keeping a person in the loop.',
  inputSchema: {
    type: 'object',
    properties: {
      ticket_id: { type: 'string', format: 'uuid' },
      proposed_message: { type: 'string', minLength: 20, maxLength: 4000 },
      actor_hint: { type: 'string', maxLength: 120, description: 'Optional label for the AI actor (e.g., "claude-desktop")' },
    },
    required: ['ticket_id', 'proposed_message'],
    additionalProperties: false,
  },
} as const;
