import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Star,
  Video,
  X
} from 'lucide-react';
import { cancelBooking, listBookings } from '../services/mentors';
import { useAuth } from '../contexts/AuthContext';
import { submitReview } from '../services/reviews';
import { submitComplaint } from '../services/admin';
import Card from '../components/Card';
import Badge from '../components/Badge';

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
  const [reportingId, setReportingId] = useState('');
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [complaintSuccessId, setComplaintSuccessId] = useState('');
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

  const submitSessionComplaint = async (booking) => {
    if (!complaintSubject.trim() || !complaintDescription.trim()) {
      setError('Please provide a subject and details for your report.');
      return;
    }
    setBusyId(booking._id);
    setError('');
    try {
      await submitComplaint({
        bookingId: booking._id,
        subject: complaintSubject.trim(),
        description: complaintDescription.trim()
      });
      setComplaintSuccessId(booking._id);
      setReportingId('');
      setComplaintSubject('');
      setComplaintDescription('');
    } catch (requestError) {
      setError(requestError.message || 'Your issue report could not be submitted.');
    } finally {
      setBusyId('');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="success" size="sm">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="warning" size="sm">Pending</Badge>;
      case 'completed':
        return <Badge variant="neutral" size="sm">Completed</Badge>;
      default:
        return <Badge variant="danger" size="sm">{status}</Badge>;
    }
  };

  return (
    <section className="page-wrap flex-1 py-10 sm:py-14 bg-bg text-ink transition-colors">
      <header className="mb-6 border-b border-border pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-accent">Your calendar</p>
          <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-ink">My sessions</h1>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-ink-muted">
            Track confirmed calls, rejoin live video rooms, and leave verified session feedback.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div aria-label="Session status" className="flex gap-2 border-b border-border mb-6 overflow-x-auto" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            aria-selected={activeTab === tab.id}
            className={`border-b-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all -mb-px outline-none ${
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink hover:border-border'
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
        <div className="mb-6 flex items-center justify-between gap-3 rounded border border-danger/40 bg-danger/10 p-3.5 text-xs sm:text-sm text-danger" role="alert">
          <span>{error}</span>
          <button className="font-bold underline hover:opacity-80" onClick={() => setRefresh((value) => value + 1)} type="button">
            Try again
          </button>
        </div>
      )}

      {loading && (
        <div className="py-16 text-center text-xs text-ink-muted" role="status">
          <p className="mt-3">Loading your sessions...</p>
        </div>
      )}

      {!loading && !error && visibleBookings.length === 0 && (
        <Card variant="flat" padding="lg" className="text-center my-6">
          <CalendarDays className="mx-auto text-ink-muted mb-2" size={30} />
          <h2 className="mt-2 font-serif text-xl sm:text-2xl font-semibold text-ink">No {activeTab} sessions</h2>
          <p className="mt-1.5 text-xs sm:text-sm text-ink-muted max-w-sm mx-auto">
            Your booked mentoring time and past session history will appear here.
          </p>
          <Link
            className="mt-4 inline-flex items-center gap-1.5 rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors"
            to="/mentors"
          >
            Browse mentors
          </Link>
        </Card>
      )}

      {/* Booking List */}
      {!loading && (
        <div className="space-y-4">
          {visibleBookings.map((booking) => {
            const otherUser = user?.role === 'learner' ? booking.mentorId : booking.learnerId;
            const canCancel = booking.status === 'pending' && new Date(booking.startTime).getTime() > Date.now();

            return (
              <Card key={booking._id} variant="default" padding="md" className="transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif text-lg sm:text-xl font-semibold text-ink">
                        Session with {otherUser?.name || 'Mentor'}
                      </h2>
                      {getStatusBadge(booking.status)}
                    </div>
                    <p className="mt-1.5 text-xs text-ink-muted flex items-center gap-1.5">
                      <Clock size={12} className="text-accent" />
                      {formatSessionTime(booking.startTime)} · 60 minutes
                    </p>
                    <p className="mt-1 text-xs font-semibold text-ink">
                      ₹{new Intl.NumberFormat('en-IN').format(booking.priceAtBooking)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {booking.status === 'pending' && (
                      <Link
                        className="rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-raised transition-colors"
                        to={`/checkout/${booking._id}`}
                      >
                        Review hold
                      </Link>
                    )}
                    {booking.status === 'confirmed' && (
                      <Link
                        className="inline-flex items-center gap-1.5 rounded bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors shadow-sm"
                        to={`/session/${booking._id}`}
                      >
                        <Video size={13} /> Join session
                      </Link>
                    )}
                    {activeTab === 'past' && user?.role === 'learner' && booking.status === 'completed' && !booking.hasReview && (
                      <button
                        className="inline-flex items-center gap-1 rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-raised transition-colors"
                        onClick={() => { setReviewingId(booking._id); setReviewSuccessId(''); }}
                        type="button"
                      >
                        <Star size={12} className="text-warning fill-warning" /> Leave a review
                      </button>
                    )}
                    <button
                      className="inline-flex items-center gap-1 rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-raised transition-colors"
                      onClick={() => { setReportingId(booking._id); setComplaintSuccessId(''); }}
                      type="button"
                    >
                      <AlertCircle size={12} /> Report issue
                    </button>
                    {canCancel && (
                      confirmCancelId === booking._id ? (
                        <div className="flex items-center gap-2">
                          <button
                            className="rounded bg-danger px-3 py-1.5 text-xs font-semibold text-surface hover:opacity-90 transition-opacity"
                            disabled={busyId === booking._id}
                            onClick={() => cancel(booking)}
                            type="button"
                          >
                            {busyId === booking._id ? 'Cancelling...' : 'Confirm cancellation'}
                          </button>
                          <button
                            aria-label="Keep booking"
                            className="p-1 rounded text-ink-muted hover:text-ink"
                            onClick={() => setConfirmCancelId('')}
                            type="button"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-danger hover:border-danger/30 transition-colors"
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
                  <p className="mt-4 rounded border border-success/40 bg-success/10 p-2.5 text-xs font-semibold text-ink flex items-center gap-1.5" role="status">
                    <CheckCircle2 size={14} className="text-success" /> Review submitted. Thank you.
                  </p>
                )}

                {complaintSuccessId === booking._id && (
                  <p className="mt-4 rounded border border-success/40 bg-success/10 p-2.5 text-xs font-semibold text-ink flex items-center gap-1.5" role="status">
                    <CheckCircle2 size={14} className="text-success" /> Issue reported to administrator. Our moderation team will review it shortly.
                  </p>
                )}

                {/* Inline Review Form */}
                {reviewingId === booking._id && (
                  <form
                    className="mt-5 rounded border border-border bg-surface-raised/40 p-4 sm:p-5"
                    onSubmit={(event) => { event.preventDefault(); submitSessionReview(booking); }}
                  >
                    <h3 className="font-serif text-sm font-semibold text-ink mb-3">Leave a verified review</h3>
                    <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                      <label className="block text-xs font-semibold text-ink">
                        Rating
                        <select
                          className="mt-1.5 w-full rounded border border-border bg-surface px-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
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
                      <label className="block text-xs font-semibold text-ink">
                        Your review
                        <textarea
                          className="mt-1.5 w-full rounded border border-border bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-accent min-h-20 resize-y"
                          maxLength={1000}
                          onChange={(event) => setReviewComment(event.target.value)}
                          placeholder="What was useful about this session?"
                          value={reviewComment}
                        />
                      </label>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        className="rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-raised"
                        onClick={() => setReviewingId('')}
                        type="button"
                      >
                        Cancel
                      </button>
                      <button
                        className="rounded bg-accent px-4 py-1.5 text-xs font-semibold text-accent-text hover:bg-accent-hover"
                        disabled={busyId === booking._id}
                        type="submit"
                      >
                        {busyId === booking._id ? 'Submitting...' : 'Submit review'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Inline Complaint Form */}
                {reportingId === booking._id && (
                  <form
                    className="mt-5 rounded border border-warning/40 bg-warning/5 p-4 sm:p-5"
                    onSubmit={(event) => { event.preventDefault(); submitSessionComplaint(booking); }}
                  >
                    <h3 className="font-serif text-sm font-semibold text-ink mb-1">Report an issue with this session</h3>
                    <p className="text-[11px] text-ink-muted mb-3">Please provide clear details. An administrator will review your report.</p>
                    <div className="space-y-3">
                      <label className="block text-xs font-semibold text-ink">
                        Subject
                        <input
                          className="mt-1 w-full rounded border border-border bg-surface px-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
                          maxLength={200}
                          onChange={(event) => setComplaintSubject(event.target.value)}
                          placeholder="e.g. Mentor arrived late, Video room connection failed"
                          value={complaintSubject}
                          required
                        />
                      </label>
                      <label className="block text-xs font-semibold text-ink">
                        Description
                        <textarea
                          className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-accent min-h-20 resize-y"
                          maxLength={2000}
                          onChange={(event) => setComplaintDescription(event.target.value)}
                          placeholder="Describe the issue in detail..."
                          value={complaintDescription}
                          required
                        />
                      </label>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        className="rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-raised"
                        onClick={() => setReportingId('')}
                        type="button"
                      >
                        Cancel
                      </button>
                      <button
                        className="rounded bg-warning px-4 py-1.5 text-xs font-semibold text-ink hover:opacity-90"
                        disabled={busyId === booking._id}
                        type="submit"
                      >
                        {busyId === booking._id ? 'Submitting...' : 'Submit report'}
                      </button>
                    </div>
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}