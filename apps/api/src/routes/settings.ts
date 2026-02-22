/**
 * Settings API Routes - Global LLM Configuration
 */

import { Hono } from 'hono';
import { getDb } from '@testfarm/db';
import { appSettings } from '@testfarm/db';
import { eq } from 'drizzle-orm';

const app = new Hono();

/**
 * GET /api/settings
 * Get global settings and available API keys status
 */
app.get('/', async (c) => {
  const db = getDb();
  const settingsResult = await db.select().from(appSettings).where(eq(appSettings.id, 'global')).limit(1);
  let settings = settingsResult[0];

  // Create default settings if not exist
  if (!settings) {
    const defaultSettings = {
      id: 'global',
      llmProvider: (process.env.LLM_PROVIDER || 'anthropic') as 'anthropic' | 'openai' | 'claude-cli' | 'google',
      llmModel: process.env.LLM_MODEL || 'claude-sonnet-4-20250514',
      updatedAt: null,
    };
    await db.insert(appSettings).values(defaultSettings);
    settings = defaultSettings;
  }

  return c.json({
    llmProvider: settings.llmProvider,
    llmModel: settings.llmModel,
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasOpenaiKey: !!process.env.OPENAI_API_KEY,
    hasGoogleKey: !!process.env.GOOGLE_API_KEY,
  });
});

/**
 * PATCH /api/settings
 * Update global settings (provider and model only)
 */
app.patch('/', async (c) => {
  const body = await c.req.json();
  const db = getDb();

  // Ensure settings row exists
  const existingResult = await db.select().from(appSettings).where(eq(appSettings.id, 'global')).limit(1);
  if (!existingResult[0]) {
    await db.insert(appSettings).values({ id: 'global' });
  }

  const updates: Record<string, unknown> = {};

  if (body.llmProvider !== undefined) {
    updates.llmProvider = body.llmProvider;
  }
  if (body.llmModel !== undefined) {
    updates.llmModel = body.llmModel;
  }

  updates.updatedAt = new Date();

  if (Object.keys(updates).length > 0) {
    await db.update(appSettings).set(updates).where(eq(appSettings.id, 'global'));
  }

  return c.json({ success: true });
});

export default app;
