import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuthPage from './AuthPage';

const { login, register } = vi.hoisted(() => ({ login: vi.fn(), register: vi.fn() }));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false, login, register }),
}));

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits registration details with the selected role', async () => {
    register.mockResolvedValueOnce({});
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthPage mode="register" /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText(/Your name/), { target: { value: 'Asha Rao' } });
    fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: 'asha@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'strongpass123' } });
    fireEvent.click(screen.getByLabelText('Mentor'));
    fireEvent.click(screen.getByRole('button', { name: /Create account/ }));

    await waitFor(() => expect(register).toHaveBeenCalledWith({
      name: 'Asha Rao',
      email: 'asha@example.com',
      password: 'strongpass123',
      role: 'mentor',
    }));
  });

  it('shows backend login errors without losing the form', async () => {
    login.mockRejectedValueOnce({ message: 'Invalid email or password.' });
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthPage mode="login" /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: 'asha@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
    expect(screen.getByLabelText(/Email address/)).toHaveValue('asha@example.com');
  });
});