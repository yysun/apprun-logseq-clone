/**
 * LLM Package Google Provider Module
 *
 * Purpose:
 * - Provide package-owned Google Generative AI client and request helpers.
 *
 * Key features:
 * - Converts package-native messages and tool schemas into Gemini request payloads.
 * - Supports streaming and non-streaming generation with package-native `LLMResponse` output.
 * - Applies Gemini-safe schema normalization for tool declarations.
 *
 * Implementation notes:
 * - Historical tool-call replay is flattened into plain text context for Gemini compatibility.
 * - Reasoning effort maps to Gemini `thinkingConfig` budgets when explicitly provided.
 *
 * Recent changes:
 * - 2026-03-27: Initial package-owned Google provider implementation.
 */

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import type {
  GoogleConfig,
  LLMChatMessage,
  LLMResponse,
  LLMStreamChunk,
  LLMToolDefinition,
  ReasoningEffort,
} from './types.js';
import { createPackageLogger, generateId } from './provider-utils.js';

const logger = createPackageLogger();
type GoogleReasoningEffort = 'none' | 'low' | 'medium' | 'high';

export type GoogleProviderRequest = {
  client: GoogleGenerativeAI;
  model: string;
  messages: LLMChatMessage[];
  tools?: Record<string, LLMToolDefinition>;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: ReasoningEffort;
  abortSignal?: AbortSignal;
};

export type GoogleProviderStreamRequest = GoogleProviderRequest & {
  onChunk: (chunk: LLMStreamChunk) => void;
};

function normalizeReasoningEffort(value: ReasoningEffort | undefined): 'default' | GoogleReasoningEffort {
  if (value === 'none' || value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }
  return 'default';
}

function buildGoogleThinkingConfig(reasoningEffort: ReasoningEffort | undefined): { includeThoughts: true; thinkingBudget: number } | undefined {
  const effort = normalizeReasoningEffort(reasoningEffort);
  if (effort === 'default') {
    return undefined;
  }

  const budgets: Record<GoogleReasoningEffort, number> = {
    none: 0,
    low: 256,
    medium: 1024,
    high: 2048,
  };

  return {
    includeThoughts: true,
    thinkingBudget: budgets[effort],
  };
}

function isAbortLikeError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;

  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  return normalized.includes('abort') || normalized.includes('canceled') || normalized.includes('cancelled');
}

function stripUnsupportedGoogleSchemaFields(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map((item) => stripUnsupportedGoogleSchemaFields(item));
  }

  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const normalizedEntries = Object.entries(schema as Record<string, unknown>)
    .filter(([key]) => key !== 'additionalProperties')
    .map(([key, value]) => [key, stripUnsupportedGoogleSchemaFields(value)]);

  return Object.fromEntries(normalizedEntries);
}

export function createGoogleClient(config: GoogleConfig): GoogleGenerativeAI {
  return new GoogleGenerativeAI(config.apiKey);
}

export function createGoogleModel(client: GoogleGenerativeAI, modelName: string, tools?: any[]): GenerativeModel {
  return client.getGenerativeModel({
    model: modelName,
    ...(tools && tools.length > 0 ? { tools: [{ functionDeclarations: tools }] } : {}),
  });
}

function convertMessagesToGoogle(messages: LLMChatMessage[]): { messages: any[]; systemInstruction: string } {
  const googleMessages: any[] = [];
  let systemInstruction = '';

  for (const message of messages) {
    if (message.role === 'system') {
      systemInstruction = message.content || '';
      continue;
    }

    if (message.role === 'tool') {
      if (!message.content?.trim()) {
        continue;
      }
      googleMessages.push({
        role: 'user',
        parts: [{ text: `[Tool result]\n${message.content}` }],
      });
      continue;
    }

    if (message.role === 'assistant' && message.tool_calls) {
      const parts: any[] = [];

      if (message.content) {
        parts.push({ text: message.content });
      }

      if (parts.length === 0) {
        parts.push({ text: '[Tool call history omitted for Google replay compatibility]' });
      }

      googleMessages.push({
        role: 'model',
        parts,
      });
      continue;
    }

    googleMessages.push({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content || '' }],
    });
  }

  return { messages: googleMessages, systemInstruction };
}

function convertToolsToGoogle(tools: Record<string, LLMToolDefinition>): any[] {
  return Object.entries(tools).map(([name, tool]) => ({
    name,
    description: tool.description || '',
    parameters: stripUnsupportedGoogleSchemaFields(tool.parameters || { type: 'object', properties: {} }),
  }));
}

export async function streamGoogleResponse(request: GoogleProviderStreamRequest): Promise<LLMResponse> {
  const googleTools = request.tools && Object.keys(request.tools).length > 0
    ? convertToolsToGoogle(request.tools)
    : undefined;
  const converted = convertMessagesToGoogle(request.messages);
  const thinkingConfig = buildGoogleThinkingConfig(request.reasoningEffort);
  const generativeModel = request.client.getGenerativeModel({
    model: request.model,
    systemInstruction: converted.systemInstruction || undefined,
    ...(googleTools && googleTools.length > 0 ? { tools: [{ functionDeclarations: googleTools }] } : {}),
    generationConfig: {
      temperature: request.temperature,
      maxOutputTokens: request.maxTokens,
      ...(thinkingConfig ? { thinkingConfig } : {}),
    } as any,
  });

  let fullResponse = '';
  const functionCalls: any[] = [];

  try {
    if (request.abortSignal?.aborted) {
      throw new DOMException('Google stream aborted before start', 'AbortError');
    }

    const result = await generativeModel.generateContentStream(
      { contents: converted.messages },
      request.abortSignal ? { signal: request.abortSignal } : undefined,
    );

    for await (const chunk of result.stream) {
      if (request.abortSignal?.aborted) {
        throw new DOMException('Google stream aborted', 'AbortError');
      }

      const parts = Array.isArray(chunk.candidates?.[0]?.content?.parts)
        ? chunk.candidates[0].content.parts
        : [];

      if (parts.length > 0) {
        for (const part of parts) {
          if (typeof part?.text === 'string' && part.text.length > 0) {
            if ((part as { thought?: boolean }).thought === true) {
              request.onChunk({ reasoningContent: part.text });
            } else {
              fullResponse += part.text;
              request.onChunk({ content: part.text });
            }
          }

          if (part.functionCall) {
            functionCalls.push({
              id: generateId(),
              type: 'function',
              function: {
                name: part.functionCall.name,
                arguments: JSON.stringify(part.functionCall.args || {}),
              },
            });
          }
        }
      } else {
        const chunkText = chunk.text();
        if (chunkText) {
          fullResponse += chunkText;
          request.onChunk({ content: chunkText });
        }
      }
    }

    if (functionCalls.length > 0) {
      const validCalls = functionCalls.filter(
        (functionCall) => functionCall.function?.name && functionCall.function.name.trim() !== '',
      );

      return {
        type: 'tool_calls',
        content: fullResponse,
        tool_calls: validCalls,
        assistantMessage: {
          role: 'assistant',
          content: fullResponse || '',
          tool_calls: validCalls,
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
      logger.info('Google streaming canceled', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    logger.error('Google streaming error', error);
    throw error;
  }
}

export async function generateGoogleResponse(request: GoogleProviderRequest): Promise<LLMResponse> {
  const googleTools = request.tools && Object.keys(request.tools).length > 0
    ? convertToolsToGoogle(request.tools)
    : undefined;
  const converted = convertMessagesToGoogle(request.messages);
  const thinkingConfig = buildGoogleThinkingConfig(request.reasoningEffort);
  const generativeModel = request.client.getGenerativeModel({
    model: request.model,
    systemInstruction: converted.systemInstruction || undefined,
    ...(googleTools && googleTools.length > 0 ? { tools: [{ functionDeclarations: googleTools }] } : {}),
    generationConfig: {
      temperature: request.temperature,
      maxOutputTokens: request.maxTokens,
      ...(thinkingConfig ? { thinkingConfig } : {}),
    } as any,
  });

  if (request.abortSignal?.aborted) {
    throw new DOMException('Google generation aborted before start', 'AbortError');
  }

  const result = await generativeModel.generateContent(
    { contents: converted.messages },
    request.abortSignal ? { signal: request.abortSignal } : undefined,
  );
  const response = result.response;
  const content = response.text() || '';
  const functionCalls: any[] = [];

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.functionCall) {
        functionCalls.push({
          id: generateId(),
          type: 'function',
          function: {
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args || {}),
          },
        });
      }
    }
  }

  if (functionCalls.length > 0) {
    const validCalls = functionCalls.filter(
      (functionCall) => functionCall.function?.name && functionCall.function.name.trim() !== '',
    );

    return {
      type: 'tool_calls',
      content,
      tool_calls: validCalls,
      assistantMessage: {
        role: 'assistant',
        content,
        tool_calls: validCalls,
      },
    };
  }

  return {
    type: 'text',
    content,
    assistantMessage: {
      role: 'assistant',
      content,
    },
  };
}
