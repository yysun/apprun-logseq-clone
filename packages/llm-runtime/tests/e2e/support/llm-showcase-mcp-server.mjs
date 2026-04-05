/**
 * LLM Package Showcase MCP Server
 *
 * Purpose:
 * - Provide a tiny deterministic stdio MCP server for the real `llm-runtime` showcase.
 *
 * Key features:
 * - Exposes one predictable lookup tool that returns release tokens by subject.
 * - Runs over stdio so the showcase exercises package-owned MCP transport support.
 * - Avoids external dependencies beyond the MCP SDK and zod already in the workspace.
 *
 * Implementation notes:
 * - Tool output is plain text so any provider can read it back reliably.
 * - Unknown subjects still return a deterministic token-shaped payload.
 * - This file is executed directly with `node`.
 *
 * Recent changes:
 * - 2026-03-27: Added the showcase MCP server for the real terminal runner.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';

const TOKENS = Object.freeze({
  alpha: 'alpha-signal-501',
  beta: 'beta-signal-842',
  gamma: 'gamma-signal-173',
});

const server = new McpServer({
  name: 'llm-showcase-server',
  version: '1.0.0',
});

server.registerTool(
  'lookup_release',
  {
    description: 'Return the deterministic showcase release token for a subject such as alpha, beta, or gamma.',
    inputSchema: {
      subject: z.string().describe('Release subject key. Example: beta'),
    },
  },
  async ({ subject }) => {
    const normalizedSubject = String(subject ?? '').trim().toLowerCase();
    const token = TOKENS[normalizedSubject] ?? `unknown-signal-${normalizedSubject || 'empty'}`;
    return {
      content: [
        {
          type: 'text',
          text: [
            `subject=${normalizedSubject || 'unknown'}`,
            `token=${token}`,
          ].join('\n'),
        },
      ],
    };
  },
);

async function main() {
  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error('showcase-mcp-server-error', error);
  process.exit(1);
});
