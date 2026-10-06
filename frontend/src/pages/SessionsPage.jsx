import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Sparkles,
  Star,
  Video,
  X
} from 'lucide-react';
import { cancelBooking, listBookings } from '../services/mentors';
import { useAuth } from '../contexts/AuthContext';
import { submitReview } from '../services/reviews';

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'cancelled', label: 'Cancelled' }
];

function formatSessionTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(new Date(value));
}

export default function SessionsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [confirmCancelId, setConfirmCancelId] = useState('');
  const [busyId, setBusyId] = useState('');
  const [reviewingId, setReviewingId] = useState('');
  const [reviewRating, setReviewRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSuccessId, setReviewSuccessId] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    listBookings()
      .then((data) => { if (active) setBookings(data); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Your sessions could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  const now = Date.now();
  const visibleBookings = activeTab === 'cancelled'
    ? bookings.filter((booking) => ['cancelled', 'expired'].includes(booking.status))
    : activeTab === 'past'
    ? bookings.filter((booking) => booking.status === 'completed' || new Date(booking.endTime).getTime() < now)
    : bookings.filter((booking) => ['pending', 'confirmed'].includes(booking.status) && new Date(booking.endTime).getTime() >= now);

  const cancel = async (booking) => {
    setBusyId(booking._id);
    setError('');
    try {
      const updated = await cancelBooking(booking._id, 'Cancelled by participant.');
      setBookings((current) => current.map((item) => item._id === updated._id ? updated : item));
      setConfirmCancelId('');
    } catch (requestError) {
      setError(requestError.message || 'The booking could not be cancelled.');
    } finally {
      setBusyId('');
    }
  };

  const submitSessionReview = async (booking) => {
    setBusyId(booking._id);
    setError('');
    try {
      await submitReview({ bookingId: booking._id, rating: Number(reviewRating), comment: reviewComment });
      setBookings((current) => current.map((item) => item._id === booking._id ? { ...item, hasReview: true } : item));
      setReviewSuccessId(booking._id);
      setReviewingId('');
      setReviewComment('');
      setReviewRating('5');
    } catch (requestError) {
      setError(requestError.message || 'Your review could not be submitted.');
    } finally {
      setBusyId('');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 text-xs font-bold capitalize">Confirmed</span>;
      case 'pending':
        return <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 px-2.5 py-0.5 text-xs font-bold capitalize">Pending</span>;
      case 'completed':
        return <span className="rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 px-2.5 py-0.5 text-xs font-bold capitalize">Completed</span>;
      default:
        return <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 px-2.5 py-0.5 text-xs font-bold capitalize">{status}</span>;
    }
  };

  return (
    <section className="page-wrap flex-1 py-10 sm:py-14">
      <header className="mb-6 border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-700">Your calendar</p>
          <h1 className="mt-1.5 text-3xl font-extrabold text-slate-900 sm:text-4xl">My sessions</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Track confirmed calls, rejoin live video rooms, and leave verified session feedback.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div aria-label="Session status" className="flex gap-2 border-b border-slate-200 mb-6" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            aria-selected={activeTab === tab.id}
            className={`border-b-2 px-4 py-3 text-sm font-bold transition-all -mb-px ${
              activeTab === tab.id
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="notice-error mb-6 flex items-center justify-between gap-3 rounded-lg p-4 text-sm" role="alert">
          <span>{error}</span>
          <button className="font-bold underline hover:opacity-80" onClick={() => setRefresh((value) => value + 1)} type="button">
            Try again
          </button>
        </div>
      )}

      {loading && (
        <div className="py-16 text-center text-sm text-slate-600" role="status">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-3">Loading your sessions...</p>
        </div>
      )}

      {!loading && !error && visibleBookings.length === 0 && (
        <div className="card p-12 text-center my-6">
          <CalendarDays className="mx-auto text-slate-400" size={32} />
          <h2 className="mt-3.5 text-2xl font-bold text-slate-900">No {activeTab} sessions</h2>
          <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto">
            Your booked mentoring time and past session history will appear here.
          </p>
          <Link className="primary-button mt-5 text-xs py-2 px-4" to="/mentors">
            Browse mentors
          </Link>
        </div>
      )}

      {/* Booking List */}
      {!loading && (
        <div className="space-y-4">
          {visibleBookings.map((booking) => {
            const otherUser = user.role === 'learner' ? booking.mentorId : booking.learnerId;
            const canCancel = booking.status === 'pending' && new Date(booking.startTime).getTime() > Date.now();

            return (
              <article key={booking._id} className="card p-6 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-xl font-bold text-slate-900">
                        Session with {otherUser?.name || 'Mentor'}
                      </h2>
                      {getStatusBadge(booking.status)}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 flex items-center gap-1.5">
                      <Clock size={13} className="text-brand-600" />
                      {formatSessionTime(booking.startTime)} · 60 minutes
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-800">
                      Rs. {new Intl.NumberFormat('en-IN').format(booking.priceAtBooking)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {booking.status === 'pending' && (
                      <Link className="secondary-button text-xs py-2 px-3.5" to={`/checkout/${booking._id}`}>
                        Review hold
                      </Link>
                    )}
                    {booking.status === 'confirmed' && (
                      <Link className="primary-button text-xs py-2 px-3.5" to={`/session/${booking._id}`}>
                        <Video size={14} /> Join session
                      </Link>
                    )}
                    {activeTab === 'past' && user.role === 'learner' && booking.status === 'completed' && !booking.hasReview && (
                      <button
                        className="quiet-button text-xs py-2 px-3.5"
                        onClick={() => { setReviewingId(booking._id); setReviewSuccessId(''); }}
                        type="button"
                      >
                        <Star size={13} className="text-amber-500" /> Leave a review
                      </button>
                    )}
                    {canCancel && (
                      confirmCancelId === booking._id ? (
                        <div className="flex items-center gap-2">
                          <button
                            className="primary-button bg-rose-700 hover:bg-rose-800 text-xs py-2 px-3.5"
                            disabled={busyId === booking._id}
                            onClick={() => cancel(booking)}
                            type="button"
                          >
                            {busyId === booking._id ? 'Cancelling...' : 'Confirm cancellation'}
                          </button>
                          <button
                            aria-label="Keep booking"
                            className="icon-button"
                            onClick={() => setConfirmCancelId('')}
                            type="button"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="quiet-button text-xs py-2 px-3.5 hover:text-rose-600"
                          onClick={() => setConfirmCancelId(booking._id)}
                          type="button"
                        >
                          Cancel
                        </button>
                      )
                    )}
                  </div>
                </div>

                {reviewSuccessId === booking._id && (
                  <p className="mt-4 rounded-md bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200 p-2.5 text-xs font-semibold text-emerald-800 flex items-center gap-1.5" role="status">
                    <CheckCircle2 size={14} /> Review submitted. Thank you.
                  </p>
                )}

                {/* Inline Review Form */}
                {reviewingId === booking._id && (
                  <form
                    className="mt-5 rounded-lg border border-slate-200 bg-surface-muted/40 p-4 sm:p-5"
                    onSubmit={(event) => { event.preventDefault(); submitSessionReview(booking); }}
                  >
                    <h3 className="text-sm font-bold text-slate-900 mb-3">Leave a verified review</h3>
                    <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                      <label className="form-label">
                        Rating
                        <select
                          className="form-input mt-1.5"
                          onChange={(event) => setReviewRating(event.target.value)}
                          value={reviewRating}
                        >
                          {[5, 4, 3, 2, 1].map((rating) => (
                            <option key={rating} value={rating}>
                              {rating} {rating === 1 ? 'star' : 'stars'}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="form-label">
                        Your review
                        <textarea
                          className="form-input mt-1.5 min-h-20 resize-y"
                          maxLength={1000}
                          onChange={(event) => setReviewComment(event.target.value)}
                          placeholder="What was useful about this session?"
                          value={reviewComment}
                        />
                      </label>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        className="quiet-button text-xs py-2 px-3.5"
                        onClick={() => setReviewingId('')}
                        type="button"
                      >
                        Cancel
                      </button>
                      <button
                        className="primary-button text-xs py-2 px-4"
                        disabled={busyId === booking._id}
                        type="submit"
                      >
                        {busyId === booking._id ? 'Submitting...' : 'Submit review'}
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}