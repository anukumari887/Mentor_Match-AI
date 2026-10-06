import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminPage from './AdminPage';
import { getAdminStats, getAdminUsers, getPayoutsSummary, getAdminPayouts } from '../services/admin';

vi.mock('../services/admin', () => ({
  getAdminStats: vi.fn(),
  getAdminUsers: vi.fn(),
  updateUserStatus: vi.fn(),
  getAdminBookings: vi.fn(),
  getAdminPayments: vi.fn(),
  markPaymentRefunded: vi.fn(),
  getPayoutsSummary: vi.fn(),
  recordPayout: vi.fn(),
  getAdminPayouts: vi.fn(),
  getAdminComplaints: vi.fn(),
  resolveComplaint: vi.fn(),
  submitComplaint: vi.fn()
}));

vi.mock('../services/mentors', () => ({
  listPendingMentors: vi.fn().mockResolvedValue({ items: [] }),
  approveMentor: vi.fn(),
  rejectMentor: vi.fn()
}));

const mockStats = {
  users: { total: 15, learners: 10, mentors: 4, admins: 1 },
  mentors: { total: 4, pending: 1, approved: 3, rejected: 0 },
  bookings: { total: 10, pending: 1, confirmed: 3, completed: 5, cancelled: 1, expired: 0 },
  financials: { gmv: 500000, platformFees: 75000, owedToMentors: 350000, totalPaidOut: 75000 },
  refundsDue: { count: 1, amount: 50000 },
  recommendationBookingRate: 25.0
};

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdminStats.mockResolvedValue(mockStats);
    getAdminUsers.mockResolvedValue({ items: [{ _id: 'u1', name: 'John Doe', email: 'john@example.com', role: 'learner', isActive: true, createdAt: new Date().toISOString() }], total: 1 });
    getPayoutsSummary.mockResolvedValue({ summary: [] });
    getAdminPayouts.mockResolvedValue({ payouts: [] });
  });

  it('renders overview metrics cards with accurate values', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AdminPage /></MemoryRouter>);

    expect(await screen.findByText('Platform Operations')).toBeInTheDocument();
    expect(await screen.findByText('Gross Merchandise Value')).toBeInTheDocument();
    expect(await screen.findByText('Rs. 5,000')).toBeInTheDocument(); // 500000 paise
    expect(await screen.findByText('Platform Revenue')).toBeInTheDocument();
    expect(await screen.findByText('Rs. 750')).toBeInTheDocument(); // 75000 paise
  });

  it('switches between admin tabs and renders user table', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AdminPage /></MemoryRouter>);

    await screen.findByText('Platform Operations');
    fireEvent.click(screen.getByRole('button', { name: /Users/ }));

    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeInTheDocument();
  });
});
