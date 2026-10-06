import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ResetPasswordPage from './ResetPasswordPage';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: {
    post: vi.fn()
  }
}));

describe('ResetPasswordPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows invalid link state if no token parameter is present', () => {
    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/invalid or expired reset link/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /request a new link/i })).toBeInTheDocument();
  });

  it('renders form and submits new password when token is in memory', async () => {
    api.post.mockResolvedValueOnce({
      data: { message: 'Your password has been reset successfully.' }
    });

    render(
      <MemoryRouter initialEntries={['/reset-password?token=secret123']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: 'NewSecurePassword123' }
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'NewSecurePassword123' }
    });

    fireEvent.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/auth/reset-password', {
        token: 'secret123',
        newPassword: 'NewSecurePassword123'
      });
    });

    expect(await screen.findByText('Password changed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in with new password/i })).toBeInTheDocument();
  });
});
