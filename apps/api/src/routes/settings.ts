/**
 * Settings API Routes - Global LLM Configuration
 */

import { Hono } from 'hono';
import { getDb } from '@testfarm/db';
import { appSettings } from '@testfarm/db';
import { eq } from 'drizzle-orm';
import { encrypt, isEncryptionConfigured } from '../crypto.js';

const app = new Hono();

/**
 * GET /api/settings
 * Get global settings (without decrypted keys)
 */
app.get('/', async (c) => {
  const db = getDb();
  const settingsResult = await db.select().from(appSettings).where(eq(appSettings.id, 'global')).limit(1);
  let settings = settingsResult[0];

  // Create default settings if not exist
  if (!settings) {
    const defaultSettings = {
      id: 'global',
      userId: null, // Global settings have no user
      llmProvider: (process.env.LLM_PROVIDER || 'anthropic') as 'anthropic' | 'openai' | 'ollama' | 'claude-cli' | 'google',
      llmModel: process.env.LLM_MODEL || 'claude-sonnet-4-20250514',
      encryptedAnthropicKey: null,
      encryptedOpenaiKey: null,
      encryptedGoogleKey: null,
      ollamaBaseUrl: 'http://localhost:11434/v1',
      updatedAt: null,
    };
    await db.insert(appSettings).values(defaultSettings);
    settings = defaultSettings;
  }

  // Return without decrypted keys (only indicate if they exist in DB)
  // Note: Env vars are invisible to users - they work as system fallback
  return c.json({
    llmProvider: settings.llmProvider,
    llmModel: settings.llmModel,
    ollamaBaseUrl: settings.ollamaBaseUrl,
    hasAnthropicKey: !!settings.encryptedAnthropicKey,
    hasOpenaiKey: !!settings.encryptedOpenaiKey,
    hasGoogleKey: !!settings.encryptedGoogleKey,
    encryptionConfigured: isEncryptionConfigured(),
  });
});

/**
 * PATCH /api/settings
 * Update global settings
 */
app.patch('/', async (c) => {
  const body = await c.req.json();
  const db = getDb();

  // Ensure settings row exists
  const existingResult = await db.select().from(appSettings).where(eq(appSettings.id, 'global')).limit(1);
  const existing = existingResult[0];
  if (!existing) {
    await db.insert(appSettings).values({ id: 'global', userId: null });
  }

  const updates: Record<string, unknown> = {};

  // Update provider and model
  if (body.llmProvider !== undefined) {
    updates.llmProvider = body.llmProvider;
  }
  if (body.llmModel !== undefined) {
    updates.llmModel = body.llmModel;
  }
  if (body.ollamaBaseUrl !== undefined) {
    updates.ollamaBaseUrl = body.ollamaBaseUrl;
  }

  // Encrypt API keys if provided
  if (body.anthropicApiKey !== undefined) {
    if (body.anthropicApiKey === null || body.anthropicApiKey === '') {
      // Allow clearing the key
      updates.encryptedAnthropicKey = null;
    } else {
      if (!isEncryptionConfigured()) {
        return c.json({ error: 'ENCRYPTION_KEY not configured on server' }, 500);
      }
      updates.encryptedAnthropicKey = encrypt(body.anthropicApiKey);
    }
  }

  if (body.openaiApiKey !== undefined) {
    if (body.openaiApiKey === null || body.openaiApiKey === '') {
      // Allow clearing the key
      updates.encryptedOpenaiKey = null;
    } else {
      if (!isEncryptionConfigured()) {
        return c.json({ error: 'ENCRYPTION_KEY not configured on server' }, 500);
      }
      updates.encryptedOpenaiKey = encrypt(body.openaiApiKey);
    }
  }

  if (body.googleApiKey !== undefined) {
    if (body.googleApiKey === null || body.googleApiKey === '') {
      // Allow clearing the key
      updates.encryptedGoogleKey = null;
    } else {
      if (!isEncryptionConfigured()) {
        return c.json({ error: 'ENCRYPTION_KEY not configured on server' }, 500);
      }
      updates.encryptedGoogleKey = encrypt(body.googleApiKey);
    }
  }

  // Update timestamp
  updates.updatedAt = new Date();

  if (Object.keys(updates).length > 0) {
    await db.update(appSettings).set(updates).where(eq(appSettings.id, 'global'));
  }

  return c.json({ success: true });
});

export default app;
