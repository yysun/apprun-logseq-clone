/**
 * LLM Package Provider Utilities
 *
 * Purpose:
 * - Provide small shared helpers for package-owned provider modules.
 *
 * Key features:
 * - Stable fallback id generation for tool-call normalization.
 * - Minimal logger surface so provider modules stay package-local.
 * - Zero dependency on `core` utilities or logger implementations.
 *
 * Implementation notes:
 * - Logging is intentionally quiet by default for package portability.
 * - Random ids use `crypto.randomUUID()` when available.
 *
 * Recent changes:
 * - 2026-03-27: Initial provider utility helpers for package-owned provider modules.
 */

export type PackageLogger = {
  trace: (message: unknown, ...args: unknown[]) => void;
  debug: (message: unknown, ...args: unknown[]) => void;
  info: (message: unknown, ...args: unknown[]) => void;
  warn: (message: unknown, ...args: unknown[]) => void;
  error: (message: unknown, ...args: unknown[]) => void;
};

const NOOP_LOGGER: PackageLogger = {
  trace: () => undefined,
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

export function createPackageLogger(): PackageLogger {
  return NOOP_LOGGER;
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function generateFallbackId(): string {
  return generateId();
}
