import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckCircle2, Clock, Compass, Sparkles, User, AlertCircle } from 'lucide-react';
import { getRecommendations } from '../services/recommendations';
import { listBookings } from '../services/mentors';

function rupees(value) {
  return `Rs. ${new Intl.NumberFormat('en-IN').format(value)}`;
}

function localTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(new Date(value));
}

export default function DashboardPage() {
  const [recommendations, setRecommendations] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([getRecommendations(5), listBookings({ status: 'confirmed' })])
      .then(([matches, bookings]) => {
        if (active) {
          setRecommendations(matches);
          setSessions(bookings.filter((booking) => new Date(booking.endTime).getTime() >= Date.now()));
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Your dashboard could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [retry]);

  return (
    <section className="page-wrap flex-1 py-10 sm:py-14">
      {/* Dashboard Header */}
      <header className="mb-8 border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-700">
            <Sparkles size={13} />
            <span>Learner dashboard</span>
          </div>
          <h1 className="mt-1.5 text-3xl font-extrabold text-slate-900 sm:text-4xl">Your next step</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Personalized mentor matches, progress updates, and scheduled calls in one place.
          </p>
        </div>
        <Link className="secondary-button text-xs py-2 px-3.5" to="/mentors">
          <Compass size={14} /> Browse all mentors
        </Link>
      </header>

      {error && (
        <div className="notice-error mb-6 flex items-center justify-between gap-3 rounded-lg p-4 text-sm" role="alert">
          <span>{error}</span>
          <button className="font-bold underline hover:opacity-80" onClick={() => setRetry((value) => value + 1)} type="button">
            Try again
          </button>
        </div>
      )}

      {loading && (
        <div className="py-16 text-center" role="status">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-3 text-sm text-slate-600">Finding your best-fit mentors...</p>
        </div>
      )}

      {!loading && !error && recommendations?.reason === 'PROFILE_INCOMPLETE' && (
        <div className="card mb-8 p-6 sm:p-7 border-l-4 border-l-brand-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 bg-brand-50/30">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Tell us what you want to learn</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 max-w-xl">
              Add your career goals, known skills, and target focus areas to unlock algorithmic matchmaking.
            </p>
          </div>
          <Link className="primary-button shrink-0 text-sm" to="/profile">
            Complete profile <ArrowRight size={15} />
          </Link>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-8 lg:grid-cols-[1.45fr_0.85fr]">
          {/* Left Column: Recommendations */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-700">
                  <Sparkles size={13} /> Suggestions
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">Mentors for your goals</h2>
              </div>
              <Link className="text-xs font-bold text-brand-700 hover:underline" to="/mentors">
                Browse all
              </Link>
            </div>

            {recommendations?.items?.length ? (
              <div className="space-y-4">
                {recommendations.items.map(({ mentor, score, reasons, overBudget }) => (
                  <article key={mentor.id} className="card card-hover p-5 sm:p-6 transition-all">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800 font-bold text-sm">
                          {mentor.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{mentor.name}</h3>
                          <p className="text-xs font-semibold text-slate-600 mt-0.5">{mentor.headline}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-base font-extrabold text-slate-900">{rupees(mentor.pricePerHour)}</p>
                        <span className="inline-block mt-0.5 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-800">
                          {Math.round(score * 100)}% fit
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-slate-200/80">
                      <p className="text-xs font-bold text-slate-700 mb-2">Why this mentor matched:</p>
                      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
                        {reasons.map((reason) => (
                          <li key={reason} className="flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-brand-600 shrink-0" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {overBudget && (
                      <p className="mt-3 text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                        <AlertCircle size={13} /> Above your current budget
                      </p>
                    )}

                    <div className="mt-4 flex items-center justify-end">
                      <Link
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-800 hover:underline"
                        to={`/mentors/${mentor.id}`}
                      >
                        View mentor <ArrowRight size={14} />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              !recommendations?.reason && (
                <div className="card p-8 text-center text-sm text-slate-600">
                  No approved mentors are available yet. Check back soon.
                </div>
              )
            )}
          </section>

          {/* Right Column: Upcoming Sessions Calendar Widget */}
          <aside className="space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-700">Your calendar</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">Upcoming sessions</h2>
            </div>

            {sessions.length ? (
              <div className="card divide-y divide-slate-200 overflow-hidden">
                {sessions.map((booking) => (
                  <div key={booking._id} className="p-4 sm:p-5 hover:bg-surface-muted/30 transition-colors">
                    <p className="text-sm font-bold text-slate-900">
                      {booking.mentorId?.name || 'Mentor session'}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 flex items-center gap-1.5">
                      <Clock size={12} className="text-brand-600" />
                      {localTime(booking.startTime)}
                    </p>
                    <Link
                      className="mt-3 inline-block text-xs font-bold text-brand-700 hover:underline"
                      to="/sessions"
                    >
                      View session →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card p-7 text-center">
                <CalendarDays className="mx-auto text-slate-400" size={28} />
                <p className="mt-3 text-sm font-semibold text-slate-800">No upcoming sessions.</p>
                <p className="mt-1 text-xs text-slate-500">
                  Ready to talk through a technical hurdle or career decision?
                </p>
                <Link className="primary-button mt-4 text-xs py-2 px-3.5" to="/mentors">
                  Find a mentor
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}