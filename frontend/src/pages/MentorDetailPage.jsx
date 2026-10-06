import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Globe,
  Star,
  Briefcase
} from 'lucide-react';
import { createBooking, getMentor, listMentorSlots } from '../services/mentors';
import { listMentorReviews } from '../services/reviews';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import { EmptyStateReviews } from '../components/Illustrations';

function rupees(value) {
  return `₹${new Intl.NumberFormat('en-IN').format(value)}`;
}

export default function MentorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mentor, setMentor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [error, setError] = useState('');
  const [slotError, setSlotError] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingSaving, setBookingSaving] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getMentor(id)
      .then((data) => { if (active) setMentor(data); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Mentor profile could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });

    setSlotsLoading(true);
    setSlotError('');
    listMentorSlots(id)
      .then((data) => { if (active) setSlots(data.slots); })
      .catch((requestError) => { if (active) setSlotError(requestError.message || 'Availability could not be loaded.'); })
      .finally(() => { if (active) setSlotsLoading(false); });

    setReviewsLoading(true);
    setReviewsError('');
    listMentorReviews(id, { limit: 10 })
      .then((data) => { if (active) setReviews(data.reviews); })
      .catch((requestError) => { if (active) setReviewsError(requestError.message || 'Reviews could not be loaded.'); })
      .finally(() => { if (active) setReviewsLoading(false); });

    return () => { active = false; };
  }, [id, retry]);

  const selectSlot = async (slot) => {
    setBookingSaving(true);
    setBookingError('');
    try {
      const booking = await createBooking({ mentorId: id, startTime: slot.startTime });
      navigate(`/checkout/${booking._id}`);
    } catch (requestError) {
      setBookingError(requestError.message || 'This session could not be held. Please choose another time.');
      setRetry((value) => value + 1);
    } finally {
      setBookingSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrap flex-1 py-16 text-center text-xs text-ink-muted" role="status">
        <p className="mt-3">Loading mentor profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <section className="page-wrap flex-1 py-12 bg-bg text-ink">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded border border-danger/40 bg-danger/10 p-4 text-xs sm:text-sm text-danger" role="alert">
          <span>{error}</span>
          <button className="font-bold underline" onClick={() => setRetry((value) => value + 1)} type="button">
            Try again
          </button>
        </div>
        <Link className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-raised" to="/mentors">
          <ArrowLeft size={14} /> Back to mentors
        </Link>
      </section>
    );
  }

  if (!mentor) return null;

  return (
    <section className="page-wrap flex-1 py-8 sm:py-12 bg-bg text-ink transition-colors">
      {/* Navigation Breadcrumb */}
      <Link
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
        to="/mentors"
      >
        <ArrowLeft size={14} /> All mentors
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_20rem] lg:gap-12 items-start">
        {/* Left Column: Details */}
        <div className="space-y-6">
          {/* Header Card */}
          <Card variant="raised" padding="lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <Avatar name={mentor.name} size="lg" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-ink">{mentor.name}</h1>
                  <Badge variant="accent" size="sm">
                    <CheckCircle2 size={11} className="mr-0.5" /> Approved by our team
                  </Badge>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-ink-muted">{mentor.headline}</p>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <Briefcase size={12} className="text-ink-muted" />
                    {mentor.experienceYears} years experience
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-ink">
                    <Star className="text-warning fill-warning" size={12} />
                    {mentor.ratingCount ? `${mentor.ratingAvg.toFixed(1)} (${mentor.ratingCount} reviews)` : 'New mentor'}
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-ink-muted">
                    <Globe size={12} /> {mentor.timezone || 'Asia/Kolkata'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* About Section */}
          <Card variant="default" padding="md">
            <h2 className="font-serif text-lg font-semibold text-ink">About</h2>
            <p className="mt-2.5 whitespace-pre-line text-xs sm:text-sm leading-relaxed text-ink-muted">
              {mentor.bio || 'This mentor has not added a bio yet.'}
            </p>
          </Card>

          {/* Focus Areas */}
          <Card variant="default" padding="md">
            <h2 className="font-serif text-lg font-semibold text-ink">Areas of focus</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(mentor.skills || []).map((skill) => (
                <span
                  key={skill}
                  className="rounded border border-border bg-surface-raised px-2.5 py-1 text-xs font-medium text-ink"
                >
                  {skill}
                </span>
              ))}
            </div>
          </Card>

          {/* Weekly Availability */}
          <Card variant="default" padding="md">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-serif text-lg font-semibold text-ink">Weekly availability</h2>
              <p className="text-[11px] text-ink-muted">Times in {mentor.timezone || 'Asia/Kolkata'}</p>
            </div>
            {mentor.availability?.length ? (
              <ul className="mt-3 divide-y divide-border">
                {mentor.availability.map((window, index) => (
                  <li className="flex justify-between items-center py-2 text-xs text-ink" key={`${window.dayOfWeek}-${index}`}>
                    <span className="font-medium">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][window.dayOfWeek]}
                    </span>
                    <span className="font-mono text-ink-muted bg-surface-raised border border-border px-2 py-0.5 rounded text-[11px]">
                      {window.startTime} – {window.endTime}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-ink-muted">Availability has not been added yet.</p>
            )}
          </Card>

          {/* Learner Reviews */}
          <Card variant="default" padding="md">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-serif text-lg font-semibold text-ink">Learner reviews</h2>
              <span className="text-xs text-ink-muted">{mentor.ratingCount || 0} total</span>
            </div>

            {reviewsLoading && <p className="mt-3 text-xs text-ink-muted" role="status">Loading reviews...</p>}
            {reviewsError && <p className="mt-3 rounded border border-danger/40 bg-danger/10 p-2 text-xs text-danger" role="alert">{reviewsError}</p>}
            {!reviewsLoading && !reviewsError && reviews.length === 0 && (
              <div className="py-6 text-center">
                <EmptyStateReviews className="w-24 h-20 mx-auto mb-2" />
                <p className="text-xs text-ink-muted">No reviews yet for this mentor.</p>
              </div>
            )}

            {!reviewsLoading && reviews.length > 0 && (
              <ul className="mt-3 divide-y divide-border">
                {reviews.map((review) => (
                  <li className="py-3.5" key={review.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-ink">{review.learnerName}</p>
                      <p className="inline-flex items-center gap-1 text-xs font-semibold text-ink">
                        <Star size={12} className="text-warning fill-warning" />
                        <span>{review.rating}/5</span>
                      </p>
                    </div>
                    {review.comment && (
                      <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{review.comment}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Right Sticky Sidebar: Booking Card */}
        <aside className="sticky top-20">
          <Card variant="raised" padding="md">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Session rate</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <p className="text-2xl font-bold text-ink">{rupees(mentor.pricePerHour)}</p>
                <span className="text-xs text-ink-muted">/ 60-min call</span>
              </div>
            </div>

            <div className="mt-3 rounded border border-border bg-surface-raised/40 p-2.5 text-xs text-ink-muted flex items-start gap-2">
              <CalendarDays className="mt-0.5 shrink-0 text-accent" size={14} />
              <span>Free cancellation &ge;24 hours before the session.</span>
            </div>

            <div className="mt-5 pt-4 border-t border-border">
              <h2 className="font-serif text-sm font-semibold text-ink">Choose a session time</h2>
              <p className="text-[11px] text-ink-muted">Times shown in your local timezone.</p>

              {bookingError && (
                <p className="mt-2.5 rounded border border-danger/40 bg-danger/10 p-2 text-xs text-danger" role="alert">
                  {bookingError}
                </p>
              )}
              {slotError && (
                <p className="mt-2.5 rounded border border-danger/40 bg-danger/10 p-2 text-xs text-danger" role="alert">
                  {slotError}
                </p>
              )}

              {slotsLoading && (
                <div className="py-5 text-center text-xs text-ink-muted" role="status">
                  Loading available times...
                </div>
              )}

              {!slotsLoading && !slotError && slots.filter((slot) => slot.available).length === 0 && (
                <p className="mt-3 text-xs text-ink-muted py-2.5 text-center rounded bg-surface-raised border border-border">
                  No upcoming times are available. Check back soon.
                </p>
              )}

              {!slotsLoading && slots.filter((slot) => slot.available).length > 0 && (
                <div className="mt-3 grid gap-1.5 max-h-72 overflow-y-auto pr-1">
                  {slots.filter((slot) => slot.available).map((slot) => (
                    <button
                      key={slot.startTime}
                      className="w-full flex items-center justify-between rounded border border-border bg-surface p-2 text-xs text-ink hover:border-accent hover:bg-accent/5 transition-colors"
                      disabled={bookingSaving}
                      onClick={() => selectSlot(slot)}
                      type="button"
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock3 size={12} className="text-accent" />
                        {new Intl.DateTimeFormat(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          timeZoneName: 'short'
                        }).format(new Date(slot.startTime))}
                      </span>
                      {bookingSaving ? (
                        <span className="text-[11px] font-semibold text-accent">Holding...</span>
                      ) : (
                        <span className="text-[11px] font-semibold text-accent">Select</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </section>
  );
}