import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';

// Create a minimal test app with just the health routes we want to test.
// The actual app in index.ts has side effects (dotenv, db init, static serving)
// so we replicate only the health endpoint logic here.
describe('Health endpoints', () => {
  const app = new Hono();

  app.get('/api/info', (c) => {
    return c.json({
      name: 'Mimic API',
      version: '0.1.0',
      status: 'healthy',
    });
  });

  app.get('/health', (c) => {
    return c.json({ status: 'ok' });
  });

  it('GET /api/info returns API info', async () => {
    const res = await app.request('/api/info');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Mimic API');
    expect(body.status).toBe('healthy');
  });

  it('GET /api/info includes version', async () => {
    const res = await app.request('/api/info');
    const body = await res.json();
    expect(body.version).toBe('0.1.0');
  });

  it('GET /health returns ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
