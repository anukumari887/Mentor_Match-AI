import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ApprovalBanner() {
  const { user, profile } = useAuth();
  const [liveDismissed, setLiveDismissed] = useState(() => {
    try {
      return localStorage.getItem('mm_mentor_live_notified') === 'true';
    } catch {
      return false;
    }
  });

  if (!user || user.role !== 'mentor') {
    return null;
  }

  const approvalStatus = profile?.approvalStatus || 'pending';
  const completeness = profile?.profileCompleteness || {
    isComplete: Boolean(
      profile?.headline?.trim() &&
      profile?.bio?.trim() &&
      profile?.skills?.length &&
      profile?.availability?.length &&
      profile?.pricePerHour >= 100
    ),
    missing: []
  };

  // Approved Mentor: optional one-time dismissible "You are live" notice
  if (approvalStatus === 'approved') {
    if (liveDismissed) return null;
    return (
      <aside
        role="status"
        aria-live="polite"
        className="border-b border-success/30 bg-success/10 text-ink py-2.5 px-4 text-xs transition-colors"
      >
        <div className="page-wrap flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-success shrink-0" aria-hidden="true" />
            <p className="font-medium">
              <span className="font-bold">You are live!</span> Your mentor profile is approved and visible to learners in directory search.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem('mm_mentor_live_notified', 'true');
              } catch {
                // ignore storage quota error
              }
              setLiveDismissed(true);
            }}
            className="p-1 text-ink-muted hover:text-ink rounded transition-colors"
            aria-label="Dismiss live notification"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </aside>
    );
  }

  // Rejected Mentor
  if (approvalStatus === 'rejected') {
    return (
      <aside
        role="status"
        aria-live="polite"
        className="border-b border-danger/40 bg-danger/10 text-ink py-3.5 px-4 text-xs sm:text-sm transition-colors"
      >
        <div className="page-wrap space-y-1.5">
          <div className="flex items-center gap-2 text-danger font-semibold text-sm sm:text-base">
            <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
            <span>Profile review feedback: changes required</span>
          </div>
          <p className="text-ink leading-relaxed pl-6.5 text-xs sm:text-sm">
            An administrator reviewed your profile and requested adjustments before you can go live.
          </p>
          {profile?.rejectionReason && (
            <div className="ml-6.5 mt-2 rounded border border-danger/30 bg-surface/80 p-3 text-xs leading-relaxed text-ink">
              <span className="font-semibold block text-danger mb-0.5">Admin notes:</span>
              <span>{profile.rejectionReason}</span>
            </div>
          )}
          <p className="text-ink-muted pl-6.5 text-xs pt-1">
            Please <Link to="/profile" className="text-accent font-semibold hover:underline">update your profile</Link> and weekly availability windows. Resubmissions are reviewed manually by platform administrators.
          </p>
        </div>
      </aside>
    );
  }

  // Pending - Profile Incomplete
  if (!completeness.isComplete) {
    const missingItems = completeness.missing?.length ? completeness.missing : [
      { key: 'headline', label: 'Professional headline', link: '/profile' },
      { key: 'bio', label: 'Bio summary', link: '/profile' },
      { key: 'skills', label: 'At least one technical skill', link: '/profile' },
      { key: 'pricePerHour', label: 'Hourly session rate (min ₹100)', link: '/profile' },
      { key: 'availability', label: 'At least one weekly availability window', link: '/profile' }
    ];

    return (
      <aside
        role="status"
        aria-live="polite"
        className="border-b border-warning/40 bg-warning/10 text-ink py-3.5 px-4 text-xs sm:text-sm transition-colors"
      >
        <div className="page-wrap space-y-2">
          <div className="flex items-center gap-2 text-ink font-serif font-bold text-sm sm:text-base">
            <AlertCircle size={18} className="text-warning shrink-0" aria-hidden="true" />
            <span>Finish your profile to be reviewed</span>
          </div>
          <p className="text-ink-muted leading-relaxed pl-6.5 text-xs sm:text-sm">
            Complete the following required details so our team can review and approve your mentor account:
          </p>
          <ul className="pl-6.5 space-y-1 text-xs">
            {missingItems.map((item) => (
              <li key={item.key} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-warning shrink-0" aria-hidden="true" />
                <Link
                  to={item.link || '/profile'}
                  className="text-ink hover:text-accent font-medium hover:underline inline-flex items-center gap-1"
                >
                  <span>{item.label}</span>
                  <ArrowRight size={11} className="text-accent" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    );
  }

  // Pending - Profile Complete
  return (
    <aside
      role="status"
      aria-live="polite"
      className="border-b border-border bg-surface-raised/80 text-ink py-3.5 px-4 text-xs sm:text-sm transition-colors"
    >
      <div className="page-wrap space-y-1.5">
        <div className="flex items-center gap-2 text-ink font-serif font-bold text-sm sm:text-base">
          <Clock size={18} className="text-accent shrink-0" aria-hidden="true" />
          <span>Your profile is waiting for admin approval</span>
        </div>
        <p className="text-ink-muted leading-relaxed pl-6.5 text-xs sm:text-sm max-w-3xl">
          Learners cannot see your profile or book sessions yet. An administrator reviews all mentor profiles by hand to maintain high session quality. Nothing else is needed from you now.
        </p>
      </div>
    </aside>
  );
}
