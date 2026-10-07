import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';
import VerificationBanner from './VerificationBanner';
import ChatNotificationListener from './ChatNotificationListener';
import DashboardPage from '../pages/DashboardPage';
import MentorEarningsPage from '../pages/MentorEarningsPage';
import AdminPage from '../pages/AdminPage';
import { ThemeProvider } from '../contexts/ThemeContext';
import * as AuthContext from '../contexts/AuthContext';
import * as api from '../services/api';
import * as chatService from '../services/chat';

vi.mock('../services/api', () => {
  const mockApi = {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({})
  };
  return {
    default: mockApi,
    ...mockApi
  };
});

vi.mock('../services/chat', () => ({
  getUnreadCount: vi.fn().mockResolvedValue(0)
}));

describe('Notifications, Banner & Dashboard Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Navbar Red Dot and Unread Count', () => {
    it('shows red dot badge with number and proper aria-label when unreadCount > 0', async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { id: 'u1', name: 'Learner User', role: 'learner' },
        logout: vi.fn()
      });
      vi.spyOn(chatService, 'getUnreadCount').mockResolvedValue(3);

      render(
        <MemoryRouter>
          <ThemeProvider>
            <Navbar />
          </ThemeProvider>
        </MemoryRouter>
      );

      const badge = await screen.findByText('3');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('aria-label', '3 unread messages');
    });

    it('shows 9+ when unreadCount exceeds 9', async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { id: 'u1', name: 'Learner User', role: 'learner' },
        logout: vi.fn()
      });
      vi.spyOn(chatService, 'getUnreadCount').mockResolvedValue(15);

      render(
        <MemoryRouter>
          <ThemeProvider>
            <Navbar />
          </ThemeProvider>
        </MemoryRouter>
      );

      const badge = await screen.findByText('9+');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('aria-label', '15 unread messages');
    });

    it('hides red dot when unreadCount is 0', async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { id: 'u1', name: 'Learner User', role: 'learner' },
        logout: vi.fn()
      });
      vi.spyOn(chatService, 'getUnreadCount').mockResolvedValue(0);

      render(
        <MemoryRouter>
          <ThemeProvider>
            <Navbar />
          </ThemeProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByLabelText(/unread messages/i)).toBeNull();
      });
    });
  });

  describe('Verification Banner Component', () => {
    it('shows verification banner for unverified learners and mentors', () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { id: 'u1', email: 'unverified@test.com', role: 'learner', emailVerified: false }
      });

      render(
        <MemoryRouter>
          <VerificationBanner />
        </MemoryRouter>
      );

      expect(screen.getByText(/Please verify your email/i)).toBeInTheDocument();
      expect(screen.getByText(/unverified@test.com/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /resend link/i })).toBeInTheDocument();
    });

    it('does NOT show verification banner for verified users or admins', () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { id: 'u1', email: 'admin@test.com', role: 'admin', emailVerified: false }
      });

      const { container } = render(
        <MemoryRouter>
          <VerificationBanner />
        </MemoryRouter>
      );

      expect(container.firstChild).toBeNull();
    });

    it('disables resend button with countdown after clicking', async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { id: 'u1', email: 'unverified@test.com', role: 'learner', emailVerified: false }
      });
      api.post.mockResolvedValueOnce({ message: 'Verification link sent.' });

      render(
        <MemoryRouter>
          <VerificationBanner />
        </MemoryRouter>
      );

      const button = screen.getByRole('button', { name: /resend link/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toBeDisabled();
        expect(button.textContent).toMatch(/60s/i);
      });
    });
  });

  describe('Dashboard Greetings (Learner, Mentor, Admin)', () => {
    it('renders "Welcome back, <name>" on Learner Dashboard with name truncation fallback', async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { id: 'u1', name: 'Dr. Jane Super Long Name For Mentorship Platform Testing', role: 'learner' }
      });
      api.get.mockResolvedValue({ bookings: [], total: 0 });

      render(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      );

      const greeting = screen.getByText(/Welcome back, Dr. Jane Super Long Name/i);
      expect(greeting).toBeInTheDocument();
      expect(greeting).toHaveAttribute('title', 'Dr. Jane Super Long Name For Mentorship Platform Testing');
    });

    it('renders "Welcome back" fallback on Learner Dashboard when name is empty', async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { id: 'u1', name: '', role: 'learner' }
      });
      api.get.mockResolvedValue({ bookings: [], total: 0 });

      render(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Welcome back')).toBeInTheDocument();
    });

    it('renders "Welcome back, <name>" on Mentor Dashboard', async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { id: 'u2', name: 'Alex Mentor', role: 'mentor' }
      });
      api.get.mockResolvedValue({ totalEarnings: 0, pendingPayouts: 0, completedSessions: 0 });

      render(
        <MemoryRouter>
          <MentorEarningsPage />
        </MemoryRouter>
      );

      expect(screen.getByText(/Welcome back, Alex Mentor/i)).toBeInTheDocument();
    });

    it('renders "Welcome back, <name>" on Admin Dashboard', async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { id: 'u3', name: 'Chief Administrator', role: 'admin' }
      });
      api.get.mockResolvedValue({ stats: {} });

      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      );

      expect(screen.getByText(/Welcome back, Chief Administrator/i)).toBeInTheDocument();
    });
  });
});
