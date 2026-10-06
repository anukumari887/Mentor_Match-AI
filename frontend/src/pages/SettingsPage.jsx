import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, ShieldAlert, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Change password state
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Logout all state
  const [showModal, setShowModal] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  const updateField = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match. Please check and try again.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });

      setSuccess('Your password was updated successfully. All other active sessions have been signed out.');
      setForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      const code = err.response?.data?.error?.code;
      const message = err.response?.data?.error?.message;
      if (code === 'INVALID_CURRENT_PASSWORD') {
        setError('The current password you entered is incorrect.');
      } else if (code === 'SAME_PASSWORD') {
        setError('Your new password must be different from your current password.');
      } else if (code === 'RATE_LIMIT_EXCEEDED') {
        setError('Too many password change attempts. Please wait 15 minutes before trying again.');
      } else {
        setError(message || err.message || 'Could not update password. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogoutAll = async () => {
    setLoggingOutAll(true);
    try {
      await api.post('/api/auth/logout-all');
      await logout();
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Failed to sign out of all devices.');
      setShowModal(false);
      setLoggingOutAll(false);
    }
  };

  return (
    <section className="page-wrap flex-1 py-10 sm:py-14 bg-bg text-ink transition-colors max-w-3xl">
      <header className="mb-8 border-b border-border pb-6">
        <p className="text-xs font-semibold tracking-wider uppercase text-accent">Security & Preferences</p>
        <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-ink">Account settings</h1>
        <p className="mt-2 text-xs sm:text-sm leading-relaxed text-ink-muted">
          Manage your credentials, active sessions, and access security.
        </p>
      </header>

      <div className="space-y-6">
        {/* Card 1: Account Information (Read-Only) */}
        <Card variant="default" padding="lg">
          <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
            <User size={18} className="text-accent" aria-hidden="true" />
            <h2 className="font-serif text-lg font-semibold text-ink">Account information</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 text-xs sm:text-sm">
            <div>
              <span className="block text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-1">Full name</span>
              <p className="font-medium text-ink">{user?.name || '—'}</p>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-1">Email address</span>
              <p className="font-medium text-ink break-all">{user?.email || '—'}</p>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-1">Role</span>
              <Badge variant="neutral" size="sm" className="capitalize inline-block">
                {user?.role || 'Learner'}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Card 2: Change Password */}
        <Card variant="default" padding="lg">
          <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
            <Lock size={18} className="text-accent" aria-hidden="true" />
            <h2 className="font-serif text-lg font-semibold text-ink">Change password</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="current-password">
                Current password
              </label>
              <input
                id="current-password"
                name="currentPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={form.currentPassword}
                onChange={updateField}
                placeholder="••••••••"
                className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-ink" htmlFor="new-password">
                  New password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-ink-muted hover:text-ink inline-flex items-center gap-1 focus:outline-none"
                  aria-label={showPassword ? 'Hide password text' : 'Show password text'}
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <input
                id="new-password"
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
                Must be at least 8 characters and under 72 bytes. Avoid common words or sequences.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="confirm-password">
                Confirm new password
              </label>
              <input
                id="confirm-password"
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
              <div role="alert" className="rounded border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-medium text-danger flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div role="status" className="rounded border border-success/40 bg-success/10 px-3 py-2 text-xs font-medium text-success flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="mt-2"
            >
              <span>{submitting ? 'Updating password...' : 'Update password'}</span>
            </Button>
          </form>
        </Card>

        {/* Card 3: Sign Out of All Devices */}
        <Card variant="default" padding="lg">
          <div className="flex items-center gap-2 mb-3 border-b border-border pb-3">
            <ShieldAlert size={18} className="text-warning" aria-hidden="true" />
            <h2 className="font-serif text-lg font-semibold text-ink">Sign out of all devices</h2>
          </div>

          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed max-w-xl">
            If you suspect unauthorized access or signed in on a public computer, you can invalidate all existing tokens.
            All other devices will be forced to log in again.
          </p>

          <div className="mt-4">
            <Button
              type="button"
              variant="danger"
              onClick={() => setShowModal(true)}
            >
              Sign out everywhere
            </Button>
          </div>
        </Card>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Sign out of all devices?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
              disabled={loggingOutAll}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleLogoutAll}
              disabled={loggingOutAll}
            >
              {loggingOutAll ? 'Signing out...' : 'Confirm sign out everywhere'}
            </Button>
          </div>
        }
      >
        <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
          This will invalidate all current active login sessions across every browser, phone, and tablet. You will be signed out immediately and redirected to the login page.
        </p>
      </Modal>
    </section>
  );
}
