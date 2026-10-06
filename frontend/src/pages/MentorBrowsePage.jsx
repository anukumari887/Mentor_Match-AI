import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCcw, Search, SlidersHorizontal, Star, UsersRound, Briefcase } from 'lucide-react';
import { listMentors } from '../services/mentors';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Skeleton from '../components/Skeleton';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function rupees(value) {
  return `₹${new Intl.NumberFormat('en-IN').format(value)}`;
}

export default function MentorBrowsePage() {
  const [form, setForm] = useState({ q: '', skill: '', minPrice: '', maxPrice: '', minRating: '', day: '', sort: 'rating' });
  const [filters, setFilters] = useState({ sort: 'rating' });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    listMentors({ ...filters, page, limit: 12 })
      .then((data) => { if (active) setResult(data); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Mentors could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, page, retry]);

  const setField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submitFilters = (event) => {
    event.preventDefault();
    const nextFilters = Object.fromEntries(
      Object.entries(form).filter(([, value]) => value !== '')
    );
    setFilters(nextFilters);
    setPage(1);
  };

  const clearFilters = () => {
    setForm({ q: '', skill: '', minPrice: '', maxPrice: '', minRating: '', day: '', sort: 'rating' });
    setFilters({ sort: 'rating' });
    setPage(1);
  };

  return (
    <section className="page-wrap flex-1 py-10 sm:py-14 bg-bg text-ink transition-colors">
      {/* Header */}
      <header className="mb-7 border-b border-border pb-6">
        <p className="text-xs font-semibold tracking-wider uppercase text-accent">Practitioners Directory</p>
        <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-ink">Browse mentors</h1>
        <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed text-ink-muted">
          Filter by technical skills, domain expertise, and price to find someone suited to your exact next step.
        </p>
      </header>

      {/* Filter Toolbar Card */}
      <form className="mb-8 rounded border border-border bg-surface p-5 sm:p-6" onSubmit={submitFilters}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-semibold text-ink lg:col-span-2">
            Name or keyword
            <div className="relative mt-1.5">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={15} />
              <input
                className="w-full rounded border border-border bg-surface pl-9 pr-3 py-2 text-xs sm:text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                name="q"
                onChange={setField}
                placeholder="Search by topic, e.g. “career change”"
                value={form.q}
              />
            </div>
          </label>

          <label className="block text-xs font-semibold text-ink">
            Skill
            <input
              className="mt-1.5 w-full rounded border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              name="skill"
              onChange={setField}
              placeholder="Python, React, System Design..."
              value={form.skill}
            />
          </label>

          <label className="block text-xs font-semibold text-ink">
            Sort by
            <select
              className="mt-1.5 w-full rounded border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              name="sort"
              onChange={setField}
              value={form.sort}
            >
              <option value="rating">Top rated</option>
              <option value="experience">Experience</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </label>

          <label className="block text-xs font-semibold text-ink">
            Min price (INR)
            <input
              className="mt-1.5 w-full rounded border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              min="0"
              name="minPrice"
              onChange={setField}
              placeholder="300"
              type="number"
              value={form.minPrice}
            />
          </label>

          <label className="block text-xs font-semibold text-ink">
            Max price (INR)
            <input
              className="mt-1.5 w-full rounded border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              min="0"
              name="maxPrice"
              onChange={setField}
              placeholder="1500"
              type="number"
              value={form.maxPrice}
            />
          </label>

          <label className="block text-xs font-semibold text-ink">
            Minimum rating
            <select
              className="mt-1.5 w-full rounded border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              name="minRating"
              onChange={setField}
              value={form.minRating}
            >
              <option value="">Any rating</option>
              <option value="3">3 stars and up</option>
              <option value="4">4 stars and up</option>
              <option value="4.5">4.5 stars and up</option>
            </select>
          </label>

          <label className="block text-xs font-semibold text-ink">
            Available on
            <select
              className="mt-1.5 w-full rounded border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              name="day"
              onChange={setField}
              value={form.day}
            >
              <option value="">Any day</option>
              {DAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors shadow-sm"
              type="submit"
            >
              <SlidersHorizontal size={13} /> Apply filters
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-3 py-2 text-xs font-medium text-ink hover:bg-surface-raised transition-colors"
              onClick={clearFilters}
              type="button"
            >
              <RotateCcw size={12} /> Clear
            </button>
          </div>
          {result && (
            <p className="text-xs text-ink-muted">
              Showing {result.items?.length || 0} of {result.total} {result.total === 1 ? 'mentor' : 'mentors'}
            </p>
          )}
        </div>
      </form>

      {/* Error state */}
      {error && (
        <div
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded border border-danger/40 bg-danger/10 p-4 text-xs sm:text-sm text-danger"
          role="alert"
        >
          <span>{error}</span>
          <button className="font-bold underline" onClick={() => setRetry((value) => value + 1)} type="button">
            Try again
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="py-12 text-center text-xs text-ink-muted" role="status">
          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            <Skeleton variant="card" />
            <Skeleton variant="card" />
          </div>
          <p className="mt-4">Finding mentors...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && result?.items?.length === 0 && (
        <Card variant="flat" padding="lg" className="text-center my-6">
          <UsersRound className="mx-auto text-ink-muted" size={32} />
          <h2 className="mt-3 font-serif text-xl sm:text-2xl font-semibold text-ink">
            No mentors match those filters
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
            Try broadening your search keyword, adjusting your price range, or selecting "Any day" for availability.
          </p>
          <button
            className="mt-4 inline-flex items-center gap-1.5 rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors"
            onClick={clearFilters}
            type="button"
          >
            Clear filters
          </button>
        </Card>
      )}

      {/* Mentor Cards Grid */}
      {!loading && !error && result?.items?.length > 0 && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            {result.items.map((mentor) => (
              <Card
                key={mentor.id}
                variant="default"
                padding="md"
                className="flex flex-col justify-between hover:border-accent transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-surface-raised border border-border font-serif font-bold text-xs text-ink">
                        {mentor.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="font-serif text-lg font-semibold text-ink">{mentor.name}</h2>
                        <p className="text-xs text-ink-muted mt-0.5">{mentor.headline}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-ink">{rupees(mentor.pricePerHour)}</p>
                      <span className="block text-[11px] text-ink-muted">per hour</span>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-ink-muted">
                    {mentor.bio}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(mentor.skills || []).slice(0, 5).map((skill) => (
                      <span
                        key={skill}
                        className="rounded border border-border bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-ink"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-border flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-ink-muted">
                    {mentor.ratingCount ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-ink">
                        <Star size={13} className="text-warning fill-warning" />
                        {mentor.ratingAvg.toFixed(1)}
                        <span className="text-ink-muted font-normal">({mentor.ratingCount})</span>
                      </span>
                    ) : (
                      <Badge variant="neutral" size="sm">New mentor</Badge>
                    )}
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Briefcase size={12} className="text-ink-muted" /> {mentor.experienceYears}y exp
                    </span>
                  </div>

                  <Link
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent hover:underline"
                    to={`/mentors/${mentor.id}`}
                  >
                    View profile <ArrowRight size={13} />
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {result.pages > 1 && (
            <nav aria-label="Mentor result pages" className="mt-8 flex items-center justify-between border-t border-border pt-4">
              <button
                className="rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-raised disabled:opacity-40 transition-colors"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                type="button"
              >
                Previous
              </button>
              <span className="text-xs text-ink-muted">
                Page {page} of {result.pages}
              </span>
              <button
                className="rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-raised disabled:opacity-40 transition-colors"
                disabled={page >= result.pages}
                onClick={() => setPage(page + 1)}
                type="button"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}