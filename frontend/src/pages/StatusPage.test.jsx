import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import StatusPage from './StatusPage';
import api from '../services/api';

vi.mock('../services/api');

describe('StatusPage Component', () => {
  it('renders loading state initially and then shows operational statuses', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        status: 'ok',
        mongo: 'ok',
        redis: 'ok',
        ml: 'ok',
        timestamp: new Date().toISOString()
      }
    });

    render(<StatusPage />);

    expect(screen.getByText(/System Health & Service Status/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/All Systems Operational/i)).toBeInTheDocument();
      expect(screen.getByText(/MongoDB/i)).toBeInTheDocument();
      expect(screen.getByText(/Redis Cache/i)).toBeInTheDocument();
      expect(screen.getByText(/ML Recommender/i)).toBeInTheDocument();
    });
  });

  it('renders error state when api fails', async () => {
    api.get.mockRejectedValueOnce({
      code: 'NETWORK_ERROR',
      message: 'Failed to connect to backend cluster'
    });

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText(/System Unreachable/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to connect to backend cluster/i)).toBeInTheDocument();
    });
  });
});
