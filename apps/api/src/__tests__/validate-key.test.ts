import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Mock the validator before importing the route
vi.mock('@testfarm/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@testfarm/core')>();
  return {
    ...actual,
    validateApiKey: vi.fn(),
  };
});

import { validateApiKey } from '@testfarm/core';
import settingsRoute from '../routes/settings.js';

function buildApp() {
  const app = new Hono();
  app.route('/api/settings', settingsRoute);
  return app;
}

describe('POST /api/settings/validate-key', () => {
  let app: ReturnType<typeof buildApp>;
  const mockValidate = vi.mocked(validateApiKey);

  beforeEach(() => {
    app = buildApp();
    vi.clearAllMocks();
  });

  it('returns valid:true when the provider accepts the key', async () => {
    mockValidate.mockResolvedValue({ valid: true });

    const res = await app.request('/api/settings/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'anthropic', apiKey: 'sk-ant-valid' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(mockValidate).toHaveBeenCalledWith('anthropic', 'sk-ant-valid');
  });

  it('returns valid:false with error message when the key is rejected', async () => {
    mockValidate.mockResolvedValue({ valid: false, error: 'Invalid API key' });

    const res = await app.request('/api/settings/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'anthropic', apiKey: 'sk-ant-bad' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.error).toBe('Invalid API key');
  });

  it('uses env var when apiKey is not provided in body', async () => {
    mockValidate.mockResolvedValue({ valid: true });

    const res = await app.request('/api/settings/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'openai' }),
    });

    expect(res.status).toBe(200);
    expect(mockValidate).toHaveBeenCalledWith('openai', undefined);
  });

  it('works with openai provider', async () => {
    mockValidate.mockResolvedValue({ valid: true });

    const res = await app.request('/api/settings/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'openai', apiKey: 'sk-valid' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
  });

  it('works with google provider', async () => {
    mockValidate.mockResolvedValue({ valid: true });

    const res = await app.request('/api/settings/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'google', apiKey: 'AIza-valid' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
  });

  it('works with claude-cli provider (no apiKey needed)', async () => {
    mockValidate.mockResolvedValue({ valid: true });

    const res = await app.request('/api/settings/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'claude-cli' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
  });

  it('returns 400 when provider is missing', async () => {
    const res = await app.request('/api/settings/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'sk-whatever' }),
    });

    expect(res.status).toBe(400);
  });

  it('returns valid:false when the validator throws an unexpected error', async () => {
    mockValidate.mockRejectedValue(new Error('Network timeout'));

    const res = await app.request('/api/settings/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'anthropic', apiKey: 'sk-ant-test' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.error).toBe('Network timeout');
  });
});
