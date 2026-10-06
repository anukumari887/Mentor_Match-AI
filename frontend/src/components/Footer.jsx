import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-surface transition-colors duration-200">
      <div className="page-wrap py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <span className="brand-mark flex h-7 w-7 items-center justify-center rounded-lg text-xs font-extrabold shadow-sm">
                M
              </span>
              <span className="text-base font-extrabold tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors">
                Mentor-Match
              </span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
              Personalized career & technical mentorship. Direct 1-on-1 video sessions with vetted senior practitioners.
            </p>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck size={14} className="text-brand-600" /> Secure payments & guaranteed refunds for early cancellations.
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Platform</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>
                <Link className="hover:text-brand-600 transition-colors" to="/mentors">Browse mentors</Link>
              </li>
              <li>
                <Link className="hover:text-brand-600 transition-colors" to="/#how-it-works">How it works</Link>
              </li>
              <li>
                <Link className="hover:text-brand-600 transition-colors" to="/status">System status</Link>
              </li>
              <li>
                <Link className="hover:text-brand-600 transition-colors" to="/register">Become a mentor</Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Legal & Support</h4>
            <nav aria-label="Legal and support links" className="mt-3 flex flex-col space-y-2 text-sm text-slate-600">
              <Link className="hover:text-brand-600 transition-colors" to="/terms">Terms of service</Link>
              <Link className="hover:text-brand-600 transition-colors" to="/privacy">Privacy policy</Link>
              <Link className="hover:text-brand-600 transition-colors" to="/refund-policy">Refund policy</Link>
            </nav>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Mentor-Match AI. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with care for learners and mentors.
          </p>
        </div>
      </div>
    </footer>
  );
}
