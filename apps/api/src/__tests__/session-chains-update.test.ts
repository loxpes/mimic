import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync, existsSync } from 'fs';

import { initializeDb, closeDb, getDb, personas, objectives } from '@testfarm/db';
import sessionChainsRoute from '../routes/session-chains.js';

let tempDbPath: string;

function freshTempDbPath(): string {
  return join(tmpdir(), `testfarm-test-chains-update-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function buildApp() {
  const app = new Hono();
  app.route('/api/session-chains', sessionChainsRoute);
  return app;
}

describe('Session Chains PATCH /api/session-chains/:id', () => {
  let app: ReturnType<typeof buildApp>;
  let personaId: string;
  let objectiveId: string;

  beforeEach(async () => {
    await closeDb();
    tempDbPath = freshTempDbPath();
    process.env.DATABASE_PATH = tempDbPath;
    await initializeDb();
    app = buildApp();

    // Seed persona and objective needed for chain creation
    const db = getDb();
    personaId = crypto.randomUUID();
    objectiveId = crypto.randomUUID();

    await db.insert(personas).values({
      id: personaId,
      name: 'Test Persona',
      definition: { identity: 'test', techProfile: '', personality: '', context: '', tendencies: [] },
      metadata: {},
    });

    await db.insert(objectives).values({
      id: objectiveId,
      name: 'Test Objective',
      definition: { goal: 'test', successCriteria: [] },
      config: { maxActions: 10, maxDuration: 5, autonomyLevel: 'full', restrictions: [], steps: [] },
      metadata: {},
    });
  });

  afterEach(async () => {
    await closeDb();
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

  async function createChain(data?: Partial<{ name: string; targetUrl: string }>) {
    const res = await app.request('/api/session-chains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId,
        objectiveId,
        targetUrl: data?.targetUrl || 'http://example.com',
        name: data?.name || 'Test Chain',
      }),
    });
    return res.json();
  }

  it('updates name', async () => {
    const chain = await createChain({ name: 'Original Name' });

    const res = await app.request(`/api/session-chains/${chain.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe('Chain updated');
  });

  it('updates targetUrl', async () => {
    const chain = await createChain({ targetUrl: 'http://old-url.com' });

    const res = await app.request(`/api/session-chains/${chain.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUrl: 'http://new-url.com' }),
    });

    expect(res.status).toBe(200);

    // Verify by fetching the chain
    const getRes = await app.request(`/api/session-chains/${chain.id}`);
    const updated = await getRes.json();
    expect(updated.targetUrl).toBe('http://new-url.com');
  });

  it('returns 404 for non-existent chain', async () => {
    const res = await app.request('/api/session-chains/non-existent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Whatever' }),
    });

    expect(res.status).toBe(404);
  });
});
