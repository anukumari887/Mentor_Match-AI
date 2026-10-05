import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, Activity, ArrowRight } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-sm">
            <span className="font-bold text-lg tracking-tight">M</span>
          </div>
          <span className="font-bold text-slate-900 text-lg tracking-tight">
            Mentor<span className="text-brand-600">Match</span>
          </span>
        </Link>

        <nav className="flex items-center space-x-1 sm:space-x-4">
          <Link
            to="/mentors"
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              location.pathname === '/mentors'
                ? 'text-brand-600 bg-brand-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Compass className="w-4 h-4" />
              <span>Browse Mentors</span>
            </span>
          </Link>

          <Link
            to="/status"
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              location.pathname === '/status'
                ? 'text-brand-600 bg-brand-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              <span>System Status</span>
            </span>
          </Link>

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          <Link
            to="/login"
            className="px-3.5 py-2 rounded-md text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Sign In
          </Link>

          <Link
            to="/register"
            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
