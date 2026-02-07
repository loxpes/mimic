import { describe, it, expect } from 'vitest';
import { isLocalhostUrl } from '../url-utils';

describe('isLocalhostUrl', () => {
  it('detects http://localhost:3000', () => {
    expect(isLocalhostUrl('http://localhost:3000')).toBe(true);
  });

  it('detects http://localhost without port', () => {
    expect(isLocalhostUrl('http://localhost')).toBe(true);
  });

  it('detects https://localhost:8080', () => {
    expect(isLocalhostUrl('https://localhost:8080')).toBe(true);
  });

  it('detects http://127.0.0.1:8080', () => {
    expect(isLocalhostUrl('http://127.0.0.1:8080')).toBe(true);
  });

  it('detects http://127.0.0.1 without port', () => {
    expect(isLocalhostUrl('http://127.0.0.1')).toBe(true);
  });

  it('detects http://0.0.0.0:5000', () => {
    expect(isLocalhostUrl('http://0.0.0.0:5000')).toBe(true);
  });

  it('detects http://[::1]:3000', () => {
    expect(isLocalhostUrl('http://[::1]:3000')).toBe(true);
  });

  it('detects http://[::1] without port', () => {
    expect(isLocalhostUrl('http://[::1]')).toBe(true);
  });

  it('returns false for https://example.com', () => {
    expect(isLocalhostUrl('https://example.com')).toBe(false);
  });

  it('returns false for http://my-localhost-app.com (no false positive)', () => {
    expect(isLocalhostUrl('http://my-localhost-app.com')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isLocalhostUrl('')).toBe(false);
  });

  it('returns false for partial URL http://loc', () => {
    expect(isLocalhostUrl('http://loc')).toBe(false);
  });

  it('returns false for invalid string', () => {
    expect(isLocalhostUrl('not a url')).toBe(false);
  });

  it('detects localhost typed without protocol (localhost:3000)', () => {
    expect(isLocalhostUrl('localhost:3000')).toBe(true);
  });

  it('detects 127.0.0.1:8080 without protocol', () => {
    expect(isLocalhostUrl('127.0.0.1:8080')).toBe(true);
  });
});
