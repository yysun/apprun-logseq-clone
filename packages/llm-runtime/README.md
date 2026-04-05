# `llm-runtime`

`llm-runtime` is a runtime layer for application-owned LLM workflows. It wraps provider invocation with one package boundary for tool orchestration, MCP integration, and skill loading.

This package is designed for harnesses that want a stable per-call API without pushing provider-specific details, built-in tool contracts, MCP wiring, and skill discovery into application code.

> It is extracted from the [Agent World](https://github.com/yysun/agent-world) to be a standalone dependency for any application that needs provider calls with tool calls, MCP and agent skill support to build your own full agent orchestration or harness.

## What This Package Owns

- Provider dispatch for `generate(...)` and `stream(...)`
- Generic host-agnostic turn-loop orchestration through `runTurnLoop(...)`
- Built-in tools such as file access, shell execution, and skill loading
- MCP tool discovery and execution
- Skill discovery from configured skill roots
- Stable environment-level registries for MCP servers and skills

## Public API

- `createLLMEnvironment(...)`
- `generate(...)`
- `stream(...)`
- `runTurnLoop(...)`

The package is per-call first. You can call `generate(...)` or `stream(...)` directly, or inject an explicit `environment` when your harness wants stable provider, MCP, and skill dependencies.

## Mental Model

The main rule is simple:

- Stable harness state belongs in `environment`
- Request-specific state stays per call

### Put This In `environment`

- Provider configuration store
- MCP registry or MCP config
- Skill registry or skill roots
- Default `reasoningEffort`
- Default `toolPermission`

### Keep This Per Call

- `provider`
- `model`
- `messages`
- `workingDirectory`
- `reasoningEffort`
- `toolPermission`
- `abortSignal`

If a value should change from one request or UI action to the next, it usually should not live in the environment.

## Tool Model

`llm-runtime` merges several tool sources into one callable surface.

### Built-In Tools

The package currently reserves these built-in names:

- `shell_cmd`
- `load_skill`
- `human_intervention_request`
- `web_fetch`
- `read_file`
- `write_file`
- `list_files`
- `grep`

Built-ins are package-owned. Application code can disable or narrow them, but should not redefine them.

### Extra Tools

Extra tools are application-specific additions such as `lookup_customer` or `create_ticket`. They are additive only and cannot override reserved built-in names.

### MCP Tools

MCP tools come from configured external servers. The runtime discovers them, namespaces them, and merges them into the same resolved tool set as built-ins and extra tools.

### Skills

Skills are reusable instruction assets discovered from skill roots and loaded through `load_skill`. Skills are not executable tools; they add instruction context for the model.

## `generate(...)` vs `stream(...)`

Both APIs share the same runtime model:

- same provider config shape
- same tool orchestration
- same MCP and skill semantics

The difference is output delivery:

- `generate(...)` returns the final result
- `stream(...)` emits chunks and still returns the final result at the end

## `runTurnLoop(...)`

`runTurnLoop(...)` is the package-owned iterative loop for harnesses that want the package to manage repeated model turns without taking ownership of harness state, persistence, or tool policy.

Use it when your harness needs more control than a single `generate(...)` or `stream(...)` call, but still wants one package boundary for:

- repeated model invocation
- empty-text retry handling
- optional plain-text tool-intent normalization

The split of responsibilities is deliberate:

- The package owns loop repetition and response classification.
- The harness owns state shape, message construction, tool execution, persistence, and replay.

You can provide either:

- `modelRequest` when the package should call `generate(...)` or `stream(...)` for you
- `callModel` when the harness wants to control model invocation directly

Minimal shape:

```ts
import { runTurnLoop, type LLMChatMessage } from 'llm-runtime';

type ChatState = {
  messages: LLMChatMessage[];
  finalText: string;
};

const result = await runTurnLoop({
  initialState: {
    messages: [{ role: 'user', content: 'Find the token and use tools if needed.' }],
    finalText: '',
  },
  emptyTextRetryLimit: 0,
  modelRequest: {
    provider: 'openai',
    model: 'gpt-5',
    builtIns: {
      read_file: true,
    },
  },
  buildMessages: async ({ state, transientInstruction }) => {
    if (!transientInstruction) {
      return state.messages;
    }

    return [
      ...state.messages,
      { role: 'system', content: transientInstruction },
    ];
  },
  onToolCallsResponse: async ({ state, response }) => {
    const nextMessages = [...state.messages, response.assistantMessage];

    for (const toolCall of response.tool_calls ?? []) {
      const toolResult = await executeTool(toolCall);
      nextMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      });
    }

    return {
      state: {
        ...state,
        messages: nextMessages,
      },
      next: {
        control: 'continue',
      },
    };
  },
  onTextResponse: async ({ state, responseText, response }) => ({
    state: {
      ...state,
      messages: [...state.messages, response.assistantMessage],
      finalText: responseText,
    },
  }),
});

console.log(result.state.finalText);
```

## Example

```ts
import { createLLMEnvironment, generate } from 'llm-runtime';

const environment = createLLMEnvironment({
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
    },
  },
  skillRoots: ['/app/skills', '/workspace/.codex/skills'],
  defaults: {
    reasoningEffort: 'medium',
    toolPermission: 'auto',
  },
  mcpConfig: {
    servers: {
      docs: {
        command: 'node',
        args: ['docs-server.js'],
        transport: 'stdio',
      },
    },
  },
});

const response = await generate({
  environment,
  provider: 'openai',
  model: 'gpt-5',
  messages: [
    {
      role: 'user',
      content: 'Summarize the workspace and use tools when needed.',
    },
  ],
  workingDirectory: process.cwd(),
  builtIns: {
    read_file: true,
    list_files: true,
    load_skill: true,
  },
});

console.log(response.content);
```

## Harness Guidance

Recommended integration pattern:

1. Create one stable `environment` for the harness.
2. Pass request-specific inputs per call.
3. Inspect `environment.skillRegistry` and `environment.mcpRegistry` when you need to debug discovered skills or MCP servers.
4. Update skill roots when the harness-level skill search path changes.
5. Do not rebuild the environment just because request-local values like `messages` or `workingDirectory` changed.

Example registry inspection pattern:

```ts
import { createLLMEnvironment } from 'llm-runtime';

const environment = createLLMEnvironment();

const skills = await environment.skillRegistry.listSkills();
const servers = environment.mcpRegistry.listServers();

console.table(skills.map((skill) => ({
  skillId: skill.skillId,
  title: skill.title,
})));

console.table(servers.map((server) => ({
  name: server.name,
  transport: server.config.transport,
})));
```

## Local Development

- `npm run build` compiles the package into `dist/`
- `npm run check` runs TypeScript without emitting files
- `npm test` runs the Vitest suite in `tests/llm`
- `npm run test:watch` runs the Vitest suite in watch mode
- `npm run test:e2e` runs the showcase script in `tests/e2e/llm-package-showcase.ts`
- `npm run test:e2e:dry-run` validates the showcase wiring without live provider calls
- `npm run test:e2e:turn-loop` runs the `runTurnLoop(...)` showcase script in `tests/e2e/llm-turn-loop-showcase.ts`
- `npm run test:e2e:turn-loop:dry-run` validates the turn-loop showcase wiring without live provider calls

The real showcase runner expects a repo-local `.env` file when using `npm run test:e2e`.
