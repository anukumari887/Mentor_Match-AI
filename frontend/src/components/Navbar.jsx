import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  ClipboardCheck,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  User,
  WalletCards,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ThemeMenu from './ThemeMenu';
import Avatar from './Avatar';

export default function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  const isActive = (path) => {
    if (path.startsWith('/#')) {
      return location.pathname === '/' && location.hash === path.substring(1);
    }
    return location.pathname === path;
  };

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    setLogoutError('');
    try {
      await logout();
      closeMenu();
    } catch (error) {
      setLogoutError(error.message || 'Could not sign out. Please try again.');
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm transition-colors">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="page-wrap flex min-h-16 items-center justify-between gap-3 py-2">
        {/* Left: Brand + Desktop Links */}
        <div className="flex items-center gap-6">
          <Link
            aria-label="Mentor-Match home"
            className="flex shrink-0 items-center gap-2.5 group"
            onClick={closeMenu}
            to="/"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded bg-ink text-surface text-sm font-bold font-serif shadow-sm">
              M
            </span>
            <span className="font-serif text-base font-bold tracking-tight text-ink group-hover:text-accent transition-colors">
              Mentor-Match
            </span>
          </Link>

          {/* Desktop Primary Nav Links */}
          <nav aria-label="Main navigation" className="hidden lg:flex lg:items-center lg:gap-1">
            <Link
              className={`whitespace-nowrap px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
                isActive('/') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
              }`}
              to="/#how-it-works"
            >
              How it works
            </Link>

            {user?.role === 'admin' && (
              <Link
                className={`whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
                  isActive('/admin') || isActive('/admin/mentors')
                    ? 'text-accent font-semibold bg-accent/10'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                }`}
                to="/admin"
              >
                <ClipboardCheck size={14} /> Admin portal
              </Link>
            )}

            {user?.role === 'learner' && (
              <Link
                className={`whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
                  isActive('/dashboard') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                }`}
                to="/dashboard"
              >
                <LayoutDashboard size={14} /> Dashboard
              </Link>
            )}

            {user && user.role !== 'admin' && (
              <Link
                className={`whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
                  isActive('/mentors') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                }`}
                to="/mentors"
              >
                <Compass size={14} /> Browse mentors
              </Link>
            )}

            <Link
              className={`whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
                isActive('/status') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
              }`}
              to="/status"
            >
              <Activity size={14} /> System status
            </Link>
          </nav>
        </div>

        {/* Right Section: Theme Menu + User Navigation */}
        <div className="hidden lg:flex lg:items-center lg:gap-2.5">
          <ThemeMenu />

          <span className="h-4 w-px bg-border" aria-hidden="true" />

          {user ? (
            <div className="flex items-center gap-1.5">
              <span className="hidden xl:inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider px-2 py-0.5 rounded bg-surface-raised text-ink border border-border">
                <Avatar name={user.name} size="xs" />
                <span className="uppercase text-ink-muted text-[10px]">{user.role}</span>
              </span>
              {user.role !== 'admin' && (
                <Link
                  className={`whitespace-nowrap px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
                    isActive('/profile') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                  }`}
                  to="/profile"
                >
                  My profile
                </Link>
              )}
              {user.role !== 'admin' && (
                <Link
                  className={`whitespace-nowrap px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
                    isActive('/sessions') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                  }`}
                  to="/sessions"
                >
                  My sessions
                </Link>
              )}
              {user.role === 'mentor' && (
                <Link
                  className={`whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
                    isActive('/earnings') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                  }`}
                  to="/earnings"
                >
                  <WalletCards size={14} /> Earnings
                </Link>
              )}
              <button
                className="whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded text-ink-muted hover:text-danger hover:bg-danger/10 transition-colors"
                onClick={handleLogout}
                type="button"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                className="whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded text-ink-muted hover:text-ink hover:bg-surface-raised transition-colors"
                to="/login"
              >
                Sign in
              </Link>
              <Link
                className="whitespace-nowrap inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded bg-accent text-accent-text hover:bg-accent-hover transition-colors shadow-sm"
                to="/register"
              >
                Get started <ArrowRight size={13} />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeMenu />

          <button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            className="flex h-8 w-8 items-center justify-center rounded border border-border bg-surface text-ink hover:bg-surface-raised transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            type="button"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile Drawer Menu */}
        {menuOpen && (
          <nav
            aria-label="Main navigation"
            className="absolute left-0 right-0 top-full flex flex-col gap-1 border-b border-border bg-surface px-5 py-4 shadow-md lg:hidden"
          >
            {user && (
              <div className="mb-2 pb-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar name={user.name} size="sm" />
                  <div>
                    <p className="text-xs font-bold text-ink">{user.name}</p>
                    <p className="text-[11px] text-ink-muted">{user.email}</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-raised text-ink-muted border border-border">
                  {user.role}
                </span>
              </div>
            )}

            <Link
              className={`whitespace-nowrap px-3 py-2 text-xs font-medium rounded ${
                isActive('/') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
              }`}
              onClick={closeMenu}
              to="/#how-it-works"
            >
              How it works
            </Link>

            {user?.role === 'admin' && (
              <Link
                className={`whitespace-nowrap inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded ${
                  isActive('/admin') || isActive('/admin/mentors')
                    ? 'text-accent font-semibold bg-accent/10'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                }`}
                onClick={closeMenu}
                to="/admin"
              >
                <ClipboardCheck size={14} /> Admin portal
              </Link>
            )}

            {user?.role === 'learner' && (
              <Link
                className={`whitespace-nowrap inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded ${
                  isActive('/dashboard') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                }`}
                onClick={closeMenu}
                to="/dashboard"
              >
                <LayoutDashboard size={14} /> Dashboard
              </Link>
            )}

            {user && user.role !== 'admin' && (
              <Link
                className={`whitespace-nowrap inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded ${
                  isActive('/mentors') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                }`}
                onClick={closeMenu}
                to="/mentors"
              >
                <Compass size={14} /> Browse mentors
              </Link>
            )}

            <Link
              className={`whitespace-nowrap inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded ${
                isActive('/status') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
              }`}
              onClick={closeMenu}
              to="/status"
            >
              <Activity size={14} /> System status
            </Link>

            {user ? (
              <div className="mt-2 pt-2 border-t border-border flex flex-col gap-1">
                {user.role !== 'admin' && (
                  <Link
                    className={`whitespace-nowrap px-3 py-2 text-xs font-medium rounded ${
                      isActive('/profile') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                    }`}
                    onClick={closeMenu}
                    to="/profile"
                  >
                    My profile
                  </Link>
                )}
                {user.role !== 'admin' && (
                  <Link
                    className={`whitespace-nowrap px-3 py-2 text-xs font-medium rounded ${
                      isActive('/sessions') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                    }`}
                    onClick={closeMenu}
                    to="/sessions"
                  >
                    My sessions
                  </Link>
                )}
                {user.role === 'mentor' && (
                  <Link
                    className={`whitespace-nowrap inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded ${
                      isActive('/earnings') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                    }`}
                    onClick={closeMenu}
                    to="/earnings"
                  >
                    <WalletCards size={14} /> Earnings
                  </Link>
                )}
                <button
                  className="whitespace-nowrap inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded text-left text-danger hover:bg-danger/10 transition-colors"
                  onClick={handleLogout}
                  type="button"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
                <Link
                  className="whitespace-nowrap px-3 py-2 text-xs font-medium text-center rounded border border-border text-ink hover:bg-surface-raised"
                  onClick={closeMenu}
                  to="/login"
                >
                  Sign in
                </Link>
                <Link
                  className="whitespace-nowrap px-3 py-2 text-xs font-semibold text-center rounded bg-accent text-accent-text hover:bg-accent-hover flex items-center justify-center gap-1.5"
                  onClick={closeMenu}
                  to="/register"
                >
                  Get started <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </nav>
        )}
      </div>
      {logoutError && (
        <div className="page-wrap pb-2 text-xs font-semibold text-danger" role="alert">
          {logoutError}
        </div>
      )}
    </header>
  );
}
