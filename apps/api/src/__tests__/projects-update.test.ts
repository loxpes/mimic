import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync, existsSync } from 'fs';

import { initializeDb, closeDb } from '@testfarm/db';
import projectsRoute from '../routes/projects.js';

let tempDbPath: string;

function freshTempDbPath(): string {
  return join(tmpdir(), `testfarm-test-projects-update-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function buildApp() {
  const app = new Hono();
  app.route('/api/projects', projectsRoute);
  return app;
}

describe('Projects PATCH /api/projects/:id', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(async () => {
    await closeDb();
    tempDbPath = freshTempDbPath();
    process.env.DATABASE_PATH = tempDbPath;
    await initializeDb();
    app = buildApp();
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

  async function createProject(data: { name: string; targetUrl: string; description?: string }) {
    const res = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  it('updates name and description', async () => {
    const project = await createProject({ name: 'Original', targetUrl: 'http://example.com' });

    const res = await app.request(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name', description: 'New desc' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Updated Name');
    expect(body.description).toBe('New desc');
    expect(body.targetUrl).toBe('http://example.com');
  });

  it('updates targetUrl', async () => {
    const project = await createProject({ name: 'My Project', targetUrl: 'http://old-url.com' });

    const res = await app.request(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUrl: 'http://new-url.com' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.targetUrl).toBe('http://new-url.com');
    expect(body.name).toBe('My Project');
  });

  it('updates all fields together', async () => {
    const project = await createProject({ name: 'Old', targetUrl: 'http://old.com', description: 'Old desc' });

    const res = await app.request(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New', targetUrl: 'http://new.com', description: 'New desc' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('New');
    expect(body.targetUrl).toBe('http://new.com');
    expect(body.description).toBe('New desc');
  });

  it('returns 404 for non-existent project', async () => {
    const res = await app.request('/api/projects/non-existent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Whatever' }),
    });

    expect(res.status).toBe(404);
  });
});
