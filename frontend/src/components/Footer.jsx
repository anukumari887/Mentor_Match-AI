import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface transition-colors">
      <div className="page-wrap py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <span className="flex h-7 w-7 items-center justify-center rounded bg-ink text-surface text-xs font-bold font-serif shadow-sm">
                M
              </span>
              <span className="font-serif text-base font-bold tracking-tight text-ink group-hover:text-accent transition-colors">
                Mentor-Match
              </span>
            </Link>
            <p className="mt-3 max-w-sm text-xs sm:text-sm leading-relaxed text-ink-muted">
              Direct, 1-on-1 video sessions with approved practitioners. Structured feedback, code review, and career conversations.
            </p>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-muted">
              <ShieldCheck size={14} className="text-accent shrink-0" />
              <span>Full refund if cancelled &ge;24 hours before session, or if the mentor cancels.</span>
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink">Platform</h4>
            <ul className="mt-3 space-y-2 text-xs sm:text-sm text-ink-muted">
              <li>
                <Link className="hover:text-ink transition-colors" to="/mentors">
                  Browse mentors
                </Link>
              </li>
              <li>
                <Link className="hover:text-ink transition-colors" to="/#how-it-works">
                  How it works
                </Link>
              </li>
              <li>
                <Link className="hover:text-ink transition-colors" to="/status">
                  System status
                </Link>
              </li>
              <li>
                <Link className="hover:text-ink transition-colors" to="/register">
                  Apply as mentor
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink">Legal & Support</h4>
            <nav aria-label="Legal and support links" className="mt-3 flex flex-col space-y-2 text-xs sm:text-sm text-ink-muted">
              <Link className="hover:text-ink transition-colors" to="/terms">
                Terms of service
              </Link>
              <Link className="hover:text-ink transition-colors" to="/privacy">
                Privacy policy
              </Link>
              <Link className="hover:text-ink transition-colors" to="/refund-policy">
                Refund policy
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-muted">
          <p>© {new Date().getFullYear()} Mentor-Match. Honest mentorship for dedicated learners.</p>
          <p>
            Respecting your time and focus.
          </p>
        </div>
      </div>
    </footer>
  );
}
