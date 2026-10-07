import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  TrendingUp,
  Wallet,
  WalletCards
} from 'lucide-react';
import { getMentorEarnings } from '../services/payments';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { EmptyStateEarnings, IconHeaderEarnings } from '../components/Illustrations';
import { useAuth } from '../contexts/AuthContext';

function rupees(paise) {
  return `Rs. ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format((paise || 0) / 100)}`;
}

export default function MentorEarningsPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getMentorEarnings()
      .then((data) => { if (active) setSummary(data); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Earnings could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  return (
    <section className="page-wrap flex-1 py-10 sm:py-14 bg-bg text-ink transition-colors">
      <header className="mb-8 border-b border-border pb-6">
        <div className="min-w-0">
          <p className="font-serif text-base sm:text-lg font-semibold text-ink truncate mb-1" title={user?.name || undefined}>
            {user?.name ? `Welcome back, ${user.name}` : 'Welcome back'}
          </p>
          <p className="text-xs font-semibold tracking-wider uppercase text-accent">
            Mentor finance
          </p>
          <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-ink flex items-center gap-2.5">
            <IconHeaderEarnings className="w-6 h-6 text-accent shrink-0" />
            <span>Earnings</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-ink-muted">
            Net revenue from completed 1-to-1 mentoring sessions, minus the 15% platform fee.
          </p>
        </div>
      </header>

      {error && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded border border-danger/40 bg-danger/10 p-3.5 text-xs sm:text-sm text-danger" role="alert">
          <span>{error}</span>
          <button className="font-bold underline hover:opacity-80" onClick={() => setRetry((value) => value + 1)} type="button">
            Try again
          </button>
        </div>
      )}

      {loading && (
        <div className="py-16 text-center text-xs text-ink-muted" role="status">
          <p className="mt-3">Loading earnings summary...</p>
        </div>
      )}

      {!loading && !error && summary && (
        <div className="space-y-8">
          {/* Stat Cards Grid */}
          <div className="grid gap-5 sm:grid-cols-3">
            <Card variant="default" padding="md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Earned</span>
                <span className="flex h-7 w-7 items-center justify-center rounded bg-surface-raised border border-border text-accent">
                  <TrendingUp size={14} />
                </span>
              </div>
              <p className="mt-2.5 font-serif text-2xl sm:text-3xl font-semibold text-ink">{rupees(summary.earned)}</p>
              <p className="mt-1 text-[11px] text-ink-muted">Gross earnings (85% share)</p>
            </Card>

            <Card variant="default" padding="md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Paid out</span>
                <span className="flex h-7 w-7 items-center justify-center rounded bg-surface-raised border border-border text-ink-muted">
                  <ArrowUpRight size={14} />
                </span>
              </div>
              <p className="mt-2.5 font-serif text-2xl sm:text-3xl font-semibold text-ink">{rupees(summary.paidOut)}</p>
              <p className="mt-1 text-[11px] text-ink-muted">Disbursed to bank account</p>
            </Card>

            <Card variant="raised" padding="md" className="border-accent/40 bg-accent/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Available balance</span>
                <span className="flex h-7 w-7 items-center justify-center rounded bg-accent/15 text-accent">
                  <Wallet size={14} />
                </span>
              </div>
              <p className="mt-2.5 font-serif text-2xl sm:text-3xl font-semibold text-accent">{rupees(summary.balance)}</p>
              <p className="mt-1 text-[11px] text-ink-muted">Eligible for next payout cycle</p>
            </Card>
          </div>

          {/* Recent Payments Section */}
          <Card variant="default" padding="md">
            <div className="flex items-center justify-between border-b border-border pb-3.5">
              <h2 className="font-serif text-lg font-semibold text-ink">Recent payments</h2>
              <span className="text-xs text-ink-muted">
                {summary.recent?.length || 0} completed
              </span>
            </div>

            {!summary.recent?.length ? (
              <div className="py-8 text-center">
                <EmptyStateEarnings className="w-24 h-20 mx-auto mb-2" />
                <p className="text-xs text-ink-muted">
                  Completed, paid sessions will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border mt-1">
                {summary.recent.map((payment) => (
                  <li className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs sm:text-sm" key={payment._id}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-success/10 text-success border border-success/30">
                        <CheckCircle2 size={15} />
                      </div>
                      <div>
                        <p className="font-semibold text-ink">
                          {payment.bookingId?.startTime
                            ? new Date(payment.bookingId.startTime).toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })
                            : 'Session payment'}
                        </p>
                        <p className="text-[11px] text-ink-muted">Paid via platform</p>
                      </div>
                    </div>
                    <span className="font-semibold text-ink text-sm sm:text-base">
                      {rupees(payment.mentorEarning)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </section>
  );
}