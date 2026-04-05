/**
 * LLM Package Turn Loop Tests
 *
 * Purpose:
 * - Validate the host-agnostic `runTurnLoop(...)` API in `packages/llm`.
 *
 * Key features:
 * - Covers plain text terminal responses with caller-owned state.
 * - Covers package-managed model invocation through the existing per-call API.
 * - Covers iterative tool-call continuation without world/agent/chat assumptions.
 *
 * Notes on implementation:
 * - Mocks package runtime model calls to keep tests deterministic and network-free.
 * - Uses only package-owned message and response contracts.
 *
 * Summary of recent changes:
 * - 2026-03-29: Added targeted coverage for the new generic package turn loop.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockGenerate, mockStream } = vi.hoisted(() => ({
  mockGenerate: vi.fn(),
  mockStream: vi.fn(),
}));

vi.mock('../../src/runtime.js', () => ({
  generate: mockGenerate,
  stream: mockStream,
}));

import { runTurnLoop } from '../../src/turn-loop.js';
import type { LLMChatMessage, LLMResponse } from '../../src/types.js';

function createTextResponse(content: string): LLMResponse {
  return {
    type: 'text',
    content,
    assistantMessage: {
      role: 'assistant',
      content,
    },
  };
}

describe('llm-runtime runTurnLoop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stops on a plain text response with caller-owned state only', async () => {
    const result = await runTurnLoop({
      initialState: {
        messages: [{ role: 'user', content: 'hello' } satisfies LLMChatMessage],
        finalText: '',
      },
      emptyTextRetryLimit: 1,
      callModel: vi.fn(async ({ messages }) => createTextResponse(`echo:${messages.at(-1)?.content}`)),
      buildMessages: async ({ state }) => state.messages,
      onTextResponse: async ({ state, responseText }) => ({
        state: {
          ...state,
          finalText: responseText,
        },
      }),
      onToolCallsResponse: async ({ state }) => ({ state }),
    });

    expect(result.reason).toBe('text_response');
    expect(result.iterations).toBe(1);
    expect(result.state).toEqual({
      messages: [{ role: 'user', content: 'hello' }],
      finalText: 'echo:hello',
    });
  });

  it('can use the package-managed generate path when modelRequest is provided', async () => {
    mockGenerate.mockResolvedValueOnce(createTextResponse('done'));

    const result = await runTurnLoop({
      initialState: {
        messages: [{ role: 'user', content: 'summarize this' } satisfies LLMChatMessage],
        seenTexts: [] as string[],
      },
      emptyTextRetryLimit: 0,
      modelRequest: {
        provider: 'openai',
        model: 'gpt-5',
      },
      buildMessages: async ({ state }) => state.messages,
      onTextResponse: async ({ state, responseText }) => ({
        state: {
          ...state,
          seenTexts: [...state.seenTexts, responseText],
        },
      }),
      onToolCallsResponse: async ({ state }) => ({ state }),
    });

    expect(mockGenerate).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'openai',
      model: 'gpt-5',
      messages: [{ role: 'user', content: 'summarize this' }],
    }));
    expect(result.state.seenTexts).toEqual(['done']);
  });

  it('continues after a synthesized plain-text tool intent and stops on the follow-up text', async () => {
    const responses: LLMResponse[] = [
      createTextResponse('Calling tool: read_file'),
      createTextResponse('File read successfully.'),
    ];

    const result = await runTurnLoop({
      initialState: {
        messages: [{ role: 'user', content: 'inspect file' } satisfies LLMChatMessage],
        toolRuns: 0,
        finalText: '',
      },
      emptyTextRetryLimit: 0,
      callModel: vi.fn(async () => responses.shift() ?? createTextResponse('unexpected')),
      buildMessages: async ({ state, transientInstruction }) => {
        if (!transientInstruction) {
          return state.messages;
        }
        return [...state.messages, { role: 'system', content: transientInstruction }];
      },
      parsePlainTextToolIntent: (content) => {
        if (content.trim() !== 'Calling tool: read_file') {
          return null;
        }
        return {
          toolName: 'read_file',
          toolArgs: { filePath: 'notes.txt' },
        };
      },
      onToolCallsResponse: async ({ state, response }) => ({
        state: {
          ...state,
          toolRuns: state.toolRuns + 1,
          messages: [
            ...state.messages,
            response.assistantMessage,
            {
              role: 'tool',
              tool_call_id: response.tool_calls?.[0]?.id,
              content: 'contents',
            },
          ],
        },
        next: {
          control: 'continue',
          transientInstruction: 'Use the tool result and answer normally.',
        },
      }),
      onTextResponse: async ({ state, responseText }) => ({
        state: {
          ...state,
          finalText: responseText,
        },
      }),
    });

    expect(result.iterations).toBe(2);
    expect(result.reason).toBe('text_response');
    expect(result.state.toolRuns).toBe(1);
    expect(result.state.finalText).toBe('File read successfully.');
    expect(result.state.messages).toHaveLength(3);
    expect(result.state.messages[1]).toMatchObject({
      role: 'assistant',
      tool_calls: [{
        function: {
          name: 'read_file',
        },
      }],
    });
  });
});
