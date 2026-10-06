import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CheckoutPage from './CheckoutPage';
import { cancelBooking, getBooking } from '../services/mentors';
import { confirmMockPayment, createPaymentOrder } from '../services/payments';

vi.mock('../services/mentors', () => ({
  cancelBooking: vi.fn(),
  getBooking: vi.fn()
}));

vi.mock('../services/payments', () => ({
  confirmMockPayment: vi.fn(),
  createPaymentOrder: vi.fn(),
  verifyRazorpayPayment: vi.fn()
}));

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a live hold countdown and confirms cancellation', async () => {
    getBooking.mockResolvedValue({
      _id: 'booking-id',
      mentorId: { _id: 'mentor-id', name: 'Asha Rao' },
      startTime: new Date(Date.now() + 86400000).toISOString(),
      priceAtBooking: 900,
      expiresAt: new Date(Date.now() + 5 * 60000).toISOString(),
      status: 'pending'
    });
    cancelBooking.mockResolvedValue({
      _id: 'booking-id',
      mentorId: { _id: 'mentor-id', name: 'Asha Rao' },
      startTime: new Date(Date.now() + 86400000).toISOString(),
      priceAtBooking: 900,
      expiresAt: new Date(Date.now() + 5 * 60000).toISOString(),
      status: 'cancelled'
    });
    render(
      <MemoryRouter initialEntries={['/checkout/booking-id']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes><Route path="/checkout/:bookingId" element={<CheckoutPage />} /></Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Time remaining: 04:59|Time remaining: 05:00/)).toBeInTheDocument();
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel hold' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));

    expect(await screen.findByText('This booking is cancelled.')).toBeInTheDocument();
    expect(cancelBooking).toHaveBeenCalledWith('booking-id', 'Cancelled from checkout.');
  });

  it('clearly identifies an expired hold', async () => {
    getBooking.mockResolvedValue({
      _id: 'booking-id',
      mentorId: { _id: 'mentor-id', name: 'Asha Rao' },
      startTime: new Date(Date.now() + 86400000).toISOString(),
      priceAtBooking: 900,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      status: 'pending'
    });
    render(
      <MemoryRouter initialEntries={['/checkout/booking-id']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes><Route path="/checkout/:bookingId" element={<CheckoutPage />} /></Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Your hold expired' })).toBeInTheDocument();
  });

  it('shows the mock test banner and confirms payment through the API', async () => {
    getBooking.mockResolvedValue({
      _id: 'booking-id',
      mentorId: { _id: 'mentor-id', name: 'Asha Rao' },
      startTime: new Date(Date.now() + 86400000).toISOString(),
      priceAtBooking: 900,
      expiresAt: new Date(Date.now() + 5 * 60000).toISOString(),
      status: 'pending'
    });
    createPaymentOrder.mockResolvedValue({ gateway: 'mock', orderId: 'mock-order', amount: 90000, currency: 'INR' });
    confirmMockPayment.mockResolvedValue({ payment: { status: 'paid' }, booking: { status: 'confirmed' } });
    render(
      <MemoryRouter initialEntries={['/checkout/booking-id']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes><Route path="/checkout/:bookingId" element={<CheckoutPage />} /></Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Continue to payment' }));
    expect(await screen.findByText('Test mode: no real money is charged.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pay now (test)' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Payment confirmed. Your session is booked.');
    expect(createPaymentOrder).toHaveBeenCalledWith('booking-id');
    expect(confirmMockPayment).toHaveBeenCalledWith('booking-id');
  });
});