import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  HelpCircle,
  ShieldCheck,
  Video
} from 'lucide-react';
import Card from '../components/Card';
import Badge from '../components/Badge';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const topics = [
    'System Design',
    'Python & ML',
    'Frontend & React',
    'Career Transition',
    'Engineering Leadership',
    'Data Structures & Algos'
  ];

  const faqs = [
    {
      q: 'How does booking a session work?',
      a: 'Browse mentors by skill or focus area, pick an open slot from their weekly schedule, and reserve it. Your slot is held for 10 minutes while you complete checkout.'
    },
    {
      q: 'What is the cancellation and refund policy?',
      a: 'You can cancel free of charge up to 24 hours before the scheduled session start time for a 100% refund. If the mentor cancels or fails to attend, you also receive a full refund. Cancellations under 24 hours are non-refundable to respect the mentor\'s reserved time.'
    },
    {
      q: 'How are payments handled?',
      a: 'Payments are processed securely via Razorpay (or mock payment mode in test environments). Funds are securely held until the session takes place.'
    },
    {
      q: 'Do I need to install software for the video session?',
      a: 'No extra downloads are required. Sessions happen right in your browser via our WebRTC video rooms, accessible 5 minutes before your scheduled start time.'
    }
  ];

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="flex-1 bg-bg text-ink transition-colors">
      {/* Editorial Hero Section */}
      <section className="border-b border-border bg-surface/40">
        <div className="page-wrap grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:py-20">
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-wider uppercase text-accent">
              Direct Peer Mentorship
            </p>

            <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-5xl leading-[1.2]">
              One-on-one technical mentorship from practicing engineers.
            </h1>

            <p className="mt-5 text-sm sm:text-base leading-relaxed text-ink-muted">
              Book focused 60-minute video sessions with approved industry mentors. Get actionable advice on architecture, code reviews, career transitions, and real engineering challenges.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded bg-accent px-5 py-2.5 text-xs sm:text-sm font-semibold text-accent-text hover:bg-accent-hover transition-colors shadow-sm"
                to="/register"
              >
                Create an account <ArrowRight size={15} />
              </Link>
              <a
                className="inline-flex items-center gap-2 rounded border border-border bg-surface px-5 py-2.5 text-xs sm:text-sm font-medium text-ink hover:bg-surface-raised transition-colors"
                href="#how-it-works"
              >
                How it works
              </a>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border pt-6 text-xs text-ink-muted">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-accent shrink-0" />
                <span>Profiles approved by our team</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-accent shrink-0" />
                <span>Transparent weekly slots</span>
              </div>
              <div className="flex items-center gap-2">
                <Video size={16} className="text-accent shrink-0" />
                <span>Zero-install browser video</span>
              </div>
            </div>
          </div>

          {/* Sample Mentor Profile Preview (Honest Labeling) */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <Card variant="raised" padding="md" className="relative">
              <div className="flex items-center justify-between pb-3 border-b border-border text-[11px] font-medium text-ink-muted">
                <Badge variant="neutral" size="sm">
                  Sample profile
                </Badge>
                <span>Preview of booking flow</span>
              </div>

              <div className="mt-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded bg-surface-raised border border-border font-serif font-bold text-base text-ink">
                    AR
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-ink">Asha Rao</h2>
                      <Badge variant="accent" size="sm">
                        <CheckCircle2 size={11} className="mr-0.5" /> Approved by our team
                      </Badge>
                    </div>
                    <p className="text-xs text-ink-muted">Staff Engineer & Tech Lead</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-ink">₹900</span>
                  <span className="block text-[11px] text-ink-muted">per 60-min session</span>
                </div>
              </div>

              <p className="mt-3.5 text-xs leading-relaxed text-ink-muted">
                "Helping mid-level engineers master system design trade-offs, break through architectural plateaus, and navigate staff-level leadership."
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded bg-surface-raised border border-border px-2 py-0.5 text-[11px] font-medium text-ink">
                  System Design
                </span>
                <span className="rounded bg-surface-raised border border-border px-2 py-0.5 text-[11px] font-medium text-ink">
                  Distributed Systems
                </span>
                <span className="rounded bg-surface-raised border border-border px-2 py-0.5 text-[11px] font-medium text-ink">
                  Python & Go
                </span>
              </div>

              {/* Sample Slot Selection */}
              <div className="mt-4 rounded border border-border bg-surface-raised/40 p-3">
                <div className="flex items-center justify-between text-xs font-semibold text-ink mb-2">
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-accent" /> Available slots this week
                  </span>
                  <span className="text-[10px] text-ink-muted font-normal">Local timezone</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border border-accent bg-accent/10 p-2 text-center font-medium text-accent">
                    Thu, 6:00 PM – 7:00 PM
                  </div>
                  <div className="rounded border border-border bg-surface p-2 text-center text-ink-muted">
                    Sat, 11:00 AM – 12:00 PM
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-ink-muted">
                <span>Free cancellation &ge;24h prior</span>
                <Link to="/mentors" className="text-accent font-medium hover:underline">
                  Browse real mentors →
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Focus Areas Bar */}
      <section className="border-b border-border py-5 bg-surface">
        <div className="page-wrap flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Explore topics:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {topics.map((topic) => (
              <Link
                key={topic}
                to={`/mentors?skill=${encodeURIComponent(topic)}`}
                className="rounded border border-border bg-surface-raised/60 px-2.5 py-1 text-xs text-ink hover:border-accent hover:text-accent transition-colors"
              >
                {topic}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Numbered How It Works Section (Not 3 identical cards) */}
      <section className="border-b border-border py-14 sm:py-18 bg-surface/20" id="how-it-works">
        <div className="page-wrap">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wider uppercase text-accent">Process</p>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-ink">
              How Mentor-Match works
            </h2>
            <p className="mt-2 text-sm text-ink-muted leading-relaxed">
              Straightforward scheduling designed for busy practitioners on both sides.
            </p>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-3">
            <div className="border-t-2 border-border pt-4">
              <span className="font-serif text-xl font-bold text-accent">01</span>
              <h3 className="mt-2 font-serif text-lg font-semibold text-ink">
                Find the right practitioner
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-ink-muted">
                Filter mentors by tech stack, seniority, and hourly rate. Read their background, focus topics, and genuine session reviews.
              </p>
            </div>

            <div className="border-t-2 border-border pt-4">
              <span className="font-serif text-xl font-bold text-accent">02</span>
              <h3 className="mt-2 font-serif text-lg font-semibold text-ink">
                Reserve your slot
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-ink-muted">
                Choose an available slot directly on the mentor's calendar. The system reserves it for 10 minutes while you complete checkout.
              </p>
            </div>

            <div className="border-t-2 border-border pt-4">
              <span className="font-serif text-xl font-bold text-accent">03</span>
              <h3 className="mt-2 font-serif text-lg font-semibold text-ink">
                Meet in browser video
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-ink-muted">
                Join the private video room at session time. Zero external tools required. After completion, leave honest feedback.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Column: For Learners & For Mentors */}
      <section className="border-b border-border py-14 sm:py-16 bg-surface">
        <div className="page-wrap grid gap-10 md:grid-cols-2">
          {/* Learner Perspective */}
          <div className="rounded border border-border p-6 sm:p-8 bg-surface-raised/30 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">For Learners</p>
              <h3 className="mt-2 font-serif text-xl sm:text-2xl font-semibold text-ink">
                Targeted guidance when you need it most.
              </h3>
              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-ink-muted">
                Whether you are preparing for a senior interview, debugging an architectural bottleneck, or planning a stack migration, get direct answers from practitioners who have solved it before.
              </p>
              <ul className="mt-5 space-y-2 text-xs text-ink-muted">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-accent shrink-0" />
                  <span>Personalized mentor suggestions based on your target skills</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-accent shrink-0" />
                  <span>Clear refund policy: 100% refund on cancellations &ge;24 hours ahead</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-accent shrink-0" />
                  <span>Transparent reviews left only by learners who completed a session</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-border">
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
              >
                Sign up as a learner <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Mentor Perspective */}
          <div className="rounded border border-border p-6 sm:p-8 bg-surface-raised/30 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">For Mentors</p>
              <h3 className="mt-2 font-serif text-xl sm:text-2xl font-semibold text-ink">
                Share what you know and earn on your schedule.
              </h3>
              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-ink-muted">
                Set your own hourly rate, define recurring weekly availability windows that fit your calendar, and give back to motivated peers while earning meaningful side income.
              </p>
              <ul className="mt-5 space-y-2 text-xs text-ink-muted">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-accent shrink-0" />
                  <span>You set your hourly rate in ₹ INR; platform fee is 15%</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-accent shrink-0" />
                  <span>Flexible weekly recurring availability with conflict protection</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-accent shrink-0" />
                  <span>Direct payouts recorded transparently in your earnings ledger</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-border">
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
              >
                Apply as a mentor <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Honest FAQ Section */}
      <section className="py-14 sm:py-18 bg-surface/20">
        <div className="page-wrap max-w-3xl">
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Questions & Answers</p>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-ink">
              Frequently asked questions
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-ink-muted">
              Honest details about session policies, payments, and platform rules.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={faq.q}
                  className="rounded border border-border bg-surface overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between p-4 text-left text-xs sm:text-sm font-semibold text-ink hover:bg-surface-raised/40 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={16}
                      className={`text-ink-muted transition-transform duration-200 shrink-0 ml-3 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-ink-muted leading-relaxed border-t border-border/50 bg-surface-raised/20">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
