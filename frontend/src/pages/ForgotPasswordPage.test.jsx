import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordPage from './ForgotPasswordPage';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: {
    post: vi.fn()
  }
}));

describe('ForgotPasswordPage Component', () => {
  it('renders form and sends reset link with constant confirmation text', async () => {
    api.post.mockResolvedValueOnce({ data: { message: 'If an account exists for that email, we have sent a reset link.' } });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();

    const input = screen.getByLabelText(/email address/i);
    fireEvent.change(input, { target: { value: 'user@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/auth/forgot-password', {
        email: 'user@example.com'
      });
    });

    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
    expect(screen.getByText(/if an account exists/i)).toBeInTheDocument();
  });
});
