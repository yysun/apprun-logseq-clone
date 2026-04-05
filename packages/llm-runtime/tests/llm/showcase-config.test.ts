/**
 * LLM Package Showcase Config Tests
 *
 * Purpose:
 * - Validate env-driven provider selection for the real `llm-runtime` showcase runner.
 *
 * Key features:
 * - Covers auto-detection for common providers.
 * - Verifies explicit provider overrides and required env validation.
 * - Keeps the real showcase preflight deterministic and unit tested.
 *
 * Implementation notes:
 * - Tests the standalone support helper with no network or provider clients.
 * - Uses plain env-like objects instead of mutating `process.env`.
 *
 * Recent changes:
 * - 2026-03-27: Added unit coverage for the real showcase env-selection helper.
 */

import { describe, expect, it } from 'vitest';
import {
  getShowcaseEnvHelp,
  resolveShowcaseGeminiSelection,
  resolveShowcaseProviderSelection,
} from '../e2e/support/llm-package-showcase-support.js';

describe('llm package showcase provider selection', () => {
  it('resolves Google Gemini from env with the default showcase model', () => {
    const selection = resolveShowcaseProviderSelection({
      GOOGLE_API_KEY: 'test-google-key',
    });

    expect(selection).toEqual({
      provider: 'google',
      model: 'gemini-2.5-flash',
      providers: {
        google: {
          apiKey: 'test-google-key',
        },
      },
    });
  });

  it('honors a showcase model override for Gemini', () => {
    const selection = resolveShowcaseGeminiSelection({
      LLM_SHOWCASE_MODEL: 'gemini-test',
      GOOGLE_API_KEY: 'test-google-key',
    });

    expect(selection).toEqual({
      provider: 'google',
      model: 'gemini-test',
      providers: {
        google: {
          apiKey: 'test-google-key',
        },
      },
    });
  });

  it('returns null when no provider env is configured', () => {
    expect(resolveShowcaseProviderSelection({})).toBeNull();
  });

  it('returns null when Gemini is not configured', () => {
    expect(resolveShowcaseGeminiSelection({
      ANTHROPIC_API_KEY: 'ignored',
      OPENAI_API_KEY: 'ignored',
    })).toBeNull();
  });

  it('returns env help text with Gemini-specific guidance', () => {
    expect(getShowcaseEnvHelp()).toContain('GOOGLE_API_KEY');
  });
});
