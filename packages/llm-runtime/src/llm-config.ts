/**
 * LLM Package Provider Configuration
 *
 * Purpose:
 * - Provide package-owned provider configuration storage and validation for `llm-runtime`.
 *
 * Key features:
 * - Runtime configuration store for all supported providers.
 * - Typed validation helpers with descriptive runtime errors.
 * - Default Ollama bootstrap configuration for local development parity.
 *
 * Implementation notes:
 * - Uses a module-local store so package consumers share one runtime config surface.
 * - Accepts string-union provider names instead of importing `core` enums.
 * - Mirrors the current provider set used by the application.
 *
 * Recent changes:
 * - 2026-03-27: Initial extraction from `core/llm-config` into `packages/llm`.
 * - 2026-03-27: Added instance-scoped provider config stores for reusable package environments.
 */

import type {
  LLMProviderConfigStore,
  LLMProviderConfigs,
  LLMProviderName,
  ProviderConfig,
  ProviderConfigMap,
} from './types.js';

export function validateProviderConfig(provider: LLMProviderName, config: ProviderConfig): void {
  switch (provider) {
    case 'openai':
    case 'anthropic':
    case 'google':
    case 'xai':
      if (!('apiKey' in config) || !config.apiKey || typeof config.apiKey !== 'string') {
        throw new Error(`${provider === 'xai' ? 'XAI' : provider[0].toUpperCase() + provider.slice(1)} provider requires apiKey (string)`);
      }
      return;
    case 'azure':
      if (!('apiKey' in config) || !config.apiKey || typeof config.apiKey !== 'string') {
        throw new Error('Azure provider requires apiKey (string)');
      }
      if (!('resourceName' in config) || typeof config.resourceName !== 'string' || !config.resourceName) {
        throw new Error('Azure provider requires resourceName (string)');
      }
      if (!config.deployment || typeof config.deployment !== 'string') {
        throw new Error('Azure provider requires deployment (string)');
      }
      return;
    case 'openai-compatible':
      if (!('apiKey' in config) || !config.apiKey || typeof config.apiKey !== 'string') {
        throw new Error('OpenAI-Compatible provider requires apiKey (string)');
      }
      if (!('baseUrl' in config) || !config.baseUrl || typeof config.baseUrl !== 'string') {
        throw new Error('OpenAI-Compatible provider requires baseUrl (string)');
      }
      return;
    case 'ollama':
      if (!('baseUrl' in config) || !config.baseUrl || typeof config.baseUrl !== 'string') {
        throw new Error('Ollama provider requires baseUrl (string)');
      }
      return;
    default:
      throw new Error(`Unsupported provider: ${String(provider)}`);
  }
}

function createDefaultProviderConfigs(): LLMProviderConfigs {
  return {
    ollama: {
      baseUrl: 'http://localhost:11434/v1',
    },
  };
}

function getProviderConfigNotFoundError(provider: LLMProviderName): Error {
  return new Error(
    `No configuration found for ${provider} provider. ` +
    'Please ensure the provider is configured before making LLM calls. ' +
    'Configuration should be set via configureLLMProvider() function.'
  );
}

function getConfigStatus(providerConfigs: LLMProviderConfigs): Record<LLMProviderName, boolean> {
  return {
    openai: !!providerConfigs.openai,
    anthropic: !!providerConfigs.anthropic,
    google: !!providerConfigs.google,
    azure: !!providerConfigs.azure,
    xai: !!providerConfigs.xai,
    'openai-compatible': !!providerConfigs['openai-compatible'],
    ollama: !!providerConfigs.ollama,
  };
}

export function createProviderConfigStore(
  initialConfigs: LLMProviderConfigs = {},
): LLMProviderConfigStore {
  let providerConfigs: LLMProviderConfigs = {
    ...createDefaultProviderConfigs(),
  };

  const configureProvider = <T extends LLMProviderName>(
    provider: T,
    config: ProviderConfigMap[T],
  ): void => {
    validateProviderConfig(provider, config as ProviderConfig);
    providerConfigs[provider] = config;
  };

  for (const [providerName, config] of Object.entries(initialConfigs) as Array<
    [LLMProviderName, ProviderConfigMap[LLMProviderName] | undefined]
  >) {
    if (!config) {
      continue;
    }

    configureProvider(
      providerName,
      config as ProviderConfigMap[typeof providerName],
    );
  }

  return {
    configureProvider,
    getProviderConfig: <T extends LLMProviderName>(provider: T): ProviderConfigMap[T] => {
      const config = providerConfigs[provider];
      if (!config) {
        throw getProviderConfigNotFoundError(provider);
      }

      return config as ProviderConfigMap[T];
    },
    isProviderConfigured: (provider) => !!providerConfigs[provider],
    getConfiguredProviders: () => Object.keys(providerConfigs) as LLMProviderName[],
    getConfigurationStatus: () => getConfigStatus(providerConfigs),
    clearProviderConfiguration: () => {
      providerConfigs = {};
    },
  };
}

const defaultProviderConfigStore = createProviderConfigStore();

export function configureLLMProvider<T extends LLMProviderName>(
  provider: T,
  config: ProviderConfigMap[T],
): void {
  defaultProviderConfigStore.configureProvider(provider, config);
}

export function getLLMProviderConfig<T extends LLMProviderName>(provider: T): ProviderConfigMap[T] {
  return defaultProviderConfigStore.getProviderConfig(provider);
}

export function isProviderConfigured(provider: LLMProviderName): boolean {
  return defaultProviderConfigStore.isProviderConfigured(provider);
}

export function getConfiguredProviders(): LLMProviderName[] {
  return defaultProviderConfigStore.getConfiguredProviders();
}

export function clearAllConfiguration(): void {
  defaultProviderConfigStore.clearProviderConfiguration();
}

export function getConfigurationStatus(): Record<LLMProviderName, boolean> {
  return defaultProviderConfigStore.getConfigurationStatus();
}
