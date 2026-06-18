import { afterEach, describe, expect, test, vi } from 'vitest';

// Resolves the server base URL from the Vite build-time env var, with a
// localhost fallback for local development (FR-001 / SC-007).
describe('SERVER_URL resolution', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  test('falls back to http://localhost:3000 when VITE_SERVER_URL is unset', async () => {
    vi.stubEnv('VITE_SERVER_URL', '');
    const { SERVER_URL } = await import('./serverUrl.js');
    expect(SERVER_URL).toBe('http://localhost:3000');
  });

  test('uses VITE_SERVER_URL when set', async () => {
    vi.stubEnv('VITE_SERVER_URL', 'https://yaniv-xyz.duckdns.org');
    const { SERVER_URL } = await import('./serverUrl.js');
    expect(SERVER_URL).toBe('https://yaniv-xyz.duckdns.org');
  });
});
