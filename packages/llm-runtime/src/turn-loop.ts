/**
 * LLM Package Generic Turn Loop
 *
 * Purpose:
 * - Provide a host-agnostic iterative model/tool loop for `llm-runtime`.
 *
 * Key features:
 * - Callback-driven loop control with caller-owned generic state.
 * - Optional package-managed model invocation via existing `generate(...)` and `stream(...)`.
 * - Bounded empty-text retry handling and optional plain-text tool-intent normalization.
 *
 * Implementation notes:
 * - The package owns loop repetition and response classification only.
 * - Hosts own persistence, queueing, restore/replay, and tool-execution policy.
 * - No Agent World-specific runtime types are referenced here.
 *
 * Recent changes:
 * - 2026-03-29: Added the first generic `runTurnLoop(...)` API for host-agnostic tool-loop orchestration.
 */

import { generate, stream } from './runtime.js';
import type {
  LLMChatMessage,
  LLMGenerateOptions,
  LLMResponse,
  LLMStreamOptions,
} from './types.js';

type ParsedToolIntent = {
  toolName: string;
  toolArgs: Record<string, unknown>;
} | null;

export type TurnLoopControl =
  | { control: 'stop' }
  | { control: 'continue'; transientInstruction?: string };

export type TurnLoopTerminalReason =
  | 'text_response'
  | 'tool_calls_response'
  | 'empty_text_stop'
  | 'unhandled_response';

export type TurnLoopStepResult<TState> = {
  state: TState;
  next?: TurnLoopControl;
};

export type TurnLoopPackageModelRequest =
  | ({ mode?: 'generate' } & Omit<LLMGenerateOptions, 'messages'>)
  | ({ mode: 'stream' } & Omit<LLMStreamOptions, 'messages'>);

export interface RunTurnLoopOptions<TState, TMessage extends LLMChatMessage = LLMChatMessage> {
  initialState: TState;
  emptyTextRetryLimit: number;
  initialEmptyTextRetryCount?: number;
  abortSignal?: AbortSignal;
  modelRequest?: TurnLoopPackageModelRequest;
  callModel?: (params: {
    messages: TMessage[];
    abortSignal?: AbortSignal;
    state: TState;
  }) => Promise<LLMResponse>;
  buildMessages: (params: {
    state: TState;
    emptyTextRetryCount: number;
    transientInstruction?: string;
  }) => Promise<TMessage[]>;
  parsePlainTextToolIntent?: (content: string) => ParsedToolIntent;
  onTextResponse: (params: {
    state: TState;
    responseText: string;
    response: LLMResponse;
    messages: TMessage[];
    iteration: number;
  }) => Promise<TurnLoopStepResult<TState> | void>;
  onToolCallsResponse: (params: {
    state: TState;
    response: LLMResponse;
    messages: TMessage[];
    iteration: number;
  }) => Promise<TurnLoopStepResult<TState> | void>;
  onEmptyTextStop?: (params: {
    state: TState;
    response: LLMResponse;
    messages: TMessage[];
    retryCount: number;
    iteration: number;
  }) => Promise<TurnLoopStepResult<TState> | void>;
  onUnhandledResponse?: (params: {
    state: TState;
    response: LLMResponse;
    messages: TMessage[];
    retryCount: number;
    iteration: number;
  }) => Promise<TurnLoopStepResult<TState> | void>;
}

export interface RunTurnLoopResult<TState> {
  state: TState;
  iterations: number;
  emptyTextRetryCount: number;
  reason: TurnLoopTerminalReason;
  response: LLMResponse;
}

function normalizeToolIntentResponse(params: {
  response: LLMResponse;
  parsePlainTextToolIntent?: (content: string) => ParsedToolIntent;
}): LLMResponse {
  const { response, parsePlainTextToolIntent } = params;

  if (
    response.type !== 'text'
    || typeof response.content !== 'string'
    || !response.content.trim()
    || !parsePlainTextToolIntent
  ) {
    return response;
  }

  const parsedIntent = parsePlainTextToolIntent(response.content);
  if (!parsedIntent) {
    return response;
  }

  const syntheticToolCallId = `tool-intent-${Date.now()}`;

  return {
    type: 'tool_calls',
    content: response.content,
    tool_calls: [{
      id: syntheticToolCallId,
      type: 'function',
      function: {
        name: parsedIntent.toolName,
        arguments: JSON.stringify(parsedIntent.toolArgs || {}),
      },
    }],
    assistantMessage: {
      role: 'assistant',
      content: response.content,
      tool_calls: [{
        id: syntheticToolCallId,
        type: 'function',
        function: {
          name: parsedIntent.toolName,
          arguments: JSON.stringify(parsedIntent.toolArgs || {}),
        },
      }],
    },
  };
}

function createDefaultModelCaller<TState, TMessage extends LLMChatMessage>(
  request: TurnLoopPackageModelRequest,
): (params: {
  messages: TMessage[];
  abortSignal?: AbortSignal;
  state: TState;
}) => Promise<LLMResponse> {
  return async (params) => {
    if (request.mode === 'stream') {
      return await stream({
        ...request,
        messages: params.messages,
        context: {
          ...(request.context ?? {}),
          abortSignal: request.context?.abortSignal ?? params.abortSignal,
        },
      });
    }

    return await generate({
      ...request,
      messages: params.messages,
      context: {
        ...(request.context ?? {}),
        abortSignal: request.context?.abortSignal ?? params.abortSignal,
      },
    });
  };
}

function resolveModelCaller<TState, TMessage extends LLMChatMessage>(
  options: RunTurnLoopOptions<TState, TMessage>,
): (params: {
  messages: TMessage[];
  abortSignal?: AbortSignal;
  state: TState;
}) => Promise<LLMResponse> {
  if (options.callModel) {
    return options.callModel;
  }

  if (options.modelRequest) {
    return createDefaultModelCaller(options.modelRequest);
  }

  throw new Error('runTurnLoop requires either callModel or modelRequest.');
}

export async function runTurnLoop<TState, TMessage extends LLMChatMessage = LLMChatMessage>(
  options: RunTurnLoopOptions<TState, TMessage>,
): Promise<RunTurnLoopResult<TState>> {
  const callModel = resolveModelCaller(options);
  let state = options.initialState;
  let emptyTextRetryCount = options.initialEmptyTextRetryCount ?? 0;
  let transientInstruction: string | undefined;
  let iterations = 0;

  while (true) {
    const messages = await options.buildMessages({
      state,
      emptyTextRetryCount,
      transientInstruction,
    });
    transientInstruction = undefined;
    iterations += 1;

    const rawResponse = await callModel({
      messages,
      abortSignal: options.abortSignal,
      state,
    });

    const response = normalizeToolIntentResponse({
      response: rawResponse,
      parsePlainTextToolIntent: options.parsePlainTextToolIntent,
    });

    if (response.type === 'tool_calls') {
      emptyTextRetryCount = 0;
      const next = await options.onToolCallsResponse({
        state,
        response,
        messages,
        iteration: iterations,
      });
      state = next?.state ?? state;
      if (next?.next?.control === 'continue') {
        transientInstruction = next.next.transientInstruction;
        continue;
      }
      return {
        state,
        iterations,
        emptyTextRetryCount,
        reason: 'tool_calls_response',
        response,
      };
    }

    if (response.type === 'text' && String(response.content || '').trim()) {
      emptyTextRetryCount = 0;
      const next = await options.onTextResponse({
        state,
        responseText: String(response.content || ''),
        response,
        messages,
        iteration: iterations,
      });
      state = next?.state ?? state;
      if (next?.next?.control === 'continue') {
        transientInstruction = next.next.transientInstruction;
        continue;
      }
      return {
        state,
        iterations,
        emptyTextRetryCount,
        reason: 'text_response',
        response,
      };
    }

    if (response.type === 'text' && emptyTextRetryCount < options.emptyTextRetryLimit) {
      emptyTextRetryCount += 1;
      continue;
    }

    if (response.type === 'text') {
      const next = await options.onEmptyTextStop?.({
        state,
        response,
        messages,
        retryCount: emptyTextRetryCount,
        iteration: iterations,
      });
      state = next?.state ?? state;
      return {
        state,
        iterations,
        emptyTextRetryCount,
        reason: 'empty_text_stop',
        response,
      };
    }

    const next = await options.onUnhandledResponse?.({
      state,
      response,
      messages,
      retryCount: emptyTextRetryCount,
      iteration: iterations,
    });
    state = next?.state ?? state;
    return {
      state,
      iterations,
      emptyTextRetryCount,
      reason: 'unhandled_response',
      response,
    };
  }
}
