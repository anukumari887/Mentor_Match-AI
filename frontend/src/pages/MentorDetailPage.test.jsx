import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import MentorDetailPage from './MentorDetailPage';
import { createBooking, getMentor, listMentorSlots } from '../services/mentors';
import { listMentorReviews } from '../services/reviews';

vi.mock('../services/mentors', () => ({
  createBooking: vi.fn(),
  getMentor: vi.fn(),
  listMentorSlots: vi.fn()
}));

vi.mock('../services/reviews', () => ({ listMentorReviews: vi.fn() }));

function CurrentPath() {
  const location = useLocation();
  return <output>{location.pathname}</output>;
}

describe('MentorDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMentor.mockResolvedValue({
      id: 'mentor-id',
      name: 'Asha Rao',
      headline: 'Software mentor',
      bio: 'Practical career advice.',
      skills: ['JavaScript'],
      pricePerHour: 900,
      experienceYears: 8,
      ratingAvg: 0,
      ratingCount: 0,
      availability: [],
      timezone: 'Asia/Kolkata'
    });
    listMentorSlots.mockResolvedValue({
      slots: [{ startTime: '2026-12-02T10:00:00.000Z', endTime: '2026-12-02T11:00:00.000Z', available: true }]
    });
    listMentorReviews.mockResolvedValue({ reviews: [] });
  });

  it('creates a booking when a learner selects an available slot', async () => {
    createBooking.mockResolvedValue({ _id: 'booking-id' });
    render(
      <MemoryRouter initialEntries={['/mentors/mentor-id']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/mentors/:id" element={<MentorDetailPage />} />
          <Route path="/checkout/:bookingId" element={<CurrentPath />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Asha Rao' });
    fireEvent.click(screen.getByRole('button', { name: /2 Dec/ }));

    await waitFor(() => expect(createBooking).toHaveBeenCalledWith({
      mentorId: 'mentor-id',
      startTime: '2026-12-02T10:00:00.000Z'
    }));
    expect(await screen.findByText('/checkout/booking-id')).toBeInTheDocument();
  });

  it('displays verified learner reviews on the mentor detail page', async () => {
    listMentorReviews.mockResolvedValue({ reviews: [{
      id: 'review-id',
      learnerName: 'Diya Shah',
      rating: 5,
      comment: 'Helpful feedback with practical next steps.'
    }] });
    render(
      <MemoryRouter initialEntries={['/mentors/mentor-id']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes><Route path="/mentors/:id" element={<MentorDetailPage />} /></Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Learner reviews' })).toBeInTheDocument();
    expect(await screen.findByText('Helpful feedback with practical next steps.')).toBeInTheDocument();
    expect(screen.getByText('Diya Shah')).toBeInTheDocument();
  });
});