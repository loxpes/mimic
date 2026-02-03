/**
 * Shared LLM configuration utilities
 */

import { getDb } from '@testfarm/db';
import { appSettings } from '@testfarm/db';
import { eq } from 'drizzle-orm';

// Default configurations
export const DEFAULT_LLM_CONFIG = {
  provider: (process.env.LLM_PROVIDER || 'anthropic') as 'anthropic' | 'openai' | 'ollama' | 'claude-cli' | 'google',
  model: process.env.LLM_MODEL || 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 2048,
};

/**
 * Get global LLM configuration from appSettings
 */
export async function getGlobalLLMConfig() {
  const db = getDb();
  const settingsResult = await db.select().from(appSettings).where(eq(appSettings.id, 'global')).limit(1);
  const settings = settingsResult[0];

  if (settings) {
    return {
      provider: settings.llmProvider || DEFAULT_LLM_CONFIG.provider,
      model: settings.llmModel || DEFAULT_LLM_CONFIG.model,
      temperature: DEFAULT_LLM_CONFIG.temperature,
      maxTokens: DEFAULT_LLM_CONFIG.maxTokens,
    };
  }

  return DEFAULT_LLM_CONFIG;
}
