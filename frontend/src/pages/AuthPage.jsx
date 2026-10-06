import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, UserCheck, GraduationCap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
      setError(requestError.message || 'We could not complete your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <div className="card w-full max-w-md p-7 sm:p-9">
        <div className="mb-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-800 shadow-xs">
            <LockKeyhole size={20} aria-hidden="true" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-700">Mentor-Match AI</p>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-slate-900">
            {isRegister ? 'Start with a conversation.' : 'Welcome back.'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {isRegister
              ? 'Create an account to accelerate your skills and career with personal guidance.'
              : 'Sign in to access your sessions, recommendations, and messages.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="form-label" htmlFor="auth-name">
                  Your name
                </label>
                <input
                  id="auth-name"
                  autoComplete="name"
                  className="form-input mt-1.5"
                  maxLength={100}
                  name="name"
                  onChange={updateField}
                  placeholder="e.g. Asha Rao"
                  required
                  value={form.name}
                />
              </div>

              <fieldset>
                <legend className="mb-1.5 text-sm font-semibold text-slate-900">I want to join as</legend>
                <div className="grid grid-cols-2 gap-2.5">
                  <label
                    className={`cursor-pointer rounded-lg border p-3 text-center transition-all ${
                      form.role === 'learner'
                        ? 'border-brand-600 bg-brand-50/70 text-brand-800 font-bold shadow-xs'
                        : 'border-slate-200 bg-surface text-slate-600 hover:bg-surface-muted font-medium'
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
                    <GraduationCap size={18} className="mx-auto mb-1 text-brand-700" />
                    <span className="text-xs sm:text-sm">Learner</span>
                  </label>

                  <label
                    className={`cursor-pointer rounded-lg border p-3 text-center transition-all ${
                      form.role === 'mentor'
                        ? 'border-brand-600 bg-brand-50/70 text-brand-800 font-bold shadow-xs'
                        : 'border-slate-200 bg-surface text-slate-600 hover:bg-surface-muted font-medium'
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
                    <UserCheck size={18} className="mx-auto mb-1 text-brand-700" />
                    <span className="text-xs sm:text-sm">Mentor</span>
                  </label>
                </div>
              </fieldset>
            </>
          )}

          <div>
            <label className="form-label" htmlFor="auth-email">
              Email address
            </label>
            <input
              id="auth-email"
              autoComplete="email"
              className="form-input mt-1.5"
              name="email"
              onChange={updateField}
              placeholder="you@domain.com"
              required
              type="email"
              value={form.email}
            />
          </div>

          <div>
            <label className="form-label" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              className="form-input mt-1.5"
              minLength={isRegister ? 8 : 1}
              name="password"
              onChange={updateField}
              placeholder="••••••••"
              required
              type="password"
              value={form.password}
            />
            {isRegister && (
              <span className="mt-1.5 block text-xs font-normal text-slate-500">
                Minimum 8 characters.
              </span>
            )}
          </div>

          {error && (
            <p role="alert" className="notice-error rounded-lg px-3 py-2.5 text-sm font-medium">
              {error}
            </p>
          )}

          <button
            className="primary-button w-full mt-2"
            disabled={submitting || loading}
            type="submit"
          >
            <span>{submitting ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}</span>
            {!submitting && <ArrowRight size={16} aria-hidden="true" />}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-200 text-center text-sm text-slate-600">
          {isRegister ? 'Already have an account?' : 'New to Mentor-Match?'}{' '}
          <Link
            className="font-bold text-brand-700 hover:text-brand-800 underline-offset-4 hover:underline"
            to={isRegister ? '/login' : '/register'}
          >
            {isRegister ? 'Sign in' : 'Create an account'}
          </Link>
        </div>
      </div>
    </section>
  );
}