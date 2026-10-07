import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  ClipboardCheck,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  User,
  WalletCards,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUnreadCount } from '../services/chat';
import ThemeMenu from './ThemeMenu';
import Avatar from './Avatar';
import Logo from './Logo';

export default function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || user.role === 'admin') {
      setUnreadCount(0);
      return;
    }

    let active = true;

    const fetchUnread = () => {
      getUnreadCount()
        .then((data) => {
          if (!active) return;
          const count = typeof data === 'number' ? data : (typeof data?.unreadCount === 'number' ? data.unreadCount : 0);
          setUnreadCount(count);
        })
        .catch(() => {});
    };

    fetchUnread();
    const intervalId = setInterval(fetchUnread, 60000);

    const handleCustomUpdate = (event) => {
      const count = typeof event?.detail === 'number' ? event.detail : event?.detail?.unreadCount;
      if (typeof count === 'number') {
        setUnreadCount(count);
      } else {
        fetchUnread();
      }
    };

    window.addEventListener('chat:unread-changed', handleCustomUpdate);

    return () => {
      active = false;
      clearInterval(intervalId);
      window.removeEventListener('chat:unread-changed', handleCustomUpdate);
    };
  }, [user]);

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
      <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 flex min-h-16 items-center justify-between gap-2 py-2">
        {/* Left: Brand + Desktop Links */}
        <div className="flex items-center gap-3">
          <Logo onClick={closeMenu} />

          {/* Desktop Primary Nav Links */}
          <nav aria-label="Main navigation" className="hidden xl:flex xl:items-center xl:gap-0.5">
            <Link
              className={`whitespace-nowrap px-1.5 py-1 text-xs font-medium rounded transition-colors ${
                isActive('/') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
              }`}
              to="/#how-it-works"
            >
              How it works
            </Link>

            {user?.role === 'admin' && (
              <Link
                className={`whitespace-nowrap inline-flex items-center gap-1 px-1.5 py-1 text-xs font-medium rounded transition-colors ${
                  isActive('/admin') || isActive('/admin/mentors')
                    ? 'text-accent font-semibold bg-accent/10'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                }`}
                to="/admin"
              >
                <ClipboardCheck size={13} /> Admin portal
              </Link>
            )}

            {user?.role === 'learner' && (
              <Link
                className={`whitespace-nowrap inline-flex items-center gap-1 px-1.5 py-1 text-xs font-medium rounded transition-colors ${
                  isActive('/dashboard') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                }`}
                to="/dashboard"
              >
                <LayoutDashboard size={13} /> Dashboard
              </Link>
            )}

            {user && user.role !== 'admin' && (
              <Link
                className={`whitespace-nowrap inline-flex items-center gap-1 px-1.5 py-1 text-xs font-medium rounded transition-colors ${
                  isActive('/mentors') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                }`}
                to="/mentors"
              >
                <Compass size={13} /> Browse mentors
              </Link>
            )}

            <Link
              className={`whitespace-nowrap inline-flex items-center gap-1 px-1.5 py-1 text-xs font-medium rounded transition-colors ${
                isActive('/status') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
              }`}
              to="/status"
            >
              <Activity size={13} /> System status
            </Link>
          </nav>
        </div>

        {/* Right Section: Theme Menu + User Navigation */}
        <div className="hidden xl:flex xl:items-center xl:gap-1.5">
          <ThemeMenu />

          <span className="h-4 w-px bg-border" aria-hidden="true" />

          {user ? (
            <div className="flex items-center gap-0.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-surface-raised text-ink border border-border">
                <Avatar name={user.name} size="xs" />
                <span className="uppercase text-ink-muted text-[10px]">{user.role}</span>
              </span>
              {user.role !== 'admin' && (
                <Link
                  className={`whitespace-nowrap px-1.5 py-1 text-xs font-medium rounded transition-colors ${
                    isActive('/profile') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                  }`}
                  to="/profile"
                >
                  My profile
                </Link>
              )}
              {user.role !== 'admin' && (
                <Link
                  className={`whitespace-nowrap px-1.5 py-1 text-xs font-medium rounded transition-colors ${
                    isActive('/sessions') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                  }`}
                  to="/sessions"
                >
                  My sessions
                </Link>
              )}
              {user.role !== 'admin' && (
                <Link
                  className={`whitespace-nowrap inline-flex items-center gap-1 px-1.5 py-1 text-xs font-medium rounded transition-colors ${
                    isActive('/messages') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                  }`}
                  to="/messages"
                >
                  <MessageSquare size={13} /> Messages
                  {unreadCount > 0 && (
                    <span
                      className="inline-flex items-center justify-center min-w-[15px] h-3.5 px-1 text-[9px] font-bold leading-none rounded-full bg-danger text-white shrink-0"
                      aria-label={`${unreadCount} unread message${unreadCount === 1 ? '' : 's'}`}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              )}
              {user.role === 'mentor' && (
                <Link
                  className={`whitespace-nowrap inline-flex items-center gap-1 px-1.5 py-1 text-xs font-medium rounded transition-colors ${
                    isActive('/earnings') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                  }`}
                  to="/earnings"
                >
                  <WalletCards size={13} /> Earnings
                </Link>
              )}
              <Link
                className={`whitespace-nowrap inline-flex items-center gap-1 px-1.5 py-1 text-xs font-medium rounded transition-colors ${
                  isActive('/settings') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                }`}
                to="/settings"
              >
                <Settings size={13} /> Settings
              </Link>
              <button
                className="whitespace-nowrap inline-flex items-center gap-1 px-1.5 py-1 text-xs font-medium rounded text-ink-muted hover:text-danger hover:bg-danger/10 transition-colors"
                onClick={handleLogout}
                type="button"
              >
                <LogOut size={13} /> Sign out
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
        <div className="flex items-center gap-2 xl:hidden">
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
            className="absolute left-0 right-0 top-full flex flex-col gap-1 border-b border-border bg-surface px-5 py-4 shadow-md xl:hidden"
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
                {user.role !== 'admin' && (
                  <Link
                    className={`whitespace-nowrap inline-flex items-center justify-between px-3 py-2 text-xs font-medium rounded ${
                      isActive('/messages') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                    }`}
                    onClick={closeMenu}
                    to="/messages"
                  >
                    <span className="inline-flex items-center gap-2">
                      <MessageSquare size={14} /> Messages
                    </span>
                    {unreadCount > 0 && (
                      <span
                        className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-[10px] font-bold leading-none rounded-full bg-danger text-white shrink-0"
                        aria-label={`${unreadCount} unread message${unreadCount === 1 ? '' : 's'}`}
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
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
                <Link
                  className={`whitespace-nowrap inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded ${
                    isActive('/settings') ? 'text-accent font-semibold bg-accent/10' : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                  }`}
                  onClick={closeMenu}
                  to="/settings"
                >
                  <Settings size={14} /> Settings
                </Link>
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
