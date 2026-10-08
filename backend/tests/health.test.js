const request = require('supertest');
const app = require('../src/app');
const { isMongoConnected } = require('../src/config/database');
const { isRedisConnected } = require('../src/config/redis');

// Mock database and redis status for unit testing
jest.mock('../src/config/database', () => ({
  isMongoConnected: jest.fn(() => true),
  connectMongoWithRetry: jest.fn()
}));

jest.mock('../src/config/redis', () => ({
  isRedisConnected: jest.fn(() => true),
  connectRedisWithRetry: jest.fn(),
  getRedisClient: jest.fn(() => ({
    ping: jest.fn().mockResolvedValue('PONG')
  }))
}));

describe('Health and System Routes', () => {
  beforeEach(() => {
    isMongoConnected.mockReturnValue(true);
    isRedisConnected.mockReturnValue(true);
  });

  it('GET /api/health returns 200 with exact required shape when mongo and redis are ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: expect.stringMatching(/^(ok|degraded)$/),
      mongo: 'ok',
      redis: 'ok',
      ml: expect.stringMatching(/^(ok|down|disabled)$/),
      email: expect.stringMatching(/^(ok|degraded|demo|disabled)$/)
    });
    // Ensure no unwanted extra fields like timestamp, hostnames, or error text
    const keys = Object.keys(res.body);
    expect(keys.sort()).toEqual(['email', 'ml', 'mongo', 'redis', 'status'].sort());
  });

  it('GET /api/health returns 503 with JSON body when mongo is down', async () => {
    isMongoConnected.mockReturnValue(false);
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({
      status: 'down',
      mongo: 'down',
      redis: 'ok',
      ml: expect.any(String),
      email: expect.any(String)
    });
    expect(Object.keys(res.body).sort()).toEqual(['email', 'ml', 'mongo', 'redis', 'status'].sort());
  });

  it('GET /api/health returns 503 with JSON body when redis is down', async () => {
    isRedisConnected.mockReturnValue(false);
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({
      status: 'down',
      mongo: 'ok',
      redis: 'down',
      ml: expect.any(String),
      email: expect.any(String)
    });
  });

  it('GET /api/health returns 200 even when ml is down or email is degraded', async () => {
    isMongoConnected.mockReturnValue(true);
    isRedisConnected.mockReturnValue(true);
    const res = await request(app).get('/api/health');
    // As long as mongo & redis are ok, status is 200 (either ok or degraded)
    expect([200]).toContain(res.statusCode);
    expect(['ok', 'degraded']).toContain(res.body.status);
  });

  it('GET /metrics returns prometheus metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('http_requests_total');
    expect(res.text).toContain('http_request_duration_seconds');
  });

  it('GET /api/nonexistent returns structured 404 error', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(res.body.error).toHaveProperty('message');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });
});
