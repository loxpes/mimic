import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Hono } from 'hono';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync, existsSync } from 'fs';

// ---------------------------------------------------------------------------
// Set DATABASE_PATH to an in-memory database before any @testfarm/db import.
// We use a unique temp file per test run to avoid conflicts.
// ---------------------------------------------------------------------------

let tempDbPath: string;

// Use a fresh temp DB per describe block -- beforeEach will reinitialize.
function freshTempDbPath(): string {
  return join(tmpdir(), `testfarm-test-personas-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

// We need to dynamically control the db instance. The cleanest way with
// @testfarm/db's singleton pattern is to mock getDb() via vi.mock, and
// use initializeDb / closeDb lifecycle with DATABASE_PATH env var.
import { initializeDb, closeDb, getDb } from '@testfarm/db';

// Import the route -- it calls getDb() at request time, not at import time.
import personasRoute from '../routes/personas.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildApp() {
  const app = new Hono();
  app.route('/api/personas', personasRoute);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Personas API routes', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(async () => {
    // Close any previous db connection so initializeDb creates a fresh one.
    await closeDb();

    tempDbPath = freshTempDbPath();
    process.env.DATABASE_PATH = tempDbPath;

    await initializeDb();
    app = buildApp();
  });

  afterEach(async () => {
    await closeDb();
    // Clean up temp file
    if (tempDbPath && existsSync(tempDbPath)) {
      try { unlinkSync(tempDbPath); } catch { /* ignore */ }
    }
    // Also remove WAL and SHM files
    for (const suffix of ['-wal', '-shm']) {
      const path = tempDbPath + suffix;
      if (existsSync(path)) {
        try { unlinkSync(path); } catch { /* ignore */ }
      }
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/personas
  // -------------------------------------------------------------------------
  describe('GET /api/personas', () => {
    it('returns empty array when no personas exist', async () => {
      const res = await app.request('/api/personas');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual([]);
    });

    it('returns all personas ordered by name', async () => {
      // Seed two personas
      await app.request('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Zeta User',
          definition: { identity: 'test', techProfile: '', personality: '', context: '', tendencies: [] },
        }),
      });
      await app.request('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Alpha User',
          definition: { identity: 'test2', techProfile: '', personality: '', context: '', tendencies: [] },
        }),
      });

      const res = await app.request('/api/personas');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(2);
      // Should be sorted alphabetically by name
      expect(body[0].name).toBe('Alpha User');
      expect(body[1].name).toBe('Zeta User');
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/personas
  // -------------------------------------------------------------------------
  describe('POST /api/personas', () => {
    it('creates a new persona and returns 201', async () => {
      const payload = {
        name: 'Test Persona',
        definition: {
          identity: 'A test identity',
          techProfile: 'Beginner',
          personality: 'Curious',
          context: 'Testing',
          tendencies: ['clicks quickly'],
        },
        metadata: { archetype: 'explorer' },
      };

      const res = await app.request('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe('Test Persona');
      expect(body.id).toBeDefined();
      expect(typeof body.id).toBe('string');
      expect(body.definition.identity).toBe('A test identity');
      expect(body.metadata.archetype).toBe('explorer');
    });

    it('assigns a UUID as the persona id', async () => {
      const res = await app.request('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'UUID Persona',
          definition: { identity: '', techProfile: '', personality: '', context: '', tendencies: [] },
        }),
      });

      const body = await res.json();
      // UUID v4 format: 8-4-4-4-12 hex characters
      expect(body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/personas/:id
  // -------------------------------------------------------------------------
  describe('GET /api/personas/:id', () => {
    it('returns a persona by id', async () => {
      // Create a persona first
      const createRes = await app.request('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Findable Persona',
          definition: { identity: 'find-me', techProfile: '', personality: '', context: '', tendencies: [] },
        }),
      });
      const created = await createRes.json();

      const res = await app.request(`/api/personas/${created.id}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(created.id);
      expect(body.name).toBe('Findable Persona');
    });

    it('returns 404 for non-existent persona', async () => {
      const res = await app.request('/api/personas/non-existent-id');
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Persona not found');
    });
  });

  // -------------------------------------------------------------------------
  // PUT /api/personas/:id
  // -------------------------------------------------------------------------
  describe('PUT /api/personas/:id', () => {
    it('updates an existing persona', async () => {
      // Create
      const createRes = await app.request('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Original Name',
          definition: { identity: 'original', techProfile: '', personality: '', context: '', tendencies: [] },
          metadata: {},
        }),
      });
      const created = await createRes.json();

      // Update
      const updateRes = await app.request(`/api/personas/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Name',
          definition: { identity: 'updated', techProfile: 'Expert', personality: '', context: '', tendencies: [] },
          metadata: { archetype: 'power-user' },
        }),
      });

      expect(updateRes.status).toBe(200);
      const body = await updateRes.json();
      expect(body.name).toBe('Updated Name');
      expect(body.definition.identity).toBe('updated');
      expect(body.definition.techProfile).toBe('Expert');
    });

    it('returns 404 when updating non-existent persona', async () => {
      const res = await app.request('/api/personas/does-not-exist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'No One',
          definition: { identity: '', techProfile: '', personality: '', context: '', tendencies: [] },
          metadata: {},
        }),
      });
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /api/personas/:id
  // -------------------------------------------------------------------------
  describe('DELETE /api/personas/:id', () => {
    it('deletes an existing persona', async () => {
      // Create
      const createRes = await app.request('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'To Delete',
          definition: { identity: '', techProfile: '', personality: '', context: '', tendencies: [] },
        }),
      });
      const created = await createRes.json();

      // Delete
      const delRes = await app.request(`/api/personas/${created.id}`, { method: 'DELETE' });
      expect(delRes.status).toBe(200);
      const body = await delRes.json();
      expect(body.message).toBe('Persona deleted');

      // Verify it's gone
      const getRes = await app.request(`/api/personas/${created.id}`);
      expect(getRes.status).toBe(404);
    });

    it('returns 404 when deleting non-existent persona', async () => {
      const res = await app.request('/api/personas/ghost-id', { method: 'DELETE' });
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/personas/import
  // -------------------------------------------------------------------------
  describe('POST /api/personas/import', () => {
    it('batch imports multiple personas', async () => {
      const payload = {
        personas: [
          { name: 'Imported A', identity: 'id-a', techProfile: 'Beginner' },
          { name: 'Imported B', identity: 'id-b', techProfile: 'Expert' },
        ],
      };

      const res = await app.request('/api/personas/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.imported).toBe(2);
      expect(body.personas).toHaveLength(2);
    });

    it('skips personas without a name', async () => {
      const payload = {
        personas: [
          { name: 'Valid', identity: 'valid' },
          { identity: 'no-name' }, // missing name
        ],
      };

      const res = await app.request('/api/personas/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.imported).toBe(1);
    });

    it('returns 400 for invalid format', async () => {
      const res = await app.request('/api/personas/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: true }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Invalid format');
    });
  });
});
