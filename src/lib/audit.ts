import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuditEntry {
  tool_name: string;
  actor_hint?: string; // e.g., "claude-desktop", "cursor"
  args_summary: Record<string, unknown>;
  outcome: 'success' | 'error' | 'blocked';
  error_message?: string;
  ms_elapsed: number;
}

/**
 * Best-effort audit logger. If the audit table isn't present or the write fails,
 * we log to stderr and continue — audit failure never breaks a tool call.
 */
export async function writeAudit(
  supabase: SupabaseClient,
  enabled: boolean,
  entry: AuditEntry,
): Promise<void> {
  if (!enabled) return;
  try {
    const { error } = await supabase.from('mcp_audit_log').insert({
      tool_name: entry.tool_name,
      actor_hint: entry.actor_hint ?? null,
      args_summary: entry.args_summary,
      outcome: entry.outcome,
      error_message: entry.error_message ?? null,
      ms_elapsed: entry.ms_elapsed,
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.error('[belle-mcp] audit write failed:', error.message);
    }
  } catch (err) {
    console.error('[belle-mcp] audit write threw:', (err as Error).message);
  }
}
