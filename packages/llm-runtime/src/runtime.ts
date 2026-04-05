/**
 * LLM Package Runtime API
 *
 * Purpose:
 * - Expose per-call `generate(...)`, `stream(...)`, and tool-resolution APIs for `llm-runtime`.
 *
 * Key features:
 * - Supports explicit `LLMEnvironment` injection for provider/MCP/skill dependencies.
 * - Retains a convenience per-call path backed by internal caches when no environment is supplied.
 * - Keeps one shared orchestration engine for buffered and streaming calls.
 *
 * Implementation notes:
 * - The primary public model is per-call plus optional explicit environment injection.
 * - Internal caches are used only by the convenience path and are not the only execution model.
 * - Built-in tool ownership and reserved-name validation stay inside the package.
 *
 * Recent changes:
 * - 2026-03-28: Added explicit environment injection and removed runtime-constructor dependency from the public API.
 */

import * as path from 'path';
import {
  assertNoBuiltInToolNameCollisions,
  createBuiltInToolDefinitions,
} from './builtins.js';
import {
  createAnthropicClient,
  generateAnthropicResponse,
  streamAnthropicResponse,
} from './anthropic-direct.js';
import {
  createGoogleClient,
  generateGoogleResponse,
  streamGoogleResponse,
} from './google-direct.js';
import { createProviderConfigStore } from './llm-config.js';
import { createMCPRegistry, normalizeMCPConfig } from './mcp.js';
import {
  createClientForProvider,
  generateOpenAIResponse,
  streamOpenAIResponse,
} from './openai-direct.js';
import { createSkillRegistry } from './skills.js';
import { createToolRegistry } from './tools.js';
import type {
  BuiltInToolSelection,
  LLMEnvironment,
  LLMEnvironmentOptions,
  LLMGenerateOptions,
  LLMProviderConfigStore,
  LLMProviderConfigs,
  LLMResolveToolsOptions,
  LLMResponse,
  LLMStreamOptions,
  LLMToolDefinition,
  MCPConfig,
  MCPRegistry,
  ReasoningEffort,
  SkillRegistry,
  ToolPermission,
} from './types.js';

const DEFAULT_REASONING_EFFORT: ReasoningEffort = 'default';
const DEFAULT_TOOL_PERMISSION: ToolPermission = 'auto';

type RuntimeDefaults = Readonly<{
  reasoningEffort: ReasoningEffort;
  toolPermission: ToolPermission;
}>;

const providerConfigStoreCache = new Map<string, LLMProviderConfigStore>();
const mcpRegistryCache = new Map<string, MCPRegistry>();
const skillRegistryCache = new Map<string, SkillRegistry>();

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`);
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

function normalizeSkillRoots(roots?: string[]): string[] {
  return [...new Set((roots ?? []).map((root) => path.resolve(String(root || '').trim())).filter(Boolean))];
}

function createDefaults(overrides?: LLMEnvironmentOptions['defaults']): RuntimeDefaults {
  return Object.freeze({
    reasoningEffort: overrides?.reasoningEffort ?? DEFAULT_REASONING_EFFORT,
    toolPermission: overrides?.toolPermission ?? DEFAULT_TOOL_PERMISSION,
  });
}

function mergeProviderConfigs(options: {
  provider?: LLMGenerateOptions['provider'] | LLMStreamOptions['provider'];
  providerConfig?: LLMGenerateOptions['providerConfig'] | LLMStreamOptions['providerConfig'];
  providers?: LLMProviderConfigs;
}): LLMProviderConfigs {
  const merged: LLMProviderConfigs = {
    ...(options.providers ?? {}),
  };

  if (options.provider && options.providerConfig) {
    merged[options.provider] = options.providerConfig as any;
  }

  return merged;
}

function getOrCreateProviderConfigStore(configs: LLMProviderConfigs): LLMProviderConfigStore {
  const cacheKey = stableStringify(configs);
  const cached = providerConfigStoreCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const store = createProviderConfigStore(configs);
  providerConfigStoreCache.set(cacheKey, store);
  return store;
}

function getOrCreateMCPRegistry(config: MCPConfig | null | undefined): MCPRegistry {
  const normalizedConfig = normalizeMCPConfig(config ?? null);
  const cacheKey = stableStringify(normalizedConfig);
  const cached = mcpRegistryCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const registry = createMCPRegistry(normalizedConfig);
  mcpRegistryCache.set(cacheKey, registry);
  return registry;
}

function getOrCreateSkillRegistry(
  roots?: string[],
  fileSystem?: LLMEnvironmentOptions['skillFileSystem'],
): SkillRegistry {
  const normalizedRoots = normalizeSkillRoots(roots);
  const cacheKey = stableStringify({
    roots: normalizedRoots,
    fileSystem: fileSystem ? 'custom' : 'default',
  });
  const cached = skillRegistryCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const registry = createSkillRegistry({
    roots: normalizedRoots,
    ...(fileSystem ? { fileSystem } : {}),
  });
  skillRegistryCache.set(cacheKey, registry);
  return registry;
}

export function createLLMEnvironment(options: LLMEnvironmentOptions = {}): LLMEnvironment {
  const providerConfigStore = options.providerConfigStore ?? createProviderConfigStore(options.providers ?? {});
  const mcpRegistry = options.mcpRegistry ?? createMCPRegistry(options.mcpConfig ?? null);
  const skillRegistry = options.skillRegistry ?? createSkillRegistry({
    roots: normalizeSkillRoots(options.skillRoots),
    ...(options.skillFileSystem ? { fileSystem: options.skillFileSystem } : {}),
  });

  return {
    defaults: createDefaults(options.defaults),
    providerConfigStore,
    mcpRegistry,
    skillRegistry,
  };
}

function buildCachedEnvironment(options: {
  provider?: LLMGenerateOptions['provider'] | LLMStreamOptions['provider'];
  providerConfig?: LLMGenerateOptions['providerConfig'] | LLMStreamOptions['providerConfig'];
  providers?: LLMProviderConfigs;
  mcpConfig?: MCPConfig | null;
  skillRoots?: string[];
  defaults?: LLMEnvironmentOptions['defaults'];
}): LLMEnvironment {
  return {
    defaults: createDefaults(options.defaults),
    providerConfigStore: getOrCreateProviderConfigStore(
      mergeProviderConfigs({
        provider: options.provider,
        providerConfig: options.providerConfig,
        providers: options.providers,
      }),
    ),
    mcpRegistry: getOrCreateMCPRegistry(options.mcpConfig ?? null),
    skillRegistry: getOrCreateSkillRegistry(options.skillRoots),
  };
}

function getEnvironmentForCall(request: {
  environment?: LLMEnvironment;
  provider?: LLMGenerateOptions['provider'] | LLMStreamOptions['provider'];
  providerConfig?: LLMGenerateOptions['providerConfig'] | LLMStreamOptions['providerConfig'];
  providers?: LLMProviderConfigs;
  mcpConfig?: MCPConfig | null;
  skillRoots?: string[];
}): LLMEnvironment {
  if (request.environment) {
    return request.environment;
  }

  return buildCachedEnvironment({
    provider: request.provider,
    providerConfig: request.providerConfig,
    providers: request.providers,
    mcpConfig: request.mcpConfig,
    skillRoots: request.skillRoots,
  });
}

function resolveReasoningEffort(environment: LLMEnvironment, request: LLMGenerateOptions | LLMStreamOptions): ReasoningEffort {
  return request.context?.reasoningEffort ?? environment.defaults.reasoningEffort;
}

function buildResolvedToolSet(options: {
  environment: LLMEnvironment;
  builtIns?: BuiltInToolSelection;
  extraTools?: LLMToolDefinition[];
  tools?: Record<string, LLMToolDefinition>;
}): Record<string, LLMToolDefinition> {
  const extraTools = options.extraTools ?? [];
  assertNoBuiltInToolNameCollisions(extraTools);

  const builtInTools = createBuiltInToolDefinitions({
    builtIns: options.builtIns,
    skillRegistry: options.environment.skillRegistry,
  });

  const resolved = createToolRegistry([
    ...Object.values(builtInTools),
    ...extraTools,
  ]).resolveTools();

  if (options.tools) {
    const requestToolValues = Object.values(options.tools);
    assertNoBuiltInToolNameCollisions(requestToolValues);
    return Object.fromEntries(
      Object.entries({
        ...resolved,
        ...options.tools,
      }).sort(([left], [right]) => left.localeCompare(right)),
    );
  }

  return Object.fromEntries(
    Object.entries(resolved).sort(([left], [right]) => left.localeCompare(right)),
  );
}

async function buildResolvedToolSetAsync(options: {
  environment: LLMEnvironment;
  builtIns?: BuiltInToolSelection;
  extraTools?: LLMToolDefinition[];
  tools?: Record<string, LLMToolDefinition>;
}): Promise<Record<string, LLMToolDefinition>> {
  const resolved = buildResolvedToolSet(options);
  const mcpTools = await options.environment.mcpRegistry.resolveTools();

  return Object.fromEntries(
    Object.entries({
      ...resolved,
      ...mcpTools,
    }).sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function resolveTools(options: LLMResolveToolsOptions = {}): Record<string, LLMToolDefinition> {
  const environment = getEnvironmentForCall({
    environment: options.environment,
    mcpConfig: options.mcpConfig,
    skillRoots: options.skillRoots,
  });

  return buildResolvedToolSet({
    environment,
    builtIns: options.builtIns,
    extraTools: options.extraTools,
    tools: options.tools,
  });
}

export async function resolveToolsAsync(options: LLMResolveToolsOptions = {}): Promise<Record<string, LLMToolDefinition>> {
  const environment = getEnvironmentForCall({
    environment: options.environment,
    mcpConfig: options.mcpConfig,
    skillRoots: options.skillRoots,
  });

  return await buildResolvedToolSetAsync({
    environment,
    builtIns: options.builtIns,
    extraTools: options.extraTools,
    tools: options.tools,
  });
}

export async function generate(request: LLMGenerateOptions): Promise<LLMResponse> {
  const environment = getEnvironmentForCall({
    environment: request.environment,
    provider: request.provider,
    providerConfig: request.providerConfig,
    providers: request.providers,
    mcpConfig: request.mcpConfig,
    skillRoots: request.skillRoots,
  });
  const tools = await buildResolvedToolSetAsync({
    environment,
    builtIns: request.builtIns,
    extraTools: request.extraTools,
    tools: request.tools,
  });
  const reasoningEffort = resolveReasoningEffort(environment, request);

  switch (request.provider) {
    case 'openai':
    case 'azure':
    case 'openai-compatible':
    case 'xai':
    case 'ollama':
      return await generateOpenAIResponse({
        client: createClientForProvider(
          request.provider,
          environment.providerConfigStore.getProviderConfig(request.provider as any) as any,
        ),
        provider: request.provider,
        model: request.model,
        messages: request.messages,
        tools,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        reasoningEffort,
        abortSignal: request.context?.abortSignal,
      });
    case 'anthropic':
      return await generateAnthropicResponse({
        client: createAnthropicClient(environment.providerConfigStore.getProviderConfig('anthropic')),
        model: request.model,
        messages: request.messages,
        tools,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        abortSignal: request.context?.abortSignal,
      });
    case 'google':
      return await generateGoogleResponse({
        client: createGoogleClient(environment.providerConfigStore.getProviderConfig('google')),
        model: request.model,
        messages: request.messages,
        tools,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        reasoningEffort,
        abortSignal: request.context?.abortSignal,
      });
    default:
      throw new Error(`Unsupported provider: ${request.provider}`);
  }
}

export async function stream(request: LLMStreamOptions): Promise<LLMResponse> {
  const environment = getEnvironmentForCall({
    environment: request.environment,
    provider: request.provider,
    providerConfig: request.providerConfig,
    providers: request.providers,
    mcpConfig: request.mcpConfig,
    skillRoots: request.skillRoots,
  });
  const tools = await buildResolvedToolSetAsync({
    environment,
    builtIns: request.builtIns,
    extraTools: request.extraTools,
    tools: request.tools,
  });
  const reasoningEffort = resolveReasoningEffort(environment, request);
  const onChunk = request.onChunk ?? (() => undefined);

  switch (request.provider) {
    case 'openai':
    case 'azure':
    case 'openai-compatible':
    case 'xai':
    case 'ollama':
      return await streamOpenAIResponse({
        client: createClientForProvider(
          request.provider,
          environment.providerConfigStore.getProviderConfig(request.provider as any) as any,
        ),
        provider: request.provider,
        model: request.model,
        messages: request.messages,
        tools,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        reasoningEffort,
        abortSignal: request.context?.abortSignal,
        onChunk,
      });
    case 'anthropic':
      return await streamAnthropicResponse({
        client: createAnthropicClient(environment.providerConfigStore.getProviderConfig('anthropic')),
        model: request.model,
        messages: request.messages,
        tools,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        abortSignal: request.context?.abortSignal,
        onChunk,
      });
    case 'google':
      return await streamGoogleResponse({
        client: createGoogleClient(environment.providerConfigStore.getProviderConfig('google')),
        model: request.model,
        messages: request.messages,
        tools,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        reasoningEffort,
        abortSignal: request.context?.abortSignal,
        onChunk,
      });
    default:
      throw new Error(`Unsupported provider: ${request.provider}`);
  }
}

export async function __resetLLMCallCachesForTests(): Promise<void> {
  await Promise.all(
    [...mcpRegistryCache.values()].map(async (registry) => {
      await registry.shutdown();
    }),
  );
  mcpRegistryCache.clear();
  skillRegistryCache.clear();
  providerConfigStoreCache.clear();
}
