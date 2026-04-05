/**
 * LLM Package Mocked Showcase Suite
 *
 * Purpose:
 * - Provide a mocked feature-tour suite for the `llm-runtime` package surface.
 *
 * Key features:
 * - Demonstrates package-owned built-ins, skills, MCP, and provider dispatch.
 * - Uses descriptive test names so terminal output reads like a feature tour.
 * - Runs with mocks only; no real network, filesystem, or provider traffic.
 *
 * Implementation notes:
 * - This suite complements the real e2e showcase runner under `tests/e2e`.
 * - Each test exercises one major user-facing capability of the package with no live provider traffic.
 *
 * Recent changes:
 * - 2026-03-29: Added mocked `runTurnLoop(...)` showcase coverage.
 * - 2026-03-27: Initial terminal showcase suite for `llm-runtime`.
 * - 2026-03-27: Re-labeled as the mocked showcase after adding the real e2e showcase runner.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

const {
  mockCreateClientForProvider,
  mockGenerateOpenAIResponse,
  mockClientConnect,
  mockClientListTools,
  mockClientCallTool,
  listToolsPayload,
} = vi.hoisted(() => ({
  mockCreateClientForProvider: vi.fn(() => ({ client: 'openai' })),
  mockGenerateOpenAIResponse: vi.fn(async (request: any) => ({
    type: 'text',
    content: 'showcase-generated',
    assistantMessage: {
      role: 'assistant',
      content: `resolved:${Object.keys(request.tools || {}).join(',')}`,
    },
  })),
  mockClientConnect: vi.fn(),
  mockClientListTools: vi.fn(),
  mockClientCallTool: vi.fn(async () => ({
    content: [{ type: 'text', text: 'showcase-mcp-result' }],
  })),
  listToolsPayload: [] as any[],
}));

vi.mock('../../src/openai-direct.js', async () => {
  const actual = await vi.importActual('../../src/openai-direct.js');
  return {
    ...(actual as object),
    createClientForProvider: mockCreateClientForProvider,
    generateOpenAIResponse: mockGenerateOpenAIResponse,
  };
});

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: class MockStdioClientTransport {
    options: any;
    constructor(options: any) {
      this.options = options;
    }
  },
}));

vi.mock('@modelcontextprotocol/sdk/client/sse.js', () => ({
  SSEClientTransport: class MockSSEClientTransport {
    url: URL;
    options: any;
    constructor(url: URL, options: any) {
      this.url = url;
      this.options = options;
    }
  },
}));

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: class MockStreamableHTTPClientTransport {
    url: URL;
    options: any;
    constructor(url: URL, options: any) {
      this.url = url;
      this.options = options;
    }
  },
}));

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: class MockClient {
    async connect(transport: any) {
      mockCreateClientForProvider();
      mockClientConnect(transport);
    }

    async close() {
      return undefined;
    }

    async listTools() {
      mockClientListTools();
      return { tools: [...listToolsPayload] };
    }

    async callTool(payload: any) {
      return mockClientCallTool(payload);
    }
  },
}));

describe('llm-runtime mocked showcase', () => {
  afterEach(async () => {
    const { __resetLLMCallCachesForTests } = await import('../../src/runtime.js');
    await __resetLLMCallCachesForTests();
  });

  it('showcases built-in tools and skill loading through an explicit environment', async () => {
    const { createLLMEnvironment, resolveTools } = await import('../../src/runtime.js');

    const environment = createLLMEnvironment({
      skillRoots: ['/global', '/project'],
      skillFileSystem: {
        access: async () => undefined,
        readFile: async (targetPath: string) => targetPath.includes('/project/')
          ? '---\nname: find-skills\ndescription: Project skill\n---\n# Project Skill'
          : '---\nname: find-skills\ndescription: Global skill\n---\n# Global Skill',
        readdir: async (targetPath: string) => {
          if (targetPath === '/global') {
            return [{ name: 'find', isDirectory: () => true, isFile: () => false, isSymbolicLink: () => false }];
          }
          if (targetPath === '/global/find') {
            return [{ name: 'SKILL.md', isDirectory: () => false, isFile: () => true, isSymbolicLink: () => false }];
          }
          if (targetPath === '/project') {
            return [{ name: 'find', isDirectory: () => true, isFile: () => false, isSymbolicLink: () => false }];
          }
          if (targetPath === '/project/find') {
            return [{ name: 'SKILL.md', isDirectory: () => false, isFile: () => true, isSymbolicLink: () => false }];
          }
          return [];
        },
        realpath: async (targetPath: string) => targetPath,
        stat: async (targetPath: string) => ({
          isDirectory: () => !targetPath.endsWith('SKILL.md'),
          isFile: () => targetPath.endsWith('SKILL.md'),
        }),
      },
    });

    const builtIns = resolveTools({
      environment,
    });
    const skill = await environment.skillRegistry.loadSkill('find-skills');

    expect(Object.keys(builtIns)).toContain('load_skill');
    expect(skill?.description).toBe('Project skill');
    expect(skill?.content).toContain('# Project Skill');
  });

  it('showcases MCP tool discovery and execution through the per-call tool API', async () => {
    listToolsPayload.length = 0;
    listToolsPayload.push({
      name: 'lookup',
      description: 'Lookup tool',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
    });

    const { resolveToolsAsync } = await import('../../src/runtime.js');
    const tools = await resolveToolsAsync({
      mcpConfig: {
        servers: {
          demo: {
            command: 'node',
            args: ['demo.js'],
            transport: 'stdio',
          },
        },
      },
      builtIns: false,
    });
    const result = await tools.demo_lookup?.execute?.({ query: 'hello' });

    expect(Object.keys(tools)).toContain('demo_lookup');
    expect(result).toBe('showcase-mcp-result');
  });

  it('showcases per-call provider generation with built-ins and MCP tools merged into one call', async () => {
    listToolsPayload.length = 0;
    listToolsPayload.push({
      name: 'lookup',
      description: 'Lookup tool',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
    });

    const { generate } = await import('../../src/runtime.js');
    const response = await generate({
      provider: 'openai',
      providerConfig: {
        apiKey: 'test-openai-key',
      },
      model: 'gpt-5',
      mcpConfig: {
        servers: {
          demo: {
            command: 'node',
            args: ['demo.js'],
            transport: 'stdio',
          },
        },
      },
      builtIns: {
        read_file: true,
      },
      messages: [
        {
          role: 'user',
          content: 'Summarize the repo',
        },
      ],
    });

    expect(response.content).toBe('showcase-generated');
    expect(mockGenerateOpenAIResponse).toHaveBeenCalledWith(expect.objectContaining({
      tools: expect.objectContaining({
        read_file: expect.any(Object),
        demo_lookup: expect.any(Object),
      }),
    }));
  });

  it('showcases the generic runTurnLoop API driving a tool round-trip', async () => {
    const { runTurnLoop } = await import('../../src/turn-loop.js');

    const responses = [
      {
        type: 'tool_calls',
        content: 'Calling tool',
        tool_calls: [{
          id: 'tool-1',
          type: 'function' as const,
          function: {
            name: 'demo_lookup',
            arguments: '{"query":"hello"}',
          },
        }],
        assistantMessage: {
          role: 'assistant' as const,
          content: 'Calling tool',
          tool_calls: [{
            id: 'tool-1',
            type: 'function' as const,
            function: {
              name: 'demo_lookup',
              arguments: '{"query":"hello"}',
            },
          }],
        },
      },
      {
        type: 'text',
        content: 'TURN_LOOP_TOKEN=showcase-mcp-result',
        assistantMessage: {
          role: 'assistant' as const,
          content: 'TURN_LOOP_TOKEN=showcase-mcp-result',
        },
      },
    ];

    const result = await runTurnLoop({
      initialState: {
        messages: [{ role: 'user' as const, content: 'Find the token' }],
        toolNames: [] as string[],
        finalText: '',
      },
      emptyTextRetryLimit: 0,
      callModel: async () => responses.shift() as any,
      buildMessages: async ({ state }) => state.messages,
      onToolCallsResponse: async ({ state, response }) => ({
        state: {
          ...state,
          toolNames: [...state.toolNames, response.tool_calls?.[0]?.function.name ?? ''],
          messages: [
            ...state.messages,
            response.assistantMessage,
            {
              role: 'tool' as const,
              tool_call_id: response.tool_calls?.[0]?.id,
              content: 'showcase-mcp-result',
            },
          ],
        },
        next: { control: 'continue' },
      }),
      onTextResponse: async ({ state, responseText }) => ({
        state: {
          ...state,
          finalText: responseText,
        },
      }),
    });

    expect(result.state.toolNames).toEqual(['demo_lookup']);
    expect(result.state.finalText).toBe('TURN_LOOP_TOKEN=showcase-mcp-result');
    expect(result.iterations).toBe(2);
  });
});
