import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VerificationBanner from '../components/VerificationBanner';
import AuthPage from '../pages/AuthPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import * as AuthContext from '../contexts/AuthContext';
import * as ConfigService from '../services/publicConfig';
import api from '../services/api';

vi.mock('../services/api', () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({})
  };
  return {
    default: mockApi,
    ...mockApi
  };
});

describe('Email Demo Mode Frontend Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ConfigService.resetPublicConfigCache();
  });

  describe('Demo Mode Behavior', () => {
    beforeEach(() => {
      vi.spyOn(api, 'get').mockImplementation((url) => {
        if (url === '/api/public-config') {
          return Promise.resolve({ data: { emailMode: 'demo' } });
        }
        return Promise.resolve({ data: {} });
      });
    });

    it('never shows the verification banner in demo mode even for unverified users', async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { id: 'u1', name: 'Learner', email: 'learner@demo.com', role: 'learner', emailVerified: false },
        loading: false
      });

      render(
        <MemoryRouter>
          <VerificationBanner />
        </MemoryRouter>
      );

      // Give config time to resolve
      await waitFor(() => {
        expect(screen.queryByText(/Please verify your email/i)).not.toBeInTheDocument();
      });
    });

    it('shows demo note on the Register page in demo mode', async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: null,
        loading: false,
        login: vi.fn(),
        register: vi.fn()
      });

      render(
        <MemoryRouter>
          <AuthPage mode="register" />
        </MemoryRouter>
      );

      const note = await screen.findByText('Demo mode: no confirmation email is sent.');
      expect(note).toBeInTheDocument();
      expect(screen.queryByText('We will send you a link to confirm this email.')).not.toBeInTheDocument();
    });

    it('shows demo note on the Forgot Password page in demo mode', async () => {
      render(
        <MemoryRouter>
          <ForgotPasswordPage />
        </MemoryRouter>
      );

      const note = await screen.findByText(
        'Demo mode: reset emails are not delivered. If you cannot log in, contact the site owner.'
      );
      expect(note).toBeInTheDocument();
    });
  });

  describe('Live Mode Behavior', () => {
    beforeEach(() => {
      vi.spyOn(api, 'get').mockImplementation((url) => {
        if (url === '/api/public-config') {
          return Promise.resolve({ data: { emailMode: 'live' } });
        }
        return Promise.resolve({ data: {} });
      });
    });

    it('shows the verification banner in live mode for unverified users', async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { id: 'u1', name: 'Learner', email: 'learner@live.com', role: 'learner', emailVerified: false },
        loading: false
      });

      render(
        <MemoryRouter>
          <VerificationBanner />
        </MemoryRouter>
      );

      const banner = await screen.findByText(/Please verify your email/i);
      expect(banner).toBeInTheDocument();
    });

    it('neither demo note appears in live mode', async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: null,
        loading: false,
        login: vi.fn(),
        register: vi.fn()
      });

      // Register page
      const { unmount } = render(
        <MemoryRouter>
          <AuthPage mode="register" />
        </MemoryRouter>
      );

      await screen.findByText('We will send you a link to confirm this email.');
      expect(screen.queryByText('Demo mode: no confirmation email is sent.')).not.toBeInTheDocument();

      unmount();

      // Forgot Password page
      render(
        <MemoryRouter>
          <ForgotPasswordPage />
        </MemoryRouter>
      );

      await screen.findByText('Enter your account email address and we will send you a secure link to reset your password.');
      expect(
        screen.queryByText('Demo mode: reset emails are not delivered. If you cannot log in, contact the site owner.')
      ).not.toBeInTheDocument();
    });
  });

  describe('Fallback on Public Config Failure', () => {
    it('behaves as live mode if /api/public-config fails to load', async () => {
      vi.spyOn(api, 'get').mockImplementation((url) => {
        if (url === '/api/public-config') {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ data: {} });
      });

      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { id: 'u1', name: 'Learner', email: 'learner@live.com', role: 'learner', emailVerified: false },
        loading: false
      });

      render(
        <MemoryRouter>
          <VerificationBanner />
        </MemoryRouter>
      );

      // Behaves as live mode -> banner shown
      const banner = await screen.findByText(/Please verify your email/i);
      expect(banner).toBeInTheDocument();
    });
  });
});
