import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from './ProfilePage';
import api from '../services/api';

const { user } = vi.hoisted(() => ({
  user: { id: 'mentor-1', name: 'Asha Rao', email: 'asha@example.com', role: 'mentor' },
}));

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), put: vi.fn() },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user,
    loading: false,
    updateProfile: vi.fn(),
  }),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { profile: { availability: [], skills: [], timezone: 'Asia/Kolkata' } } });
  });

  it('blocks overlapping weekly windows before saving', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ProfilePage /></MemoryRouter>);
    await screen.findByLabelText('Headline');

    fireEvent.click(screen.getByRole('button', { name: /Add time/ }));
    fireEvent.click(screen.getByRole('button', { name: /Add time/ }));
    fireEvent.click(screen.getByRole('button', { name: /Save profile/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Availability windows overlap on Monday.');
    expect(api.put).not.toHaveBeenCalled();
  });

  it('saves the mentor profile using the existing profile endpoint', async () => {
    api.put.mockResolvedValueOnce({ data: { profile: { headline: 'Engineering mentor', availability: [] } } });
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ProfilePage /></MemoryRouter>);

    fireEvent.change(await screen.findByLabelText('Headline'), { target: { value: 'Engineering mentor' } });
    fireEvent.click(screen.getByRole('button', { name: /Save profile/ }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/profile', expect.objectContaining({
      headline: 'Engineering mentor',
      timezone: 'Asia/Kolkata',
      availability: [],
    })));
    expect(await screen.findByRole('status')).toHaveTextContent('Your changes have been saved.');
  });
});