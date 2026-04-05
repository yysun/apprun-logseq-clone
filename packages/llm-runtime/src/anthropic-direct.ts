/**
 * LLM Package Anthropic Provider Module
 *
 * Purpose:
 * - Provide package-owned Anthropic client and request helpers.
 *
 * Key features:
 * - Converts package-native messages and tool schemas into Anthropic message payloads.
 * - Supports streaming and non-streaming generation with package-native `LLMResponse` output.
 * - Keeps provider behavior pure with no tool execution or host runtime coupling.
 *
 * Implementation notes:
 * - System prompts are extracted from the message list and passed through Anthropic's `system` field.
 * - Historical tool results are converted into Anthropic `tool_result` blocks.
 *
 * Recent changes:
 * - 2026-03-27: Initial package-owned Anthropic provider implementation.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  AnthropicConfig,
  LLMChatMessage,
  LLMResponse,
  LLMStreamChunk,
  LLMToolDefinition,
} from './types.js';
import { createPackageLogger } from './provider-utils.js';

const logger = createPackageLogger();

export type AnthropicProviderRequest = {
  client: Anthropic;
  model: string;
  messages: LLMChatMessage[];
  tools?: Record<string, LLMToolDefinition>;
  temperature?: number;
  maxTokens?: number;
  abortSignal?: AbortSignal;
};

export type AnthropicProviderStreamRequest = AnthropicProviderRequest & {
  onChunk: (chunk: LLMStreamChunk) => void;
};

function isAbortLikeError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;

  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  return normalized.includes('abort') || normalized.includes('canceled') || normalized.includes('cancelled');
}

export function createAnthropicClient(config: AnthropicConfig): Anthropic {
  return new Anthropic({
    apiKey: config.apiKey,
  });
}

function convertMessagesToAnthropic(messages: LLMChatMessage[]): Anthropic.Messages.MessageParam[] {
  return messages
    .filter((message) => message.role !== 'system')
    .map((message) => {
      if (message.role === 'tool') {
        return {
          role: 'user' as const,
          content: [
            {
              type: 'tool_result' as const,
              tool_use_id: message.tool_call_id || '',
              content: message.content || '',
            },
          ],
        };
      }

      if (message.role === 'assistant' && message.tool_calls) {
        const content: any[] = [];

        if (message.content) {
          content.push({
            type: 'text',
            text: message.content,
          });
        }

        message.tool_calls.forEach((toolCall) => {
          content.push({
            type: 'tool_use',
            id: toolCall.id,
            name: toolCall.function.name,
            input: JSON.parse(toolCall.function.arguments || '{}'),
          });
        });

        return {
          role: 'assistant' as const,
          content,
        };
      }

      return {
        role: message.role as 'user' | 'assistant',
        content: message.content || '',
      };
    });
}

function convertToolsToAnthropic(tools: Record<string, LLMToolDefinition>): Anthropic.Messages.Tool[] {
  return Object.entries(tools).map(([name, tool]) => ({
    name,
    description: tool.description || '',
    input_schema: (tool.parameters || { type: 'object', properties: {} }) as Anthropic.Messages.Tool.InputSchema,
  }));
}

function extractSystemPrompt(messages: LLMChatMessage[]): string {
  const systemMessage = messages.find((message) => message.role === 'system');
  return systemMessage?.content || 'You are a helpful assistant.';
}

export async function streamAnthropicResponse(request: AnthropicProviderStreamRequest): Promise<LLMResponse> {
  const anthropicMessages = convertMessagesToAnthropic(request.messages);
  const anthropicTools = request.tools && Object.keys(request.tools).length > 0
    ? convertToolsToAnthropic(request.tools)
    : undefined;

  const stream = await request.client.messages.create(
    {
      model: request.model,
      messages: anthropicMessages,
      system: extractSystemPrompt(request.messages),
      stream: true,
      temperature: request.temperature,
      max_tokens: request.maxTokens || 4096,
      ...(anthropicTools ? { tools: anthropicTools } : {}),
    },
    request.abortSignal ? { signal: request.abortSignal as any } : undefined,
  );

  let fullResponse = '';
  const toolUses: any[] = [];

  try {
    for await (const chunk of stream) {
      if (request.abortSignal?.aborted) {
        throw new DOMException('Anthropic stream aborted', 'AbortError');
      }

      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        fullResponse += chunk.delta.text;
        request.onChunk({ content: chunk.delta.text });
      } else if (chunk.type === 'content_block_start' && chunk.content_block.type === 'tool_use') {
        toolUses.push(chunk.content_block);
      }
    }

    if (toolUses.length > 0) {
      const toolCalls = toolUses
        .filter((toolUse) => toolUse.name && toolUse.name.trim() !== '')
        .map((toolUse) => ({
          id: toolUse.id,
          type: 'function' as const,
          function: {
            name: toolUse.name,
            arguments: JSON.stringify(toolUse.input),
          },
        }));

      return {
        type: 'tool_calls',
        content: fullResponse,
        tool_calls: toolCalls,
        assistantMessage: {
          role: 'assistant',
          content: fullResponse || '',
          tool_calls: toolCalls,
        },
      };
    }

    return {
      type: 'text',
      content: fullResponse,
      assistantMessage: {
        role: 'assistant',
        content: fullResponse,
      },
    };
  } catch (error) {
    if (request.abortSignal?.aborted || isAbortLikeError(error)) {
      logger.info('Anthropic streaming canceled', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    logger.error('Anthropic streaming error', error);
    throw error;
  }
}

export async function generateAnthropicResponse(request: AnthropicProviderRequest): Promise<LLMResponse> {
  const anthropicMessages = convertMessagesToAnthropic(request.messages);
  const anthropicTools = request.tools && Object.keys(request.tools).length > 0
    ? convertToolsToAnthropic(request.tools)
    : undefined;

  const response = await request.client.messages.create(
    {
      model: request.model,
      messages: anthropicMessages,
      system: extractSystemPrompt(request.messages),
      temperature: request.temperature,
      max_tokens: request.maxTokens || 4096,
      ...(anthropicTools ? { tools: anthropicTools } : {}),
    },
    request.abortSignal ? { signal: request.abortSignal as any } : undefined,
  );

  let content = '';
  const toolUses: any[] = [];

  response.content.forEach((block) => {
    if (block.type === 'text') {
      content += block.text;
    } else if (block.type === 'tool_use') {
      toolUses.push(block);
    }
  });

  if (toolUses.length > 0) {
    const toolCalls = toolUses
      .filter((toolUse) => toolUse.name && toolUse.name.trim() !== '')
      .map((toolUse) => ({
        id: toolUse.id,
        type: 'function' as const,
        function: {
          name: toolUse.name,
          arguments: JSON.stringify(toolUse.input),
        },
      }));

    return {
      type: 'tool_calls',
      content,
      tool_calls: toolCalls,
      assistantMessage: {
        role: 'assistant',
        content,
        tool_calls: toolCalls,
      },
      usage: response.usage
        ? {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          }
        : undefined,
    };
  }

  return {
    type: 'text',
    content,
    assistantMessage: {
      role: 'assistant',
      content,
    },
    usage: response.usage
      ? {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        }
      : undefined,
  };
}
