import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VideoRoomPage from './VideoRoomPage';
import { getBooking } from '../services/mentors';
import { connectVideoSocket, getRoomDetails } from '../services/video';

vi.mock('../services/mentors', () => ({ getBooking: vi.fn() }));
vi.mock('../services/video', () => ({ connectVideoSocket: vi.fn(), getRoomDetails: vi.fn() }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: 'learner' } }) }));

describe('VideoRoomPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBooking.mockResolvedValue({
      _id: 'booking-id',
      mentorId: { name: 'Asha Rao' },
      startTime: '2026-12-02T10:00:00.000Z',
      endTime: '2026-12-02T11:00:00.000Z'
    });
  });

  it('explains when the join window is closed and does not request media', async () => {
    getRoomDetails.mockResolvedValue({
      canJoin: false,
      opensAt: '2026-12-02T09:50:00.000Z',
      closesAt: '2026-12-02T11:15:00.000Z',
      iceServers: []
    });
    render(
      <MemoryRouter initialEntries={['/session/booking-id']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes><Route path="/session/:bookingId" element={<VideoRoomPage />} /></Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'This room is not open yet' })).toBeInTheDocument();
    expect(connectVideoSocket).not.toHaveBeenCalled();
  });

  it('shows permission guidance if the browser has no media API', async () => {
    getRoomDetails.mockResolvedValue({ canJoin: true, opensAt: '', closesAt: '', iceServers: [] });
    const mediaDescriptor = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    const view = render(
      <MemoryRouter initialEntries={['/session/booking-id']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes><Route path="/session/:bookingId" element={<VideoRoomPage />} /></Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Video calls need a camera-enabled browser on localhost or HTTPS.');
    expect(connectVideoSocket).not.toHaveBeenCalled();

    view.unmount();
    if (mediaDescriptor) Object.defineProperty(navigator, 'mediaDevices', mediaDescriptor);
    else delete navigator.mediaDevices;
  });
});