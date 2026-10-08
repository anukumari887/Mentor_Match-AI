import React, { useEffect, useState } from 'react';
import { Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePublicConfig } from '../contexts/ConfigContext';
import api from '../services/api';
import Toast from './Toast';

export default function VerificationBanner() {
  const { user } = useAuth();
  const { emailMode } = usePublicConfig();
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  // Countdown timer for 60-second cooldown
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  // In demo mode, never show the verification banner
  if (emailMode === 'demo') {
    return null;
  }

  // Only show for unverified learners and mentors (not admins, not verified users)
  if (!user || user.role === 'admin' || user.emailVerified) {
    return null;
  }

  const handleResend = async () => {
    if (countdown > 0 || sending) return;
    setSending(true);
    try {
      const res = await api.post('/api/auth/resend-verification');
      setCountdown(60);
      setToast({
        variant: 'success',
        message: res.data?.message || 'Verification link sent. Please check your inbox.'
      });
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Could not send verification email. Please try again.';
      setCountdown(60);
      setToast({
        variant: 'error',
        message: msg
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <aside
        role="status"
        aria-live="polite"
        className="border-b border-warning/40 bg-warning/10 text-ink py-3 px-4 text-xs sm:text-sm transition-colors"
      >
        <div className="page-wrap flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <Mail size={18} className="text-warning shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
            <div>
              <p className="font-semibold text-ink">
                Please verify your email. We sent a link to{' '}
                <span className="font-mono font-medium underline">{user.email}</span>.
              </p>
              <p className="text-ink-muted text-[11px] sm:text-xs mt-0.5">
                Booking sessions, payment checkout, and messaging are paused until your email is verified.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResend}
            disabled={countdown > 0 || sending}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 rounded border border-warning/60 bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-raised disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <RefreshCw size={12} className="animate-spin text-warning" />
            ) : (
              <Mail size={12} className="text-warning" />
            )}
            <span>
              {countdown > 0
                ? `Resend link (${countdown}s)`
                : sending
                ? 'Sending...'
                : 'Resend link'}
            </span>
          </button>
        </div>
      </aside>

      {toast && (
        <Toast
          variant={toast.variant}
          message={toast.message}
          onClose={() => setToast(null)}
          duration={5000}
        />
      )}
    </>
  );
}
