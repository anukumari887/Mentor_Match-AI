import React, { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Wallet,
  WalletCards
} from 'lucide-react';
import { getMentorEarnings } from '../services/payments';

function rupees(paise) {
  return `Rs. ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format((paise || 0) / 100)}`;
}

export default function MentorEarningsPage() {
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
    <section className="page-wrap flex-1 py-10 sm:py-14">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-700">
          <WalletCards size={14} />
          <span>Mentor finance</span>
        </div>
        <h1 className="mt-1.5 text-3xl font-extrabold text-slate-900 sm:text-4xl">Earnings</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Net revenue from completed 1-to-1 mentoring sessions, minus the 15% platform fee.
        </p>
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
        <div className="py-16 text-center text-sm text-slate-600" role="status">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-3">Loading earnings summary...</p>
        </div>
      )}

      {!loading && !error && summary && (
        <div className="space-y-8">
          {/* Stat Cards Grid */}
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Earned</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <TrendingUp size={16} />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">{rupees(summary.earned)}</p>
              <p className="mt-1 text-[11px] text-slate-500">Gross earnings (85% share)</p>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Paid out</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted text-slate-600">
                  <ArrowUpRight size={16} />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">{rupees(summary.paidOut)}</p>
              <p className="mt-1 text-[11px] text-slate-500">Disbursed to bank account</p>
            </div>

            <div className="card p-6 border-brand-500/40 bg-brand-50/20 dark:bg-brand-950/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-800 dark:text-brand-300">Available balance</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/60 text-brand-800 dark:text-brand-300">
                  <Wallet size={16} />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-brand-700 dark:text-brand-400">{rupees(summary.balance)}</p>
              <p className="mt-1 text-[11px] font-medium text-brand-800 dark:text-brand-300">Eligible for next payout cycle</p>
            </div>
          </div>

          {/* Recent Payments Section */}
          <section className="card p-6 sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h2 className="text-xl font-bold text-slate-900">Recent payments</h2>
              <span className="text-xs font-semibold text-slate-500">
                {summary.recent?.length || 0} completed
              </span>
            </div>

            {!summary.recent?.length ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Completed, paid sessions will appear here.
              </p>
            ) : (
              <ul className="divide-y divide-slate-200 mt-2">
                {summary.recent.map((payment) => (
                  <li className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm" key={payment._id}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {payment.bookingId?.startTime
                            ? new Date(payment.bookingId.startTime).toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })
                            : 'Session payment'}
                        </p>
                        <p className="text-xs text-slate-500">Paid via platform</p>
                      </div>
                    </div>
                    <span className="text-base font-extrabold text-slate-900">
                      {rupees(payment.mentorEarning)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </section>
  );
}