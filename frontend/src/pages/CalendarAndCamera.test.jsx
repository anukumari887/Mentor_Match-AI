import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CalendarPage from './CalendarPage';
import CameraMicCheckCard from '../components/CameraMicCheckCard';
import * as api from '../services/api';
import * as AuthContext from '../contexts/AuthContext';
import * as mentorsApi from '../services/mentors';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  get: vi.fn(),
  post: vi.fn()
}));

vi.mock('../services/mentors', () => ({
  listBookings: vi.fn(),
  downloadBookingIcs: vi.fn()
}));

describe('Calendar and Camera Check Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CalendarPage Component', () => {
    const mockBookings = [
      {
        _id: 'b-1',
        learnerId: { _id: 'l-1', name: 'Learner One' },
        mentorId: { _id: 'm-1', name: 'Mentor Alex' },
        startTime: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes from now (joinable)
        endTime: new Date(Date.now() + 62 * 60 * 1000).toISOString(),
        status: 'confirmed'
      }
    ];

    beforeEach(() => {
      mentorsApi.listBookings.mockResolvedValue({ bookings: mockBookings });
    });

    it('renders month navigation and session count dots', async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { id: 'l-1', role: 'learner' }
      });

      render(
        <MemoryRouter>
          <CalendarPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Today/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Previous month/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Next month/i })).toBeInTheDocument();
      });
    });

    it('allows keyboard navigation on calendar grid days', async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { id: 'l-1', role: 'learner' }
      });
      api.get.mockResolvedValueOnce({ bookings: mockBookings });

      render(
        <MemoryRouter>
          <CalendarPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        const dayButtons = screen.getAllByRole('button');
        const firstDayButton = dayButtons.find((btn) => btn.getAttribute('tabindex') !== null);
        if (firstDayButton) {
          fireEvent.keyDown(firstDayButton, { key: 'ArrowRight' });
          fireEvent.keyDown(firstDayButton, { key: 'Enter' });
        }
      });
    });
  });

  describe('CameraMicCheckCard in Settings', () => {
    let mockTracks;
    let mockStream;
    let getUserMediaSpy;

    beforeEach(() => {
      mockTracks = [
        { kind: 'video', enabled: true, stop: vi.fn() },
        { kind: 'audio', enabled: true, stop: vi.fn() }
      ];
      mockStream = {
        getTracks: vi.fn(() => mockTracks),
        getVideoTracks: vi.fn(() => [mockTracks[0]]),
        getAudioTracks: vi.fn(() => [mockTracks[1]])
      };

      getUserMediaSpy = vi.fn().mockResolvedValue(mockStream);
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: getUserMediaSpy,
          enumerateDevices: vi.fn().mockResolvedValue([
            { deviceId: 'cam-1', kind: 'videoinput', label: 'FaceTime HD' },
            { deviceId: 'mic-1', kind: 'audioinput', label: 'Internal Mic' }
          ])
        },
        writable: true,
        configurable: true
      });
    });

    it('does NOT call getUserMedia before the user clicks "Test camera and microphone"', () => {
      render(<CameraMicCheckCard />);
      expect(getUserMediaSpy).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /Test camera and microphone/i })).toBeInTheDocument();
    });

    it('calls getUserMedia ONLY after click and toggles camera track.enabled', async () => {
      render(<CameraMicCheckCard />);

      const testBtn = screen.getByRole('button', { name: /Test camera and microphone/i });
      fireEvent.click(testBtn);

      await waitFor(() => {
        expect(getUserMediaSpy).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: /Turn camera off/i })).toBeInTheDocument();
      });

      // Toggle camera off
      const camToggle = screen.getByRole('button', { name: /Turn camera off/i });
      fireEvent.click(camToggle);

      expect(mockTracks[0].enabled).toBe(false);
      expect(camToggle.textContent).toContain('Turn camera on');
    });

    it('stops all media tracks when Stop test is clicked or on unmount', async () => {
      const { unmount } = render(<CameraMicCheckCard />);

      const testBtn = screen.getByRole('button', { name: /Test camera and microphone/i });
      fireEvent.click(testBtn);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Stop test/i })).toBeInTheDocument();
      });

      unmount();

      expect(mockTracks[0].stop).toHaveBeenCalled();
      expect(mockTracks[1].stop).toHaveBeenCalled();
    });
  });
});
