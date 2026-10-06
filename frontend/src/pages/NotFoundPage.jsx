import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import Card from '../components/Card';

export default function NotFoundPage() {
  return (
    <div className="page-wrap flex flex-1 flex-col items-center justify-center px-4 py-20 text-center bg-bg text-ink transition-colors">
      <Card variant="raised" padding="lg" className="max-w-md text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded bg-surface-raised border border-border text-ink mb-3.5">
          <Compass size={20} className="text-accent" />
        </div>
        <p className="text-xs font-semibold tracking-wider uppercase text-accent">404 · Page Not Found</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">This page has moved on.</h1>
        <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-ink-muted">
          The link you followed may be broken, or the page may have been moved or removed.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors"
          >
            <Home size={14} /> Return home
          </Link>
          <Link
            to="/mentors"
            className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-4 py-2 text-xs font-medium text-ink hover:bg-surface-raised transition-colors"
          >
            <Compass size={14} /> Browse mentors
          </Link>
        </div>
      </Card>
    </div>
  );
}
