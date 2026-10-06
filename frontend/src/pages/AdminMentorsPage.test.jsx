import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminMentorsPage from './AdminMentorsPage';

const { approveMentor, listPendingMentors, rejectMentor } = vi.hoisted(() => ({
  approveMentor: vi.fn(),
  listPendingMentors: vi.fn(),
  rejectMentor: vi.fn()
}));

vi.mock('../services/mentors', () => ({ approveMentor, listPendingMentors, rejectMentor }));

const pendingMentor = {
  id: 'mentor-id',
  name: 'Kabir Sethi',
  headline: 'Backend mentor',
  bio: 'Practical backend guidance.',
  skills: ['Node.js'],
  experienceYears: 5,
  pricePerHour: 650
};

describe('AdminMentorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPendingMentors.mockResolvedValue({ items: [pendingMentor] });
  });

  it('approves a pending profile and removes it from the queue', async () => {
    approveMentor.mockResolvedValueOnce({});
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AdminMentorsPage /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Kabir Sethi' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Approve profile/ }));

    await waitFor(() => expect(approveMentor).toHaveBeenCalledWith('mentor-id'));
    expect(await screen.findByRole('heading', { name: /No profiles waiting for review/ })).toBeInTheDocument();
  });

  it('requires a reason before rejecting a profile', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AdminMentorsPage /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Kabir Sethi' });
    fireEvent.click(screen.getByRole('button', { name: /Reject profile/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Add a short reason before rejecting this profile.');
    expect(rejectMentor).not.toHaveBeenCalled();
  });
});