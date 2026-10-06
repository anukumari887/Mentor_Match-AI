import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckCircle2, Clock, Compass, AlertCircle } from 'lucide-react';
import { getRecommendations } from '../services/recommendations';
import { listBookings } from '../services/mentors';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Skeleton from '../components/Skeleton';
import Avatar from '../components/Avatar';
import {
  EmptyStateProfileIncomplete,
  EmptyStateMentorSearch,
  EmptyStateSessions,
  EmptyStateRecommendations,
  IconHeaderGuide,
  IconHeaderRecommendations
} from '../components/Illustrations';

function rupees(value) {
  return `₹${new Intl.NumberFormat('en-IN').format(value)}`;
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
    <section className="page-wrap flex-1 py-10 sm:py-14 bg-bg text-ink transition-colors">
      {/* Dashboard Header */}
      <header className="mb-8 border-b border-border pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-accent">
            Learner dashboard
          </p>
          <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-ink">
            Your next step
          </h1>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-ink-muted">
            Personalized mentor matches, progress updates, and scheduled calls in one place.
          </p>
        </div>
        <Link
          className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-raised transition-colors"
          to="/mentors"
        >
          <Compass size={14} /> Browse all mentors
        </Link>
      </header>

      {error && (
        <div
          className="mb-6 flex items-center justify-between gap-3 rounded border border-danger/40 bg-danger/10 p-4 text-xs sm:text-sm text-danger"
          role="alert"
        >
          <span>{error}</span>
          <button
            className="font-bold underline hover:opacity-80"
            onClick={() => setRetry((value) => value + 1)}
            type="button"
          >
            Try again
          </button>
        </div>
      )}

      {loading && (
        <div className="py-12 text-center" role="status">
          <div className="space-y-4 max-w-lg mx-auto">
            <Skeleton variant="card" />
            <Skeleton variant="line" height="20px" width="60%" className="mx-auto" />
          </div>
          <p className="mt-3 text-xs text-ink-muted">Finding your best-fit mentors...</p>
        </div>
      )}

      {!loading && !error && recommendations?.reason === 'PROFILE_INCOMPLETE' && (
        <Card
          variant="raised"
          padding="lg"
          className="mb-8 border-l-4 border-l-accent flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 bg-accent/5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <EmptyStateProfileIncomplete className="w-20 h-16 shrink-0" />
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-semibold text-ink flex items-center gap-2">
                <IconHeaderGuide className="w-5 h-5 text-accent shrink-0" />
                <span>Tell us what you want to learn</span>
              </h2>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-ink-muted max-w-xl">
                Add your career goals, known skills, and target focus areas to unlock algorithmic matchmaking.
              </p>
            </div>
          </div>
          <Link
            className="inline-flex items-center gap-1.5 rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors shrink-0"
            to="/profile"
          >
            Complete profile <ArrowRight size={14} />
          </Link>
        </Card>
      )}

      {!loading && !error && (
        <div className="grid gap-8 lg:grid-cols-[1.45fr_0.85fr]">
          {/* Left Column: Recommendations */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="text-xs font-semibold tracking-wider uppercase text-accent">
                  Suggestions
                </p>
                <h2 className="mt-1 font-serif text-xl font-semibold text-ink flex items-center gap-2">
                  <IconHeaderRecommendations className="w-5 h-5 text-accent shrink-0" />
                  <span>Mentors for your goals</span>
                </h2>
              </div>
              <Link className="text-xs font-semibold text-accent hover:underline" to="/mentors">
                Browse all
              </Link>
            </div>

            {recommendations?.items?.length ? (
              <div className="space-y-4">
                {recommendations.items.map(({ mentor, score, reasons, overBudget }) => (
                  <Card key={mentor.id} variant="default" padding="md" className="hover:border-accent transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Avatar name={mentor.name} size="md" />
                        <div>
                          <h3 className="font-serif text-base font-semibold text-ink">{mentor.name}</h3>
                          <p className="text-xs text-ink-muted mt-0.5">{mentor.headline}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-bold text-ink">{rupees(mentor.pricePerHour)}</p>
                        <Badge variant="accent" size="sm" className="mt-0.5">
                          {Math.round(score * 100)}% fit
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-border">
                      <p className="text-[11px] font-semibold text-ink mb-1.5">Why this mentor matched:</p>
                      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                        {reasons.map((reason) => (
                          <li key={reason} className="flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-accent shrink-0" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {overBudget && (
                      <p className="mt-2.5 text-xs text-warning flex items-center gap-1.5 font-medium">
                        <AlertCircle size={13} /> Above your current budget
                      </p>
                    )}

                    <div className="mt-3.5 flex items-center justify-end">
                      <Link
                        className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                        to={`/mentors/${mentor.id}`}
                      >
                        View mentor <ArrowRight size={13} />
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              !recommendations?.reason && (
                <Card variant="flat" padding="lg" className="text-center text-xs text-ink-muted">
                  <EmptyStateRecommendations className="w-24 h-20 mx-auto mb-2" />
                  <p>No approved mentors are available yet. Check back soon.</p>
                </Card>
              )
            )}
          </section>

          {/* Right Column: Upcoming Sessions Calendar Widget */}
          <aside className="space-y-4">
            <div className="border-b border-border pb-3">
              <p className="text-xs font-semibold tracking-wider uppercase text-accent">Your calendar</p>
              <h2 className="mt-1 font-serif text-xl font-semibold text-ink">Upcoming sessions</h2>
            </div>

            {sessions.length ? (
              <Card variant="default" padding="none" className="divide-y divide-border overflow-hidden">
                {sessions.map((booking) => (
                  <div key={booking._id} className="p-4 hover:bg-surface-raised/40 transition-colors">
                    <p className="text-xs font-bold text-ink">
                      {booking.mentorId?.name || 'Mentor session'}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted flex items-center gap-1.5">
                      <Clock size={12} className="text-accent" />
                      {localTime(booking.startTime)}
                    </p>
                    <Link
                      className="mt-2.5 inline-block text-xs font-semibold text-accent hover:underline"
                      to="/sessions"
                    >
                      View session →
                    </Link>
                  </div>
                ))}
              </Card>
            ) : (
              <Card variant="flat" padding="md" className="text-center">
                <EmptyStateSessions className="w-24 h-20 mx-auto mb-2" />
                <p className="text-xs font-semibold text-ink">No upcoming sessions.</p>
                <p className="mt-1 text-[11px] text-ink-muted">
                  Ready to talk through a technical hurdle or career decision?
                </p>
                <Link
                  className="mt-3.5 inline-flex items-center gap-1 rounded bg-accent px-3 py-1.5 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors"
                  to="/mentors"
                >
                  Find a mentor
                </Link>
              </Card>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}