import React from 'react';
import { useLocation } from 'react-router-dom';

export default function LegalPage() {
  const location = useLocation();

  let title = 'Terms of Service';
  let content = 'Please review our terms of service before using Mentor-Match AI.';

  if (location.pathname === '/privacy') {
    title = 'Privacy Policy';
    content = 'We respect your privacy and protect all session data, communication logs, and profile records.';
  } else if (location.pathname === '/refund-policy') {
    title = 'Refund and Cancellation Policy';
    content = 'Learners can cancel confirmed bookings up to 24 hours before the session start time for a full refund. Cancellations initiated by mentors are always refunded in full.';
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 flex-1">
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
      <p className="mt-4 text-slate-600 leading-relaxed">{content}</p>
      <div className="mt-8 p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-500">
        Note: These are draft operational policies for Mentor-Match AI. Formal legal review is required prior to public production launch.
      </div>
    </div>
  );
}
