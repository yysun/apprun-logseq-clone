/**
 * LLM Package Built-In Tool Catalog
 *
 * Purpose:
 * - Own the canonical built-in tool catalog for `llm-runtime`.
 *
 * Key features:
 * - Stable built-in tool names, descriptions, and parameter schemas.
 * - Constructor-time enable/disable control with optional per-call narrowing support.
 * - Internal built-in executors, including package-owned HITL pending-request generation.
 *
 * Implementation notes:
 * - The package owns the built-in catalog and enablement policy.
 * - File, shell, web, and skill built-ins execute inside the package.
 * - `human_intervention_request` returns a package-owned pending request artifact.
 *
 * Recent changes:
 * - 2026-03-27: Added package-owned built-in tool catalog and selection helpers.
 */

import { wrapToolWithValidation } from './tool-validation.js';
import { createBuiltInExecutors } from './builtin-executors.js';
import type {
  BuiltInToolName,
  BuiltInToolSelection,
  LLMToolDefinition,
  SkillRegistry,
} from './types.js';

export const BUILT_IN_TOOL_NAMES = [
  'shell_cmd',
  'load_skill',
  'human_intervention_request',
  'web_fetch',
  'read_file',
  'write_file',
  'list_files',
  'grep',
] as const satisfies readonly BuiltInToolName[];

type BuiltInToolToggleMap = Record<BuiltInToolName, boolean>;

const BUILT_IN_TOOL_CATALOG: Record<BuiltInToolName, Omit<LLMToolDefinition, 'name' | 'execute'>> = {
  shell_cmd: {
    description:
      'Execute a user-requested shell command and capture output. Use this only when the user explicitly asks to run a command.',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to execute (for example: "ls", "cat", "grep").',
        },
        parameters: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional command arguments. Pass each argument as a separate token.',
        },
        directory: {
          type: 'string',
          description: 'Optional target directory inside trusted working-directory scope.',
        },
        timeout: {
          type: 'number',
          description: 'Optional timeout in milliseconds.',
        },
        output_format: {
          type: 'string',
          enum: ['markdown', 'json'],
          description: 'Optional output format.',
        },
        output_detail: {
          type: 'string',
          enum: ['minimal', 'full'],
          description: 'Optional output detail level.',
        },
        artifact_paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional file paths to include as artifacts.',
        },
      },
      required: ['command'],
      additionalProperties: false,
    },
  },
  load_skill: {
    description:
      'Load the full instructions for a known skill by `skill_id` and return the skill context payload.',
    parameters: {
      type: 'object',
      properties: {
        skill_id: {
          type: 'string',
          description: 'Required skill id to load.',
        },
      },
      required: ['skill_id'],
      additionalProperties: false,
    },
  },
  human_intervention_request: {
    description:
      'Ask a human a question and offer choices; returns after a single option selection.',
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'Required question shown to the human.',
        },
        options: {
          type: 'array',
          items: { type: 'string' },
          description: 'Required list of selectable options.',
        },
        timeoutMs: {
          type: 'number',
          description: 'Optional timeout in milliseconds.',
        },
        defaultOption: {
          type: 'string',
          description: 'Optional default option label.',
        },
        metadata: {
          type: 'object',
          description: 'Optional metadata attached to the request.',
          additionalProperties: true,
        },
      },
      required: ['question', 'options'],
      additionalProperties: false,
    },
  },
  web_fetch: {
    description:
      'Fetch a URL and convert response content to markdown. Supports lightweight SPA data extraction from embedded JSON state without running a browser renderer.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Target URL to fetch. Only http/https schemes are allowed.',
        },
        timeoutMs: {
          type: 'number',
          description: 'Optional request timeout in milliseconds.',
        },
        maxChars: {
          type: 'number',
          description: 'Optional maximum markdown output characters.',
        },
        includeLinks: {
          type: 'boolean',
          description: 'When false, link URLs are stripped and only anchor text is kept.',
        },
        includeImages: {
          type: 'boolean',
          description: 'When true, image markdown is preserved.',
        },
      },
      required: ['url'],
      additionalProperties: false,
    },
  },
  read_file: {
    description:
      'Read file contents with bounded line pagination. Relative paths resolve from the trusted working directory.',
    parameters: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Target file path.',
        },
        path: {
          type: 'string',
          description: 'Alias for filePath.',
        },
        offset: {
          type: 'number',
          description: '1-based line number to start reading from.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of lines to return.',
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  write_file: {
    description:
      'Write text content to a file inside the trusted working-directory scope.',
    parameters: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Target file path.',
        },
        path: {
          type: 'string',
          description: 'Alias for filePath.',
        },
        content: {
          type: 'string',
          description: 'UTF-8 text content to write.',
        },
        mode: {
          type: 'string',
          enum: ['create', 'overwrite'],
          description: 'Optional write mode.',
        },
      },
      required: ['content'],
      additionalProperties: false,
    },
  },
  list_files: {
    description:
      'List file and directory names for quick workspace exploration.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Optional directory path to list.',
        },
        includeHidden: {
          type: 'boolean',
          description: 'Include dot-prefixed files and folders when true.',
        },
        recursive: {
          type: 'boolean',
          description: 'When true, include nested entries.',
        },
        maxDepth: {
          type: 'number',
          description: 'Maximum directory depth when recursive.',
        },
        includePattern: {
          type: 'string',
          description: 'Optional glob-like filter.',
        },
        maxEntries: {
          type: 'number',
          description: 'Maximum number of returned entries.',
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  grep: {
    description:
      'Search text across files to find destinations. Supports plain text or regex queries.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Text or regex pattern to search for.',
        },
        isRegexp: {
          type: 'boolean',
          description: 'When true, treat query as a regular expression.',
        },
        directoryPath: {
          type: 'string',
          description: 'Optional root directory for recursive search.',
        },
        includePattern: {
          type: 'string',
          description: 'Optional include pattern.',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum matches to return.',
        },
        contextLines: {
          type: 'number',
          description: 'Number of surrounding context lines per match.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
};

function toToggleMap(selection: BuiltInToolSelection | undefined): BuiltInToolToggleMap {
  const resolved = {} as BuiltInToolToggleMap;
  for (const toolName of BUILT_IN_TOOL_NAMES) {
    resolved[toolName] = selection === undefined || selection === true
      ? true
      : selection === false
        ? false
        : selection[toolName] === true;
  }
  return resolved;
}

export function normalizeBuiltInToolSelection(
  selection: BuiltInToolSelection | undefined,
): Record<BuiltInToolName, boolean> {
  return { ...toToggleMap(selection) };
}

export function intersectBuiltInToolSelections(
  baseline: BuiltInToolSelection | undefined,
  narrowing: BuiltInToolSelection | undefined,
): Record<BuiltInToolName, boolean> {
  const baselineMap = toToggleMap(baseline);

  if (narrowing === undefined || narrowing === true) {
    return baselineMap;
  }

  if (narrowing === false) {
    return Object.fromEntries(BUILT_IN_TOOL_NAMES.map((toolName) => [toolName, false])) as Record<BuiltInToolName, boolean>;
  }

  return Object.fromEntries(
    BUILT_IN_TOOL_NAMES.map((toolName) => [toolName, baselineMap[toolName] && narrowing[toolName] === true]),
  ) as Record<BuiltInToolName, boolean>;
}

export function createBuiltInToolDefinitions(options: {
  builtIns?: BuiltInToolSelection;
  skillRegistry: SkillRegistry;
}): Record<string, LLMToolDefinition> {
  const enabled = toToggleMap(options.builtIns);
  const executors = createBuiltInExecutors({
    skillRegistry: options.skillRegistry,
  });

  return Object.fromEntries(
    BUILT_IN_TOOL_NAMES
      .filter((toolName) => enabled[toolName])
      .map((toolName) => {
        const catalogEntry = BUILT_IN_TOOL_CATALOG[toolName];

        const definition = wrapToolWithValidation({
          name: toolName,
          description: catalogEntry.description,
          parameters: catalogEntry.parameters,
          execute: executors[toolName],
        });

        return [toolName, definition];
      }),
  );
}

export function assertNoBuiltInToolNameCollisions(tools: LLMToolDefinition[]): void {
  for (const tool of tools) {
    if (BUILT_IN_TOOL_NAMES.includes(tool.name as BuiltInToolName)) {
      throw new Error(`Tool name "${tool.name}" is reserved by llm-runtime built-ins.`);
    }
  }
}
