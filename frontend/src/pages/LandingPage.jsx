import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Compass,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Video
} from 'lucide-react';

export default function LandingPage() {
  const topics = [
    'System Design',
    'Python & ML',
    'Frontend & React',
    'Career Transition',
    'Engineering Leadership',
    'Data Structures & Algos'
  ];

  return (
    <div className="flex-1 transition-colors duration-200">
      {/* Hero Section */}
      <section className="border-b border-slate-200 bg-surface/50">
        <div className="page-wrap grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:py-20">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">
              <Sparkles size={13} className="text-brand-600" />
              <span>Mentorship for the work ahead</span>
            </div>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.15] text-slate-900 sm:text-5xl lg:text-5xl">
              A thoughtful next step starts with the right person.
            </h1>

            <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
              Get practical, 1-on-1 guidance from engineers, leads, and founders who have already navigated the decisions you are facing today.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link className="primary-button text-base px-5 py-3" to="/register">
                Create your account <ArrowRight size={17} />
              </Link>
              <a className="quiet-button text-base px-5 py-3" href="#how-it-works">
                See how it works <ArrowDown size={16} />
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-slate-200 pt-6 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={17} className="text-brand-600" /> All mentor profiles reviewed
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarCheck size={17} className="text-brand-600" /> Flexible weekly scheduling
              </span>
              <span className="inline-flex items-center gap-2">
                <Video size={17} className="text-brand-600" /> In-browser video rooms
              </span>
            </div>
          </div>

          {/* Interactive Hero Visual: Authentic Product Preview Card */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="card p-6 sm:p-7 relative overflow-hidden">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-800 font-bold text-lg">
                    AR
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">Asha Rao</h3>
                      <span className="inline-flex items-center gap-1 rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-bold text-brand-700">
                        <CheckCircle2 size={11} /> Verified
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-600">Staff Engineer & Tech Lead</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-extrabold text-slate-900">Rs. 900</span>
                  <span className="block text-[11px] font-medium text-slate-500">per 60-min session</span>
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-600">
                "Helping mid-level engineers master system design trade-offs, break through plateaus, and prepare for staff-level responsibilities."
              </p>

              <div className="mt-3.5 flex flex-wrap gap-1.5">
                <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  System Design
                </span>
                <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  Distributed Systems
                </span>
                <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  Python & Go
                </span>
              </div>

              {/* Slot Picker Snippet */}
              <div className="mt-5 rounded-lg border border-slate-200 bg-surface-muted/40 p-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2.5">
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-brand-600" /> Next available times
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">Your local time</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-brand-500/40 bg-brand-50/50 p-2 text-center text-xs font-semibold text-brand-800">
                    Thu, 6:00 PM - 7:00 PM
                  </div>
                  <div className="rounded-md border border-slate-200 bg-surface p-2 text-center text-xs font-semibold text-slate-700">
                    Sat, 11:00 AM - 12:00 PM
                  </div>
                </div>
              </div>

              {/* Verified review snippet */}
              <div className="mt-4 pt-3.5 border-t border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                  <Star size={14} className="fill-amber-400" />
                  <span>4.9 / 5.0</span>
                  <span className="text-slate-500 font-normal">(18 reviews)</span>
                </div>
                <span className="text-xs font-semibold text-brand-600 flex items-center gap-1">
                  100% money-back guarantee
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular topics pill section */}
      <section className="border-b border-slate-200 py-6 bg-surface">
        <div className="page-wrap flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Popular Focus Areas:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {topics.map((topic) => (
              <Link
                key={topic}
                to={`/mentors?skill=${encodeURIComponent(topic)}`}
                className="rounded-full border border-slate-200 bg-surface-muted/60 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-brand-500 hover:text-brand-600 transition-colors"
              >
                {topic}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="border-b border-slate-200 py-14 sm:py-18 bg-surface/30" id="how-it-works">
        <div className="page-wrap">
          <div className="grid gap-5 border-b border-slate-200 pb-8 md:grid-cols-[0.8fr_1.2fr] md:items-end">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-700">A good place to begin</p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">Make the conversation count.</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-600 md:justify-self-end">
              Start with what you want to learn, then shape a profile around the kind of support that would make a real difference in your trajectory.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <article className="card p-6 sm:p-7 relative flex flex-col justify-between">
              <div>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-sm font-extrabold text-brand-700">
                  01
                </span>
                <h3 className="mt-4 text-xl font-bold text-slate-900">Name your next step</h3>
                <p className="mt-2.5 text-sm leading-6 text-slate-600">
                  Set your goals, current skills, and the specific hurdles where an experienced outside perspective will accelerate progress.
                </p>
              </div>
              <Link className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:underline" to="/register">
                Build a learner profile <ArrowRight size={15} />
              </Link>
            </article>

            <article className="card p-6 sm:p-7 relative flex flex-col justify-between">
              <div>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-sm font-extrabold text-brand-700">
                  02
                </span>
                <h3 className="mt-4 text-xl font-bold text-slate-900">Share what you know</h3>
                <p className="mt-2.5 text-sm leading-6 text-slate-600">
                  Senior engineers and mentors set their own rates, choose structured weekly slots, and accept bookings on their own terms.
                </p>
              </div>
              <Link className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:underline" to="/register">
                Join as a mentor <ArrowRight size={15} />
              </Link>
            </article>

            <article className="card p-6 sm:p-7 relative flex flex-col justify-between">
              <div>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-sm font-extrabold text-brand-700">
                  03
                </span>
                <h3 className="mt-4 text-xl font-bold text-slate-900">Keep it human</h3>
                <p className="mt-2.5 text-sm leading-6 text-slate-600">
                  Connect in private, encrypted in-browser video rooms with zero installs. Leave actionable reviews after every finished session.
                </p>
              </div>
              <Link className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:underline" to="/status">
                Check platform status <ArrowRight size={15} />
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* Trust & Verification Callout */}
      <section className="page-wrap py-12 sm:py-16">
        <div className="card p-8 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-800">
              <MessageSquare size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Your experience belongs in the conversation.
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 max-w-xl">
                Start a learner or mentor profile in just a few minutes. You can update your availability and focus areas any time.
              </p>
            </div>
          </div>
          <Link className="primary-button shrink-0 text-sm px-6 py-3" to="/register">
            Get started <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
}
