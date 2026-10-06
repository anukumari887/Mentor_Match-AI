import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Logo from '../components/Logo';
import ResponsiveImage from '../components/ResponsiveImage';

export default function ResetPasswordPage() {
  const location = useLocation();

  // Read token from search params on initial mount, then scrub immediately from URL bar
  const [token, setToken] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('token') || '';
  });

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isTokenInvalid, setIsTokenInvalid] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Scrub token from address bar and history state so it's only held in memory
    if (window.history && window.history.replaceState) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState(null, '', cleanUrl);
    }

    if (!token) {
      setIsTokenInvalid(true);
    }
  }, []);

  const updateField = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match. Please verify and try again.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/auth/reset-password', {
        token,
        newPassword: form.newPassword
      });
      setSuccess(true);
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'INVALID_OR_EXPIRED_TOKEN') {
        setIsTokenInvalid(true);
      } else {
        setError(err.response?.data?.error?.message || err.message || 'Password reset failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page-wrap flex-1 py-12 sm:py-16 flex items-center justify-center">
      <div className="w-full max-w-4xl grid gap-8 md:grid-cols-[1.1fr_0.9fr] items-center">
        {/* Form Card */}
        <Card variant="raised" padding="lg" className="w-full">
          <div className="mb-6 flex flex-col items-start gap-3">
            <Logo variant="mark" asLink={false} />
            <div>
              <h1 className="font-serif text-2xl font-bold text-ink">Set new password</h1>
              <p className="mt-1 text-xs text-ink-muted">
                Choose a strong password to protect your Mentor-Match account.
              </p>
            </div>
          </div>

          {isTokenInvalid ? (
            <div className="space-y-4 py-2">
              <div
                role="alert"
                className="rounded border border-danger/40 bg-danger/10 p-4 text-xs sm:text-sm text-ink leading-relaxed"
              >
                <div className="flex items-center gap-2 font-semibold text-danger mb-1">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>Invalid or expired reset link</span>
                </div>
                <p className="text-ink-muted">
                  This reset link has either already been used, expired after 30 minutes, or is invalid. Please request a new link.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/forgot-password"
                  className="inline-flex items-center justify-center gap-1.5 rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors"
                >
                  Request a new link <ArrowRight size={13} />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-1.5 rounded border border-border px-4 py-2 text-xs font-medium text-ink hover:bg-surface-raised transition-colors"
                >
                  Return to sign in
                </Link>
              </div>
            </div>
          ) : success ? (
            <div className="space-y-4 py-2">
              <div
                role="status"
                className="rounded border border-success/40 bg-success/10 p-4 text-xs sm:text-sm text-ink leading-relaxed"
              >
                <div className="flex items-center gap-2 font-semibold text-success mb-1">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>Password changed</span>
                </div>
                <p className="text-ink-muted">
                  Your password has been reset successfully. You can now sign in with your new credentials.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-1.5 rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors"
                >
                  Sign in with new password <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-ink" htmlFor="reset-new-password">
                    New password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-ink-muted hover:text-ink inline-flex items-center gap-1 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  id="reset-new-password"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={form.newPassword}
                  onChange={updateField}
                  placeholder="••••••••"
                  className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
                <p className="mt-1 text-[11px] text-ink-muted">
                  Minimum 8 characters, maximum 72 bytes. Avoid common passwords.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="reset-confirm-password">
                  Confirm new password
                </label>
                <input
                  id="reset-confirm-password"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={form.confirmPassword}
                  onChange={updateField}
                  placeholder="••••••••"
                  className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>

              {error && (
                <p role="alert" className="rounded border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className="w-full mt-2"
              >
                <span>{submitting ? 'Resetting password...' : 'Change password'}</span>
                {!submitting && <ArrowRight size={14} aria-hidden="true" />}
              </Button>

              <div className="mt-4 pt-4 border-t border-border text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink font-medium"
                >
                  <ArrowLeft size={12} /> Back to sign in
                </Link>
              </div>
            </form>
          )}
        </Card>

        {/* Right Photo Panel */}
        <aside className="hidden md:flex flex-col justify-between rounded-lg border border-border bg-surface-raised/40 p-6 overflow-hidden">
          <div>
            <div className="overflow-hidden rounded border border-border shadow-2xs mb-5">
              <ResponsiveImage
                baseName="auth-workspace"
                alt="Editorial study workspace with open notebook, fountain pen, and coffee"
                width={600}
                height={400}
                loading="lazy"
                className="aspect-[4/3] object-cover"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wider uppercase text-accent">Account Security</p>
              <h2 className="font-serif text-lg font-semibold text-ink">
                Fresh session security
              </h2>
              <p className="text-xs text-ink-muted leading-relaxed">
                When you set a new password, all earlier sessions and active cookies are revoked automatically across all devices.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
