import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VerifyEmailPage from './VerifyEmailPage';
import * as api from '../services/api';
import * as AuthContext from '../contexts/AuthContext';

vi.mock('../services/api', () => {
  const mockApi = {
    post: vi.fn(),
    get: vi.fn()
  };
  return {
    default: mockApi,
    ...mockApi
  };
});

describe('VerifyEmailPage', () => {
  const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 'u1', email: 'test@example.com' },
      refreshUser: vi.fn()
    });
  });

  it('immediately removes token from URL using history.replaceState and shows success on valid token', async () => {
    api.post.mockResolvedValueOnce({ message: 'Email verified successfully.' });

    window.location.search = '?token=test-token-12345';

    render(
      <MemoryRouter initialEntries={['/verify-email?token=test-token-12345']}>
        <Routes>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', expect.any(String));
    expect(api.post).toHaveBeenCalledWith('/api/auth/verify-email', { token: 'test-token-12345' });

    await waitFor(() => {
      expect(screen.getByText('Email verified')).toBeInTheDocument();
      expect(screen.getByText(/Your email address has been verified successfully/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Go to Dashboard/i })).toBeInTheDocument();
    });
  });

  it('shows clear error and resend action on invalid or expired token', async () => {
    const error = new Error('Invalid token');
    error.code = 'INVALID_OR_EXPIRED_TOKEN';
    error.message = 'This verification link is invalid or has expired.';
    api.post.mockRejectedValueOnce(error);

    render(
      <MemoryRouter initialEntries={['/verify-email?token=expired-token-999']}>
        <Routes>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Verification failed')).toBeInTheDocument();
      expect(screen.getByText(/This verification link is invalid or has expired/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Send a new link/i })).toBeInTheDocument();
    });
  });
});
