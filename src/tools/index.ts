import type { SupabaseClient } from '@supabase/supabase-js';
import { listPropertiesInput, listProperties, listPropertiesDef } from './list-properties.js';
import { listTenantsInput, listTenants, listTenantsDef } from './list-tenants.js';
import { getLeaseInput, getLease, getLeaseDef } from './get-lease.js';
import {
  searchMaintenanceTicketsInput,
  searchMaintenanceTickets,
  searchMaintenanceTicketsDef,
} from './search-maintenance-tickets.js';
import { getRentRollInput, getRentRoll, getRentRollDef } from './get-rent-roll.js';
import {
  draftMaintenanceResponseInput,
  draftMaintenanceResponse,
  draftMaintenanceResponseDef,
} from './draft-maintenance-response.js';

export interface ToolHandler {
  definition: {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  };
  handler: (supabase: SupabaseClient, args: unknown) => Promise<unknown>;
  isWrite: boolean;
}

export const tools: Record<string, ToolHandler> = {
  list_properties: {
    definition: listPropertiesDef,
    handler: (sb, args) => listProperties(sb, listPropertiesInput.parse(args)),
    isWrite: false,
  },
  list_tenants: {
    definition: listTenantsDef,
    handler: (sb, args) => listTenants(sb, listTenantsInput.parse(args)),
    isWrite: false,
  },
  get_lease: {
    definition: getLeaseDef,
    handler: (sb, args) => getLease(sb, getLeaseInput.parse(args)),
    isWrite: false,
  },
  search_maintenance_tickets: {
    definition: searchMaintenanceTicketsDef,
    handler: (sb, args) => searchMaintenanceTickets(sb, searchMaintenanceTicketsInput.parse(args)),
    isWrite: false,
  },
  get_rent_roll: {
    definition: getRentRollDef,
    handler: (sb, args) => getRentRoll(sb, getRentRollInput.parse(args)),
    isWrite: false,
  },
  draft_maintenance_response: {
    definition: draftMaintenanceResponseDef,
    handler: (sb, args) =>
      draftMaintenanceResponse(sb, draftMaintenanceResponseInput.parse(args)),
    isWrite: true,
  },
};

export function listToolDefinitions() {
  return Object.values(tools).map((t) => t.definition);
}
