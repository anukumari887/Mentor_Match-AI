import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Clock,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldAlert,
  User
} from 'lucide-react';
import {
  listConversations,
  listMessages,
  markChatRead,
  sendMessage
} from '../services/chat';
import { getChatSocket } from '../services/socket';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';

function formatMessageTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MessagesPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState('');

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [hasNewMessagesBelow, setHasNewMessagesBelow] = useState(false);

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const activeConversationIdRef = useRef(conversationId);
  activeConversationIdRef.current = conversationId;

  const [activeThreadMeta, setActiveThreadMeta] = useState(null);

  // Find currently selected conversation
  const selectedConversation = conversations.find((c) => c._id === conversationId) || (
    activeThreadMeta ? {
      _id: conversationId,
      otherUser: activeThreadMeta.otherUser,
      canSend: activeThreadMeta.canSend,
      validUntil: activeThreadMeta.validUntil
    } : null
  );

  // 1. Fetch conversations list
  const fetchConversations = async (silent = false) => {
    if (!silent) setConversationsLoading(true);
    setConversationsError('');
    try {
      const data = await listConversations();
      setConversations(Array.isArray(data) ? data : data?.conversations || []);
    } catch (err) {
      if (!silent) setConversationsError(err.message || 'Could not load conversations.');
    } finally {
      if (!silent) setConversationsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // 2. Fetch messages for active conversation
  const fetchThreadMessages = async (convId, silent = false) => {
    if (!convId) {
      setMessages([]);
      setActiveThreadMeta(null);
      return;
    }
    if (!silent) setMessagesLoading(true);
    setMessagesError('');
    try {
      const data = await listMessages(convId, { limit: 30 });
      if (data?.otherUser) {
        setActiveThreadMeta({
          otherUser: data.otherUser,
          canSend: data.canSend,
          validUntil: data.validUntil
        });
      }
      // API returns newest first; reverse for chronological display
      const chronological = [...(data.messages || [])].reverse();
      setMessages(chronological);
      setHasMore(Boolean(data.hasMore));

      // Auto-scroll to bottom on first load
      setTimeout(() => {
        if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
      }, 50);

      // Mark read if tab is visible
      if (document.visibilityState === 'visible') {
        markChatRead(convId).catch(() => {});
        window.dispatchEvent(new CustomEvent('chat:unread-changed'));
      }
    } catch (err) {
      if (!silent) setMessagesError(err.message || 'Could not load messages.');
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  };

  useEffect(() => {
    fetchThreadMessages(conversationId);
    fetchConversations(true);
  }, [conversationId]);

  // Load older messages (cursor pagination)
  const handleLoadOlder = async () => {
    if (!conversationId || !messages.length || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const oldestDate = messages[0].createdAt;
      const data = await listMessages(conversationId, { before: oldestDate, limit: 30 });
      const olderChronological = [...data.messages].reverse();

      const scrollContainer = messagesContainerRef.current;
      const previousScrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;

      setMessages((prev) => [...olderChronological, ...prev]);
      setHasMore(data.hasMore);

      // Preserve scroll position
      setTimeout(() => {
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight - previousScrollHeight;
        }
      }, 20);
    } catch (err) {
      setMessagesError(err.message || 'Could not load older messages.');
    } finally {
      setLoadingOlder(false);
    }
  };

  // 3. Socket real-time events & polling fallback
  useEffect(() => {
    const socket = getChatSocket();

    const handleIncomingMessage = (payload) => {
      const { conversationId: msgConvId, message: newMsg } = payload;

      // Update conversations list preview
      setConversations((prev) => {
        const index = prev.findIndex((c) => c._id === msgConvId);
        if (index === -1) {
          fetchConversations(true);
          return prev;
        }
        const updated = [...prev];
        const existing = updated[index];
        const isCurrentActive = activeConversationIdRef.current === msgConvId;
        updated[index] = {
          ...existing,
          lastMessagePreview: newMsg.body.slice(0, 80),
          lastMessageAt: newMsg.createdAt,
          unreadCount: isCurrentActive ? 0 : existing.unreadCount + 1
        };
        // Move to top
        const [moved] = updated.splice(index, 1);
        return [moved, ...updated];
      });

      // If message is for the currently open conversation
      if (activeConversationIdRef.current === msgConvId) {
        setMessages((prev) => {
          // Check if already in list (optimistic match or ID match)
          const exists = prev.some(
            (m) =>
              (newMsg._id && m._id === newMsg._id) ||
              (newMsg.clientMessageId && m.clientMessageId === newMsg.clientMessageId)
          );
          if (exists) {
            // Replace optimistic with confirmed
            return prev.map((m) =>
              m.clientMessageId === newMsg.clientMessageId ? newMsg : m
            );
          }
          return [...prev, newMsg];
        });

        // If visible, mark read immediately
        if (document.visibilityState === 'visible') {
          markChatRead(msgConvId).catch(() => {});
          window.dispatchEvent(new CustomEvent('chat:unread-changed'));
        }

        // Scroll or show "new messages" button
        if (isNearBottomRef.current) {
          setTimeout(() => {
            if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }, 30);
        } else {
          setHasNewMessagesBelow(true);
        }
      }
    };

    const handleReadEvent = (payload) => {
      const { conversationId: readConvId } = payload;
      setConversations((prev) =>
        prev.map((c) => (c._id === readConvId ? { ...c, unreadCount: 0 } : c))
      );
    };

    socket.on('chat:message', handleIncomingMessage);
    socket.on('chat:read', handleReadEvent);

    // Fallback: 15-second polling if disconnected
    const fallbackTimer = setInterval(() => {
      if (!socket.connected && activeConversationIdRef.current) {
        fetchThreadMessages(activeConversationIdRef.current, true);
        fetchConversations(true);
      }
    }, 15000);

    return () => {
      socket.off('chat:message', handleIncomingMessage);
      socket.off('chat:read', handleReadEvent);
      clearInterval(fallbackTimer);
    };
  }, []);

  // Track scroll position in messages container
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceToBottom < 80;
    if (isNearBottomRef.current) {
      setHasNewMessagesBelow(false);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setHasNewMessagesBelow(false);
    }
  };

  // 4. Send message handler
  const handleSend = async (customBody = null, customClientId = null) => {
    const bodyToSend = (customBody !== null ? customBody : inputText).trim();
    if (!bodyToSend || !conversationId || sending) return;

    if (selectedConversation && !selectedConversation.canSend) {
      setMessagesError('This chat has expired. You cannot send new messages.');
      return;
    }

    const clientMessageId = customClientId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Optimistic message
    const optimisticMessage = {
      _id: clientMessageId,
      clientMessageId,
      conversationId,
      senderId: user.id || user._id,
      body: bodyToSend,
      createdAt: new Date().toISOString(),
      status: 'sending'
    };

    if (!customClientId) {
      setMessages((prev) => [...prev, optimisticMessage]);
      setInputText('');
    } else {
      // Retrying: update status
      setMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === clientMessageId ? { ...m, status: 'sending' } : m
        )
      );
    }

    setSending(true);
    setMessagesError('');

    setTimeout(() => scrollToBottom(), 30);

    try {
      const saved = await sendMessage(conversationId, {
        body: bodyToSend,
        clientMessageId
      });

      // Update message status to confirmed
      setMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === clientMessageId ? { ...saved, status: 'confirmed' } : m
        )
      );

      // Update conversations list preview
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId
            ? {
                ...c,
                lastMessagePreview: bodyToSend.slice(0, 80),
                lastMessageAt: saved.createdAt
              }
            : c
        )
      );
    } catch (err) {
      // Mark as failed
      setMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === clientMessageId ? { ...m, status: 'failed' } : m
        )
      );
      const code = err.response?.data?.error?.code || err.code;
      if (code === 'EMAIL_NOT_VERIFIED') {
        setMessagesError('Please verify your email address to send messages.');
      } else {
        setMessagesError(err.message || 'Could not send message. Tap to retry.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <section className="page-wrap flex-1 py-6 sm:py-8 bg-bg text-ink transition-colors">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink flex items-center gap-2">
            <MessageSquare size={20} className="text-accent" /> Messages
          </h1>
          <p className="mt-1 text-xs text-ink-muted">
            Direct communication between learners and confirmed mentors.
          </p>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid gap-4 lg:grid-cols-[20rem_1fr] min-h-[580px] h-[calc(100vh-14rem)] max-h-[820px] rounded border border-border bg-surface overflow-hidden">
        {/* Left Pane: Conversations List (Hidden on mobile if a thread is open) */}
        <aside
          className={`flex flex-col border-r border-border bg-surface ${
            conversationId ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="p-3 border-b border-border bg-surface-raised/40">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Conversations ({conversations.length})
            </p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {conversationsLoading && (
              <div className="py-12 text-center text-xs text-ink-muted">
                <RefreshCw size={16} className="animate-spin mx-auto mb-2 text-accent" />
                Loading conversations...
              </div>
            )}

            {conversationsError && (
              <div className="p-4 text-xs text-danger">
                <p>{conversationsError}</p>
                <button
                  className="mt-2 text-xs font-bold underline"
                  onClick={() => fetchConversations()}
                  type="button"
                >
                  Try again
                </button>
              </div>
            )}

            {!conversationsLoading && !conversationsError && conversations.length === 0 && (
              <div className="py-12 px-4 text-center">
                <MessageSquare size={28} className="mx-auto mb-2 text-ink-muted opacity-40" />
                <p className="text-xs font-semibold text-ink">
                  {user?.role === 'learner'
                    ? 'Book a session to start chatting with a mentor.'
                    : 'No messages yet.'}
                </p>
                {user?.role === 'learner' && (
                  <Link
                    className="mt-3 inline-block rounded bg-accent px-3 py-1.5 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors"
                    to="/mentors"
                  >
                    Browse mentors
                  </Link>
                )}
              </div>
            )}

            {!conversationsLoading &&
              conversations.map((conv) => {
                const isSelected = conv._id === conversationId;
                return (
                  <Link
                    key={conv._id}
                    className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 hover:bg-surface-raised ${
                      isSelected ? 'bg-surface-raised border-l-4 border-l-accent' : ''
                    }`}
                    to={`/messages/${conv._id}`}
                  >
                    <Avatar name={conv.otherUser.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-ink truncate">
                          {conv.otherUser.name}
                        </p>
                        {conv.lastMessageAt && (
                          <span className="text-[10px] text-ink-muted shrink-0">
                            {formatMessageTime(conv.lastMessageAt)}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-ink-muted truncate">
                        {conv.lastMessagePreview || 'No messages yet'}
                      </p>

                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        {!conv.canSend && (
                          <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-raised border border-border">
                            Chat ended
                          </span>
                        )}
                        {conv.unreadCount > 0 && (
                          <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-[10px] font-bold leading-none rounded-full bg-accent text-accent-text">
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>
        </aside>

        {/* Right Pane: Thread View (Hidden on mobile if no conversation selected) */}
        <main
          className={`flex flex-col bg-bg ${
            !conversationId ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {conversationId && selectedConversation ? (
            <>
              {/* Thread Header */}
              <header className="p-3.5 border-b border-border bg-surface flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    aria-label="Back to conversations list"
                    className="p-1 rounded text-ink-muted hover:text-ink lg:hidden"
                    onClick={() => navigate('/messages')}
                    type="button"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <Avatar name={selectedConversation.otherUser.name} size="sm" />
                  <div>
                    <h2 className="text-xs sm:text-sm font-semibold text-ink">
                      {selectedConversation.otherUser.name}
                    </h2>
                    <p className="text-[11px] text-ink-muted">
                      {selectedConversation.canSend ? (
                        <>Chat open until {new Date(selectedConversation.validUntil).toLocaleString()}</>
                      ) : (
                        <span className="text-ink-muted">
                          This chat ended on {new Date(selectedConversation.validUntil).toLocaleDateString()}.{' '}
                          {user?.role === 'learner' && (
                            <Link
                              className="font-semibold text-accent hover:underline"
                              to={`/mentors/${selectedConversation.otherUser._id || selectedConversation.otherUser.id}`}
                            >
                              Book another session
                            </Link>
                          )}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {!selectedConversation.canSend && (
                  <Badge variant="neutral" size="sm">
                    Read only
                  </Badge>
                )}
              </header>

              {/* Message List */}
              <div
                aria-live="polite"
                className="flex-1 overflow-y-auto p-4 space-y-3 relative"
                onScroll={handleScroll}
                ref={messagesContainerRef}
                role="log"
              >
                {/* Load older button */}
                {hasMore && (
                  <div className="text-center py-1">
                    <button
                      className="rounded border border-border bg-surface px-3 py-1 text-xs font-medium text-ink hover:bg-surface-raised disabled:opacity-50"
                      disabled={loadingOlder}
                      onClick={handleLoadOlder}
                      type="button"
                    >
                      {loadingOlder ? 'Loading...' : 'Load older messages'}
                    </button>
                  </div>
                )}

                {messagesLoading && (
                  <div className="py-12 text-center text-xs text-ink-muted">
                    <RefreshCw size={16} className="animate-spin mx-auto mb-2 text-accent" />
                    Loading conversation...
                  </div>
                )}

                {messagesError && (
                  <div className="rounded border border-danger/40 bg-danger/10 p-2.5 text-xs text-danger text-center">
                    {messagesError}
                  </div>
                )}

                {!messagesLoading && messages.length === 0 && (
                  <div className="py-12 text-center text-xs text-ink-muted">
                    No messages yet. Send a message to start the conversation.
                  </div>
                )}

                {/* Messages with Date Separators */}
                {!messagesLoading &&
                  messages.map((msg, index) => {
                    const isMine =
                      msg.senderId === user.id ||
                      msg.senderId === user._id ||
                      (typeof msg.senderId === 'object' &&
                        (msg.senderId._id === user.id || msg.senderId._id === user._id));

                    // Show date separator if first message or calendar date changes
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const showDateSeparator =
                      !prevMsg ||
                      new Date(msg.createdAt).toDateString() !==
                        new Date(prevMsg.createdAt).toDateString();

                    return (
                      <React.Fragment key={msg._id || msg.clientMessageId}>
                        {showDateSeparator && (
                          <div className="flex items-center justify-center my-3">
                            <span className="rounded bg-surface-raised border border-border px-2.5 py-0.5 text-[10px] font-semibold text-ink-muted">
                              {formatDateSeparator(msg.createdAt)}
                            </span>
                          </div>
                        )}

                        <div
                          className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[70%] rounded px-3 py-2 text-xs leading-relaxed shadow-sm ${
                              isMine
                                ? 'bg-accent text-accent-text'
                                : 'bg-surface border border-border text-ink'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                            <div
                              className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                                isMine ? 'text-accent-text/80' : 'text-ink-muted'
                              }`}
                            >
                              <span>{formatMessageTime(msg.createdAt)}</span>
                              {msg.status === 'sending' && <span>(Sending...)</span>}
                              {msg.status === 'failed' && (
                                <button
                                  className="text-danger font-bold underline"
                                  onClick={() => handleSend(msg.body, msg.clientMessageId)}
                                  type="button"
                                >
                                  Failed. Tap to retry
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}

                <div ref={messagesEndRef} />
              </div>

              {/* Floating "New messages" pill */}
              {hasNewMessagesBelow && (
                <div className="absolute bottom-24 right-8 z-10">
                  <button
                    className="rounded-full bg-accent text-accent-text px-3 py-1.5 text-xs font-semibold shadow-md hover:bg-accent-hover transition-colors flex items-center gap-1.5"
                    onClick={scrollToBottom}
                    type="button"
                  >
                    <span>New messages</span> &darr;
                  </button>
                </div>
              )}

              {/* Composer */}
              <footer className="p-3 border-t border-border bg-surface">
                {!selectedConversation.canSend ? (
                  <div className="rounded border border-border bg-surface-raised/40 p-3 text-center text-xs text-ink-muted">
                    This chat ended on{' '}
                    <strong className="text-ink">
                      {new Date(selectedConversation.validUntil).toLocaleDateString()}
                    </strong>
                    .{' '}
                    {user?.role === 'learner' && (
                      <Link
                        className="font-semibold text-accent hover:underline"
                        to={`/mentors/${selectedConversation.otherUser._id || selectedConversation.otherUser.id}`}
                      >
                        Book another session with {selectedConversation.otherUser.name} to chat again.
                      </Link>
                    )}
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                  >
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 relative">
                        <textarea
                          aria-label="Write a message"
                          className="w-full rounded border border-border bg-surface-inset p-2.5 text-xs text-ink focus:outline-none focus:border-accent resize-none min-h-[50px] max-h-32"
                          disabled={sending}
                          maxLength={2000}
                          onChange={(e) => setInputText(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Type a message (Enter to send, Shift+Enter for new line)..."
                          rows={2}
                          value={inputText}
                        />

                        {inputText.length > 1800 && (
                          <span
                            className={`absolute bottom-2 right-2 text-[10px] font-mono ${
                              inputText.length >= 2000 ? 'text-danger font-bold' : 'text-ink-muted'
                            }`}
                          >
                            {inputText.length}/2000
                          </span>
                        )}
                      </div>

                      <button
                        aria-label="Send message"
                        className="rounded bg-accent p-2.5 text-accent-text hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        disabled={!inputText.trim() || sending}
                        type="submit"
                      >
                        <Send size={16} />
                      </button>
                    </div>

                    <p className="mt-2 text-[11px] text-ink-muted leading-tight">
                      Do not share passwords or payment details. Keep sessions and payments on Mentor-Match.
                    </p>
                  </form>
                )}
              </footer>
            </>
          ) : conversationId && conversationsLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-ink-muted">
              <RefreshCw size={20} className="animate-spin text-accent mb-2" />
              Loading conversation...
            </div>
          ) : (
            /* No conversation selected (Desktop empty state) */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <MessageSquare size={36} className="text-ink-muted opacity-30 mb-3" />
              <h2 className="font-serif text-lg font-semibold text-ink">Select a conversation</h2>
              <p className="mt-1 text-xs text-ink-muted max-w-xs">
                Choose a conversation on the left to read messages and reply in real time.
              </p>
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
