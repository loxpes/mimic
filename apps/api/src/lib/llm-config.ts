/**
 * Shared LLM configuration utilities
 */

import { getDb } from '@testfarm/db';
import { appSettings } from '@testfarm/db';
import { eq } from 'drizzle-orm';

// Default configurations
export const DEFAULT_LLM_CONFIG = {
  provider: (process.env.LLM_PROVIDER || 'anthropic') as 'anthropic' | 'openai' | 'claude-cli' | 'google',
  model: process.env.LLM_MODEL || 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 2048,
};

/**
 * Get LLM configuration (from global settings or defaults)
 */
export async function getGlobalLLMConfig() {
  const db = getDb();

  const globalSettings = await db.select().from(appSettings).where(eq(appSettings.id, 'global')).limit(1);
  if (globalSettings[0]) {
    return {
      provider: globalSettings[0].llmProvider || DEFAULT_LLM_CONFIG.provider,
      model: globalSettings[0].llmModel || DEFAULT_LLM_CONFIG.model,
      temperature: DEFAULT_LLM_CONFIG.temperature,
      maxTokens: DEFAULT_LLM_CONFIG.maxTokens,
    };
  }

  return DEFAULT_LLM_CONFIG;
}
