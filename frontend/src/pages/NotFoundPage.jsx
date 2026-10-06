import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="page-wrap flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <div className="card max-w-md p-8 sm:p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-800 font-extrabold mb-4">
          <Compass size={24} />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-brand-700">404 · Not found</p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">This page has moved on.</h1>
        <p className="mt-3 text-xs sm:text-sm leading-6 text-slate-600">
          The link you followed may be broken, or the page may have been moved or removed.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="primary-button text-xs py-2 px-4"
          >
            <Home size={15} /> Return home
          </Link>
          <Link
            to="/mentors"
            className="quiet-button text-xs py-2 px-4"
          >
            <Compass size={15} /> Browse mentors
          </Link>
        </div>
      </div>
    </div>
  );
}
