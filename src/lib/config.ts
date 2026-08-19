import 'dotenv/config';
import { z } from 'zod';

const ConfigSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  MCP_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(60),
  MCP_AUDIT_LOG_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  MCP_TRANSPORT: z.enum(['stdio', 'http']).default('stdio'),
  PORT: z.coerce.number().int().positive().default(3939),
  MCP_HTTP_TOKEN: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const parsed = ConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('[belle-mcp] Invalid environment configuration:');
    console.error(parsed.error.format());
    process.exit(1);
  }
  return parsed.data;
}
