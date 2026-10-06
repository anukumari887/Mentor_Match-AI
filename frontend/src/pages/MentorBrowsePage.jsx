import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCcw, Search, SlidersHorizontal, Star, UsersRound, Briefcase, CheckCircle2 } from 'lucide-react';
import { listMentors } from '../services/mentors';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function rupees(value) {
  return `Rs. ${new Intl.NumberFormat('en-IN').format(value)}`;
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
    <section className="page-wrap flex-1 py-10 sm:py-14">
      {/* Header */}
      <header className="mb-7 border-b border-slate-200 pb-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-700">Find your perspective</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">Browse mentors</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Filter by technical skills, domain expertise, and price to find someone suited to your exact next step.
        </p>
      </header>

      {/* Filter Toolbar Card */}
      <form className="card p-5 sm:p-6 mb-8" onSubmit={submitFilters}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="form-label lg:col-span-2">
            Name or keyword
            <div className="relative mt-1.5">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                className="form-input pl-10"
                name="q"
                onChange={setField}
                placeholder="Search by topic, e.g. “career change”"
                value={form.q}
              />
            </div>
          </label>

          <label className="form-label">
            Skill
            <input
              className="form-input mt-1.5"
              name="skill"
              onChange={setField}
              placeholder="Python, React, System Design..."
              value={form.skill}
            />
          </label>

          <label className="form-label">
            Sort by
            <select className="form-input mt-1.5" name="sort" onChange={setField} value={form.sort}>
              <option value="rating">Top rated</option>
              <option value="experience">Experience</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </label>

          <label className="form-label">
            Min price (INR)
            <input
              className="form-input mt-1.5"
              min="0"
              name="minPrice"
              onChange={setField}
              placeholder="300"
              type="number"
              value={form.minPrice}
            />
          </label>

          <label className="form-label">
            Max price (INR)
            <input
              className="form-input mt-1.5"
              min="0"
              name="maxPrice"
              onChange={setField}
              placeholder="1500"
              type="number"
              value={form.maxPrice}
            />
          </label>

          <label className="form-label">
            Minimum rating
            <select className="form-input mt-1.5" name="minRating" onChange={setField} value={form.minRating}>
              <option value="">Any rating</option>
              <option value="3">3 stars and up</option>
              <option value="4">4 stars and up</option>
              <option value="4.5">4.5 stars and up</option>
            </select>
          </label>

          <label className="form-label">
            Available on
            <select className="form-input mt-1.5" name="day" onChange={setField} value={form.day}>
              <option value="">Any day</option>
              {DAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button className="primary-button text-xs py-2 px-4" type="submit">
              <SlidersHorizontal size={14} /> Apply filters
            </button>
            <button className="quiet-button text-xs py-2 px-3.5" onClick={clearFilters} type="button">
              <RotateCcw size={13} /> Clear
            </button>
          </div>
          {result && (
            <p className="text-xs font-semibold text-slate-500">
              Showing {result.items?.length || 0} of {result.total} {result.total === 1 ? 'mentor' : 'mentors'}
            </p>
          )}
        </div>
      </form>

      {/* Error state */}
      {error && (
        <div className="notice-error mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg p-4 text-sm" role="alert">
          <span>{error}</span>
          <button className="font-bold underline" onClick={() => setRetry((value) => value + 1)} type="button">
            Try again
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="py-16 text-center text-sm text-slate-600" role="status">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-3">Finding mentors...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && result?.items?.length === 0 && (
        <div className="card p-12 text-center my-6">
          <UsersRound className="mx-auto text-slate-400" size={32} />
          <h2 className="mt-4 text-2xl font-bold text-slate-900">No mentors match those filters</h2>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            Try broadening your search keyword, adjusting your price range, or selecting "Any day" for availability.
          </p>
          <button className="primary-button mt-5 text-xs py-2 px-4" onClick={clearFilters} type="button">
            Clear filters
          </button>
        </div>
      )}

      {/* Mentor Cards Grid */}
      {!loading && !error && result?.items?.length > 0 && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            {result.items.map((mentor) => (
              <article key={mentor.id} className="card card-hover p-6 flex flex-col justify-between transition-all">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800 font-extrabold text-sm">
                        {mentor.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">{mentor.name}</h2>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5">{mentor.headline}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-base font-extrabold text-slate-900">{rupees(mentor.pricePerHour)}</p>
                      <span className="block text-[11px] font-medium text-slate-500">per hour</span>
                    </div>
                  </div>

                  <p className="mt-3.5 line-clamp-2 text-xs leading-5 text-slate-600">
                    {mentor.bio}
                  </p>

                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {(mentor.skills || []).slice(0, 5).map((skill) => (
                      <span key={skill} className="rounded-md border border-slate-200 bg-surface-muted/60 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    {mentor.ratingCount ? (
                      <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                        <Star size={13} className="text-amber-500 fill-amber-400" />
                        {mentor.ratingAvg.toFixed(1)}
                        <span className="text-slate-500 font-normal">({mentor.ratingCount})</span>
                      </span>
                    ) : (
                      <span className="font-semibold text-brand-700">New mentor</span>
                    )}
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Briefcase size={12} className="text-slate-400" /> {mentor.experienceYears}y exp
                    </span>
                  </div>

                  <Link
                    className="inline-flex shrink-0 items-center gap-1 font-bold text-brand-700 hover:text-brand-800 hover:underline"
                    to={`/mentors/${mentor.id}`}
                  >
                    View profile <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          {result.pages > 1 && (
            <nav aria-label="Mentor result pages" className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5">
              <button
                className="quiet-button text-xs py-2 px-3.5"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                type="button"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-slate-600">
                Page {page} of {result.pages}
              </span>
              <button
                className="quiet-button text-xs py-2 px-3.5"
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