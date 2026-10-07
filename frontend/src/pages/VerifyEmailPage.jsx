import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, ArrowRight, Mail, RefreshCw } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  // Read token from search params on initial mount, then scrub immediately from URL bar
  const [initialToken] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('token') || '';
  });

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const verifiedRef = useRef(false);

  useEffect(() => {
    // Immediately remove token from address bar and history state so it only lives in memory
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    if (!initialToken) {
      setStatus('error');
      setErrorMessage('No verification token provided or link is invalid.');
      return;
    }

    if (verifiedRef.current) return;
    verifiedRef.current = true;

    // Verify token with backend
    api.post('/api/auth/verify-email', { token: initialToken })
      .then(async () => {
        setStatus('success');
        if (refreshUser) {
          try {
            await refreshUser();
          } catch {}
        }
      })
      .catch((err) => {
        setStatus('error');
        setErrorMessage(
          err.response?.data?.error?.message ||
          'This verification link is invalid or has expired.'
        );
      });
  }, [initialToken, refreshUser]);

  const handleResend = async () => {
    setResending(true);
    setResendMessage('');
    try {
      const res = await api.post('/api/auth/resend-verification');
      setResendMessage(res.data?.message || 'A new verification link has been sent to your email.');
    } catch (err) {
      setResendMessage(
        err.response?.data?.error?.message ||
        'Could not send a new link. Please try again later.'
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <section className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12 sm:px-6 bg-bg text-ink">
      <div className="w-full max-w-md">
        <Card variant="raised" padding="lg" className="w-full">
          <div className="mb-6 text-center">
            <div className="mb-3 flex justify-center">
              <Logo variant="mark" asLink={false} />
            </div>
            <p className="text-xs font-semibold tracking-wider uppercase text-accent">Mentor-Match</p>
            <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-ink">
              Email verification
            </h1>
          </div>

          {status === 'loading' && (
            <div className="py-8 text-center" role="status">
              <RefreshCw size={28} className="animate-spin text-accent mx-auto mb-3" />
              <p className="text-sm font-medium text-ink">Verifying your email address...</p>
              <p className="text-xs text-ink-muted mt-1">Please wait a moment.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-5 text-center">
              <div className="w-12 h-12 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>

              <div>
                <h2 className="font-serif text-lg font-semibold text-ink">Email verified</h2>
                <p className="mt-2 text-xs sm:text-sm text-ink-muted leading-relaxed">
                  Your email address has been verified successfully. You can now book mentoring sessions, make payments, and send chat messages.
                </p>
              </div>

              <div className="pt-2">
                {user ? (
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => navigate(user.role === 'mentor' ? '/sessions' : '/dashboard')}
                  >
                    Go to dashboard <ArrowRight size={14} className="ml-1" />
                  </Button>
                ) : (
                  <Link
                    to="/login"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded bg-accent px-4 py-2.5 text-xs sm:text-sm font-semibold text-accent-text hover:bg-accent-hover transition-colors shadow-sm"
                  >
                    Sign in to continue <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-5">
              <div className="rounded border border-danger/40 bg-danger/10 p-4 text-xs sm:text-sm text-danger flex items-start gap-2.5">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Verification failed</p>
                  <p className="mt-0.5 text-xs text-danger/90 leading-relaxed">
                    {errorMessage || 'This verification link is invalid or has expired.'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-ink-muted leading-relaxed text-center">
                Verification links expire after 24 hours. You can request a fresh link below.
              </p>

              {user ? (
                <div className="space-y-3 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full flex items-center justify-center gap-1.5"
                    disabled={resending}
                    onClick={handleResend}
                  >
                    {resending ? <RefreshCw size={13} className="animate-spin" /> : <Mail size={13} />}
                    <span>{resending ? 'Sending...' : 'Send a new link'}</span>
                  </Button>
                  {resendMessage && (
                    <p className="text-xs text-center font-medium text-ink bg-surface-raised p-2 rounded border border-border">
                      {resendMessage}
                    </p>
                  )}
                  <div className="text-center pt-2">
                    <Link to="/profile" className="text-xs text-accent hover:underline">
                      Back to my profile
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1 text-center">
                  <Link
                    to="/login"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded bg-accent px-4 py-2 text-xs sm:text-sm font-semibold text-accent-text hover:bg-accent-hover transition-colors"
                  >
                    Sign in to request a new link <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
