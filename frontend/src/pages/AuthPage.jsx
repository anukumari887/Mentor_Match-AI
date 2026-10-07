import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import ResponsiveImage from '../components/ResponsiveImage';
import Logo from '../components/Logo';
import { IconChoiceLearner, IconChoiceMentor } from '../components/Illustrations';

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const { user, loading, login, register } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'learner' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/profile" replace />;

  const updateField = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (isRegister) {
        await register(form);
        navigate('/profile', { replace: true });
      } else {
        await login({ email: form.email, password: form.password });
        navigate(location.state?.from?.pathname || '/profile', { replace: true });
      }
    } catch (requestError) {
      const code = requestError.response?.data?.error?.code || requestError.code;
      if (code === 'EMAIL_DOMAIN_INVALID') {
        setError('This email address looks wrong. Please check it, or use a different one.');
      } else if (code === 'EMAIL_NOT_VERIFIED') {
        setError('Please verify your email address to continue.');
      } else {
        setError(requestError.message || 'We could not complete your request. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12 sm:px-6 bg-bg text-ink">
      <div className="w-full max-w-4xl grid md:grid-cols-[1.1fr_0.9fr] lg:grid-cols-[1.15fr_0.85fr] gap-6 lg:gap-8 items-stretch">
        <Card variant="raised" padding="lg" className="w-full flex flex-col justify-between">
        <div className="mb-6">
          <div className="mb-3">
            <Logo variant="mark" asLink={false} />
          </div>
          <p className="text-xs font-semibold tracking-wider uppercase text-accent">Mentor-Match</p>
          <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-ink">
            {isRegister ? 'Create an account.' : 'Welcome back.'}
          </h1>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-ink-muted">
            {isRegister
              ? 'Connect with practitioners for career and technical mentorship.'
              : 'Sign in to access your sessions and profile.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-semibold tracking-wide text-ink mb-1.5" htmlFor="auth-name">
                  Your name
                </label>
                <input
                  id="auth-name"
                  autoComplete="name"
                  className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  maxLength={100}
                  name="name"
                  onChange={updateField}
                  placeholder="e.g. Asha Rao"
                  required
                  value={form.name}
                />
              </div>

              <fieldset>
                <legend className="mb-1.5 text-xs font-semibold text-ink">I want to join as</legend>
                <div className="grid grid-cols-2 gap-2.5">
                  <label
                    className={`cursor-pointer rounded border p-2.5 text-center transition-all ${
                      form.role === 'learner'
                        ? 'border-accent bg-accent/10 text-accent font-semibold'
                        : 'border-border bg-surface text-ink-muted hover:text-ink hover:bg-surface-raised font-normal'
                    }`}
                  >
                    <input
                      className="sr-only"
                      name="role"
                      onChange={updateField}
                      type="radio"
                      value="learner"
                      checked={form.role === 'learner'}
                    />
                    <IconChoiceLearner className="mx-auto mb-1 text-inherit" />
                    <span className="text-xs">Learner</span>
                  </label>

                  <label
                    className={`cursor-pointer rounded border p-2.5 text-center transition-all ${
                      form.role === 'mentor'
                        ? 'border-accent bg-accent/10 text-accent font-semibold'
                        : 'border-border bg-surface text-ink-muted hover:text-ink hover:bg-surface-raised font-normal'
                    }`}
                  >
                    <input
                      className="sr-only"
                      name="role"
                      onChange={updateField}
                      type="radio"
                      value="mentor"
                      checked={form.role === 'mentor'}
                    />
                    <IconChoiceMentor className="mx-auto mb-1 text-inherit" />
                    <span className="text-xs">Mentor</span>
                  </label>
                </div>
              </fieldset>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold tracking-wide text-ink mb-1.5" htmlFor="auth-email">
              Email address
            </label>
            <input
              id="auth-email"
              autoComplete="email"
              className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              name="email"
              onChange={updateField}
              placeholder="you@domain.com"
              required
              type="email"
              value={form.email}
            />
            {isRegister && (
              <p className="mt-1.5 text-xs text-ink-muted">
                We will send you a link to confirm this email.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wide text-ink mb-1.5" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              minLength={isRegister ? 8 : 1}
              name="password"
              onChange={updateField}
              placeholder="••••••••"
              required
              type="password"
              value={form.password}
            />
            {isRegister ? (
              <span className="mt-1 block text-[11px] text-ink-muted">
                Minimum 8 characters.
              </span>
            ) : (
              <div className="mt-1.5 flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs text-accent hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
              {error}
            </p>
          )}

          <Button
            variant="primary"
            className="w-full mt-2"
            disabled={submitting || loading}
            type="submit"
          >
            <span>{submitting ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}</span>
            {!submitting && <ArrowRight size={14} aria-hidden="true" />}
          </Button>
        </form>

          <div className="mt-6 pt-4 border-t border-border text-center text-xs text-ink-muted">
            {isRegister ? 'Already have an account?' : 'New to Mentor-Match?'}{' '}
            <Link
              className="font-semibold text-accent hover:underline"
              to={isRegister ? '/login' : '/register'}
            >
              {isRegister ? 'Sign in' : 'Create an account'}
            </Link>
          </div>
        </Card>

        {/* Editorial Photo Panel for Desktop (Hidden on mobile phones) */}
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

            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider uppercase text-accent">Peer Mentorship</p>
              <blockquote className="font-serif text-base lg:text-lg font-medium text-ink leading-snug">
                "Focused 60-minute technical sessions with practicing engineers. Real answers to tough architecture, career, and coding challenges."
              </blockquote>
              <p className="text-xs text-ink-muted leading-relaxed">
                Practitioner-reviewed profiles, in-browser WebRTC video, and transparent 24-hour cancellation refund protection.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-[11px] text-ink-muted">
            <span className="font-semibold text-ink">Mentor-Match</span>
            <span>Razorpay & WebRTC</span>
          </div>
        </aside>
      </div>
    </section>
  );
}