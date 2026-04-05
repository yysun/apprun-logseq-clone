/**
 * LLM Package Runtime Provider Dispatch Tests
 *
 * Purpose:
 * - Verify that the per-call APIs dispatch through the package-owned provider layer.
 *
 * Key features:
 * - Covers per-call generate and stream provider dispatch.
 * - Verifies explicit-environment and per-call tool resolution reaches the provider adapter.
 * - Uses mocked package provider modules with no real SDK or network usage.
 *
 * Implementation notes:
 * - Mocks package provider modules directly to keep tests focused on runtime orchestration.
 * - Avoids real filesystem, network, and provider clients.
 *
 * Recent changes:
 * - 2026-03-27: Initial provider-dispatch coverage for the publishable `llm-runtime` runtime.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

const {
  mockCreateClientForProvider,
  mockGenerateOpenAIResponse,
  mockStreamOpenAIResponse,
} = vi.hoisted(() => ({
  mockCreateClientForProvider: vi.fn(() => ({ client: 'openai' })),
  mockGenerateOpenAIResponse: vi.fn(async (request: any) => ({
    type: 'text',
    content: 'generated',
    assistantMessage: {
      role: 'assistant',
      content: `tools:${Object.keys(request.tools || {}).join(',')}`,
    },
  })),
  mockStreamOpenAIResponse: vi.fn(async (request: any) => {
    request.onChunk({ content: 'chunk-1' });
    request.onChunk({ reasoningContent: 'reasoning-1' });
    return {
      type: 'text',
      content: 'streamed',
      assistantMessage: {
        role: 'assistant',
        content: 'streamed',
      },
    };
  }),
}));

vi.mock('../../src/openai-direct.js', () => ({
  createClientForProvider: mockCreateClientForProvider,
  generateOpenAIResponse: mockGenerateOpenAIResponse,
  streamOpenAIResponse: mockStreamOpenAIResponse,
}));

describe('llm-runtime runtime provider dispatch', () => {
  afterEach(async () => {
    const { __resetLLMCallCachesForTests } = await import('../../src/runtime.js');
    await __resetLLMCallCachesForTests();
  });

  it('dispatches generate requests through an explicit environment', async () => {
    const { createLLMEnvironment, generate } = await import('../../src/runtime.js');

    const environment = createLLMEnvironment({
      providers: {
        openai: {
          apiKey: 'test-openai-key',
        },
      },
    });

    const response = await generate({
      provider: 'openai',
      model: 'gpt-5',
      messages: [
        {
          role: 'user',
          content: 'Hello',
        },
      ],
      context: {
        reasoningEffort: 'high',
      },
      environment,
      builtIns: false,
      extraTools: [
        {
          name: 'project_lookup',
          description: 'Project lookup',
          parameters: { type: 'object' },
        },
      ],
      tools: {
        project_write: {
          name: 'project_write',
          description: 'Project write',
          parameters: { type: 'object' },
        },
      },
    });

    expect(response.content).toBe('generated');
    expect(mockCreateClientForProvider).toHaveBeenCalledWith('openai', {
      apiKey: 'test-openai-key',
    });
    expect(mockGenerateOpenAIResponse).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'openai',
      model: 'gpt-5',
      reasoningEffort: 'high',
      tools: {
        project_lookup: expect.objectContaining({ name: 'project_lookup' }),
        project_write: expect.objectContaining({ name: 'project_write' }),
      },
    }));
  });

  it('dispatches stream requests through an explicit environment', async () => {
    const { createLLMEnvironment, stream } = await import('../../src/runtime.js');

    const environment = createLLMEnvironment({
      providers: {
        openai: {
          apiKey: 'test-openai-key',
        },
      },
      defaults: {
        reasoningEffort: 'medium',
      },
    });

    const chunks: Array<{ content?: string; reasoningContent?: string }> = [];
    const response = await stream({
      provider: 'openai',
      model: 'gpt-5',
      messages: [
        {
          role: 'user',
          content: 'Stream please',
        },
      ],
      onChunk: (chunk) => {
        chunks.push(chunk);
      },
      environment,
      builtIns: false,
    });

    expect(response.content).toBe('streamed');
    expect(chunks).toEqual([
      { content: 'chunk-1' },
      { reasoningContent: 'reasoning-1' },
    ]);
    expect(mockStreamOpenAIResponse).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'openai',
      model: 'gpt-5',
      reasoningEffort: 'medium',
    }));
  });

  it('rejects per-call request.tools attempts to override reserved built-in names', async () => {
    const { generate } = await import('../../src/runtime.js');

    await expect(generate({
      provider: 'openai',
      providerConfig: {
        apiKey: 'test-openai-key',
      },
      model: 'gpt-5',
      messages: [
        {
          role: 'user',
          content: 'Hello',
        },
      ],
      tools: {
        read_file: {
          name: 'read_file',
          description: 'override',
          parameters: { type: 'object' },
        },
      },
    })).rejects.toThrow('Tool name "read_file" is reserved by llm-runtime built-ins.');
  });

  it('dispatches per-call generate requests without constructing a runtime', async () => {
    const { generate } = await import('../../src/runtime.js');

    const response = await generate({
      provider: 'openai',
      providerConfig: {
        apiKey: 'test-openai-key',
      },
      model: 'gpt-5',
      messages: [
        {
          role: 'user',
          content: 'Hello',
        },
      ],
      builtIns: false,
      extraTools: [
        {
          name: 'project_lookup',
          description: 'Project lookup',
          parameters: { type: 'object' },
        },
      ],
      context: {
        reasoningEffort: 'low',
      },
    });

    expect(response.content).toBe('generated');
    expect(mockCreateClientForProvider).toHaveBeenCalledWith('openai', {
      apiKey: 'test-openai-key',
    });
    expect(mockGenerateOpenAIResponse).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'openai',
      model: 'gpt-5',
      reasoningEffort: 'low',
      tools: {
        project_lookup: expect.objectContaining({ name: 'project_lookup' }),
      },
    }));
  });

  it('dispatches per-call stream requests without constructing a runtime', async () => {
    const { stream } = await import('../../src/runtime.js');

    const chunks: Array<{ content?: string; reasoningContent?: string }> = [];
    const response = await stream({
      provider: 'openai',
      providerConfig: {
        apiKey: 'test-openai-key',
      },
      model: 'gpt-5',
      messages: [
        {
          role: 'user',
          content: 'Stream please',
        },
      ],
      builtIns: false,
      onChunk: (chunk) => {
        chunks.push(chunk);
      },
    });

    expect(response.content).toBe('streamed');
    expect(chunks).toEqual([
      { content: 'chunk-1' },
      { reasoningContent: 'reasoning-1' },
    ]);
    expect(mockStreamOpenAIResponse).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'openai',
      model: 'gpt-5',
      reasoningEffort: 'default',
    }));
  });
});
