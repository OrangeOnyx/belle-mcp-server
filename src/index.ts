#!/usr/bin/env node
/**
 * Belle MCP Server — entry point.
 *
 * Exposes Belle Realty property data as read-only MCP tools plus a single
 * HITL-gated propose-write tool. Speaks MCP over stdio by default (compatible
 * with Claude Desktop, Cursor, etc.) or HTTP for hosted deployments.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfig } from './lib/config.js';
import { getSupabase } from './lib/supabase.js';
import { RateLimiter } from './lib/rate-limit.js';
import { writeAudit } from './lib/audit.js';
import { tools, listToolDefinitions } from './tools/index.js';

async function main() {
  const config = loadConfig();
  const supabase = getSupabase(config);
  const rateLimiter = new RateLimiter(config.MCP_RATE_LIMIT_PER_MIN);

  const server = new Server(
    {
      name: 'belle-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: listToolDefinitions() };
  });

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const started = Date.now();
    const toolName = req.params.name;
    const args = req.params.arguments ?? {};
    const tool = tools[toolName];

    if (!tool) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
      };
    }

    const { allowed, retryAfterMs } = rateLimiter.check();
    if (!allowed) {
      await writeAudit(supabase, config.MCP_AUDIT_LOG_ENABLED, {
        tool_name: toolName,
        args_summary: {},
        outcome: 'blocked',
        error_message: `rate_limit retry_after_ms=${retryAfterMs}`,
        ms_elapsed: Date.now() - started,
      });
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Rate limit exceeded (${config.MCP_RATE_LIMIT_PER_MIN}/min). Retry in ${Math.ceil(retryAfterMs / 1000)}s.`,
          },
        ],
      };
    }

    try {
      const result = await tool.handler(supabase, args);
      await writeAudit(supabase, config.MCP_AUDIT_LOG_ENABLED, {
        tool_name: toolName,
        args_summary: sanitizeArgs(args),
        outcome: 'success',
        ms_elapsed: Date.now() - started,
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await writeAudit(supabase, config.MCP_AUDIT_LOG_ENABLED, {
        tool_name: toolName,
        args_summary: sanitizeArgs(args),
        outcome: 'error',
        error_message: message,
        ms_elapsed: Date.now() - started,
      });
      return {
        isError: true,
        content: [{ type: 'text', text: `Tool ${toolName} failed: ${message}` }],
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // eslint-disable-next-line no-console
  console.error('[belle-mcp] server up on stdio; awaiting tool calls');
}

function sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (typeof v === 'string' && v.length > 200) out[k] = `${v.slice(0, 200)}...`;
    else out[k] = v;
  }
  return out;
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[belle-mcp] fatal:', err);
  process.exit(1);
});
