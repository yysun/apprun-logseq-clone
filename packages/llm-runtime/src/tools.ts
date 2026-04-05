/**
 * LLM Package Tool Registry
 *
 * Purpose:
 * - Provide package-owned tool contracts and in-memory registry assembly.
 *
 * Key features:
 * - Register tools by canonical name.
 * - Deterministic listing and merged resolution.
 * - Public contract suitable for package consumers and future built-in tool migration.
 *
 * Implementation notes:
 * - Uses last-write-wins semantics for name collisions.
 * - Keeps registration independent from host runtime identifiers.
 * - Supports extra-tool merging at resolution time for per-call overrides.
 *
 * Recent changes:
 * - 2026-03-27: Initial tool registry extraction for `packages/llm`.
 */

import type { LLMToolDefinition, LLMToolRegistry } from './types.js';

export function createToolRegistry(initialTools: LLMToolDefinition[] = []): LLMToolRegistry {
  const tools = new Map<string, LLMToolDefinition>();

  const registerTool = (tool: LLMToolDefinition): void => {
    const normalizedName = String(tool.name || '').trim();
    if (!normalizedName) {
      throw new Error('Tool name is required');
    }
    tools.set(normalizedName, { ...tool, name: normalizedName });
  };

  const registerTools = (nextTools: LLMToolDefinition[]): void => {
    for (const tool of nextTools) {
      registerTool(tool);
    }
  };

  registerTools(initialTools);

  return {
    registerTool,
    registerTools,
    getTool: (name) => tools.get(String(name || '').trim()),
    listTools: () => [...tools.values()].sort((left, right) => left.name.localeCompare(right.name)),
    resolveTools: (extraTools = []) => {
      const resolved = new Map<string, LLMToolDefinition>(tools.entries());
      for (const tool of extraTools) {
        const normalizedName = String(tool.name || '').trim();
        if (!normalizedName) {
          continue;
        }
        resolved.set(normalizedName, { ...tool, name: normalizedName });
      }
      return Object.fromEntries(
        [...resolved.entries()].sort(([left], [right]) => left.localeCompare(right)),
      );
    },
  };
}
