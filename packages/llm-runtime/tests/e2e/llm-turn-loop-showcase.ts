/**
 * LLM Package Turn Loop Real Showcase Runner
 *
 * Purpose:
 * - Run a real end-to-end terminal showcase for the generic `runTurnLoop(...)` API in `llm-runtime`.
 *
 * Key features:
 * - Uses a real LLM provider selected from env vars loaded from the repo `.env`.
 * - Exercises `runTurnLoop(...)` across built-ins, MCP tool use, and streaming callbacks.
 * - Prints a terminal-friendly walkthrough with assertions for each scenario.
 *
 * Implementation notes:
 * - The runner uses the package turn loop directly instead of managing its own local loop.
 * - A temporary workspace provides deterministic files and skills without touching the repo.
 * - `--dry-run` validates setup without making real provider calls.
 *
 * Recent changes:
 * - 2026-03-29: Added the real terminal showcase runner for `runTurnLoop(...)`.
 */

import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { config as loadDotEnv } from 'dotenv';
import {
  createLLMEnvironment,
  generate,
  runTurnLoop,
  stream,
  type LLMChatMessage,
  type LLMEnvironment,
  type LLMResponse,
  type LLMStreamChunk,
} from '../../src/index.js';
import { resolveToolsAsync } from '../../src/runtime.js';
import {
  getShowcaseEnvHelp,
  resolveShowcaseProviderSelection,
  type ShowcaseProviderSelection,
} from './support/llm-package-showcase-support.js';
import {
  assertScenarioResult,
  buildShowcaseScenarios,
  createShowcaseWorkspace,
  summarizeChunks,
  toToolMessageContent,
  type ShowcaseScenario,
  type ShowcaseScenarioResult,
} from './support/llm-showcase-fixtures.js';

const MAX_TOOL_TURNS = 6;

loadDotEnv({
  path: path.resolve(process.cwd(), '.env'),
  override: false,
  quiet: true,
});

type TurnLoopShowcaseState = {
  messages: LLMChatMessage[];
  toolNames: string[];
  chunks: LLMStreamChunk[];
  finalText: string;
};

function parseFlags(argv: string[]) {
  const flags = new Set(argv.slice(2));
  return {
    help: flags.has('--help') || flags.has('-h'),
    dryRun: flags.has('--dry-run'),
  };
}

function printHelp() {
  console.log([
    'Usage: npm run test:llm-turn-loop-showcase -- [--dry-run]',
    '',
    'Options:',
    '  --dry-run    Validate setup, tools, skills, and MCP wiring without calling a live LLM.',
    '  -h, --help   Show this help text.',
    '',
    getShowcaseEnvHelp(),
  ].join('\n'));
}

async function runShowcaseScenario(
  scenario: ShowcaseScenario,
  workingDirectory: string,
  providerSelection: ShowcaseProviderSelection,
  environment: LLMEnvironment,
): Promise<ShowcaseScenarioResult> {
  const initialState: TurnLoopShowcaseState = {
    messages: [...scenario.messages],
    toolNames: [],
    chunks: [],
    finalText: '',
  };

  const result = await runTurnLoop({
    initialState,
    emptyTextRetryLimit: 0,
    buildMessages: async ({ state }) => state.messages,
    callModel: async ({ messages, state }) => {
      if (scenario.mode === 'stream') {
        return await stream({
          provider: providerSelection.provider,
          model: providerSelection.model,
          builtIns: scenario.builtIns,
          messages,
          temperature: 0,
          environment,
          context: {
            workingDirectory,
          },
          onChunk: (chunk) => {
            state.chunks.push(chunk);
          },
        });
      }

      return await generate({
        provider: providerSelection.provider,
        model: providerSelection.model,
        builtIns: scenario.builtIns,
        messages,
        temperature: 0,
        environment,
        context: {
          workingDirectory,
        },
      });
    },
    onTextResponse: async ({ state, responseText, response }) => ({
      state: {
        ...state,
        messages: [...state.messages, response.assistantMessage],
        finalText: responseText,
      },
    }),
    onToolCallsResponse: async ({ state, response, iteration }) => {
      assert(iteration <= MAX_TOOL_TURNS, `Scenario exceeded ${MAX_TOOL_TURNS} tool rounds without reaching a final answer.`);

      const tools = await resolveToolsAsync({
        environment,
        builtIns: scenario.builtIns,
      });

      const nextMessages = [...state.messages, response.assistantMessage];
      const nextToolNames = [...state.toolNames];

      for (const toolCall of response.tool_calls ?? []) {
        const tool = tools[toolCall.function.name];
        assert(tool?.execute, `Missing executable tool: ${toolCall.function.name}`);

        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = JSON.parse(toolCall.function.arguments || '{}') as Record<string, unknown>;
        } catch (error) {
          throw new Error(`Invalid tool arguments for ${toolCall.function.name}: ${error instanceof Error ? error.message : String(error)}`);
        }

        nextToolNames.push(toolCall.function.name);
        console.log(`  tool -> ${toolCall.function.name}(${toolCall.function.arguments || '{}'})`);

        const toolResult = await tool.execute(parsedArgs, {
          workingDirectory,
          toolCallId: toolCall.id,
          toolPermission: 'auto',
        });

        nextMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toToolMessageContent(toolResult),
        });
      }

      return {
        state: {
          ...state,
          messages: nextMessages,
          toolNames: nextToolNames,
        },
        next: {
          control: 'continue',
        },
      };
    },
  });

  return {
    finalText: result.state.finalText,
    toolNames: result.state.toolNames,
    chunks: result.state.chunks,
    turns: result.iterations,
  };
}

async function runShowcaseWithSelection(providerSelection: ShowcaseProviderSelection, dryRun: boolean) {
  const workspace = await createShowcaseWorkspace();
  const environment = createLLMEnvironment({
    providers: providerSelection.providers,
    mcpConfig: {
      servers: {
        showcase: {
          command: process.execPath,
          args: [path.resolve('tests/e2e/support/llm-showcase-mcp-server.mjs')],
          transport: 'stdio',
          env: { ...process.env },
        },
      },
    },
    skillRoots: workspace.skillRoots,
  });
  const showcaseBuiltIns = {
    read_file: true,
    load_skill: true,
    human_intervention_request: false,
    shell_cmd: false,
    web_fetch: false,
    write_file: false,
    list_files: false,
    grep: false,
  };

  try {
    console.log('LLM package turn-loop real showcase');
    console.log(`provider=${providerSelection.provider}`);
    console.log(`model=${providerSelection.model}`);

    const resolvedTools = await resolveToolsAsync({
      environment,
      builtIns: showcaseBuiltIns,
    });
    console.log(`tools=${Object.keys(resolvedTools).join(', ')}`);

    if (dryRun) {
      console.log('dry-run=ok');
      return;
    }

    for (const scenario of buildShowcaseScenarios()) {
      console.log(`\n[scenario] ${scenario.name}`);
      const result = await runShowcaseScenario(
        scenario,
        workspace.rootPath,
        providerSelection,
        environment,
      );
      assertScenarioResult(scenario, result);
      console.log(`  tools used: ${result.toolNames.join(', ')}`);
      if (scenario.mode === 'stream') {
        console.log(`  stream summary: ${summarizeChunks(result.chunks) || '(no visible text chunks)'}`);
      }
      console.log(`  final answer:\n${result.finalText}`);
      console.log(`  status: PASS in ${result.turns} turn(s)`);
    }

    console.log('\nturn-loop showcase status: PASS');
  } finally {
    await environment.mcpRegistry.shutdown().catch(() => undefined);
    await rm(path.dirname(workspace.rootPath), { recursive: true, force: true }).catch(() => undefined);
  }
}

async function main() {
  const flags = parseFlags(process.argv);
  if (flags.help) {
    printHelp();
    return;
  }

  const selection = resolveShowcaseProviderSelection(process.env);
  if (!selection && !flags.dryRun) {
    console.error('No real LLM provider configuration was found for the turn-loop showcase runner.\n');
    console.error(getShowcaseEnvHelp());
    process.exitCode = 1;
    return;
  }

  if (flags.dryRun) {
    const dryRunSelection = selection ?? {
      provider: 'google',
      model: 'dry-run-model',
      providers: {},
    };
    await runShowcaseWithSelection(dryRunSelection, true);
    return;
  }

  await runShowcaseWithSelection(selection, false);
}

main().catch((error) => {
  console.error('turn-loop showcase status: FAIL');
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
