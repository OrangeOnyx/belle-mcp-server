import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Config } from './config.js';

let client: SupabaseClient | null = null;

export function getSupabase(config: Config): SupabaseClient {
  if (!client) {
    client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'public' },
    });
  }
  return client;
}
