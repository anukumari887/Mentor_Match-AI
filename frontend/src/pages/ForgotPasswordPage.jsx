import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { usePublicConfig } from '../contexts/ConfigContext';
import api from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Logo from '../components/Logo';
import ResponsiveImage from '../components/ResponsiveImage';

export default function ForgotPasswordPage() {
  const { emailMode } = usePublicConfig();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.post('/api/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      // Per security rules, always show constant message unless client network drops
      if (err.response) {
        setSubmitted(true);
      } else {
        setError(err.message || 'Network error. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page-wrap flex-1 py-12 sm:py-16 flex items-center justify-center">
      <div className="w-full max-w-4xl grid gap-8 md:grid-cols-[1.1fr_0.9fr] items-center">
        {/* Left Form Card */}
        <Card variant="raised" padding="lg" className="w-full">
          <div className="mb-6 flex flex-col items-start gap-3">
            <Logo variant="mark" asLink={false} />
            <div>
              <h1 className="font-serif text-2xl font-bold text-ink">Reset password</h1>
              <p className="mt-1 text-xs text-ink-muted">
                Enter your account email address and we will send you a secure link to reset your password.
              </p>
              {emailMode === 'demo' && (
                <p className="mt-2 text-xs text-ink-muted">
                  Demo mode: reset emails are not delivered. If you cannot log in, contact the site owner.
                </p>
              )}
            </div>
          </div>

          {submitted ? (
            <div className="space-y-4 py-2">
              <div
                role="status"
                className="rounded border border-success/40 bg-success/10 p-4 text-xs sm:text-sm text-ink leading-relaxed"
              >
                <div className="flex items-center gap-2 font-semibold text-success mb-1">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>Check your inbox</span>
                </div>
                <p className="text-ink-muted">
                  If an account exists for that email, we have sent a reset link. The link expires in 30 minutes.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                >
                  <ArrowLeft size={13} /> Return to sign in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="forgot-email">
                  Email address
                </label>
                <div className="relative">
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  />
                </div>
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
                <span>{submitting ? 'Sending link...' : 'Send reset link'}</span>
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

        {/* Right Photo Panel for Desktop */}
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
              <p className="text-xs font-semibold tracking-wider uppercase text-accent">Security First</p>
              <h2 className="font-serif text-lg font-semibold text-ink">
                Secure Account Recovery
              </h2>
              <p className="text-xs text-ink-muted leading-relaxed">
                Password reset tokens are single-use, cryptographically generated, and hashed with SHA-256 before storage.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
