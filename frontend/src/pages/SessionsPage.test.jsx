import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SessionsPage from './SessionsPage';
import { cancelBooking, listBookings } from '../services/mentors';
import { submitReview } from '../services/reviews';

vi.mock('../services/mentors', () => ({
  cancelBooking: vi.fn(),
  listBookings: vi.fn()
}));

vi.mock('../services/reviews', () => ({ submitReview: vi.fn() }));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'learner' } })
}));

describe('SessionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists upcoming bookings and requires confirmation before cancellation', async () => {
    const booking = {
      _id: 'booking-id',
      mentorId: { _id: 'mentor-id', name: 'Asha Rao' },
      startTime: new Date(Date.now() + 3600000).toISOString(),
      endTime: new Date(Date.now() + 7200000).toISOString(),
      priceAtBooking: 900,
      status: 'pending'
    };
    listBookings.mockResolvedValue([booking]);
    cancelBooking.mockResolvedValue({ ...booking, status: 'cancelled' });
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><SessionsPage /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Session with Asha Rao' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Confirm cancellation' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));

    expect(await screen.findByRole('heading', { name: /No upcoming sessions/ })).toBeInTheDocument();
    expect(cancelBooking).toHaveBeenCalledWith('booking-id', 'Cancelled by participant.');
  });

  it('submits a review for a completed session and marks it reviewed', async () => {
    const booking = {
      _id: 'completed-booking-id',
      mentorId: { _id: 'mentor-id', name: 'Asha Rao' },
      startTime: new Date(Date.now() - 86400000).toISOString(),
      endTime: new Date(Date.now() - 82800000).toISOString(),
      priceAtBooking: 900,
      status: 'completed',
      hasReview: false
    };
    listBookings.mockResolvedValue([booking]);
    submitReview.mockResolvedValue({ rating: 5 });
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><SessionsPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('tab', { name: 'Past' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Leave a review' }));
    fireEvent.change(screen.getByLabelText('Your review'), { target: { value: 'Very useful session.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Review submitted. Thank you.');
    expect(submitReview).toHaveBeenCalledWith({ bookingId: 'completed-booking-id', rating: 5, comment: 'Very useful session.' });
  });
});