import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  CreditCard,
  ShieldCheck,
  Timer
} from 'lucide-react';
import { cancelBooking, getBooking } from '../services/mentors';
import { confirmMockPayment, createPaymentOrder, verifyRazorpayPayment } from '../services/payments';

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function rupees(value) {
  return `Rs. ${new Intl.NumberFormat('en-IN').format(value)}`;
}

function formatSessionTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(new Date(value));
}

export default function CheckoutPage() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  useEffect(() => {
    let active = true;
    getBooking(bookingId)
      .then((data) => { if (active) setBooking(data); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Booking details could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bookingId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const cancelHold = async () => {
    setCancelling(true);
    setError('');
    try {
      const updated = await cancelBooking(bookingId, 'Cancelled from checkout.');
      setBooking(updated);
      setConfirmCancel(false);
    } catch (requestError) {
      setError(requestError.message || 'The booking could not be cancelled.');
    } finally {
      setCancelling(false);
    }
  };

  const applyPaymentResult = (result) => {
    setBooking((current) => ({
      ...current,
      ...result.booking,
      mentorId: current.mentorId,
      status: result.booking?.status || 'confirmed'
    }));
    setPaymentConfirmed(true);
    setPaymentOrder(null);
  };

  const beginPayment = async () => {
    setPaymentLoading(true);
    setPaymentError('');
    try {
      const order = await createPaymentOrder(bookingId);
      setPaymentOrder(order);
      if (order.gateway === 'mock') {
        setPaymentLoading(false);
        return;
      }
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Secure checkout could not be loaded. Please try again.');

      const checkout = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'Mentor-Match',
        description: 'One-hour mentoring session',
        handler: async (result) => {
          try {
            const confirmed = await verifyRazorpayPayment(result);
            applyPaymentResult(confirmed);
          } catch (requestError) {
            setPaymentError(requestError.message || 'Payment verification failed.');
          } finally {
            setPaymentLoading(false);
          }
        },
        modal: { ondismiss: () => setPaymentLoading(false) }
      });
      checkout.open();
    } catch (requestError) {
      setPaymentError(requestError.message || 'Payment could not be started.');
      setPaymentLoading(false);
    }
  };

  const confirmTestPayment = async () => {
    setPaymentLoading(true);
    setPaymentError('');
    try {
      const result = await confirmMockPayment(bookingId);
      applyPaymentResult(result);
    } catch (requestError) {
      setPaymentError(requestError.message || 'Test payment could not be confirmed.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrap flex-1 py-16 text-center text-sm text-slate-600" role="status">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        <p className="mt-3">Loading booking details...</p>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <section className="page-wrap flex-1 py-12 max-w-lg mx-auto">
        <div className="notice-error rounded-lg p-4 text-sm" role="alert">{error}</div>
        <Link className="quiet-button mt-5 text-xs py-2 px-3.5" to="/sessions">
          <ArrowLeft size={14} /> My sessions
        </Link>
      </section>
    );
  }

  if (!booking) return null;

  const remainingMs = Math.max(0, new Date(booking.expiresAt).getTime() - now);
  const expired = booking.status === 'expired' || (booking.status === 'pending' && remainingMs === 0);
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const mentor = booking.mentorId;

  return (
    <section className="page-wrap flex-1 py-10 sm:py-14">
      <Link
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-800 hover:underline"
        to="/sessions"
      >
        <ArrowLeft size={15} /> My sessions
      </Link>

      <div className="card max-w-xl mx-auto p-7 sm:p-9 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-700">Booking hold</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">Review your session</h1>
          </div>
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold capitalize text-brand-800 border border-brand-200/50">
            {booking.status}
          </span>
        </div>

        {error && (
          <p className="notice-error mt-4 rounded-lg p-3 text-sm font-medium" role="alert">
            {error}
          </p>
        )}
        {paymentError && (
          <p className="notice-error mt-4 rounded-lg p-3 text-sm font-medium" role="alert">
            {paymentError}
          </p>
        )}

        {paymentConfirmed && (
          <div className="mt-5 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200 p-4 text-sm text-emerald-900 flex items-start gap-2.5" role="status">
            <CheckCircle2 size={18} className="text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Payment confirmed. Your session is booked.</p>
              <Link className="font-semibold underline mt-1 inline-block text-emerald-800 dark:text-emerald-300" to="/sessions">
                View sessions →
              </Link>
            </div>
          </div>
        )}

        {/* Summary List */}
        <dl className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-surface-muted/30 px-4">
          <div className="flex justify-between py-3 text-sm">
            <dt className="text-slate-500">Mentor</dt>
            <dd className="font-bold text-slate-900">{mentor?.name || 'Mentor'}</dd>
          </div>
          <div className="flex justify-between py-3 text-sm">
            <dt className="text-slate-500">Starts</dt>
            <dd className="font-bold text-slate-900 text-right">{formatSessionTime(booking.startTime)}</dd>
          </div>
          <div className="flex justify-between py-3 text-sm">
            <dt className="text-slate-500">Duration</dt>
            <dd className="font-bold text-slate-900">60 minutes</dd>
          </div>
          <div className="flex justify-between py-3 text-sm">
            <dt className="text-slate-500">Session price</dt>
            <dd className="font-extrabold text-slate-900 text-base">{rupees(booking.priceAtBooking)}</dd>
          </div>
        </dl>

        {expired ? (
          <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50/60 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-200 p-4 text-amber-900">
            <h2 className="text-base font-bold flex items-center gap-1.5">
              <AlertCircle size={16} /> Your hold expired
            </h2>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-300 leading-5">
              This reservation window has timed out. Choose another available time slot on the mentor's profile.
            </p>
            <Link className="quiet-button mt-4 text-xs py-2 px-3.5" to={`/mentors/${mentor?._id || mentor}`}>
              <ArrowLeft size={14} /> Back to mentor
            </Link>
          </div>
        ) : booking.status === 'pending' ? (
          <div className="mt-6">
            {/* Hold Timer Banner */}
            <div className="rounded-lg border border-brand-200 bg-brand-50/60 dark:border-brand-800/60 dark:bg-brand-950/40 p-3.5 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Clock3 className="text-brand-700 dark:text-brand-400" size={15} />
                Time remaining: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
              <span className="text-[11px] font-medium text-slate-500">Held exclusively for you</span>
            </div>

            {paymentOrder?.gateway === 'mock' ? (
              <div className="mt-5 rounded-lg border border-brand-300 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/50 p-4">
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <CreditCard size={14} className="text-brand-700 dark:text-brand-400" /> Test mode: no real money is charged.
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Click below to simulate an instant successful transaction in development.
                </p>
                <button
                  className="primary-button w-full mt-4 text-sm"
                  disabled={paymentLoading || expired}
                  onClick={confirmTestPayment}
                  type="button"
                >
                  {paymentLoading ? 'Confirming...' : 'Pay now (test)'}
                </button>
              </div>
            ) : (
              <button
                className="primary-button w-full mt-5 text-sm"
                disabled={paymentLoading || expired}
                onClick={beginPayment}
                type="button"
              >
                {paymentLoading ? 'Opening secure checkout...' : 'Continue to payment'}
              </button>
            )}

            {/* Cancel Hold Section */}
            {confirmCancel ? (
              <div className="mt-5 rounded-lg border border-slate-200 bg-surface-muted/40 p-4">
                <p className="text-xs font-semibold text-slate-700 mb-3">
                  Are you sure you want to release this time slot?
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="primary-button bg-rose-700 hover:bg-rose-800 text-xs py-2 px-3.5"
                    disabled={cancelling}
                    onClick={cancelHold}
                    type="button"
                  >
                    {cancelling ? 'Cancelling...' : 'Confirm cancellation'}
                  </button>
                  <button
                    className="quiet-button text-xs py-2 px-3.5"
                    onClick={() => setConfirmCancel(false)}
                    type="button"
                  >
                    Keep this time
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 text-center">
                <button
                  className="text-xs font-semibold text-slate-500 hover:text-rose-600 underline-offset-4 hover:underline"
                  onClick={() => setConfirmCancel(true)}
                  type="button"
                >
                  Cancel hold
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-6 text-center text-sm font-semibold text-slate-600">
            This booking is {booking.status}.
          </p>
        )}
      </div>
    </section>
  );
}