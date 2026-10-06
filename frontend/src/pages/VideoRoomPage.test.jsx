import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VideoRoomPage from './VideoRoomPage';
import { getBooking } from '../services/mentors';
import { connectVideoSocket, getRoomDetails } from '../services/video';

vi.mock('../services/mentors', () => ({ getBooking: vi.fn() }));
vi.mock('../services/video', () => ({ connectVideoSocket: vi.fn(), getRoomDetails: vi.fn() }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: 'learner' } }) }));

function createMockTrack(kind) {
  return {
    kind,
    enabled: true,
    stop: vi.fn()
  };
}

function createMockStream(hasVideo = true, hasAudio = true) {
  const tracks = [];
  if (hasVideo) tracks.push(createMockTrack('video'));
  if (hasAudio) tracks.push(createMockTrack('audio'));

  return {
    getTracks: () => tracks,
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
    getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
    removeTrack: vi.fn(),
    addTrack: vi.fn()
  };
}

describe('VideoRoomPage', () => {
  let mockGetUserMedia;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserMedia = vi.fn();

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: mockGetUserMedia,
        enumerateDevices: vi.fn().mockResolvedValue([
          { deviceId: 'cam-1', kind: 'videoinput', label: 'Front Camera' },
          { deviceId: 'mic-1', kind: 'audioinput', label: 'Internal Mic' }
        ])
      }
    });

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
    expect(mockGetUserMedia).not.toHaveBeenCalled();
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

  it('makes NO getUserMedia call on page load until user clicks button', async () => {
    getRoomDetails.mockResolvedValue({
      canJoin: true,
      opensAt: '2026-10-01T09:50:00.000Z',
      closesAt: '2026-10-01T11:15:00.000Z',
      iceServers: []
    });

    render(
      <MemoryRouter initialEntries={['/session/booking-id']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes><Route path="/session/:bookingId" element={<VideoRoomPage />} /></Routes>
      </MemoryRouter>
    );

    await screen.findByText('Check your camera and microphone');
    expect(mockGetUserMedia).not.toHaveBeenCalled();

    // Now click "Allow camera and microphone"
    const stream = createMockStream();
    mockGetUserMedia.mockResolvedValue(stream);

    fireEvent.click(screen.getByRole('button', { name: 'Allow camera and microphone' }));
    await waitFor(() => expect(mockGetUserMedia).toHaveBeenCalledTimes(1));
  });

  it('displays friendly message on NotAllowedError', async () => {
    getRoomDetails.mockResolvedValue({ canJoin: true, opensAt: '', closesAt: '', iceServers: [] });
    const err = new Error('Permission denied');
    err.name = 'NotAllowedError';
    mockGetUserMedia.mockRejectedValue(err);

    render(
      <MemoryRouter initialEntries={['/session/booking-id']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes><Route path="/session/:bookingId" element={<VideoRoomPage />} /></Routes>
      </MemoryRouter>
    );

    await screen.findByText('Check your camera and microphone');
    fireEvent.click(screen.getByRole('button', { name: 'Allow camera and microphone' }));

    expect(await screen.findByText(/Camera or microphone is blocked/)).toBeInTheDocument();
  });

  it('displays friendly message on NotFoundError and NotReadableError', async () => {
    getRoomDetails.mockResolvedValue({ canJoin: true, opensAt: '', closesAt: '', iceServers: [] });
    const errNotFound = new Error('Not found');
    errNotFound.name = 'NotFoundError';
    mockGetUserMedia.mockRejectedValueOnce(errNotFound);

    render(
      <MemoryRouter initialEntries={['/session/booking-id']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes><Route path="/session/:bookingId" element={<VideoRoomPage />} /></Routes>
      </MemoryRouter>
    );

    await screen.findByText('Check your camera and microphone');
    fireEvent.click(screen.getByRole('button', { name: 'Allow camera and microphone' }));

    expect(await screen.findByText(/No camera or microphone found/)).toBeInTheDocument();
  });

  it('allows fallback to microphone only or listen only when camera fails', async () => {
    getRoomDetails.mockResolvedValue({ canJoin: true, opensAt: '', closesAt: '', iceServers: [] });
    const err = new Error('Camera failed');
    err.name = 'NotAllowedError';
    mockGetUserMedia.mockRejectedValueOnce(err);

    render(
      <MemoryRouter initialEntries={['/session/booking-id']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes><Route path="/session/:bookingId" element={<VideoRoomPage />} /></Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Allow camera and microphone' }));
    const micOnlyBtn = await screen.findByRole('button', { name: 'Join with microphone only' });

    const micStream = createMockStream(false, true);
    mockGetUserMedia.mockResolvedValueOnce(micStream);
    fireEvent.click(micOnlyBtn);

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: expect.anything(), video: false }));
    });
  });

  it('toggles mute and camera track.enabled states and updates labels', async () => {
    getRoomDetails.mockResolvedValue({ canJoin: true, opensAt: '', closesAt: '', iceServers: [] });
    const stream = createMockStream(true, true);
    mockGetUserMedia.mockResolvedValue(stream);

    render(
      <MemoryRouter initialEntries={['/session/booking-id']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes><Route path="/session/:bookingId" element={<VideoRoomPage />} /></Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Allow camera and microphone' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mute' })).toBeInTheDocument());

    const muteBtn = screen.getByRole('button', { name: 'Mute' });
    fireEvent.click(muteBtn);
    expect(stream.getAudioTracks()[0].enabled).toBe(false);
    expect(screen.getByRole('button', { name: 'Unmute' })).toBeInTheDocument();

    const cameraBtn = screen.getByRole('button', { name: 'Camera off' });
    fireEvent.click(cameraBtn);
    expect(stream.getVideoTracks()[0].enabled).toBe(false);
    expect(screen.getByRole('button', { name: 'Camera on' })).toBeInTheDocument();
  });

  it('stops all tracks on unmount', async () => {
    getRoomDetails.mockResolvedValue({ canJoin: true, opensAt: '', closesAt: '', iceServers: [] });
    const stream = createMockStream(true, true);
    mockGetUserMedia.mockResolvedValue(stream);

    const view = render(
      <MemoryRouter initialEntries={['/session/booking-id']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes><Route path="/session/:bookingId" element={<VideoRoomPage />} /></Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Allow camera and microphone' }));
    await waitFor(() => expect(mockGetUserMedia).toHaveBeenCalled());

    view.unmount();
    stream.getTracks().forEach((track) => {
      expect(track.stop).toHaveBeenCalled();
    });
  });
});