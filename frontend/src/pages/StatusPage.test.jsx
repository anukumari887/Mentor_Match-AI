import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import StatusPage from './StatusPage';
import api from '../services/api';

vi.mock('../services/api');

describe('StatusPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders each component state from a 200 HTTP body', async () => {
    api.get.mockResolvedValueOnce({
      status: 200,
      data: {
        status: 'ok',
        mongo: 'ok',
        redis: 'ok',
        ml: 'ok',
        email: 'demo'
      }
    });

    render(<StatusPage />);

    expect(screen.getByText(/System Health & Service Status/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/All Systems Operational/i)).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('Cache')).toBeInTheDocument();
      expect(screen.getByText('Recommendation service')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();

      // Check state labels
      const workingBadges = screen.getAllByText('Working');
      expect(workingBadges.length).toBeGreaterThanOrEqual(3);
      expect(screen.getByText('Demo mode')).toBeInTheDocument();
    });
  });

  it('renders each component state from a 503 HTTP body when dependencies are down', async () => {
    // 503 response still returns JSON body with component breakdown
    api.get.mockResolvedValueOnce({
      status: 503,
      data: {
        status: 'down',
        mongo: 'down',
        redis: 'ok',
        ml: 'disabled',
        email: 'degraded'
      }
    });

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText(/System Outage Detected/i)).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('Cache')).toBeInTheDocument();
      expect(screen.getByText('Recommendation service')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();

      // Database is down -> Not reachable (1 in summary banner + 1 mongo + 1 email)
      const notReachableBadges = screen.getAllByText('Not reachable');
      expect(notReachableBadges.length).toBe(3);

      // ML is disabled -> Not set up
      expect(screen.getByText('Not set up')).toBeInTheDocument();

      // Redis is ok -> Working
      expect(screen.getByText('Working')).toBeInTheDocument();
    });

    // Ensure raw status code is NEVER displayed
    expect(screen.queryByText(/status code 503/i)).not.toBeInTheDocument();
  });

  it('renders server did not answer message when request has no body (network error / proxy failure)', async () => {
    api.get.mockRejectedValueOnce(new Error('Network Error'));

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText(/System Unreachable/i)).toBeInTheDocument();
      expect(
        screen.getByText(/The server did not answer\. Try again in a minute\./i)
      ).toBeInTheDocument();
    });

    // Ensure raw status code is NEVER displayed
    expect(screen.queryByText(/status code 503/i)).not.toBeInTheDocument();
  });

  it('never displays raw status code 503 even if axios rejects with 503', async () => {
    const error503 = new Error('Request failed with status code 503');
    error503.response = {
      status: 503,
      data: {
        status: 'down',
        mongo: 'down',
        redis: 'down',
        ml: 'down',
        email: 'degraded'
      }
    };
    api.get.mockRejectedValueOnce(error503);

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText(/System Outage Detected/i)).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
    });

    expect(screen.queryByText(/status code 503/i)).not.toBeInTheDocument();
  });
});
