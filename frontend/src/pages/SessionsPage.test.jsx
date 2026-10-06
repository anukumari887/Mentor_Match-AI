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

  it('renders payment status badges and refund messages accurately for learner bookings', async () => {
    const upcomingPaid = {
      _id: 'paid-booking',
      mentorId: { _id: 'mentor-1', name: 'Dev Lead' },
      startTime: new Date(Date.now() + 3600000).toISOString(),
      endTime: new Date(Date.now() + 7200000).toISOString(),
      priceAtBooking: 1000,
      status: 'confirmed',
      paymentStatus: 'paid'
    };

    const cancelledRefundDue = {
      _id: 'refund-due-booking',
      mentorId: { _id: 'mentor-2', name: 'Cloud Architect' },
      startTime: new Date(Date.now() + 86400000).toISOString(),
      endTime: new Date(Date.now() + 90000000).toISOString(),
      priceAtBooking: 1200,
      status: 'cancelled',
      paymentStatus: 'refund_due'
    };

    const cancelledRefunded = {
      _id: 'refunded-booking',
      mentorId: { _id: 'mentor-3', name: 'System Designer' },
      startTime: new Date(Date.now() + 186400000).toISOString(),
      endTime: new Date(Date.now() + 190000000).toISOString(),
      priceAtBooking: 1500,
      status: 'cancelled',
      paymentStatus: 'refunded',
      refundReference: 'rfnd_demo_123'
    };

    const cancelledLate = {
      _id: 'late-cancel-booking',
      mentorId: { _id: 'mentor-4', name: 'Frontend Lead' },
      startTime: new Date(Date.now() + 286400000).toISOString(),
      endTime: new Date(Date.now() + 290000000).toISOString(),
      priceAtBooking: 800,
      status: 'cancelled',
      paymentStatus: 'paid',
      cancelledBy: 'learner',
      paymentEarned: true
    };

    listBookings.mockResolvedValue([upcomingPaid, cancelledRefundDue, cancelledRefunded, cancelledLate]);

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SessionsPage />
      </MemoryRouter>
    );

    // Upcoming tab shows "Paid" badge
    expect(await screen.findByText('Paid')).toBeInTheDocument();

    // Switch to Cancelled tab
    fireEvent.click(screen.getByRole('tab', { name: 'Cancelled' }));

    // Badges
    expect(await screen.findByText('Refund pending')).toBeInTheDocument();
    expect(screen.getByText('Refunded (rfnd_demo_123)')).toBeInTheDocument();
    expect(screen.getByText('No refund (cancelled late)')).toBeInTheDocument();

    // Refund notice copy
    expect(screen.getByText(/refund pending: we will update this page when it is processed/i)).toBeInTheDocument();
    expect(screen.getByText(/refunded\. it can take several working days to reach your account/i)).toBeInTheDocument();
  });
});