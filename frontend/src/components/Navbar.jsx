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
  Moon,
  Sun,
  SunMoon,
  User,
  WalletCards,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  const isActive = (path) => location.pathname === path;
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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-surface/95 backdrop-blur-md transition-colors duration-200">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="page-wrap flex min-h-16 items-center justify-between gap-4 py-2.5">
        <div className="flex items-center gap-6">
          <Link aria-label="Mentor-Match home" className="flex shrink-0 items-center gap-2.5 group" onClick={closeMenu} to="/">
            <span className="brand-mark flex h-8 w-8 items-center justify-center rounded-lg text-sm font-extrabold shadow-sm transition-transform group-hover:scale-105">
              M
            </span>
            <span className="text-base font-extrabold tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors">
              Mentor-Match
            </span>
          </Link>

          {/* Desktop Primary Nav Links */}
          <nav aria-label="Main navigation" className="hidden lg:flex lg:items-center lg:gap-1">
            <Link className={`nav-link ${isActive('/') ? 'nav-link-active' : ''}`} to="/#how-it-works">How it works</Link>
            {user?.role === 'admin' && (
              <Link className={`nav-link inline-flex items-center gap-1.5 ${isActive('/admin') || isActive('/admin/mentors') ? 'nav-link-active' : ''}`} to="/admin">
                <ClipboardCheck size={16} /> Admin portal
              </Link>
            )}
            {user?.role === 'learner' && (
              <Link className={`nav-link inline-flex items-center gap-1.5 ${isActive('/dashboard') ? 'nav-link-active' : ''}`} to="/dashboard">
                <LayoutDashboard size={16} /> Dashboard
              </Link>
            )}
            {user && user.role !== 'admin' && (
              <Link className={`nav-link inline-flex items-center gap-1.5 ${isActive('/mentors') ? 'nav-link-active' : ''}`} to="/mentors">
                <Compass size={16} /> Browse mentors
              </Link>
            )}
            <Link className={`nav-link inline-flex items-center gap-1.5 ${isActive('/status') ? 'nav-link-active' : ''}`} to="/status">
              <Activity size={16} /> System status
            </Link>
          </nav>
        </div>

        {/* Right Section: Theme Toggle + Auth */}
        <div className="hidden lg:flex lg:items-center lg:gap-3">
          <label className="theme-select-wrap cursor-pointer transition-colors hover:border-brand-500/50" title="Choose appearance">
            <span className="sr-only">Theme</span>
            {theme === 'light' ? (
              <Sun size={15} className="text-amber-500" aria-hidden="true" />
            ) : theme === 'dark' ? (
              <Moon size={15} className="text-brand-400" aria-hidden="true" />
            ) : (
              <SunMoon size={15} className="text-slate-500" aria-hidden="true" />
            )}
            <select
              aria-label="Theme"
              className="theme-select focus:outline-none"
              onChange={(event) => setTheme(event.target.value)}
              value={theme}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>

          <span className="h-5 w-px bg-slate-200" aria-hidden="true" />

          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden xl:inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                {user.role}
              </span>
              {user.role !== 'admin' && (
                <Link className={`nav-link ${isActive('/profile') ? 'nav-link-active' : ''}`} to="/profile">
                  My profile
                </Link>
              )}
              {user.role !== 'admin' && (
                <Link className={`nav-link ${isActive('/sessions') ? 'nav-link-active' : ''}`} to="/sessions">
                  My sessions
                </Link>
              )}
              {user.role === 'mentor' && (
                <Link className={`nav-link inline-flex items-center gap-1.5 ${isActive('/earnings') ? 'nav-link-active' : ''}`} to="/earnings">
                  <WalletCards size={16} /> Earnings
                </Link>
              )}
              <button
                className="nav-link inline-flex items-center gap-1.5 text-slate-600 hover:text-rose-600"
                onClick={handleLogout}
                type="button"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link className="nav-link" to="/login">Sign in</Link>
              <Link className="primary-button text-xs py-2 px-3.5" to="/register">
                Get started <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 lg:hidden">
          <label className="theme-select-wrap p-1.5" title="Choose appearance">
            <span className="sr-only">Theme</span>
            {theme === 'light' ? (
              <Sun size={15} className="text-amber-500" aria-hidden="true" />
            ) : theme === 'dark' ? (
              <Moon size={15} className="text-brand-400" aria-hidden="true" />
            ) : (
              <SunMoon size={15} className="text-slate-500" aria-hidden="true" />
            )}
            <select
              aria-label="Theme"
              className="theme-select text-xs w-16"
              onChange={(event) => setTheme(event.target.value)}
              value={theme}
            >
              <option value="system">Auto</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>

          <button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            className="icon-button"
            onClick={() => setMenuOpen(!menuOpen)}
            type="button"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Drawer Menu */}
        {menuOpen && (
          <nav
            aria-label="Main navigation"
            className="absolute left-0 right-0 top-full flex flex-col gap-1 border-b border-slate-200 bg-surface px-5 py-5 shadow-lg lg:hidden"
          >
            {user && (
              <div className="mb-3 pb-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                  {user.role}
                </span>
              </div>
            )}

            <Link className={`nav-link ${isActive('/') ? 'nav-link-active' : ''}`} onClick={closeMenu} to="/#how-it-works">How it works</Link>
            {user?.role === 'admin' && (
              <Link className={`nav-link inline-flex items-center gap-2 ${isActive('/admin') || isActive('/admin/mentors') ? 'nav-link-active' : ''}`} onClick={closeMenu} to="/admin">
                <ClipboardCheck size={16} /> Admin portal
              </Link>
            )}
            {user?.role === 'learner' && (
              <Link className={`nav-link inline-flex items-center gap-2 ${isActive('/dashboard') ? 'nav-link-active' : ''}`} onClick={closeMenu} to="/dashboard">
                <LayoutDashboard size={16} /> Dashboard
              </Link>
            )}
            {user && user.role !== 'admin' && (
              <Link className={`nav-link inline-flex items-center gap-2 ${isActive('/mentors') ? 'nav-link-active' : ''}`} onClick={closeMenu} to="/mentors">
                <Compass size={16} /> Browse mentors
              </Link>
            )}
            <Link className={`nav-link inline-flex items-center gap-2 ${isActive('/status') ? 'nav-link-active' : ''}`} onClick={closeMenu} to="/status">
              <Activity size={16} /> System status
            </Link>

            {user ? (
              <div className="mt-2 pt-2 border-t border-slate-200 flex flex-col gap-1">
                {user.role !== 'admin' && (
                  <Link className={`nav-link ${isActive('/profile') ? 'nav-link-active' : ''}`} onClick={closeMenu} to="/profile">
                    My profile
                  </Link>
                )}
                {user.role !== 'admin' && (
                  <Link className={`nav-link ${isActive('/sessions') ? 'nav-link-active' : ''}`} onClick={closeMenu} to="/sessions">
                    My sessions
                  </Link>
                )}
                {user.role === 'mentor' && (
                  <Link className={`nav-link inline-flex items-center gap-2 ${isActive('/earnings') ? 'nav-link-active' : ''}`} onClick={closeMenu} to="/earnings">
                    <WalletCards size={16} /> Earnings
                  </Link>
                )}
                <button
                  className="nav-link inline-flex items-center gap-2 text-left text-rose-600 hover:text-rose-700"
                  onClick={handleLogout}
                  type="button"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col gap-2">
                <Link className="nav-link text-center justify-center" onClick={closeMenu} to="/login">Sign in</Link>
                <Link className="primary-button text-center justify-center" onClick={closeMenu} to="/register">
                  Get started <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </nav>
        )}
      </div>
      {logoutError && (
        <div className="page-wrap pb-2 text-xs font-semibold text-rose-600" role="alert">
          {logoutError}
        </div>
      )}
    </header>
  );
}
