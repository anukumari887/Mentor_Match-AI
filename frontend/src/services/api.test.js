import { afterEach, describe, expect, it } from 'vitest';
import api from './api';

const originalAdapter = api.defaults.adapter;

afterEach(() => {
  api.defaults.adapter = originalAdapter;
});

describe('API network errors', () => {
  it('explains that the backend must be running', async () => {
    api.defaults.adapter = () => Promise.reject(new Error('Network Error'));

    await expect(api.post('/api/auth/register', {})).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'Cannot reach the Mentor-Match server. Start the backend at localhost:5000, then try again.',
    });
  });
});