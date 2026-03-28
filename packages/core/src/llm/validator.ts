/**
 * API Key Validator - Checks if a provider's API key is valid
 * by making a minimal call to each provider's API.
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type ValidatableProvider = 'anthropic' | 'openai' | 'google' | 'claude-cli';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Minimal models to use for each provider (cheapest / fastest)
const VALIDATION_MODELS: Record<Exclude<ValidatableProvider, 'claude-cli'>, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
  google: 'gemini-2.0-flash-lite',
};

async function validateClaudeCli(): Promise<ValidationResult> {
  try {
    await execFileAsync('claude', ['--version'], { timeout: 5000 });
    return { valid: true };
  } catch {
    return { valid: false, error: 'Claude CLI not found or not accessible' };
  }
}

async function validateProviderKey(
  provider: Exclude<ValidatableProvider, 'claude-cli'>,
  apiKey: string | undefined
): Promise<ValidationResult> {
  try {
    let model;

    if (provider === 'anthropic') {
      const client = createAnthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });
      model = client(VALIDATION_MODELS.anthropic);
    } else if (provider === 'openai') {
      const client = createOpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY });
      model = client(VALIDATION_MODELS.openai);
    } else {
      const client = createGoogleGenerativeAI({ apiKey: apiKey ?? process.env.GOOGLE_API_KEY });
      model = client(VALIDATION_MODELS.google);
    }

    await generateText({
      model,
      prompt: 'Hi',
      maxOutputTokens: 1,
    });

    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    // Normalise auth error messages across providers
    const isAuthError =
      message.includes('401') ||
      message.includes('403') ||
      message.includes('invalid') ||
      message.includes('Invalid') ||
      message.includes('API key') ||
      message.includes('authentication') ||
      message.includes('unauthorized') ||
      message.includes('Unauthorized');

    return {
      valid: false,
      error: isAuthError ? 'Invalid API key' : message,
    };
  }
}

export async function validateApiKey(
  provider: ValidatableProvider,
  apiKey?: string
): Promise<ValidationResult> {
  if (provider === 'claude-cli') {
    return validateClaudeCli();
  }
  return validateProviderKey(provider, apiKey);
}
