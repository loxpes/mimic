import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync, existsSync } from 'fs';
import { initializeDb, closeDb } from '@testfarm/db';
import settingsRoute from '../routes/settings.js';

let tempDbPath: string;

function freshTempDbPath(): string {
  return join(tmpdir(), `testfarm-test-settings-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function buildApp() {
  const app = new Hono();
  app.route('/api/settings', settingsRoute);
  return app;
}

describe('Settings API routes', () => {
  let app: ReturnType<typeof buildApp>;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    await closeDb();
    tempDbPath = freshTempDbPath();
    process.env.DATABASE_PATH = tempDbPath;
    await initializeDb();
    app = buildApp();
  });

  afterEach(async () => {
    await closeDb();
    process.env = { ...originalEnv };
    if (tempDbPath && existsSync(tempDbPath)) {
      try { unlinkSync(tempDbPath); } catch { /* ignore */ }
    }
    for (const suffix of ['-wal', '-shm']) {
      const path = tempDbPath + suffix;
      if (existsSync(path)) {
        try { unlinkSync(path); } catch { /* ignore */ }
      }
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/settings
  // -------------------------------------------------------------------------
  describe('GET /api/settings', () => {
    it('returns default settings when none exist', async () => {
      const res = await app.request('/api/settings');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.llmProvider).toBeDefined();
      expect(body.llmModel).toBeDefined();
      expect(typeof body.hasAnthropicKey).toBe('boolean');
      expect(typeof body.hasOpenaiKey).toBe('boolean');
      expect(typeof body.hasGoogleKey).toBe('boolean');
    });

    it('reflects ANTHROPIC_API_KEY presence from env', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      const res = await app.request('/api/settings');
      const body = await res.json();
      expect(body.hasAnthropicKey).toBe(true);
    });

    it('returns hasAnthropicKey false when env var is not set', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const res = await app.request('/api/settings');
      const body = await res.json();
      expect(body.hasAnthropicKey).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /api/settings
  // -------------------------------------------------------------------------
  describe('PATCH /api/settings', () => {
    it('updates provider and model', async () => {
      // Ensure defaults are created first
      await app.request('/api/settings');

      const res = await app.request('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ llmProvider: 'openai', llmModel: 'gpt-4o' }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // Verify the change persisted
      const getRes = await app.request('/api/settings');
      const settings = await getRes.json();
      expect(settings.llmProvider).toBe('openai');
      expect(settings.llmModel).toBe('gpt-4o');
    });

    it('creates settings row if it does not exist before patching', async () => {
      const res = await app.request('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ llmProvider: 'google' }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});
