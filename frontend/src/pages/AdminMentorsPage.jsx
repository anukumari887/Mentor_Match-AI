import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  Check,
  UserCheck,
  X
} from 'lucide-react';
import { approveMentor, listPendingMentors, rejectMentor } from '../services/mentors';
import Card from '../components/Card';
import Badge from '../components/Badge';

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
    <section className="page-wrap flex-1 py-10 sm:py-14 bg-bg text-ink transition-colors">
      <header className="mb-8 border-b border-border pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-accent">Administration</p>
          <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-ink">Mentor profile review</h1>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-ink-muted">
            New mentor profiles remain hidden from the public directory until verified and approved by an admin.
          </p>
        </div>
      </header>

      {error && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded border border-danger/40 bg-danger/10 p-3.5 text-xs sm:text-sm text-danger font-medium" role="alert">
          <span>{error}</span>
          <button className="font-bold underline hover:opacity-80" onClick={() => setRefresh((value) => value + 1)} type="button">
            Refresh
          </button>
        </div>
      )}

      {loading && (
        <div className="py-16 text-center text-xs text-ink-muted" role="status">
          <p className="mt-3">Loading pending profiles...</p>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <Card variant="flat" padding="lg" className="text-center my-6">
          <UserCheck className="mx-auto text-accent mb-2" size={32} />
          <h2 className="mt-2 font-serif text-xl sm:text-2xl font-semibold text-ink">No profiles waiting for review</h2>
          <p className="mt-1.5 text-xs sm:text-sm text-ink-muted max-w-sm mx-auto">
            All submitted mentor applications have been processed. New applicant submissions will appear here.
          </p>
        </Card>
      )}

      {!loading && items.map((mentor) => (
        <Card key={mentor.id} variant="default" padding="md" className="mb-6 transition-colors">
          <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
            {/* Applicant details */}
            <div>
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-surface-raised border border-border font-serif font-bold text-sm text-ink">
                  {mentor.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-serif text-lg font-semibold text-ink">{mentor.name}</h2>
                  <p className="text-xs text-ink-muted mt-0.5">{mentor.headline}</p>
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                {mentor.bio}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {(mentor.skills || []).map((skill) => (
                  <span key={skill} className="rounded border border-border bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-ink">
                    {skill}
                  </span>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center gap-4 text-xs text-ink-muted">
                <span className="flex items-center gap-1 font-medium text-ink">
                  <Briefcase size={12} className="text-ink-muted" />
                  {mentor.experienceYears} years experience
                </span>
                <span>·</span>
                <span className="font-bold text-ink">
                  ₹{new Intl.NumberFormat('en-IN').format(mentor.pricePerHour)} per hour
                </span>
              </div>
            </div>

            {/* Action sidebar */}
            <div className="rounded border border-border bg-surface-raised/40 p-4 space-y-4 flex flex-col justify-between">
              <div>
                <button
                  className="w-full rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  disabled={busyId === mentor.id}
                  onClick={() => review(mentor, 'approve')}
                  type="button"
                >
                  <Check size={14} /> {busyId === mentor.id ? 'Saving...' : 'Approve profile'}
                </button>

                <div className="mt-3.5">
                  <label className="block text-xs font-semibold text-ink mb-1" htmlFor={`reject-reason-${mentor.id}`}>
                    Reason for rejection
                  </label>
                  <textarea
                    id={`reject-reason-${mentor.id}`}
                    className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent min-h-20 resize-y"
                    maxLength={500}
                    onChange={(event) => setReasons((current) => ({ ...current, [mentor.id]: event.target.value }))}
                    placeholder="Specify why profile was not approved..."
                    value={reasons[mentor.id] || ''}
                  />
                </div>
              </div>

              <button
                className="w-full rounded border border-border bg-surface px-4 py-1.5 text-xs font-medium text-ink hover:text-danger hover:border-danger/30 transition-colors flex items-center justify-center gap-1.5"
                disabled={busyId === mentor.id}
                onClick={() => review(mentor, 'reject')}
                type="button"
              >
                <X size={14} /> Reject profile
              </button>
            </div>
          </div>
        </Card>
      ))}
    </section>
  );
}