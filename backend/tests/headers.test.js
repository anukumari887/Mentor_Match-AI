jest.mock('../src/config/database', () => ({
  isMongoConnected: jest.fn(() => true),
  connectMongoWithRetry: jest.fn()
}));

jest.mock('../src/config/redis', () => ({
  isRedisConnected: jest.fn(() => true),
  connectRedisWithRetry: jest.fn(),
  getRedisClient: jest.fn()
}));

const request = require('supertest');
const app = require('../src/app');

describe('Security Headers', () => {
  it('includes Permissions-Policy allowing camera and microphone for self only', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);

    const permissionsPolicy = res.headers['permissions-policy'];
    expect(permissionsPolicy).toBeDefined();
    expect(permissionsPolicy).toContain('camera=(self)');
    expect(permissionsPolicy).toContain('microphone=(self)');
  });

  it('includes strict Content-Security-Policy with media-src blob: and connect-src for websockets without looser directives', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);

    const csp = res.headers['content-security-policy'];
    expect(csp).toBeDefined();

    // Must allow self and blob: for media
    expect(csp).toContain("media-src 'self' blob:");

    // Must allow websocket connection to self and ws/wss
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain('ws:');
    expect(csp).toContain('wss:');

    // Strict directives must remain tight
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain('*');
  });
});
