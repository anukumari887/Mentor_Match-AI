import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUnreadCount } from '../services/chat';
import { getChatSocket } from '../services/socket';

export default function ChatNotificationListener() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [popup, setPopup] = useState(null);
  const popupTimerRef = useRef(null);
  const lastPopupTimeRef = useRef({});
  const unreadCountRef = useRef(0);
  const locationRef = useRef(location.pathname);
  locationRef.current = location.pathname;

  const originalTitle = 'Mentor-Match AI';

  // Manage document title based on unread count and tab visibility
  const updateTitle = (count) => {
    unreadCountRef.current = count;
    if (document.hidden && count > 0) {
      document.title = `(${count}) Mentor-Match`;
    } else {
      document.title = originalTitle;
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        document.title = originalTitle;
      } else if (unreadCountRef.current > 0) {
        document.title = `(${unreadCountRef.current}) Mentor-Match`;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.title = originalTitle;
    };
  }, []);

  // Keyboard dismiss (Escape) for popup
  useEffect(() => {
    if (!popup) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        clearTimeout(popupTimerRef.current);
        setPopup(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [popup]);

  // Main Socket listener setup (Single app-level listener)
  useEffect(() => {
    if (!user || user.role === 'admin') {
      updateTitle(0);
      return;
    }

    let active = true;

    const refreshUnread = async () => {
      try {
        const data = await getUnreadCount();
        if (active && typeof data?.unreadCount === 'number') {
          updateTitle(data.unreadCount);
          window.dispatchEvent(
            new CustomEvent('chat:unread-changed', {
              detail: { unreadCount: data.unreadCount }
            })
          );
        }
      } catch {}
    };

    refreshUnread();

    const socket = getChatSocket();

    const handleChatMessage = (data) => {
      if (!active) return;
      const conversationId = String(data?.conversationId || data?.message?.conversationId || '');
      const message = data?.message || data;
      if (!message || !conversationId) return;

      // Update unread count
      refreshUnread();

      // Ignore user's own messages
      if (String(message.senderId) === String(user._id || user.id)) {
        return;
      }

      // Ignore if user is currently looking at this conversation
      const currentPath = locationRef.current;
      if (currentPath === `/messages/${conversationId}`) {
        return;
      }

      // Desktop notifications if granted and tab is hidden
      try {
        const desktopEnabled = localStorage.getItem('mm_desktop_notifications') === 'true';
        if (
          desktopEnabled &&
          document.hidden &&
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          const bodyPreview = String(message.body || '').slice(0, 80);
          new Notification(`New message from ${message.senderName || 'Mentor-Match'}`, {
            body: bodyPreview
          });
        }
      } catch {}

      // Popup collapsing: several messages from the same conversation within 5 seconds collapse
      const now = Date.now();
      const lastTime = lastPopupTimeRef.current[conversationId] || 0;
      const isWithin5s = now - lastTime < 5000;
      lastPopupTimeRef.current[conversationId] = now;

      const rawBody = String(message.body || '');
      const previewText = rawBody.slice(0, 80);
      const senderName = message.senderName || 'Someone';

      clearTimeout(popupTimerRef.current);

      setPopup((prev) => {
        const count = isWithin5s && prev?.conversationId === conversationId ? (prev.count || 1) + 1 : 1;
        return {
          conversationId,
          senderName,
          previewText,
          count
        };
      });

      // Auto close after about 8 seconds
      popupTimerRef.current = setTimeout(() => {
        setPopup(null);
      }, 8000);
    };

    const handleChatRead = () => {
      if (!active) return;
      refreshUnread();
    };

    const handleCustomPopup = (e) => {
      if (e?.detail) handleChatMessage(e.detail);
    };

    socket.on('chat:message', handleChatMessage);
    socket.on('chat:read', handleChatRead);
    window.addEventListener('chat:show-popup', handleCustomPopup);

    return () => {
      active = false;
      clearTimeout(popupTimerRef.current);
      socket.off('chat:message', handleChatMessage);
      socket.off('chat:read', handleChatRead);
      window.removeEventListener('chat:show-popup', handleCustomPopup);
      updateTitle(0);
    };
  }, [user]);

  if (!popup) return null;

  const handleOpen = () => {
    clearTimeout(popupTimerRef.current);
    const convId = popup.conversationId;
    setPopup(null);
    navigate(`/messages/${convId}`);
  };

  const handleDismiss = () => {
    clearTimeout(popupTimerRef.current);
    setPopup(null);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex items-start gap-3 rounded-lg bg-surface border border-accent/40 p-4 shadow-xl text-ink max-w-sm transition-all duration-200"
    >
      <div className="rounded-full bg-accent/10 p-2 text-accent shrink-0 mt-0.5">
        <MessageSquare size={16} aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-ink truncate">
            New message from {popup.senderName}
            {popup.count > 1 ? ` (${popup.count})` : ''}
          </p>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss message notification"
            className="text-ink-muted hover:text-ink p-0.5 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <X size={14} />
          </button>
        </div>

        <p className="text-xs text-ink-muted mt-1 leading-relaxed line-clamp-2 break-words">
          {popup.previewText}
        </p>

        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpen}
            className="inline-flex items-center justify-center rounded bg-accent px-3 py-1 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors shadow-sm focus:outline-none focus:ring-1 focus:ring-accent"
          >
            Open
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-raised transition-colors focus:outline-none"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
