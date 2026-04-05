/**
 * LLM Package Showcase Support Helpers
 *
 * Purpose:
 * - Provide reusable support helpers for the real `llm-runtime` showcase runner.
 *
 * Key features:
 * - Resolves Google Gemini provider/model selection from env vars for a live showcase run.
 * - Builds package provider config objects without importing `core`.
 * - Keeps preflight validation deterministic and easy to unit test.
 *
 * Implementation notes:
 * - The real showcase intentionally uses Google Gemini only to keep the live path stable.
 * - `.env` is the source of truth for `GOOGLE_API_KEY` and optional `LLM_SHOWCASE_MODEL`.
 * - The default model is conservative and overridable through `LLM_SHOWCASE_MODEL`.
 *
 * Recent changes:
 * - 2026-03-27: Added support helpers for the real terminal showcase runner.
 * - 2026-03-27: Restricted the live showcase to Google Gemini only.
 */

import type { LLMProviderConfigs } from '../../../src/index.js';

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export type ShowcaseProviderSelection = {
  provider: 'google';
  model: string;
  providers: LLMProviderConfigs;
};

type ShowcaseEnv = NodeJS.ProcessEnv;

function requireNonEmpty(value: string | undefined, message: string): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new Error(message);
  }
  return normalized;
}

export function resolveShowcaseGeminiSelection(env: ShowcaseEnv): ShowcaseProviderSelection | null {
  const apiKey = String(env.GOOGLE_API_KEY ?? '').trim();
  if (!apiKey) {
    return null;
  }

  return {
    provider: 'google',
    model: String(env.LLM_SHOWCASE_MODEL ?? DEFAULT_GEMINI_MODEL).trim() || DEFAULT_GEMINI_MODEL,
    providers: {
      google: {
        apiKey: requireNonEmpty(env.GOOGLE_API_KEY, 'GOOGLE_API_KEY is required for the Google Gemini showcase.'),
      },
    },
  };
}

export function resolveShowcaseProviderSelection(env: ShowcaseEnv): ShowcaseProviderSelection | null {
  return resolveShowcaseGeminiSelection(env);
}

export function getShowcaseEnvHelp(): string {
  return [
    'Set these in the repo .env before running the real Google Gemini showcase:',
    '  GOOGLE_API_KEY',
    '  LLM_SHOWCASE_MODEL=gemini-2.5-flash   # optional override',
  ].join('\n');
}
