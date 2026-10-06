import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from './SettingsPage';
import * as AuthContext from '../contexts/AuthContext';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: {
    post: vi.fn()
  }
}));

describe('SettingsPage Component', () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { name: 'Asha Rao', email: 'asha@example.com', role: 'learner' },
      logout: mockLogout
    });
  });

  it('renders account info in read-only form', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Account information')).toBeInTheDocument();
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('asha@example.com')).toBeInTheDocument();
  });

  it('validates password mismatch before calling API', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'CurrentPass123' } });
    fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: 'NewPassword123' } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'MismatchPassword123' } });

    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('submits change password and displays success message', async () => {
    api.post.mockResolvedValueOnce({ data: { message: 'Password changed successfully.' } });

    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'CurrentPass123' } });
    fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: 'NewPassword123' } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'NewPassword123' } });

    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/auth/change-password', {
        currentPassword: 'CurrentPass123',
        newPassword: 'NewPassword123'
      });
    });

    expect(await screen.findByText(/password was updated successfully/i)).toBeInTheDocument();
  });

  it('opens confirmation modal when clicking sign out of all devices', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /sign out everywhere/i });
    fireEvent.click(button);

    expect(screen.getByText(/sign out of all devices\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm sign out everywhere/i })).toBeInTheDocument();
  });
});
