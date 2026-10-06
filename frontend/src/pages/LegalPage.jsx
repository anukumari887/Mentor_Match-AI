import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';

export default function LegalPage() {
  const location = useLocation();

  let title = 'Terms of Service';
  let content = 'Please review our terms of service before using Mentor-Match AI.';
  let detailedSections = [
    {
      heading: '1. Platform Overview',
      body: 'Mentor-Match AI connects independent learners with expert mentors for paid 1-on-1 video consultations. We provide the scheduling infrastructure, WebRTC video calling rooms, and payment processing ledger.'
    },
    {
      heading: '2. User Conduct & Integrity',
      body: 'All users agree to interact professionally, respect intellectual property, and attend scheduled sessions on time. Harassment, recording without mutual consent, or sharing offensive material will result in immediate account termination.'
    },
    {
      heading: '3. Booking Holds & Confirmations',
      body: 'Selected session slots are held for up to 15 minutes to allow payment completion. If payment is not completed before the hold expires, the slot is automatically released back to the mentor’s public availability.'
    }
  ];

  if (location.pathname === '/privacy') {
    title = 'Privacy Policy';
    content = 'We respect your privacy and protect all session data, communication logs, and profile records.';
    detailedSections = [
      {
        heading: '1. Information We Collect',
        body: 'We collect account details (name, email, role), profile inputs (skills, experience, goals), booking logs, and transaction metadata. We do not store sensitive payment card details; payment information is processed securely through PCI-DSS certified gateway adapters.'
      },
      {
        heading: '2. How Information is Used',
        body: 'Your inputs power personalized mentor recommendations and allow participants to prepare for sessions. We never sell your personal contact information to third parties.'
      },
      {
        heading: '3. Video & Audio Security',
        body: 'Video consultations occur over encrypted WebRTC peer-to-peer connections. The platform does not record video or audio calls without explicit advance notice and permission.'
      }
    ];
  } else if (location.pathname === '/refund-policy') {
    title = 'Refund and Cancellation Policy';
    content = 'Learners can cancel confirmed bookings up to 24 hours before the session start time for a full refund. Cancellations initiated by mentors are always refunded in full.';
    detailedSections = [
      {
        heading: '1. Learner Cancellations',
        body: 'Learners can cancel confirmed bookings up to 24 hours before the session start time for a 100% refund. Cancellations made with less than 24 hours notice are non-refundable, as the mentor reserved their scheduled time exclusively for you.'
      },
      {
        heading: '2. Mentor Cancellations',
        body: 'If a mentor cancels a session at any time before completion, the learner receives an immediate full refund, and the cancellation is recorded on the mentor’s account.'
      },
      {
        heading: '3. Technical Issues & Satisfaction',
        body: 'If severe platform connectivity failures prevent a scheduled call from occurring, participants can report the issue within 48 hours for admin review and refund re-issuance.'
      }
    ];
  }

  return (
    <div className="page-wrap max-w-3xl flex-1 py-12 sm:py-16">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-800 hover:underline mb-6"
      >
        <ArrowLeft size={15} /> Back to home
      </Link>

      <div className="card p-8 sm:p-10">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-700">
          <FileText size={14} />
          <span>Mentor-Match policies</span>
        </div>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">{title}</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">{content}</p>

        <div className="mt-8 space-y-6 pt-6 border-t border-slate-200">
          {detailedSections.map((section, idx) => (
            <div key={idx}>
              <h2 className="text-base font-bold text-slate-900">{section.heading}</h2>
              <p className="mt-1.5 text-xs sm:text-sm leading-6 text-slate-600">{section.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-brand-300 bg-brand-50/50 p-4 text-xs leading-5 text-slate-600 flex items-start gap-2.5">
          <ShieldCheck size={16} className="text-brand-700 shrink-0 mt-0.5" />
          <span>
            Draft policy for the Mentor-Match service. Formal legal review is required before public production launch.
          </span>
        </div>
      </div>
    </div>
  );
}
