import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('static response policy', () => {
  const config = JSON.parse(readFileSync('public/staticwebapp.config.json', 'utf8')) as {
    globalHeaders: Record<string, string>;
    routes: Array<{ route: string; headers: Record<string, string> }>;
  };

  it('sets restrictive browser policies', () => {
    expect(config.globalHeaders['Content-Security-Policy']).toContain("default-src 'self'");
    expect(config.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(config.globalHeaders['Permissions-Policy']).toContain('camera=()');
    expect(config.globalHeaders['X-XSS-Protection']).toBe('');
  });

  it('gives only fingerprinted build assets a long-lived immutable policy', () => {
    expect(config.routes.find(({ route }) => route === '/immutable/*')?.headers['Cache-Control'])
      .toBe('public, max-age=31536000, immutable');
    expect(config.routes.find(({ route }) => route === '/sw.js')?.headers['Cache-Control']).toBe('no-cache');
  });
});
