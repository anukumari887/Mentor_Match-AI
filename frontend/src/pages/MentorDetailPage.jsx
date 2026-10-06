import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Globe,
  Sparkles,
  Star,
  UserRound,
  Briefcase
} from 'lucide-react';
import { createBooking, getMentor, listMentorSlots } from '../services/mentors';
import { listMentorReviews } from '../services/reviews';

function rupees(value) {
  return `Rs. ${new Intl.NumberFormat('en-IN').format(value)}`;
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
      <div className="page-wrap flex-1 py-16 text-center text-sm text-slate-600" role="status">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        <p className="mt-3">Loading mentor profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <section className="page-wrap flex-1 py-12">
        <div className="notice-error flex flex-wrap items-center justify-between gap-3 rounded-lg p-4 text-sm" role="alert">
          <span>{error}</span>
          <button className="font-bold underline" onClick={() => setRetry((value) => value + 1)} type="button">
            Try again
          </button>
        </div>
        <Link className="quiet-button mt-5 text-xs py-2 px-3.5" to="/mentors">
          <ArrowLeft size={14} /> Back to mentors
        </Link>
      </section>
    );
  }

  if (!mentor) return null;

  return (
    <section className="page-wrap flex-1 py-8 sm:py-12">
      {/* Navigation Breadcrumb */}
      <Link
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-800 hover:underline"
        to="/mentors"
      >
        <ArrowLeft size={15} /> All mentors
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_20rem] lg:gap-12 items-start">
        {/* Left Column: Details */}
        <div className="space-y-8">
          {/* Header Card */}
          <div className="card p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-800 font-extrabold text-xl shadow-xs">
                {mentor.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{mentor.name}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700 border border-brand-200/60">
                    <CheckCircle2 size={12} /> Verified mentor
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-600">{mentor.headline}</p>

                <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Briefcase size={13} className="text-slate-400" />
                    {mentor.experienceYears} years' experience
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                    <Star className="text-amber-500 fill-amber-400" size={13} />
                    {mentor.ratingCount ? `${mentor.ratingAvg.toFixed(1)} (${mentor.ratingCount} reviews)` : 'New mentor'}
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <Globe size={13} /> {mentor.timezone || 'Asia/Kolkata'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* About Section */}
          <section className="card p-6 sm:p-7">
            <h2 className="text-xl font-bold text-slate-900">About</h2>
            <p className="mt-3.5 whitespace-pre-line text-sm leading-7 text-slate-600">
              {mentor.bio || 'This mentor has not added a bio yet.'}
            </p>
          </section>

          {/* Focus Areas */}
          <section className="card p-6 sm:p-7">
            <h2 className="text-xl font-bold text-slate-900">Areas of focus</h2>
            <div className="mt-3.5 flex flex-wrap gap-2">
              {(mentor.skills || []).map((skill) => (
                <span
                  key={skill}
                  className="rounded-lg border border-slate-200 bg-surface-muted/60 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>

          {/* Weekly Availability */}
          <section className="card p-6 sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-xl font-bold text-slate-900">Weekly availability</h2>
              <p className="text-xs text-slate-500">Times in {mentor.timezone || 'Asia/Kolkata'}</p>
            </div>
            {mentor.availability?.length ? (
              <ul className="mt-4 divide-y divide-slate-200">
                {mentor.availability.map((window, index) => (
                  <li className="flex justify-between items-center py-2.5 text-sm" key={`${window.dayOfWeek}-${index}`}>
                    <span className="font-semibold text-slate-800">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][window.dayOfWeek]}
                    </span>
                    <span className="text-xs font-mono font-medium text-slate-600 bg-surface-muted px-2.5 py-1 rounded-md">
                      {window.startTime} – {window.endTime}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Availability has not been added yet.</p>
            )}
          </section>

          {/* Learner Reviews */}
          <section className="card p-6 sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-xl font-bold text-slate-900">Learner reviews</h2>
              <span className="text-xs font-semibold text-slate-500">{mentor.ratingCount || 0} total</span>
            </div>

            {reviewsLoading && <p className="mt-4 text-sm text-slate-600" role="status">Loading reviews...</p>}
            {reviewsError && <p className="notice-error mt-4 rounded-lg p-3 text-sm" role="alert">{reviewsError}</p>}
            {!reviewsLoading && !reviewsError && reviews.length === 0 && (
              <p className="mt-4 text-sm text-slate-500">No reviews yet for this mentor.</p>
            )}

            {!reviewsLoading && reviews.length > 0 && (
              <ul className="mt-4 divide-y divide-slate-200">
                {reviews.map((review) => (
                  <li className="py-4" key={review.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-slate-900">{review.learnerName}</p>
                      <p className="inline-flex items-center gap-1 text-xs font-bold text-amber-500">
                        <Star size={13} className="fill-amber-400" />
                        <span>{review.rating}/5</span>
                      </p>
                    </div>
                    {review.comment && (
                      <p className="mt-2 text-xs leading-5 text-slate-600">{review.comment}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right Sticky Sidebar: Booking Card */}
        <aside className="card p-6 sm:p-7 sticky top-24 shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Session rate</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <p className="text-3xl font-extrabold text-slate-900">{rupees(mentor.pricePerHour)}</p>
              <span className="text-xs font-medium text-slate-500">/ 60-min call</span>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-surface-muted/50 p-3 text-xs leading-5 text-slate-600 flex items-start gap-2 border border-slate-200/60">
            <CalendarDays className="mt-0.5 shrink-0 text-brand-600" size={15} />
            <span>Includes 1-to-1 video room & money-back cancellation guarantee.</span>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200">
            <h2 className="text-base font-bold text-slate-900">Choose a session time</h2>
            <p className="mt-0.5 text-xs text-slate-500">Times below use your device's time zone.</p>

            {bookingError && (
              <p className="notice-error mt-3 rounded-md p-2.5 text-xs font-medium" role="alert">
                {bookingError}
              </p>
            )}
            {slotError && (
              <p className="notice-error mt-3 rounded-md p-2.5 text-xs font-medium" role="alert">
                {slotError}
              </p>
            )}

            {slotsLoading && (
              <div className="py-6 text-center text-xs text-slate-500" role="status">
                Loading available times...
              </div>
            )}

            {!slotsLoading && !slotError && slots.filter((slot) => slot.available).length === 0 && (
              <p className="mt-4 text-xs text-slate-500 py-3 text-center rounded-lg bg-surface-muted">
                No upcoming times are available. Check back soon.
              </p>
            )}

            {!slotsLoading && slots.filter((slot) => slot.available).length > 0 && (
              <div className="mt-4 grid gap-2 max-h-72 overflow-y-auto pr-1">
                {slots.filter((slot) => slot.available).map((slot) => (
                  <button
                    key={slot.startTime}
                    className="quiet-button w-full justify-between text-xs py-2.5 px-3 hover:border-brand-500 hover:bg-brand-50/30 transition-all"
                    disabled={bookingSaving}
                    onClick={() => selectSlot(slot)}
                    type="button"
                  >
                    <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <Clock3 size={13} className="text-brand-600" />
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
                      <span className="text-[11px] font-bold text-brand-700">Holding...</span>
                    ) : (
                      <span className="text-[11px] font-bold text-brand-600">Select</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}