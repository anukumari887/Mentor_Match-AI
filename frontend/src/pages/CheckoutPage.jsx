import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard
} from 'lucide-react';
import { cancelBooking, getBooking } from '../services/mentors';
import { confirmMockPayment, createPaymentOrder, verifyRazorpayPayment } from '../services/payments';
import Card from '../components/Card';
import Badge from '../components/Badge';

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
  return `₹${new Intl.NumberFormat('en-IN').format(value)}`;
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
      <div className="page-wrap flex-1 py-16 text-center text-xs text-ink-muted" role="status">
        <p className="mt-3">Loading booking details...</p>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <section className="page-wrap flex-1 py-12 max-w-lg mx-auto bg-bg text-ink">
        <div className="rounded border border-danger/40 bg-danger/10 p-4 text-xs sm:text-sm text-danger" role="alert">{error}</div>
        <Link className="mt-4 inline-flex items-center gap-1.5 rounded border border-border bg-surface px-3 py-1.5 text-xs text-ink hover:bg-surface-raised" to="/sessions">
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
    <section className="page-wrap flex-1 py-10 sm:py-14 bg-bg text-ink transition-colors">
      <Link
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
        to="/sessions"
      >
        <ArrowLeft size={14} /> My sessions
      </Link>

      <Card variant="raised" padding="lg" className="max-w-xl mx-auto shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <p className="text-xs font-semibold tracking-wider uppercase text-accent">Booking hold</p>
            <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">Review your session</h1>
          </div>
          <Badge variant="neutral" size="sm" className="capitalize">
            {booking.status}
          </Badge>
        </div>

        {error && (
          <p className="mt-4 rounded border border-danger/40 bg-danger/10 p-3 text-xs text-danger font-medium" role="alert">
            {error}
          </p>
        )}
        {paymentError && (
          <p className="mt-4 rounded border border-danger/40 bg-danger/10 p-3 text-xs text-danger font-medium" role="alert">
            {paymentError}
          </p>
        )}

        {paymentConfirmed && (
          <div className="mt-5 rounded border border-success/40 bg-success/10 p-4 text-xs sm:text-sm text-ink flex items-start gap-2.5" role="status">
            <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-ink">Payment confirmed. Your session is booked.</p>
              <Link className="font-semibold text-accent hover:underline mt-1 inline-block" to="/sessions">
                View sessions →
              </Link>
            </div>
          </div>
        )}

        {/* Summary List */}
        <dl className="mt-6 divide-y divide-border rounded border border-border bg-surface-raised/30 px-4">
          <div className="flex justify-between py-2.5 text-xs sm:text-sm">
            <dt className="text-ink-muted">Mentor</dt>
            <dd className="font-semibold text-ink">{mentor?.name || 'Mentor'}</dd>
          </div>
          <div className="flex justify-between py-2.5 text-xs sm:text-sm">
            <dt className="text-ink-muted">Starts</dt>
            <dd className="font-semibold text-ink text-right">{formatSessionTime(booking.startTime)}</dd>
          </div>
          <div className="flex justify-between py-2.5 text-xs sm:text-sm">
            <dt className="text-ink-muted">Duration</dt>
            <dd className="font-semibold text-ink">60 minutes</dd>
          </div>
          <div className="flex justify-between py-2.5 text-xs sm:text-sm">
            <dt className="text-ink-muted">Session price</dt>
            <dd className="font-bold text-ink text-sm sm:text-base">{rupees(booking.priceAtBooking)}</dd>
          </div>
        </dl>

        {expired ? (
          <div className="mt-6 rounded border border-warning/40 bg-warning/10 p-4 text-ink">
            <h2 className="font-serif text-base font-semibold flex items-center gap-1.5 text-ink">
              <AlertCircle size={16} className="text-warning" /> Your hold expired
            </h2>
            <p className="mt-1 text-xs text-ink-muted leading-relaxed">
              This reservation window has timed out. Choose another available time slot on the mentor's profile.
            </p>
            <Link
              className="mt-3.5 inline-flex items-center gap-1.5 rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-raised"
              to={`/mentors/${mentor?._id || mentor}`}
            >
              <ArrowLeft size={13} /> Back to mentor
            </Link>
          </div>
        ) : booking.status === 'pending' ? (
          <div className="mt-6">
            {/* Hold Timer Banner */}
            <div className="rounded border border-accent/30 bg-accent/10 p-3 flex items-center justify-between text-xs">
              <span className="font-semibold text-ink flex items-center gap-1.5">
                <Clock3 className="text-accent" size={14} />
                Time remaining: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
              <span className="text-[11px] text-ink-muted">Held exclusively for you</span>
            </div>

            {paymentOrder?.gateway === 'mock' ? (
              <div className="mt-5 rounded border border-border bg-surface-raised/40 p-4">
                <p className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <CreditCard size={14} className="text-accent" /> Test mode: no real money is charged.
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Click below to simulate an instant successful transaction in development.
                </p>
                <button
                  className="w-full mt-4 rounded bg-accent px-4 py-2.5 text-xs sm:text-sm font-semibold text-accent-text hover:bg-accent-hover transition-colors shadow-sm"
                  disabled={paymentLoading || expired}
                  onClick={confirmTestPayment}
                  type="button"
                >
                  {paymentLoading ? 'Confirming...' : 'Pay now (test)'}
                </button>
              </div>
            ) : (
              <button
                className="w-full mt-5 rounded bg-accent px-4 py-2.5 text-xs sm:text-sm font-semibold text-accent-text hover:bg-accent-hover transition-colors shadow-sm"
                disabled={paymentLoading || expired}
                onClick={beginPayment}
                type="button"
              >
                {paymentLoading ? 'Opening secure checkout...' : 'Continue to payment'}
              </button>
            )}

            {/* Cancel Hold Section */}
            {confirmCancel ? (
              <div className="mt-5 rounded border border-border bg-surface-raised/30 p-4">
                <p className="text-xs font-medium text-ink mb-3">
                  Are you sure you want to release this time slot?
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="rounded bg-danger px-3.5 py-1.5 text-xs font-semibold text-surface hover:opacity-90 transition-opacity"
                    disabled={cancelling}
                    onClick={cancelHold}
                    type="button"
                  >
                    {cancelling ? 'Cancelling...' : 'Confirm cancellation'}
                  </button>
                  <button
                    className="rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-raised transition-colors"
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
                  className="text-xs text-ink-muted hover:text-danger underline-offset-4 hover:underline transition-colors"
                  onClick={() => setConfirmCancel(true)}
                  type="button"
                >
                  Cancel hold
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-6 text-center text-xs sm:text-sm font-medium text-ink-muted">
            This booking is {booking.status}.
          </p>
        )}
      </Card>
    </section>
  );
}