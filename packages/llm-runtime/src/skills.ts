/**
 * LLM Package Skill Registry
 *
 * Purpose:
 * - Provide package-owned skill discovery and loading for ordered skill roots.
 *
 * Key features:
 * - Ordered root precedence where later roots override earlier collisions.
 * - On-demand scan/list/get/load APIs with deterministic ordering.
 * - File-system adapter injection for deterministic unit tests.
 *
 * Implementation notes:
 * - Uses `SKILL.md` front matter `name` and `description` as the public contract.
 * - Keeps the public API to one ordered root list rather than exposing source scopes.
 * - Reads from the filesystem on demand instead of maintaining background watchers.
 *
 * Recent changes:
 * - 2026-03-27: Initial skill registry extraction for `packages/llm`.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import type {
  LoadedSkill,
  SkillEntry,
  SkillFileSystemAdapter,
  SkillRegistry,
  SkillRegistryOptions,
  SkillRegistrySyncResult,
} from './types.js';

type DirectoryEntry = Awaited<ReturnType<SkillFileSystemAdapter['readdir']>>[number];

function normalizeRoots(roots: string[] | undefined): string[] {
  return [...new Set((roots ?? []).map((root) => path.resolve(String(root || '').trim())).filter(Boolean))];
}

function parseSkillFrontMatter(content: string): { name: string; description: string } {
  const normalizedContent = content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const frontMatterMatch = normalizedContent.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  if (!frontMatterMatch || !frontMatterMatch[1]) {
    return { name: '', description: '' };
  }

  let name = '';
  let description = '';

  for (const line of frontMatterMatch[1].split('\n')) {
    const match = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!match) continue;
    const key = match[1]?.trim();
    const value = String(match[2] ?? '').trim().replace(/^["']|["']$/g, '');
    if (key === 'name') name = value;
    if (key === 'description') description = value;
  }

  return { name, description };
}

async function pathExists(fileSystem: SkillFileSystemAdapter, targetPath: string): Promise<boolean> {
  try {
    await fileSystem.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveDirectoryIdentity(fileSystem: SkillFileSystemAdapter, directoryPath: string): Promise<string> {
  try {
    return await fileSystem.realpath(directoryPath);
  } catch {
    return path.resolve(directoryPath);
  }
}

async function findSkillMarkdownFiles(fileSystem: SkillFileSystemAdapter, rootPath: string): Promise<string[]> {
  const output: string[] = [];
  const queue: string[] = [rootPath];
  const visitedDirectories = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const directoryIdentity = await resolveDirectoryIdentity(fileSystem, current);
    if (visitedDirectories.has(directoryIdentity)) {
      continue;
    }
    visitedDirectories.add(directoryIdentity);

    let entries: DirectoryEntry[] = [];
    try {
      entries = await fileSystem.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(absolutePath);
        continue;
      }
      if (typeof entry.isSymbolicLink === 'function' && entry.isSymbolicLink()) {
        try {
          const stats = await fileSystem.stat(absolutePath);
          if (stats.isDirectory()) {
            queue.push(absolutePath);
            continue;
          }
          if (stats.isFile() && entry.name === 'SKILL.md') {
            output.push(absolutePath);
          }
        } catch {
          // Ignore unreadable symlinks.
        }
        continue;
      }
      if (entry.isFile() && entry.name === 'SKILL.md') {
        output.push(absolutePath);
      }
    }
  }

  return output.sort((left, right) => left.localeCompare(right));
}

export function createSkillRegistry(options: SkillRegistryOptions = {}): SkillRegistry {
  let roots = normalizeRoots(options.roots);
  const fileSystem = options.fileSystem ?? {
    access: fs.access.bind(fs),
    readFile: fs.readFile.bind(fs) as SkillFileSystemAdapter['readFile'],
    readdir: fs.readdir.bind(fs) as SkillFileSystemAdapter['readdir'],
    realpath: fs.realpath.bind(fs),
    stat: fs.stat.bind(fs) as SkillFileSystemAdapter['stat'],
  };

  async function scanSkills(): Promise<SkillEntry[]> {
    const discovered = new Map<string, SkillEntry>();

    for (const rootPath of roots) {
      if (!(await pathExists(fileSystem, rootPath))) {
        continue;
      }

      const skillFiles = await findSkillMarkdownFiles(fileSystem, rootPath);
      for (const skillFilePath of skillFiles) {
        let content = '';
        try {
          content = await fileSystem.readFile(skillFilePath, 'utf8');
        } catch {
          continue;
        }

        const metadata = parseSkillFrontMatter(content);
        const skillId = metadata.name.trim();
        if (!skillId) {
          continue;
        }

        discovered.set(skillId, {
          skillId,
          description: metadata.description.trim(),
          sourcePath: skillFilePath,
          rootPath,
        });
      }
    }

    return [...discovered.values()].sort((left, right) => left.skillId.localeCompare(right.skillId));
  }

  return {
    getRoots: () => roots.slice(),
    setRoots: (nextRoots) => {
      roots = normalizeRoots(nextRoots);
    },
    sync: async (): Promise<SkillRegistrySyncResult> => ({
      skills: await scanSkills(),
    }),
    listSkills: scanSkills,
    getSkill: async (skillId) => (await scanSkills()).find((skill) => skill.skillId === skillId),
    loadSkill: async (skillId): Promise<LoadedSkill | undefined> => {
      const skill = (await scanSkills()).find((entry) => entry.skillId === skillId);
      if (!skill) {
        return undefined;
      }
      const content = await fileSystem.readFile(skill.sourcePath, 'utf8');
      return { ...skill, content };
    },
  };
}
