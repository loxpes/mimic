import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync, existsSync } from 'fs';

import { initializeDb, closeDb, getDb, personas, objectives, sessions } from '@testfarm/db';
import { eq } from 'drizzle-orm';
import sessionsRoute from '../routes/sessions.js';

let tempDbPath: string;

function freshTempDbPath(): string {
  return join(tmpdir(), `testfarm-test-sessions-update-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function buildApp() {
  const app = new Hono();
  app.route('/api/sessions', sessionsRoute);
  return app;
}

describe('Sessions PATCH /api/sessions/:id', () => {
  let app: ReturnType<typeof buildApp>;
  let personaId: string;
  let personaId2: string;
  let objectiveId: string;
  let objectiveId2: string;

  beforeEach(async () => {
    await closeDb();
    tempDbPath = freshTempDbPath();
    process.env.DATABASE_PATH = tempDbPath;
    await initializeDb();
    app = buildApp();

    const db = getDb();
    personaId = crypto.randomUUID();
    personaId2 = crypto.randomUUID();
    objectiveId = crypto.randomUUID();
    objectiveId2 = crypto.randomUUID();

    await db.insert(personas).values([
      {
        id: personaId,
        name: 'Persona A',
        definition: { identity: 'test', techProfile: '', personality: '', context: '', tendencies: [] },
        metadata: {},
      },
      {
        id: personaId2,
        name: 'Persona B',
        definition: { identity: 'test2', techProfile: '', personality: '', context: '', tendencies: [] },
        metadata: {},
      },
    ]);

    await db.insert(objectives).values([
      {
        id: objectiveId,
        name: 'Objective A',
        definition: { goal: 'test', successCriteria: [] },
        config: { maxActions: 10, maxDuration: 5, autonomyLevel: 'full', restrictions: [], steps: [] },
        metadata: {},
      },
      {
        id: objectiveId2,
        name: 'Objective B',
        definition: { goal: 'test2', successCriteria: [] },
        config: { maxActions: 20, maxDuration: 10, autonomyLevel: 'full', restrictions: [], steps: [] },
        metadata: {},
      },
    ]);
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

  async function createPendingSession(data?: Partial<{ targetUrl: string; personaId: string; objectiveId: string }>) {
    const res = await app.request('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId: data?.personaId || personaId,
        objectiveId: data?.objectiveId || objectiveId,
        targetUrl: data?.targetUrl || 'http://example.com',
      }),
    });
    return res.json();
  }

  it('updates targetUrl of a pending session', async () => {
    const session = await createPendingSession({ targetUrl: 'http://old.com' });

    const res = await app.request(`/api/sessions/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUrl: 'http://new.com' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.targetUrl).toBe('http://new.com');
  });

  it('updates personaId of a pending session', async () => {
    const session = await createPendingSession();

    const res = await app.request(`/api/sessions/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId: personaId2 }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.personaId).toBe(personaId2);
  });

  it('updates objectiveId of a pending session', async () => {
    const session = await createPendingSession();

    const res = await app.request(`/api/sessions/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objectiveId: objectiveId2 }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.objectiveId).toBe(objectiveId2);
  });

  it('rejects editing a non-pending session', async () => {
    const session = await createPendingSession();

    // Manually set session to running
    const db = getDb();
    await db.update(sessions).set({
      state: { status: 'running', actionCount: 0, progress: 0, currentUrl: 'http://example.com' },
    }).where(eq(sessions.id, session.id));

    const res = await app.request(`/api/sessions/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUrl: 'http://hacked.com' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Only pending sessions can be edited');
  });

  it('returns 404 for non-existent session', async () => {
    const res = await app.request('/api/sessions/non-existent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUrl: 'http://new.com' }),
    });

    expect(res.status).toBe(404);
  });
});
