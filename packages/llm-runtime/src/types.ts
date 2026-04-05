/**
 * LLM Package Types
 *
 * Purpose:
 * - Define the public type contracts for the publishable `llm-runtime` package.
 *
 * Key features:
 * - Provider configuration types decoupled from `core`.
 * - Tool, MCP, and skill registry contracts used by the package runtime.
 * - Minimal per-call execution context for package consumers.
 *
 * Implementation notes:
 * - Uses string unions instead of `core` enums to avoid package-to-core coupling.
 * - Keeps world/chat/agent identifiers out of the primary API surface.
 * - Leaves room for future provider invocation APIs without breaking current contracts.
 *
 * Recent changes:
 * - 2026-03-27: Initial package-owned public API contracts for `packages/llm`.
 * - 2026-03-27: Added runtime-scoped provider store contracts and constructor-time provider config.
 * - 2026-03-27: Added built-in tool catalog, package-owned HITL pending artifacts, and additive extra-tool contracts.
 * - 2026-03-27: Added package-native message/response/provider invocation contracts.
 */

export type LLMProviderName =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'azure'
  | 'xai'
  | 'openai-compatible'
  | 'ollama';

export type ReasoningEffort = 'default' | 'none' | 'low' | 'medium' | 'high';
export type ToolPermission = 'auto' | 'ask' | 'read';
export type BuiltInToolName =
  | 'shell_cmd'
  | 'load_skill'
  | 'human_intervention_request'
  | 'web_fetch'
  | 'read_file'
  | 'write_file'
  | 'list_files'
  | 'grep';

export interface BaseLLMConfig {
  apiKey?: string;
  baseUrl?: string;
  endpoint?: string;
  deployment?: string;
  apiVersion?: string;
}

export interface OpenAIConfig extends Required<Pick<BaseLLMConfig, 'apiKey'>> { }
export interface AnthropicConfig extends Required<Pick<BaseLLMConfig, 'apiKey'>> { }
export interface GoogleConfig extends Required<Pick<BaseLLMConfig, 'apiKey'>> { }
export interface XAIConfig extends Required<Pick<BaseLLMConfig, 'apiKey'>> { }
export interface OpenAICompatibleConfig extends Required<Pick<BaseLLMConfig, 'apiKey' | 'baseUrl'>> { }
export interface OllamaConfig extends Required<Pick<BaseLLMConfig, 'baseUrl'>> { }
export interface AzureConfig extends Required<Pick<BaseLLMConfig, 'apiKey' | 'deployment'>> {
  resourceName: string;
  apiVersion?: string;
}

export interface ProviderConfigMap {
  openai: OpenAIConfig;
  anthropic: AnthropicConfig;
  google: GoogleConfig;
  azure: AzureConfig;
  xai: XAIConfig;
  'openai-compatible': OpenAICompatibleConfig;
  ollama: OllamaConfig;
}

export type ProviderConfig = ProviderConfigMap[keyof ProviderConfigMap];
export type LLMProviderConfigs = Partial<{ [K in LLMProviderName]: ProviderConfigMap[K] }>;

export interface LLMToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  createdAt?: Date;
  tool_calls?: LLMToolCall[];
  tool_call_id?: string;
}

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
}

export interface LLMResponse {
  type: 'text' | 'tool_calls';
  content: string;
  tool_calls?: LLMToolCall[];
  assistantMessage: LLMChatMessage;
  usage?: LLMUsage;
}

export interface LLMStreamChunk {
  content?: string;
  reasoningContent?: string;
}

export interface LLMProviderConfigStore {
  configureProvider: <T extends LLMProviderName>(provider: T, config: ProviderConfigMap[T]) => void;
  getProviderConfig: <T extends LLMProviderName>(provider: T) => ProviderConfigMap[T];
  isProviderConfigured: (provider: LLMProviderName) => boolean;
  getConfiguredProviders: () => LLMProviderName[];
  getConfigurationStatus: () => Record<LLMProviderName, boolean>;
  clearProviderConfiguration: () => void;
}

export interface MCPServerDefinition {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  transport?: 'stdio' | 'sse' | 'streamable-http';
  url?: string;
  headers?: Record<string, string>;
  enabled?: boolean;
}

export interface MCPConfig {
  servers?: Record<string, MCPServerDefinition>;
  mcpServers?: Record<string, MCPServerDefinition>;
}

export interface MCPRegistryEntry extends MCPServerDefinition {
  name: string;
}

export interface SkillEntry {
  skillId: string;
  description: string;
  sourcePath: string;
  rootPath: string;
}

export interface LoadedSkill extends SkillEntry {
  content: string;
}

export interface SkillRegistrySyncResult {
  skills: SkillEntry[];
}

export interface LLMToolExecutionContext {
  workingDirectory?: string;
  reasoningEffort?: ReasoningEffort;
  toolPermission?: ToolPermission;
  abortSignal?: AbortSignal;
  sequenceId?: string;
  parentToolCallId?: string;
  toolCallId?: string;
  chatId?: string | null;
  agentName?: string | null;
  world?: unknown;
  messages?: Array<Record<string, unknown>>;
  llmResultMode?: 'minimal' | 'verbose';
  persistToolEnvelope?: boolean;
  metadata?: Record<string, unknown>;
}

export interface LLMToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute?: (args: Record<string, unknown>, context?: LLMToolExecutionContext) => Promise<unknown> | unknown;
}

export interface LLMToolRegistry {
  registerTool: (tool: LLMToolDefinition) => void;
  registerTools: (tools: LLMToolDefinition[]) => void;
  getTool: (name: string) => LLMToolDefinition | undefined;
  listTools: () => LLMToolDefinition[];
  resolveTools: (extraTools?: LLMToolDefinition[]) => Record<string, LLMToolDefinition>;
}

export type BuiltInToolSelection = boolean | Partial<Record<BuiltInToolName, boolean>>;

export interface PendingHitlToolResult {
  ok: false;
  pending: true;
  status: 'pending';
  confirmed: false;
  requestId: string;
  selectedOption: null;
  question: string;
  options: string[];
  defaultOption?: string;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

export interface SkillFileSystemAdapter {
  access(path: string): Promise<void>;
  readFile(path: string, encoding: BufferEncoding): Promise<string>;
  readdir(
    path: string,
    options: { withFileTypes: true }
  ): Promise<Array<{ name: string; isDirectory(): boolean; isFile(): boolean; isSymbolicLink?(): boolean }>>;
  realpath(path: string): Promise<string>;
  stat(path: string): Promise<{ isDirectory(): boolean; isFile(): boolean }>;
}

export interface SkillRegistryOptions {
  roots?: string[];
  fileSystem?: SkillFileSystemAdapter;
}

export interface MCPRegistry {
  getConfig: () => MCPConfig | null;
  setConfig: (config: MCPConfig | null) => void;
  listServers: () => MCPRegistryEntry[];
  resolveTools: () => Promise<Record<string, LLMToolDefinition>>;
  shutdown: () => Promise<void>;
}

export interface SkillRegistry {
  getRoots: () => string[];
  setRoots: (roots: string[]) => void;
  sync: () => Promise<SkillRegistrySyncResult>;
  listSkills: () => Promise<SkillEntry[]>;
  getSkill: (skillId: string) => Promise<SkillEntry | undefined>;
  loadSkill: (skillId: string) => Promise<LoadedSkill | undefined>;
}

export interface LLMEnvironment {
  defaults: {
    reasoningEffort: ReasoningEffort;
    toolPermission: ToolPermission;
  };
  providerConfigStore: LLMProviderConfigStore;
  mcpRegistry: MCPRegistry;
  skillRegistry: SkillRegistry;
}

export interface LLMEnvironmentOptions {
  defaults?: {
    reasoningEffort?: ReasoningEffort;
    toolPermission?: ToolPermission;
  };
  providers?: LLMProviderConfigs;
  providerConfigStore?: LLMProviderConfigStore;
  mcpConfig?: MCPConfig | null;
  mcpRegistry?: MCPRegistry;
  skillRoots?: string[];
  skillRegistry?: SkillRegistry;
  skillFileSystem?: SkillFileSystemAdapter;
}

export interface LLMPerCallProviderOptions {
  provider: LLMProviderName;
  model: string;
  messages: LLMChatMessage[];
  temperature?: number;
  maxTokens?: number;
  providerConfig?: ProviderConfig;
  providers?: LLMProviderConfigs;
  mcpConfig?: MCPConfig | null;
  skillRoots?: string[];
  builtIns?: BuiltInToolSelection;
  extraTools?: LLMToolDefinition[];
  tools?: Record<string, LLMToolDefinition>;
  environment?: LLMEnvironment;
  context?: LLMToolExecutionContext;
}

export interface LLMGenerateOptions extends LLMPerCallProviderOptions { }

export interface LLMStreamOptions extends LLMPerCallProviderOptions {
  onChunk?: (chunk: LLMStreamChunk) => void;
}

export interface LLMResolveToolsOptions {
  mcpConfig?: MCPConfig | null;
  skillRoots?: string[];
  builtIns?: BuiltInToolSelection;
  extraTools?: LLMToolDefinition[];
  tools?: Record<string, LLMToolDefinition>;
  environment?: LLMEnvironment;
}
