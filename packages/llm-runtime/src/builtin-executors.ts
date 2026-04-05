/**
 * LLM Package Built-In Executors
 *
 * Purpose:
 * - Provide package-owned implementations for reusable built-in tools.
 *
 * Key features:
 * - Internal executors for shell, file, web-fetch, and load-skill tools.
 * - Package-owned HITL pending request artifacts with no host adapter dependency.
 * - Trusted working-directory enforcement for file and shell operations.
 *
 * Implementation notes:
 * - The package owns tool behavior; callers only configure enablement and optional extra tools.
 * - Working directory defaults to the explicit execution context and falls back to `process.cwd()`.
 * - Output contracts stay deterministic and string-based for compatibility with current callers.
 *
 * Recent changes:
 * - 2026-03-27: Added package-owned executors for built-in tools.
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import type {
  BuiltInToolName,
  LLMToolExecutionContext,
  PendingHitlToolResult,
  SkillRegistry,
} from './types.js';

type BuiltInExecutor = (
  args: Record<string, unknown>,
  context?: LLMToolExecutionContext,
) => Promise<unknown> | unknown;

type BuiltInExecutorOptions = {
  skillRegistry: SkillRegistry;
};

const DEFAULT_READ_LIMIT = 200;
const DEFAULT_LIST_MAX_ENTRIES = 200;
const DEFAULT_LIST_MAX_DEPTH = 2;
const DEFAULT_GREP_MAX_RESULTS = 50;
const DEFAULT_GREP_CONTEXT_LINES = 2;
const DEFAULT_SHELL_TIMEOUT_MS = 600_000;
const DEFAULT_WEB_FETCH_TIMEOUT_MS = 15_000;
const DEFAULT_WEB_FETCH_MAX_CHARS = 16_000;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getEnvValueFromText(text: unknown, key: string): string | undefined {
  if (typeof text !== 'string' || !text.trim()) {
    return undefined;
  }

  const prefix = `${key}=`;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith(prefix)) {
      return line.slice(prefix.length).trim();
    }
  }

  return undefined;
}

function getTrustedWorkingDirectory(context?: LLMToolExecutionContext): string {
  const explicit = typeof context?.workingDirectory === 'string' ? context.workingDirectory.trim() : '';
  if (explicit) {
    return path.resolve(explicit);
  }

  const worldVariables = typeof (context?.world as { variables?: unknown } | undefined)?.variables === 'string'
    ? (context?.world as { variables?: string }).variables
    : undefined;
  const worldDirectory = getEnvValueFromText(worldVariables, 'working_directory');
  if (worldDirectory) {
    return path.resolve(worldDirectory);
  }

  return process.cwd();
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

function isPathWithinRoot(candidatePath: string, rootPath: string): boolean {
  const normalizedCandidate = normalizePath(path.resolve(candidatePath)).replace(/\/+$/, '');
  const normalizedRoot = normalizePath(path.resolve(rootPath)).replace(/\/+$/, '');
  return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}/`);
}

function resolveScopedPath(inputPath: string, trustedWorkingDirectory: string): string {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Missing required path parameter');
  }

  const resolvedPath = path.resolve(trustedWorkingDirectory, inputPath);
  if (!isPathWithinRoot(resolvedPath, trustedWorkingDirectory)) {
    throw new Error('Working directory mismatch: requested path is outside trusted working directory');
  }

  return resolvedPath;
}

function stripYamlFrontMatter(markdown: string): string {
  const frontMatterPattern = /^\uFEFF?---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/;
  return markdown.replace(frontMatterPattern, '');
}

function toUtf8String(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }
  return value == null ? '' : String(value);
}

async function createReadFileExecutor(options: BuiltInExecutorOptions, args: Record<string, unknown>, context?: LLMToolExecutionContext): Promise<string> {
  try {
    const trustedWorkingDirectory = getTrustedWorkingDirectory(context);
    const requestedFilePath = String(args.filePath ?? args.path ?? '').trim();
    if (!requestedFilePath) {
      return 'Error: read_file failed - filePath is required';
    }

    let resolvedPath = resolveScopedPath(requestedFilePath, trustedWorkingDirectory);
    let rawContent = '';

    try {
      rawContent = await fs.readFile(resolvedPath, 'utf8');
    } catch (error) {
      const skills = await options.skillRegistry.listSkills();
      let fallbackLoaded = false;
      for (const skill of skills) {
        const skillRoot = path.dirname(skill.sourcePath);
        const candidatePath = path.resolve(skillRoot, requestedFilePath);
        if (!isPathWithinRoot(candidatePath, skillRoot)) {
          continue;
        }
        try {
          rawContent = await fs.readFile(candidatePath, 'utf8');
          resolvedPath = candidatePath;
          fallbackLoaded = true;
          break;
        } catch {
          // continue
        }
      }
      if (!fallbackLoaded) {
        throw error;
      }
    }

    const lines = toUtf8String(rawContent).split(/\r?\n/);
    const offset = clamp(Number(args.offset ?? 1), 1, Number.MAX_SAFE_INTEGER);
    const limit = clamp(Number(args.limit ?? DEFAULT_READ_LIMIT), 1, DEFAULT_READ_LIMIT);

    return JSON.stringify({
      filePath: resolvedPath,
      offset,
      limit,
      totalLines: lines.length,
      content: lines.slice(offset - 1, offset - 1 + limit).join('\n'),
    }, null, 2);
  } catch (error) {
    return `Error: read_file failed - ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function createWriteFileExecutor(_options: BuiltInExecutorOptions, args: Record<string, unknown>, context?: LLMToolExecutionContext): Promise<string> {
  try {
    if (context?.toolPermission === 'read') {
      return 'Error: write_file is blocked by the current permission level (read).';
    }

    const trustedWorkingDirectory = getTrustedWorkingDirectory(context);
    const requestedFilePath = String(args.filePath ?? args.path ?? '').trim();
    if (!requestedFilePath) {
      return 'Error: write_file failed - filePath is required';
    }
    if (typeof args.content !== 'string') {
      return 'Error: write_file failed - content must be a string';
    }

    const mode = String(args.mode ?? 'overwrite').trim().toLowerCase();
    const resolvedPath = resolveScopedPath(requestedFilePath, trustedWorkingDirectory);
    const parentDirectory = path.dirname(resolvedPath);
    if (!isPathWithinRoot(parentDirectory, trustedWorkingDirectory)) {
      return 'Error: write_file failed - Working directory mismatch';
    }

    await fs.mkdir(parentDirectory, { recursive: true });
    await fs.writeFile(
      resolvedPath,
      args.content,
      mode === 'create'
        ? { encoding: 'utf8', flag: 'wx' }
        : { encoding: 'utf8', flag: 'w' },
    );

    return JSON.stringify({
      ok: true,
      status: 'success',
      filePath: resolvedPath,
      mode: mode === 'create' ? 'create' : 'overwrite',
      bytesWritten: Buffer.byteLength(args.content, 'utf8'),
    }, null, 2);
  } catch (error) {
    return `Error: write_file failed - ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function createListFilesExecutor(_options: BuiltInExecutorOptions, args: Record<string, unknown>, context?: LLMToolExecutionContext): Promise<string> {
  try {
    const trustedWorkingDirectory = getTrustedWorkingDirectory(context);
    const requestedPath = String(args.path ?? '.');
    const resolvedPath = resolveScopedPath(requestedPath, trustedWorkingDirectory);
    const recursive = Boolean(args.recursive ?? false);
    const includeHidden = Boolean(args.includeHidden ?? true);
    const maxDepth = clamp(Number(args.maxDepth ?? (recursive ? DEFAULT_LIST_MAX_DEPTH : 1)), 1, DEFAULT_LIST_MAX_DEPTH);
    const maxEntries = clamp(Number(args.maxEntries ?? DEFAULT_LIST_MAX_ENTRIES), 1, DEFAULT_LIST_MAX_ENTRIES);
    const includePattern = String(args.includePattern ?? '').trim();

    const entries = await fg(['**/*'], {
      cwd: resolvedPath,
      deep: maxDepth,
      onlyFiles: false,
      dot: includeHidden,
      markDirectories: true,
      ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    });

    const filteredEntries = entries
      .map((entry: string) => normalizePath(entry))
      .filter((entry: string) => !includePattern || entry.includes(includePattern.replace(/\*\*/g, '').replace(/\*/g, '')))
      .sort((left: string, right: string) => left.localeCompare(right));

    const truncated = filteredEntries.length > maxEntries;
    const returnedEntries = truncated ? filteredEntries.slice(0, maxEntries) : filteredEntries;

    return JSON.stringify({
      requestedPath,
      path: resolvedPath,
      recursive,
      includePattern: includePattern || undefined,
      maxEntries,
      total: filteredEntries.length,
      returned: returnedEntries.length,
      truncated,
      entries: returnedEntries,
      found: filteredEntries.length > 0,
      message: filteredEntries.length === 0
        ? 'No files or directories found in the requested path.'
        : truncated
          ? `Result truncated to ${maxEntries} entries out of ${filteredEntries.length}.`
          : undefined,
    }, null, 2);
  } catch (error) {
    return `Error: list_files failed - ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function collectFilesRecursively(rootPath: string): Promise<string[]> {
  return fg(['**/*'], {
    cwd: rootPath,
    onlyFiles: true,
    dot: true,
    ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
  }).then((entries: string[]) => entries.map((entry: string) => path.join(rootPath, entry)));
}

async function createGrepExecutor(_options: BuiltInExecutorOptions, args: Record<string, unknown>, context?: LLMToolExecutionContext): Promise<string> {
  try {
    const query = String(args.query ?? '').trim();
    if (!query) {
      return 'Error: grep failed - query must be a non-empty string';
    }

    const trustedWorkingDirectory = getTrustedWorkingDirectory(context);
    const directoryPath = args.directoryPath
      ? resolveScopedPath(String(args.directoryPath), trustedWorkingDirectory)
      : trustedWorkingDirectory;
    const isRegexp = Boolean(args.isRegexp ?? false);
    const maxResults = clamp(Number(args.maxResults ?? DEFAULT_GREP_MAX_RESULTS), 1, DEFAULT_GREP_MAX_RESULTS);
    const contextLines = clamp(Number(args.contextLines ?? DEFAULT_GREP_CONTEXT_LINES), 0, 5);
    const matcher = isRegexp ? new RegExp(query, 'i') : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const matches: Array<Record<string, unknown>> = [];
    for (const filePath of await collectFilesRecursively(directoryPath)) {
      const content = await fs.readFile(filePath, 'utf8').catch(() => null);
      if (content == null) continue;
      const lines = content.split(/\r?\n/);
      for (let index = 0; index < lines.length; index += 1) {
        if (!matcher.test(lines[index] ?? '')) continue;
        matches.push({
          filePath,
          lineNumber: index + 1,
          line: lines[index],
          context: lines.slice(Math.max(0, index - contextLines), index + contextLines + 1),
        });
        if (matches.length >= maxResults) {
          return JSON.stringify({ query, matches, truncated: true }, null, 2);
        }
      }
    }

    return JSON.stringify({ query, matches, truncated: false }, null, 2);
  } catch (error) {
    return `Error: grep failed - ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function createWebFetchExecutor(_options: BuiltInExecutorOptions, args: Record<string, unknown>): Promise<string> {
  try {
    const rawUrl = String(args.url ?? '').trim();
    if (!rawUrl) {
      return 'Error: web_fetch failed - invalid_url: url is required';
    }

    const timeoutMs = clamp(Number(args.timeoutMs ?? DEFAULT_WEB_FETCH_TIMEOUT_MS), 1000, 120_000);
    const maxChars = clamp(Number(args.maxChars ?? DEFAULT_WEB_FETCH_MAX_CHARS), 100, 200_000);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(rawUrl, { signal: controller.signal });
      const contentType = response.headers.get('content-type') || '';
      const bodyText = await response.text();
      const normalizedBody = contentType.includes('application/json')
        ? JSON.stringify(JSON.parse(bodyText), null, 2)
        : bodyText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const markdown = normalizedBody.slice(0, maxChars);

      return JSON.stringify({
        url: rawUrl,
        resolvedUrl: response.url || rawUrl,
        status: response.status,
        ok: response.ok,
        contentType: contentType || null,
        mode: contentType.includes('json') ? 'json' : contentType.includes('html') ? 'html' : 'text',
        markdown,
        truncated: normalizedBody.length > markdown.length,
      }, null, 2);
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error: web_fetch failed - ${message}`;
  }
}

async function createLoadSkillExecutor(options: BuiltInExecutorOptions, args: Record<string, unknown>): Promise<string> {
  const skillId = String(args.skill_id ?? '').trim();
  if (!skillId) {
    return [
      '<skill_context id="">',
      '  <error>',
      '    Missing required parameter: skill_id',
      '  </error>',
      '</skill_context>',
    ].join('\n');
  }

  const skill = await options.skillRegistry.loadSkill(skillId);
  if (!skill) {
    return [
      `<skill_context id="${skillId}">`,
      '  <error>',
      `    Skill with id "${skillId}" was not found in the current registry.`,
      '  </error>',
      '</skill_context>',
    ].join('\n');
  }

  return [
    `<skill_context id="${skill.skillId}">`,
    `  <description>${skill.description}</description>`,
    `  <skill_root>${path.dirname(skill.sourcePath)}</skill_root>`,
    '  <instructions>',
    stripYamlFrontMatter(skill.content).trim(),
    '  </instructions>',
    '</skill_context>',
  ].join('\n');
}

async function createHitlExecutor(options: BuiltInExecutorOptions, args: Record<string, unknown>, context?: LLMToolExecutionContext): Promise<string> {
  const question = String(args.question ?? '').trim();
  const optionsList = Array.isArray(args.options)
    ? args.options.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
  if (!question || optionsList.length === 0) {
    return 'Error: human_intervention_request failed - question and options are required.';
  }

  const pendingResult: PendingHitlToolResult = {
    ok: false,
    pending: true,
    status: 'pending',
    confirmed: false,
    requestId: typeof context?.toolCallId === 'string' ? context.toolCallId : '',
    selectedOption: null,
    question,
    options: optionsList,
    ...(typeof args.defaultOption === 'string' && args.defaultOption.trim()
      ? { defaultOption: args.defaultOption.trim() }
      : {}),
    ...(typeof args.timeoutMs === 'number' ? { timeoutMs: args.timeoutMs } : {}),
    ...(typeof args.metadata === 'object' && args.metadata && !Array.isArray(args.metadata)
      ? { metadata: args.metadata as Record<string, unknown> }
      : {}),
  };

  return JSON.stringify(pendingResult, null, 2);
}

async function createShellExecutor(_options: BuiltInExecutorOptions, args: Record<string, unknown>, context?: LLMToolExecutionContext): Promise<string> {
  const command = String(args.command ?? '').trim();
  if (!command) {
    return 'Error: shell_cmd failed - command is required';
  }

  const trustedWorkingDirectory = getTrustedWorkingDirectory(context);
  const requestedDirectory = typeof args.directory === 'string' && args.directory.trim()
    ? resolveScopedPath(args.directory, trustedWorkingDirectory)
    : trustedWorkingDirectory;
  const parameters = Array.isArray(args.parameters)
    ? args.parameters.filter((entry): entry is string => typeof entry === 'string')
    : [];
  const timeoutMs = clamp(Number(args.timeout ?? DEFAULT_SHELL_TIMEOUT_MS), 1000, DEFAULT_SHELL_TIMEOUT_MS);
  const outputFormat = String(args.output_format ?? 'markdown') === 'json' ? 'json' : 'markdown';
  const outputDetail = String(args.output_detail ?? 'minimal') === 'full' ? 'full' : 'minimal';

  return await new Promise<string>((resolvePromise) => {
    const startedAt = Date.now();
    const child = spawn(command, parameters, {
      cwd: requestedDirectory,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on('error', (error: Error) => {
      clearTimeout(timer);
      resolvePromise(`Error: shell_cmd failed - ${error.message}`);
    });
    child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startedAt;
      if (outputFormat === 'json') {
        resolvePromise(JSON.stringify({
          exit_code: code,
          stdout,
          stderr,
          timed_out: timedOut,
          duration_ms: durationMs,
          signal,
        }, null, 2));
        return;
      }

      const preview = outputDetail === 'full' ? stdout : stdout.slice(0, 4096);
      resolvePromise([
        `status: ${code === 0 && !timedOut ? 'success' : 'failed'}`,
        `exit_code: ${code}`,
        `timed_out: ${timedOut}`,
        preview ? `stdout:\n${preview}` : 'stdout:\n',
        stderr ? `stderr:\n${outputDetail === 'full' ? stderr : stderr.slice(0, 4096)}` : 'stderr:\n',
      ].join('\n'));
    });
  });
}

export function createBuiltInExecutors(options: BuiltInExecutorOptions): Record<BuiltInToolName, BuiltInExecutor> {
  return {
    shell_cmd: (args, context) => createShellExecutor(options, args, context),
    load_skill: (args) => createLoadSkillExecutor(options, args),
    human_intervention_request: (args, context) => createHitlExecutor(options, args, context),
    web_fetch: (args) => createWebFetchExecutor(options, args),
    read_file: (args, context) => createReadFileExecutor(options, args, context),
    write_file: (args, context) => createWriteFileExecutor(options, args, context),
    list_files: (args, context) => createListFilesExecutor(options, args, context),
    grep: (args, context) => createGrepExecutor(options, args, context),
  };
}
