import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MessagesPage from './MessagesPage';
import {
  listConversations,
  listMessages,
  markChatRead,
  sendMessage
} from '../services/chat';
import { getChatSocket } from '../services/socket';

vi.mock('../services/chat', () => ({
  listConversations: vi.fn(),
  listMessages: vi.fn(),
  markChatRead: vi.fn().mockResolvedValue({}),
  sendMessage: vi.fn()
}));

const mockSocket = {
  connected: true,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn()
};
vi.mock('../services/socket', () => ({
  getChatSocket: () => mockSocket
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'learner-1', _id: 'learner-1', role: 'learner', name: 'Student' } })
}));

describe('MessagesPage', () => {
  const mockConversation = {
    _id: 'conv-123',
    learnerId: 'learner-1',
    mentorId: 'mentor-1',
    canSend: true,
    validUntil: new Date(Date.now() + 86400000).toISOString(),
    unreadCount: 2,
    lastMessagePreview: 'Hello mentor',
    lastMessageAt: new Date().toISOString(),
    otherUser: { _id: 'mentor-1', id: 'mentor-1', name: 'Dr. John Doe', role: 'mentor' }
  };

  const mockMessage = {
    _id: 'msg-1',
    conversationId: 'conv-123',
    senderId: 'mentor-1',
    body: 'Hello there, how can I help you?',
    createdAt: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    listConversations.mockResolvedValue([mockConversation]);
    listMessages.mockResolvedValue({ messages: [mockMessage], hasMore: false });
  });

  it('renders conversations and unread badges', async () => {
    render(
      <MemoryRouter initialEntries={['/messages']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/messages" element={<MessagesPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Dr. John Doe')).toBeInTheDocument();
    expect(screen.getByText('Hello mentor')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders messages as plain text, escaping HTML without execution', async () => {
    const xssMessage = {
      _id: 'msg-xss',
      conversationId: 'conv-123',
      senderId: 'mentor-1',
      body: '<script>alert("hack")</script><b>Bold Text</b>',
      createdAt: new Date().toISOString()
    };
    listMessages.mockResolvedValue({ messages: [xssMessage], hasMore: false });

    render(
      <MemoryRouter initialEntries={['/messages/conv-123']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/messages/:conversationId" element={<MessagesPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Verify text is present as literal string in DOM and no script tag is executed
    expect(await screen.findByText('<script>alert("hack")</script><b>Bold Text</b>')).toBeInTheDocument();
  });

  it('composer sends message on Enter and creates optimistic confirmed state', async () => {
    sendMessage.mockResolvedValue({
      _id: 'msg-saved-1',
      conversationId: 'conv-123',
      senderId: 'learner-1',
      body: 'Can we discuss React?',
      createdAt: new Date().toISOString()
    });

    render(
      <MemoryRouter initialEntries={['/messages/conv-123']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/messages/:conversationId" element={<MessagesPage />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Dr. John Doe' });
    const textarea = screen.getByPlaceholderText(/Type a message/);

    fireEvent.change(textarea, { target: { value: 'Can we discuss React?' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith('conv-123', {
        body: 'Can we discuss React?',
        clientMessageId: expect.stringMatching(/^msg_/)
      });
    });
  });

  it('adds newline on Shift+Enter without sending', async () => {
    render(
      <MemoryRouter initialEntries={['/messages/conv-123']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/messages/:conversationId" element={<MessagesPage />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Dr. John Doe' });
    const textarea = screen.getByPlaceholderText(/Type a message/);

    fireEvent.change(textarea, { target: { value: 'Line 1' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('displays retry on failed send and reuses the same clientMessageId', async () => {
    sendMessage.mockRejectedValueOnce(new Error('Network error'));

    render(
      <MemoryRouter initialEntries={['/messages/conv-123']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/messages/:conversationId" element={<MessagesPage />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Dr. John Doe' });
    const textarea = screen.getByPlaceholderText(/Type a message/);

    fireEvent.change(textarea, { target: { value: 'Retry test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    // Expect retry button
    const retryBtn = await screen.findByRole('button', { name: 'Failed. Tap to retry' });
    expect(retryBtn).toBeInTheDocument();

    const firstClientMessageId = sendMessage.mock.calls[0][1].clientMessageId;

    // Retry sending
    sendMessage.mockResolvedValueOnce({
      _id: 'msg-saved-retry',
      conversationId: 'conv-123',
      senderId: 'learner-1',
      body: 'Retry test message',
      createdAt: new Date().toISOString()
    });

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledTimes(2);
      expect(sendMessage.mock.calls[1][1].clientMessageId).toBe(firstClientMessageId);
    });
  });

  it('disables composer and shows expired notice when chat has ended', async () => {
    const expiredConversation = {
      ...mockConversation,
      canSend: false,
      validUntil: '2026-01-01T00:00:00.000Z'
    };
    listConversations.mockResolvedValue([expiredConversation]);

    render(
      <MemoryRouter initialEntries={['/messages/conv-123']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/messages/:conversationId" element={<MessagesPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect((await screen.findAllByText(/This chat ended on/)).length).toBeGreaterThan(0);
    expect(screen.getByText('Read only')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Type a message/)).not.toBeInTheDocument();
  });
});
