/**
 * LLM Showcase Shared Fixtures
 *
 * Purpose:
 * - Provide reusable workspace setup, scenarios, and assertions for the package showcase runners.
 *
 * Key features:
 * - Creates a temporary deterministic workspace with files and skills for live showcase runs.
 * - Defines shared showcase scenarios for built-ins, MCP, and streaming flows.
 * - Provides stable result assertions and chunk summarization for terminal output.
 *
 * Implementation notes:
 * - The fixtures are test-only and intentionally keep all filesystem writes inside a temp directory.
 * - Both the per-call showcase and the turn-loop showcase reuse the same scenarios.
 *
 * Recent changes:
 * - 2026-03-29: Extracted shared showcase fixtures for the new `runTurnLoop(...)` e2e runner.
 */

import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { LLMChatMessage, LLMStreamChunk } from '../../../src/index.js';

export type ShowcaseWorkspace = {
  rootPath: string;
  skillRoots: string[];
};

export type ShowcaseScenario = {
  name: string;
  mode: 'generate' | 'stream';
  builtIns?: boolean | Record<string, boolean>;
  messages: LLMChatMessage[];
  expectedTools: string[];
  expectedTokens: string[];
};

export type ShowcaseScenarioResult = {
  finalText: string;
  toolNames: string[];
  chunks: LLMStreamChunk[];
  turns: number;
};

export async function createShowcaseWorkspace(): Promise<ShowcaseWorkspace> {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'agent-world-llm-showcase-'));
  const workspaceRoot = path.join(tempRoot, 'workspace');
  const docsRoot = path.join(workspaceRoot, 'docs');
  const skillsRoot = path.join(tempRoot, 'skills');
  const skillFolder = path.join(skillsRoot, 'showcase-skill');

  await mkdir(docsRoot, { recursive: true });
  await mkdir(skillFolder, { recursive: true });

  await writeFile(
    path.join(docsRoot, 'repo-guide.txt'),
    [
      'Repository guide for the llm showcase.',
      'Use token alpha-repo-token when asked for the repo token.',
      'The guide exists only for the showcase runner.',
    ].join('\n'),
    'utf8',
  );

  await writeFile(
    path.join(docsRoot, 'stream-brief.txt'),
    [
      'Streaming brief for the llm showcase.',
      'Use token stream-marker-21 when asked for the stream file token.',
      'Pair it with the gamma MCP token for the final streamed answer.',
    ].join('\n'),
    'utf8',
  );

  await writeFile(
    path.join(skillFolder, 'SKILL.md'),
    [
      '---',
      'name: showcase_skill',
      'description: Showcase skill for the llm package runner',
      '---',
      '# Showcase Skill',
      '',
      'Use token skill-beacon-77 when the user asks for the skill token.',
      'This content is loaded through the package-owned `load_skill` tool.',
    ].join('\n'),
    'utf8',
  );

  return {
    rootPath: workspaceRoot,
    skillRoots: [skillsRoot],
  };
}

export function buildShowcaseScenarios(): ShowcaseScenario[] {
  return [
    {
      name: 'Built-ins: read_file + load_skill',
      mode: 'generate',
      builtIns: {
        read_file: true,
        load_skill: true,
      },
      expectedTools: ['read_file', 'load_skill'],
      expectedTokens: ['alpha-repo-token', 'skill-beacon-77'],
      messages: [
        {
          role: 'system',
          content: [
            'You are running inside a strict tool-use showcase.',
            'When the user asks for a value that lives in a tool response, you must call the relevant tool and must not guess.',
            'After you gather the values, return only the requested lines with no extra commentary.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            'Use read_file on docs/repo-guide.txt and load_skill with skill_id showcase_skill.',
            'Do not answer until both tool calls succeed.',
            'Then return exactly these two lines:',
            'REPO_TOKEN=<repo token>',
            'SKILL_TOKEN=<skill token>',
          ].join('\n'),
        },
      ],
    },
    {
      name: 'MCP: namespaced lookup tool',
      mode: 'generate',
      builtIns: false,
      expectedTools: ['showcase_lookup_release'],
      expectedTokens: ['beta-signal-842'],
      messages: [
        {
          role: 'system',
          content: [
            'You are running inside a strict MCP showcase.',
            'If the user asks for a release token, call the MCP tool before answering.',
            'Do not invent a token.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            'Use showcase_lookup_release with subject beta.',
            'Return exactly one line:',
            'MCP_TOKEN=<beta token>',
          ].join('\n'),
        },
      ],
    },
    {
      name: 'Streaming: built-ins + MCP together',
      mode: 'stream',
      builtIns: {
        read_file: true,
      },
      expectedTools: ['read_file', 'showcase_lookup_release'],
      expectedTokens: ['stream-marker-21', 'gamma-signal-173'],
      messages: [
        {
          role: 'system',
          content: [
            'You are running inside a strict streaming tool-use showcase.',
            'You must call tools when the user asks for file-backed or MCP-backed values.',
            'Return only the requested lines at the end.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            'Use read_file on docs/stream-brief.txt and use showcase_lookup_release with subject gamma.',
            'Do not answer until both tool calls succeed.',
            'Then return exactly these two lines:',
            'STREAM_FILE_TOKEN=<file token>',
            'STREAM_MCP_TOKEN=<mcp token>',
          ].join('\n'),
        },
      ],
    },
  ];
}

export function toToolMessageContent(result: unknown): string {
  if (typeof result === 'string') {
    return result;
  }
  return JSON.stringify(result, null, 2);
}

export function assertScenarioResult(scenario: ShowcaseScenario, result: ShowcaseScenarioResult) {
  for (const expectedTool of scenario.expectedTools) {
    assert(
      result.toolNames.includes(expectedTool),
      `Expected tool "${expectedTool}" to be used in scenario "${scenario.name}". Used tools: ${result.toolNames.join(', ') || '(none)'}`,
    );
  }

  for (const expectedToken of scenario.expectedTokens) {
    assert(
      result.finalText.includes(expectedToken),
      `Expected token "${expectedToken}" in scenario "${scenario.name}" final text.\nFinal text:\n${result.finalText}`,
    );
  }

  if (scenario.mode === 'stream') {
    assert(
      result.chunks.length > 0,
      `Expected streaming chunks for scenario "${scenario.name}".`,
    );
  }
}

export function summarizeChunks(chunks: LLMStreamChunk[]): string {
  const content = chunks
    .map((chunk) => chunk.content ?? chunk.reasoningContent ?? '')
    .join('')
    .trim();
  return content.length > 160 ? `${content.slice(0, 160)}...` : content;
}
