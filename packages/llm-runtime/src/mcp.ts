/**
 * LLM Package MCP Registry
 *
 * Purpose:
 * - Provide package-owned MCP config parsing, server access, and executable tool resolution.
 *
 * Key features:
 * - Parse legacy MCP JSON config strings into typed config objects.
 * - Normalize `servers` and `mcpServers` access through one registry surface.
 * - Resolve MCP servers into package-native executable tool definitions.
 * - Cache MCP clients and discovered tools for repeated runtime use.
 *
 * Implementation notes:
 * - Tool names are namespaced as `${serverName}_${toolName}` to avoid cross-server collisions.
 * - Tool schemas are normalized to the simple JSON-schema subset already used by the package.
 * - MCP tool execution returns deterministic string payloads for downstream compatibility.
 *
 * Recent changes:
 * - 2026-03-27: Replaced the config-only slice with executable package-owned MCP tool resolution.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type {
  LLMToolDefinition,
  MCPConfig,
  MCPRegistry,
  MCPRegistryEntry,
  MCPServerDefinition,
} from './types.js';
import { wrapToolWithValidation } from './tool-validation.js';

type MCPClientCacheEntry = {
  configHash: string;
  client: Client;
};

type MCPToolCacheEntry = {
  configHash: string;
  tools: Record<string, LLMToolDefinition>;
};

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === 'string');
}

function normalizeServerDefinition(name: string, value: unknown): MCPRegistryEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`MCP server "${name}" must be an object`);
  }

  const candidate = value as Record<string, unknown>;
  const headers = candidate.headers;
  if (headers !== undefined && !isStringRecord(headers)) {
    throw new Error(`MCP server "${name}" headers must be a string-to-string map`);
  }

  const args = candidate.args;
  if (args !== undefined && (!Array.isArray(args) || !args.every((entry) => typeof entry === 'string'))) {
    throw new Error(`MCP server "${name}" args must be a string array`);
  }

  const env = candidate.env;
  if (env !== undefined && !isStringRecord(env)) {
    throw new Error(`MCP server "${name}" env must be a string-to-string map`);
  }

  const transport = candidate.transport;
  if (
    transport !== undefined
    && transport !== 'stdio'
    && transport !== 'sse'
    && transport !== 'streamable-http'
  ) {
    throw new Error(`MCP server "${name}" transport must be stdio, sse, or streamable-http`);
  }

  const normalized: MCPRegistryEntry = { name };
  if (typeof candidate.command === 'string' && candidate.command.trim()) normalized.command = candidate.command;
  if (Array.isArray(args)) normalized.args = args.slice();
  if (env && typeof env === 'object') normalized.env = { ...env };
  if (typeof transport === 'string') normalized.transport = transport;
  if (typeof candidate.url === 'string' && candidate.url.trim()) normalized.url = candidate.url;
  if (headers && typeof headers === 'object') normalized.headers = { ...headers };
  if (typeof candidate.enabled === 'boolean') normalized.enabled = candidate.enabled;
  return normalized;
}

function sanitizeName(value: string): string {
  return String(value || '').replace(/[^\w.-]/g, '_');
}

function namespaceToolName(serverName: string, toolName: string): string {
  return `${sanitizeName(serverName)}_${sanitizeName(toolName)}`;
}

function getConfigHash(server: MCPRegistryEntry): string {
  return JSON.stringify({
    name: server.name,
    command: server.command,
    args: server.args,
    env: server.env,
    transport: server.transport,
    url: server.url,
    headers: server.headers,
    enabled: server.enabled,
  });
}

function normalizeToolSchema(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return {
      type: 'object',
      properties: {},
      additionalProperties: false,
    };
  }

  const candidate = schema as Record<string, unknown>;
  const properties = candidate.properties && typeof candidate.properties === 'object' && !Array.isArray(candidate.properties)
    ? Object.entries(candidate.properties as Record<string, unknown>).reduce<Record<string, unknown>>((accumulator, [key, value]) => {
      const prop = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
      const nextProp: Record<string, unknown> = {
        type: typeof prop.type === 'string' ? prop.type : 'string',
      };
      if (typeof prop.description === 'string' && prop.description.trim()) {
        nextProp.description = prop.description;
      }
      if (Array.isArray(prop.enum)) {
        nextProp.enum = prop.enum;
      }
      if (prop.items && typeof prop.items === 'object' && !Array.isArray(prop.items)) {
        nextProp.items = prop.items;
      }
      accumulator[key] = nextProp;
      return accumulator;
    }, {})
    : {};

  return {
    type: 'object',
    properties,
    additionalProperties: candidate.additionalProperties === true,
    ...(Array.isArray(candidate.required) ? { required: [...candidate.required] } : {}),
  };
}

function formatMCPToolResult(result: unknown): string {
  if (!result) {
    return '';
  }

  if (typeof result === 'string') {
    return result;
  }

  if (typeof result !== 'object') {
    return String(result);
  }

  const candidate = result as {
    content?: Array<{ type?: string; text?: string }>;
    isError?: boolean;
    error?: unknown;
    type?: string;
  };

  if (candidate.isError || candidate.type === 'error') {
    const errorValue = candidate.error;
    const message = typeof errorValue === 'string'
      ? errorValue
      : errorValue && typeof errorValue === 'object' && typeof (errorValue as { message?: unknown }).message === 'string'
        ? (errorValue as { message: string }).message
        : 'Unknown MCP tool error';
    return `Error: MCP tool execution failed - ${message}`;
  }

  if (Array.isArray(candidate.content)) {
    const textParts = candidate.content
      .filter((entry) => entry?.type === 'text' && typeof entry.text === 'string')
      .map((entry) => entry.text as string);
    if (textParts.length > 0) {
      return textParts.join('\n');
    }
  }

  return JSON.stringify(result, null, 2);
}

export function normalizeMCPConfig(config: MCPConfig | null | undefined): MCPConfig | null {
  if (!config) {
    return null;
  }

  const source = config.servers ?? config.mcpServers ?? {};
  const entries = Object.entries(source).sort(([left], [right]) => left.localeCompare(right));

  const normalizedServers: Record<string, MCPServerDefinition> = {};
  for (const [name, value] of entries) {
    const normalized = normalizeServerDefinition(name, value);
    const { name: _name, ...serverConfig } = normalized;
    normalizedServers[name] = serverConfig;
  }

  return { servers: normalizedServers };
}

export function parseMCPConfigJson(input: string | null | undefined): MCPConfig | null {
  const raw = String(input ?? '').trim();
  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw) as MCPConfig;
  return normalizeMCPConfig(parsed);
}

async function connectMCPServer(server: MCPRegistryEntry): Promise<Client> {
  const transport = server.transport || 'stdio';
  const client = new Client({ name: 'llm-runtime', version: '0.1.0' }, { capabilities: {} });

  if (transport === 'stdio') {
    const stdioTransport = new StdioClientTransport({
      command: server.command || '',
      args: server.args ?? [],
      env: server.env,
    });
    await client.connect(stdioTransport);
    return client;
  }

  if (!server.url) {
    throw new Error(`MCP server "${server.name}" requires a url for ${transport} transport`);
  }

  if (transport === 'sse') {
    await client.connect(new SSEClientTransport(new URL(server.url), {
      requestInit: { headers: server.headers },
    }));
    return client;
  }

  await client.connect(new StreamableHTTPClientTransport(new URL(server.url), {
    requestInit: { headers: server.headers },
  }));
  return client;
}

export function createMCPRegistry(initialConfig: MCPConfig | null = null): MCPRegistry {
  let config = normalizeMCPConfig(initialConfig);
  const clientCache = new Map<string, MCPClientCacheEntry>();
  const toolCache = new Map<string, MCPToolCacheEntry>();

  function listServersInternal(): MCPRegistryEntry[] {
    const servers = config?.servers ?? config?.mcpServers ?? {};
    return Object.entries(servers)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, serverConfig]) => normalizeServerDefinition(name, serverConfig))
      .filter((server) => server.enabled !== false);
  }

  async function getClient(server: MCPRegistryEntry): Promise<Client> {
    const cacheKey = server.name;
    const configHash = getConfigHash(server);
    const cached = clientCache.get(cacheKey);
    if (cached && cached.configHash === configHash) {
      return cached.client;
    }

    if (cached) {
      await cached.client.close().catch(() => undefined);
      clientCache.delete(cacheKey);
    }

    const client = await connectMCPServer(server);
    clientCache.set(cacheKey, { configHash, client });
    return client;
  }

  async function resolveTools(): Promise<Record<string, LLMToolDefinition>> {
    const resolved: Record<string, LLMToolDefinition> = {};

    for (const server of listServersInternal()) {
      const configHash = getConfigHash(server);
      const cached = toolCache.get(server.name);
      if (cached && cached.configHash === configHash) {
        Object.assign(resolved, cached.tools);
        continue;
      }

      const client = await getClient(server);
      const response = await client.listTools();
      const serverTools = Object.fromEntries(
        (response.tools as Tool[]).map((tool) => {
          const toolName = namespaceToolName(server.name, tool.name);
          const definition = wrapToolWithValidation({
            name: toolName,
            description: tool.description || '',
            parameters: normalizeToolSchema(tool.inputSchema),
            execute: async (args) => {
              const result = await client.callTool({
                name: tool.name,
                arguments: args ?? {},
              });
              return formatMCPToolResult(result);
            },
          });
          return [toolName, definition];
        }),
      );

      toolCache.set(server.name, {
        configHash,
        tools: serverTools,
      });
      Object.assign(resolved, serverTools);
    }

    return Object.fromEntries(
      Object.entries(resolved).sort(([left], [right]) => left.localeCompare(right)),
    );
  }

  async function shutdown(): Promise<void> {
    await Promise.all(
      [...clientCache.values()].map(async (entry) => {
        await entry.client.close().catch(() => undefined);
      }),
    );
    clientCache.clear();
    toolCache.clear();
  }

  return {
    getConfig: () => (config ? { ...config, servers: { ...(config.servers ?? {}) } } : null),
    setConfig: (nextConfig) => {
      config = normalizeMCPConfig(nextConfig);
      toolCache.clear();
    },
    listServers: listServersInternal,
    resolveTools,
    shutdown,
  };
}
