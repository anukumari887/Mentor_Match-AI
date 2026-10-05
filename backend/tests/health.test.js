const request = require('supertest');
const app = require('../src/app');

// Mock database and redis status for predictable unit testing
jest.mock('../src/config/database', () => ({
  isMongoConnected: jest.fn(() => true),
  connectMongoWithRetry: jest.fn()
}));

jest.mock('../src/config/redis', () => ({
  isRedisConnected: jest.fn(() => true),
  connectRedisWithRetry: jest.fn(),
  getRedisClient: jest.fn()
}));

describe('Health and System Routes', () => {
  it('GET /api/health returns 200 with service statuses', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('mongo', 'ok');
    expect(res.body).toHaveProperty('redis', 'ok');
    expect(res.body).toHaveProperty('ml');
    expect(res.body).toHaveProperty('timestamp');
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
