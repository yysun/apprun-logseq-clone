/**
 * LLM Package Tool Validation
 *
 * Purpose:
 * - Provide package-owned argument validation and normalization for tool execution.
 *
 * Key features:
 * - Validates required parameters and simple JSON-schema primitive types.
 * - Normalizes common built-in alias fields before execution.
 * - Wraps tool execution so direct package consumers get the same guardrails as host integrations.
 *
 * Implementation notes:
 * - Validation is intentionally scoped to the schema patterns used by this package today.
 * - This module avoids app-specific event emission so it stays reusable.
 * - Built-in tool aliases mirror current runtime compatibility behavior where practical.
 *
 * Recent changes:
 * - 2026-03-27: Added package-owned validation for built-in tool execution.
 */

import type { LLMToolDefinition } from './types.js';

function normalizeKnownParameterAliases(toolName: string, args: Record<string, unknown>): {
  normalizedArgs: Record<string, unknown>;
  corrections: string[];
} {
  const normalizedArgs = { ...args };
  const corrections: string[] = [];

  if (
    toolName === 'read_file'
    && normalizedArgs.filePath === undefined
    && normalizedArgs.path !== undefined
  ) {
    normalizedArgs.filePath = normalizedArgs.path;
    delete normalizedArgs.path;
    corrections.push('path -> filePath');
  }

  if (toolName === 'list_files' && normalizedArgs.path === undefined && normalizedArgs.directory !== undefined) {
    normalizedArgs.path = normalizedArgs.directory;
    delete normalizedArgs.directory;
    corrections.push('directory -> path');
  }

  if (toolName === 'list_files' && normalizedArgs.includePattern === undefined && normalizedArgs['.includePattern'] !== undefined) {
    normalizedArgs.includePattern = normalizedArgs['.includePattern'];
    delete normalizedArgs['.includePattern'];
    corrections.push('.includePattern -> includePattern');
  }

  if (
    toolName === 'grep'
    && normalizedArgs.directoryPath === undefined
    && normalizedArgs.directory !== undefined
  ) {
    normalizedArgs.directoryPath = normalizedArgs.directory;
    delete normalizedArgs.directory;
    corrections.push('directory -> directoryPath');
  }

  if (
    toolName === 'grep'
    && normalizedArgs.directoryPath === undefined
    && normalizedArgs.path !== undefined
  ) {
    normalizedArgs.directoryPath = normalizedArgs.path;
    delete normalizedArgs.path;
    corrections.push('path -> directoryPath');
  }

  if (
    toolName === 'grep'
    && normalizedArgs.includePattern === undefined
    && normalizedArgs['.includePattern'] !== undefined
  ) {
    normalizedArgs.includePattern = normalizedArgs['.includePattern'];
    delete normalizedArgs['.includePattern'];
    corrections.push('.includePattern -> includePattern');
  }

  if (toolName === 'human_intervention_request') {
    if (normalizedArgs.question === undefined && normalizedArgs.prompt !== undefined) {
      normalizedArgs.question = normalizedArgs.prompt;
      delete normalizedArgs.prompt;
      corrections.push('prompt -> question');
    }
    if (normalizedArgs.defaultOption === undefined && normalizedArgs.default_option !== undefined) {
      normalizedArgs.defaultOption = normalizedArgs.default_option;
      delete normalizedArgs.default_option;
      corrections.push('default_option -> defaultOption');
    }
  }

  if (toolName === 'web_fetch') {
    if (normalizedArgs.url === undefined && normalizedArgs.uri !== undefined) {
      normalizedArgs.url = normalizedArgs.uri;
      delete normalizedArgs.uri;
      corrections.push('uri -> url');
    }
    if (normalizedArgs.url === undefined && normalizedArgs.href !== undefined) {
      normalizedArgs.url = normalizedArgs.href;
      delete normalizedArgs.href;
      corrections.push('href -> url');
    }
  }

  if (toolName === 'shell_cmd') {
    if (normalizedArgs.workingDirectory !== undefined) {
      delete normalizedArgs.workingDirectory;
      corrections.push('workingDirectory stripped');
    }
    if (normalizedArgs.working_directory !== undefined) {
      delete normalizedArgs.working_directory;
      corrections.push('working_directory stripped');
    }
  }

  return { normalizedArgs, corrections };
}

export function validateToolParameters(
  args: unknown,
  toolSchema: Record<string, unknown> | undefined,
  toolName: string,
): {
  valid: boolean;
  correctedArgs?: Record<string, unknown>;
  error?: string;
} {
  const schemaProperties = toolSchema?.properties;
  if (!schemaProperties || typeof schemaProperties !== 'object') {
    return {
      valid: true,
      correctedArgs: (args && typeof args === 'object') ? { ...(args as Record<string, unknown>) } : {},
    };
  }

  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    return {
      valid: false,
      error: `Tool arguments must be an object, got: ${Array.isArray(args) ? 'array' : typeof args}`,
    };
  }

  const aliasNormalization = normalizeKnownParameterAliases(
    toolName,
    args as Record<string, unknown>,
  );
  const normalizedArgs = aliasNormalization.normalizedArgs;
  const correctedArgs: Record<string, unknown> = {};
  const requiredParams = Array.isArray(toolSchema.required) ? toolSchema.required : [];
  const allowsAdditionalProperties = toolSchema.additionalProperties !== false;
  const errors: string[] = [];

  for (const requiredParam of requiredParams) {
    const value = normalizedArgs[requiredParam as string];
    if (value === undefined || value === null || value === '') {
      errors.push(`Required parameter '${String(requiredParam)}' is missing or empty`);
    }
  }

  for (const [key, value] of Object.entries(normalizedArgs)) {
    const propSchema = (schemaProperties as Record<string, any>)[key];
    if (!propSchema) {
      if (!allowsAdditionalProperties) {
        errors.push(`Unknown parameter '${key}' is not allowed`);
        continue;
      }
      correctedArgs[key] = value;
      continue;
    }

    if ((value === null || value === undefined) && !requiredParams.includes(key)) {
      continue;
    }

    if (propSchema.type === 'array' && typeof value === 'string' && value !== '') {
      correctedArgs[key] = [value];
      continue;
    }

    if (propSchema.type === 'array' && !Array.isArray(value)) {
      errors.push(`Parameter '${key}' must be an array, got: ${typeof value}`);
      continue;
    }

    if (propSchema.type === 'number' && typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        correctedArgs[key] = parsed;
        continue;
      }
    }

    if (propSchema.type === 'string' && typeof value !== 'string') {
      errors.push(`Parameter '${key}' must be a string, got: ${typeof value}`);
      continue;
    }

    if (propSchema.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`Parameter '${key}' must be a boolean, got: ${typeof value}`);
      continue;
    }

    correctedArgs[key] = value;
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join('; '),
    };
  }

  return {
    valid: true,
    correctedArgs,
  };
}

export function wrapToolWithValidation(tool: LLMToolDefinition): LLMToolDefinition {
  if (!tool.execute) {
    return tool;
  }

  return {
    ...tool,
    execute: async (args, context) => {
      const validation = validateToolParameters(args, tool.parameters, tool.name);
      if (!validation.valid) {
        return `Error: Tool parameter validation failed for ${tool.name}: ${validation.error}`;
      }

      return tool.execute?.(validation.correctedArgs ?? {}, context);
    },
  };
}
