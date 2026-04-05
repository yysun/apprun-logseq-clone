/**
 * LLM Package OpenAI Provider Module
 *
 * Purpose:
 * - Provide package-owned OpenAI-compatible provider clients and request helpers.
 *
 * Key features:
 * - Supports OpenAI, Azure OpenAI, XAI, Ollama, and generic OpenAI-compatible endpoints.
 * - Converts package-native messages and tool schemas into OpenAI chat-completions payloads.
 * - Returns package-native `LLMResponse` payloads for streaming and non-streaming requests.
 *
 * Implementation notes:
 * - This module is intentionally pure: no tool execution, persistence, or event emission.
 * - Reasoning effort is passed through the OpenAI-compatible `reasoning` request object.
 * - Tool-call ids are normalized to OpenAI's 40-character limit.
 *
 * Recent changes:
 * - 2026-03-27: Initial package-owned OpenAI-compatible provider implementation.
 */

import OpenAI from 'openai';
import type {
  AzureConfig,
  LLMChatMessage,
  LLMProviderName,
  LLMResponse,
  LLMStreamChunk,
  LLMToolDefinition,
  OllamaConfig,
  OpenAICompatibleConfig,
  OpenAIConfig,
  ReasoningEffort,
  XAIConfig,
} from './types.js';
import { createPackageLogger, generateFallbackId } from './provider-utils.js';

const logger = createPackageLogger();
const OPENAI_TOOL_CALL_ID_MAX_LENGTH = 40;

type OpenAIClientProvider = Extract<
  LLMProviderName,
  'openai' | 'azure' | 'openai-compatible' | 'xai' | 'ollama'
>;
type OpenAIReasoningEffort = 'none' | 'low' | 'medium' | 'high';
type OpenAIMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type OpenAIAssistantMessageParam = OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam;

export type OpenAIProviderRequest = {
  client: OpenAI;
  provider: OpenAIClientProvider;
  model: string;
  messages: LLMChatMessage[];
  tools?: Record<string, LLMToolDefinition>;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: ReasoningEffort;
  abortSignal?: AbortSignal;
};

export type OpenAIProviderStreamRequest = OpenAIProviderRequest & {
  onChunk: (chunk: LLMStreamChunk) => void;
};

function normalizeReasoningEffort(value: ReasoningEffort | undefined): 'default' | OpenAIReasoningEffort {
  if (value === 'none' || value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }
  return 'default';
}

function getReasoningConfig(reasoningEffort: ReasoningEffort | undefined): { effort: OpenAIReasoningEffort } | undefined {
  const effort = normalizeReasoningEffort(reasoningEffort);
  return effort === 'default' ? undefined : { effort };
}

function extractReasoningText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string') {
          return (part as { text: string }).text;
        }
        return '';
      })
      .join('');
  }

  return '';
}

function isAbortLikeError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;

  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  return normalized.includes('abort') || normalized.includes('canceled') || normalized.includes('cancelled');
}

function fnv1a32(input: string, reverse = false): number {
  let hash = 2166136261;
  if (reverse) {
    for (let index = input.length - 1; index >= 0; index -= 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
  } else {
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
  }
  return hash >>> 0;
}

function shortenToolCallIdForOpenAI(rawId: string): string {
  const trimmed = rawId.trim();
  if (!trimmed) return '';
  if (trimmed.length <= OPENAI_TOOL_CALL_ID_MAX_LENGTH) return trimmed;

  const hash = `${fnv1a32(trimmed).toString(36)}${fnv1a32(trimmed, true).toString(36)}`.slice(0, 10);
  const prefixLength = Math.max(1, OPENAI_TOOL_CALL_ID_MAX_LENGTH - hash.length - 1);
  return `${trimmed.slice(0, prefixLength)}_${hash}`;
}

function collectHistoricalToolCallIds(messages: LLMChatMessage[]): string[] {
  const ids: string[] = [];
  for (const message of messages) {
    if (message.role === 'assistant' && Array.isArray(message.tool_calls)) {
      for (const toolCall of message.tool_calls) {
        ids.push(String(toolCall?.id || ''));
      }
    }
    if (message.role === 'tool') {
      ids.push(String(message.tool_call_id || ''));
    }
  }
  return ids;
}

function finalizePendingAssistantToolCalls(
  converted: OpenAIMessageParam[],
  pending: {
    assistantIndex: number;
    expectedIds: Set<string>;
    resolvedIds: Set<string>;
  },
): void {
  const assistantMessage = converted[pending.assistantIndex] as OpenAIAssistantMessageParam | undefined;
  if (!assistantMessage || assistantMessage.role !== 'assistant') {
    return;
  }

  const currentToolCalls = Array.isArray((assistantMessage as { tool_calls?: unknown[] }).tool_calls)
    ? ((assistantMessage as { tool_calls?: unknown[] }).tool_calls ?? [])
    : [];
  const resolvedToolCalls = currentToolCalls.filter((toolCall) =>
    pending.resolvedIds.has(String((toolCall as { id?: unknown })?.id || '')),
  );

  if (resolvedToolCalls.length > 0) {
    (assistantMessage as { tool_calls?: unknown[] }).tool_calls = resolvedToolCalls;
    return;
  }

  if (assistantMessage.content && String(assistantMessage.content).trim()) {
    delete (assistantMessage as { tool_calls?: unknown[] }).tool_calls;
    return;
  }

  converted.splice(pending.assistantIndex, 1);
}

function createToolCallIdAllocator(seedIds: string[] = []): (originalId?: string) => string {
  const normalizedByOriginal = new Map<string, string>();
  const usedIds = new Set<string>();

  const reserveUnique = (candidate: string): string => {
    const safeCandidate = (candidate || generateFallbackId()).slice(0, OPENAI_TOOL_CALL_ID_MAX_LENGTH);
    if (!usedIds.has(safeCandidate)) {
      usedIds.add(safeCandidate);
      return safeCandidate;
    }

    let suffix = 1;
    while (true) {
      const suffixToken = `_${suffix.toString(36)}`;
      const nextCandidate = `${safeCandidate.slice(0, OPENAI_TOOL_CALL_ID_MAX_LENGTH - suffixToken.length)}${suffixToken}`;
      if (!usedIds.has(nextCandidate)) {
        usedIds.add(nextCandidate);
        return nextCandidate;
      }
      suffix += 1;
    }
  };

  const allocate = (originalId?: string): string => {
    const raw = typeof originalId === 'string' ? originalId.trim() : '';
    if (!raw) {
      return reserveUnique(shortenToolCallIdForOpenAI(generateFallbackId()));
    }

    const existing = normalizedByOriginal.get(raw);
    if (existing) return existing;

    const shortened = shortenToolCallIdForOpenAI(raw);
    const normalized = reserveUnique(shortened);
    normalizedByOriginal.set(raw, normalized);

    if (normalized !== raw) {
      logger.warn('Normalized tool_call id for OpenAI compatibility', {
        originalLength: raw.length,
        normalizedLength: normalized.length,
      });
    }

    return normalized;
  };

  for (const seedId of seedIds) {
    allocate(seedId);
  }

  return allocate;
}

export function createOpenAIClient(config: OpenAIConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
  });
}

export function createAzureOpenAIClient(config: AzureConfig): OpenAI {
  const endpoint = `https://${config.resourceName}.openai.azure.com`;
  const apiVersion = config.apiVersion || '2024-10-21-preview';

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: `${endpoint}/openai/deployments/${config.deployment}`,
    defaultQuery: { 'api-version': apiVersion },
    defaultHeaders: {
      'api-key': config.apiKey,
    },
  });
}

export function createOpenAICompatibleClient(config: OpenAICompatibleConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
  });
}

export function createXAIClient(config: XAIConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: 'https://api.x.ai/v1',
  });
}

export function createOllamaClient(config: OllamaConfig): OpenAI {
  return new OpenAI({
    apiKey: 'ollama',
    baseURL: config.baseUrl,
  });
}

function convertMessagesToOpenAI(messages: LLMChatMessage[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const allocateToolCallId = createToolCallIdAllocator(collectHistoricalToolCallIds(messages));
  const converted: OpenAIMessageParam[] = [];
  let pendingAssistant: {
    assistantIndex: number;
    expectedIds: Set<string>;
    resolvedIds: Set<string>;
  } | null = null;

  const closePendingAssistant = () => {
    if (!pendingAssistant) return;
    finalizePendingAssistantToolCalls(converted, pendingAssistant);
    pendingAssistant = null;
  };

  for (const message of messages) {
    if (pendingAssistant && message.role === 'tool') {
      const toolCallId = allocateToolCallId(message.tool_call_id);
      if (
        pendingAssistant.expectedIds.has(toolCallId)
        && !pendingAssistant.resolvedIds.has(toolCallId)
      ) {
        converted.push({
          role: 'tool',
          content: message.content,
          tool_call_id: toolCallId,
        });
        pendingAssistant.resolvedIds.add(toolCallId);

        if (pendingAssistant.resolvedIds.size === pendingAssistant.expectedIds.size) {
          pendingAssistant = null;
        }
      } else {
        logger.debug('Dropping unexpected tool message during OpenAI conversion', { toolCallId });
      }
      continue;
    }

    if (pendingAssistant && message.role !== 'tool') {
      closePendingAssistant();
    }

    switch (message.role) {
      case 'system':
        converted.push({
          role: 'system',
          content: message.content,
        });
        break;
      case 'user':
        converted.push({
          role: 'user',
          content: message.content,
        });
        break;
      case 'assistant': {
        const mappedToolCalls = Array.isArray(message.tool_calls)
          ? message.tool_calls.map((toolCall) => ({
            ...toolCall,
            id: allocateToolCallId(toolCall?.id),
          }))
          : [];

        const assistantMessage: OpenAIAssistantMessageParam = {
          role: 'assistant',
          content: message.content,
          ...(mappedToolCalls.length > 0 ? { tool_calls: mappedToolCalls as any } : {}),
        };
        converted.push(assistantMessage);

        if (mappedToolCalls.length > 0) {
          pendingAssistant = {
            assistantIndex: converted.length - 1,
            expectedIds: new Set(mappedToolCalls.map((toolCall) => String(toolCall.id))),
            resolvedIds: new Set<string>(),
          };
        }
        break;
      }
      case 'tool':
        logger.debug('Dropping orphaned tool message during OpenAI conversion', {
          toolCallId: message.tool_call_id,
        });
        break;
      default:
        throw new Error(`Unsupported message role: ${(message as { role: string }).role}`);
    }
  }

  closePendingAssistant();
  return converted;
}

function convertToolsToOpenAI(tools: Record<string, LLMToolDefinition>): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return Object.entries(tools).map(([name, tool]) => ({
    type: 'function',
    function: {
      name,
      description: tool.description || '',
      parameters: tool.parameters || {},
    },
  }));
}

export async function streamOpenAIResponse(request: OpenAIProviderStreamRequest): Promise<LLMResponse> {
  const openaiMessages = convertMessagesToOpenAI(request.messages);
  const openaiTools = request.tools && Object.keys(request.tools).length > 0
    ? convertToolsToOpenAI(request.tools)
    : undefined;
  const reasoning = getReasoningConfig(request.reasoningEffort);

  const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming & { reasoning?: { effort: OpenAIReasoningEffort } } = {
    model: request.model,
    messages: openaiMessages,
    stream: true,
    temperature: request.temperature,
    max_completion_tokens: request.maxTokens,
    ...(reasoning ? { reasoning } : {}),
    ...(openaiTools ? { tools: openaiTools } : {}),
  };

  const stream = await request.client.chat.completions.create(
    requestParams,
    request.abortSignal ? { signal: request.abortSignal } : undefined,
  );

  let fullResponse = '';
  const functionCalls: Array<{
    id?: string;
    type: 'function';
    function: { name: string; arguments: string };
  }> = [];

  try {
    for await (const chunk of stream) {
      if (request.abortSignal?.aborted) {
        throw new DOMException('OpenAI stream aborted', 'AbortError');
      }
      const delta = chunk.choices[0]?.delta;

      const reasoningContent = extractReasoningText(
        (delta as any)?.reasoning_content
        ?? (delta as any)?.reasoning
        ?? (delta as any)?.thinking,
      );

      if (reasoningContent) {
        request.onChunk({ reasoningContent });
      }

      if (delta?.content) {
        fullResponse += delta.content;
        request.onChunk({ content: delta.content });
      }

      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          if (toolCall.index === undefined) {
            continue;
          }

          if (!functionCalls[toolCall.index]) {
            functionCalls[toolCall.index] = {
              id: toolCall.id,
              type: 'function',
              function: { name: toolCall.function?.name || '', arguments: '' },
            };
          }

          if (!functionCalls[toolCall.index].id && toolCall.id) {
            functionCalls[toolCall.index].id = toolCall.id;
          }

          if (
            toolCall.function?.name
            && toolCall.function.name.trim() !== ''
            && !functionCalls[toolCall.index].function.name
          ) {
            functionCalls[toolCall.index].function.name = toolCall.function.name;
          }

          if (toolCall.function?.arguments) {
            functionCalls[toolCall.index].function.arguments += toolCall.function.arguments;
          }
        }
      }
    }

    if (functionCalls.length > 0) {
      const validCalls = functionCalls.filter(
        (functionCall) => functionCall.function?.name && functionCall.function.name.trim() !== '',
      );
      const allocateToolCallId = createToolCallIdAllocator();
      const toolCallsFormatted = validCalls.map((functionCall) => ({
        id: allocateToolCallId(functionCall.id),
        type: 'function' as const,
        function: {
          name: functionCall.function.name,
          arguments: functionCall.function.arguments || '{}',
        },
      }));

      return {
        type: 'tool_calls',
        content: fullResponse,
        tool_calls: toolCallsFormatted,
        assistantMessage: {
          role: 'assistant',
          content: fullResponse || '',
          tool_calls: toolCallsFormatted,
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
      logger.info('OpenAI streaming canceled', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    logger.error('OpenAI streaming error', error);
    throw error;
  }
}

export async function generateOpenAIResponse(request: OpenAIProviderRequest): Promise<LLMResponse> {
  const openaiMessages = convertMessagesToOpenAI(request.messages);
  const openaiTools = request.tools && Object.keys(request.tools).length > 0
    ? convertToolsToOpenAI(request.tools)
    : undefined;
  const reasoning = getReasoningConfig(request.reasoningEffort);

  const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & { reasoning?: { effort: OpenAIReasoningEffort } } = {
    model: request.model,
    messages: openaiMessages,
    temperature: request.temperature,
    max_completion_tokens: request.maxTokens,
    ...(reasoning ? { reasoning } : {}),
    ...(openaiTools ? { tools: openaiTools } : {}),
  };

  const response = await request.client.chat.completions.create(
    requestParams,
    request.abortSignal ? { signal: request.abortSignal } : undefined,
  );
  const message = response.choices[0]?.message;

  if (!message) {
    throw new Error('No response message received from OpenAI');
  }

  const content = message.content || '';
  if (message.tool_calls && message.tool_calls.length > 0) {
    const validToolCalls = message.tool_calls.filter(
      (toolCall) => toolCall.type === 'function' && toolCall.function?.name && toolCall.function.name.trim() !== '',
    );
    const allocateToolCallId = createToolCallIdAllocator();
    const toolCallsFormatted = validToolCalls.map((toolCall) => {
      const functionCall = toolCall as OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall;
      return {
        id: allocateToolCallId(toolCall.id),
        type: 'function' as const,
        function: {
          name: functionCall.function.name,
          arguments: functionCall.function.arguments || '{}',
        },
      };
    });

    return {
      type: 'tool_calls',
      content,
      tool_calls: toolCallsFormatted,
      assistantMessage: {
        role: 'assistant',
        content,
        tool_calls: toolCallsFormatted,
      },
      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
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
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined,
  };
}

export function createClientForProvider(providerType: OpenAIClientProvider, config: OpenAIConfig | AzureConfig | OpenAICompatibleConfig | XAIConfig | OllamaConfig): OpenAI {
  switch (providerType) {
    case 'openai':
      return createOpenAIClient(config as OpenAIConfig);
    case 'azure':
      return createAzureOpenAIClient(config as AzureConfig);
    case 'openai-compatible':
      return createOpenAICompatibleClient(config as OpenAICompatibleConfig);
    case 'xai':
      return createXAIClient(config as XAIConfig);
    case 'ollama':
      return createOllamaClient(config as OllamaConfig);
    default:
      throw new Error(`Unsupported OpenAI provider type: ${providerType}`);
  }
}
