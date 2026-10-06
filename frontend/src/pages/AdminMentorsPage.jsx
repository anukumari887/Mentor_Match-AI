import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  Check,
  ClipboardCheck,
  RotateCcw,
  ShieldAlert,
  UserCheck,
  X
} from 'lucide-react';
import { approveMentor, listPendingMentors, rejectMentor } from '../services/mentors';

export default function AdminMentorsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [reasons, setReasons] = useState({});
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    listPendingMentors()
      .then((data) => { if (active) setItems(data.items); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Pending mentor profiles could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  const review = async (mentor, action) => {
    if (action === 'reject' && !reasons[mentor.id]?.trim()) {
      setError('Add a short reason before rejecting this profile.');
      return;
    }
    setBusyId(mentor.id);
    setError('');
    try {
      if (action === 'approve') await approveMentor(mentor.id);
      else await rejectMentor(mentor.id, reasons[mentor.id].trim());
      setItems((current) => current.filter((item) => item.id !== mentor.id));
    } catch (requestError) {
      setError(requestError.message || 'The review could not be saved.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <section className="page-wrap flex-1 py-10 sm:py-14">
      <header className="mb-8 border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-700">
            <ClipboardCheck size={14} />
            <span>Administration</span>
          </div>
          <h1 className="mt-1.5 text-3xl font-extrabold text-slate-900 sm:text-4xl">Mentor profile review</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            New mentor profiles remain hidden from the public directory until verified and approved by an admin.
          </p>
        </div>
      </header>

      {error && (
        <div className="notice-error mb-6 flex items-center justify-between gap-3 rounded-lg p-4 text-sm font-medium" role="alert">
          <span>{error}</span>
          <button className="font-bold underline hover:opacity-80" onClick={() => setRefresh((value) => value + 1)} type="button">
            Refresh
          </button>
        </div>
      )}

      {loading && (
        <div className="py-16 text-center text-sm text-slate-600" role="status">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-3">Loading pending profiles...</p>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="card p-12 text-center my-6">
          <UserCheck className="mx-auto text-brand-600" size={32} />
          <h2 className="mt-4 text-2xl font-bold text-slate-900">No profiles waiting for review</h2>
          <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto">
            All submitted mentor applications have been processed. New applicant submissions will appear here.
          </p>
        </div>
      )}

      {!loading && items.map((mentor) => (
        <article key={mentor.id} className="card p-6 sm:p-7 mb-6 transition-all">
          <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
            {/* Applicant details */}
            <div>
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-800 font-extrabold text-base">
                  {mentor.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{mentor.name}</h2>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">{mentor.headline}</p>
                </div>
              </div>

              <p className="mt-4 text-xs leading-6 text-slate-600">
                {mentor.bio}
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {(mentor.skills || []).map((skill) => (
                  <span key={skill} className="rounded-md border border-slate-200 bg-surface-muted/60 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    {skill}
                  </span>
                ))}
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-200/80 flex items-center gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1 font-semibold text-slate-800">
                  <Briefcase size={13} className="text-slate-400" />
                  {mentor.experienceYears} years' experience
                </span>
                <span>·</span>
                <span className="font-extrabold text-slate-900">
                  Rs. {new Intl.NumberFormat('en-IN').format(mentor.pricePerHour)} per hour
                </span>
              </div>
            </div>

            {/* Action sidebar */}
            <div className="rounded-lg border border-slate-200 bg-surface-muted/40 p-5 space-y-4 flex flex-col justify-between">
              <div>
                <button
                  className="primary-button w-full text-xs py-2.5 px-4"
                  disabled={busyId === mentor.id}
                  onClick={() => review(mentor, 'approve')}
                  type="button"
                >
                  <Check size={15} /> {busyId === mentor.id ? 'Saving...' : 'Approve profile'}
                </button>

                <div className="mt-4">
                  <label className="form-label text-xs" htmlFor={`reject-reason-${mentor.id}`}>
                    Reason for rejection
                  </label>
                  <textarea
                    id={`reject-reason-${mentor.id}`}
                    className="form-input mt-1.5 min-h-20 text-xs resize-y"
                    maxLength={500}
                    onChange={(event) => setReasons((current) => ({ ...current, [mentor.id]: event.target.value }))}
                    placeholder="Specify why profile was not approved..."
                    value={reasons[mentor.id] || ''}
                  />
                </div>
              </div>

              <button
                className="quiet-button w-full text-xs py-2 px-4 hover:border-rose-400 hover:text-rose-700"
                disabled={busyId === mentor.id}
                onClick={() => review(mentor, 'reject')}
                type="button"
              >
                <X size={15} /> Reject profile
              </button>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}