/**
 * LLM Package OpenAI Provider Tests
 *
 * Purpose:
 * - Validate the package-owned OpenAI-compatible provider helpers without real SDK traffic.
 *
 * Key features:
 * - Covers non-streaming response normalization for tool calls and usage.
 * - Covers streaming chunk forwarding for text, reasoning content, and tool calls.
 *
 * Implementation notes:
 * - Uses fake client objects instead of real network calls.
 * - Exercises the provider module through its public exports.
 *
 * Recent changes:
 * - 2026-03-27: Initial targeted OpenAI-compatible provider coverage for `llm-runtime`.
 */

import { describe, expect, it } from 'vitest';
import {
  generateOpenAIResponse,
  streamOpenAIResponse,
} from '../../src/openai-direct.js';

describe('llm-runtime openai-direct', () => {
  it('normalizes non-streaming tool calls into package-native responses', async () => {
    const fakeClient = {
      chat: {
        completions: {
          create: async () => ({
            choices: [
              {
                message: {
                  content: 'Need a tool',
                  tool_calls: [
                    {
                      id: 'tool-call-1',
                      type: 'function',
                      function: {
                        name: 'read_file',
                        arguments: '{"filePath":"README.md"}',
                      },
                    },
                  ],
                },
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          }),
        },
      },
    } as any;

    const response = await generateOpenAIResponse({
      client: fakeClient,
      provider: 'openai',
      model: 'gpt-5',
      messages: [
        {
          role: 'user',
          content: 'Read the file',
        },
      ],
      tools: {
        read_file: {
          name: 'read_file',
          description: 'Read a file',
          parameters: { type: 'object', properties: {} },
        },
      },
      reasoningEffort: 'low',
    });

    expect(response).toEqual({
      type: 'tool_calls',
      content: 'Need a tool',
      tool_calls: [
        {
          id: 'tool-call-1',
          type: 'function',
          function: {
            name: 'read_file',
            arguments: '{"filePath":"README.md"}',
          },
        },
      ],
      assistantMessage: {
        role: 'assistant',
        content: 'Need a tool',
        tool_calls: [
          {
            id: 'tool-call-1',
            type: 'function',
            function: {
              name: 'read_file',
              arguments: '{"filePath":"README.md"}',
            },
          },
        ],
      },
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      },
    });
  });

  it('streams content, reasoning, and tool calls into a package-native response', async () => {
    async function* createStream() {
      yield {
        choices: [
          {
            delta: {
              reasoning: 'think-1',
            },
          },
        ],
      };
      yield {
        choices: [
          {
            delta: {
              content: 'hello ',
            },
          },
        ],
      };
      yield {
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: 'tool-stream-1',
                  function: {
                    name: 'read_file',
                    arguments: '{"filePath":"README',
                  },
                },
              ],
            },
          },
        ],
      };
      yield {
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  function: {
                    arguments: '.md"}',
                  },
                },
              ],
            },
          },
        ],
      };
    }

    const fakeClient = {
      chat: {
        completions: {
          create: async () => createStream(),
        },
      },
    } as any;

    const chunks: Array<{ content?: string; reasoningContent?: string }> = [];
    const response = await streamOpenAIResponse({
      client: fakeClient,
      provider: 'openai',
      model: 'gpt-5',
      messages: [
        {
          role: 'user',
          content: 'Stream a result',
        },
      ],
      tools: {
        read_file: {
          name: 'read_file',
          description: 'Read a file',
          parameters: { type: 'object', properties: {} },
        },
      },
      onChunk: (chunk) => {
        chunks.push(chunk);
      },
    });

    expect(chunks).toEqual([
      { reasoningContent: 'think-1' },
      { content: 'hello ' },
    ]);
    expect(response).toEqual({
      type: 'tool_calls',
      content: 'hello ',
      tool_calls: [
        {
          id: 'tool-stream-1',
          type: 'function',
          function: {
            name: 'read_file',
            arguments: '{"filePath":"README.md"}',
          },
        },
      ],
      assistantMessage: {
        role: 'assistant',
        content: 'hello ',
        tool_calls: [
          {
            id: 'tool-stream-1',
            type: 'function',
            function: {
              name: 'read_file',
              arguments: '{"filePath":"README.md"}',
            },
          },
        ],
      },
    });
  });
});
