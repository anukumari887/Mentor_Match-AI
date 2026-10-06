import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MentorBrowsePage from './MentorBrowsePage';

const { listMentors } = vi.hoisted(() => ({ listMentors: vi.fn() }));

vi.mock('../services/mentors', () => ({ listMentors }));

const mentor = {
  id: 'mentor-id',
  name: 'Asha Rao',
  headline: 'Software engineering mentor',
  bio: 'Guidance for growing engineers.',
  skills: ['JavaScript', 'Node.js'],
  pricePerHour: 900,
  ratingAvg: 4.8,
  ratingCount: 12,
  experienceYears: 8
};

describe('MentorBrowsePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits search filters and renders matching mentors', async () => {
    listMentors.mockResolvedValue({ items: [mentor], total: 1, page: 1, pages: 1 });
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><MentorBrowsePage /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Asha Rao' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Name or keyword'), { target: { value: 'career change' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply filters/ }));

    await waitFor(() => expect(listMentors).toHaveBeenLastCalledWith(expect.objectContaining({
      q: 'career change',
      sort: 'rating',
      page: 1,
      limit: 12
    })));
    expect(screen.getByRole('link', { name: /View profile/ })).toHaveAttribute('href', '/mentors/mentor-id');
  });

  it('shows an empty state when no mentors match', async () => {
    listMentors.mockResolvedValue({ items: [], total: 0, page: 1, pages: 0 });
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><MentorBrowsePage /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: /No mentors match those filters/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });
});