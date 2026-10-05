import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Calendar, Video, Star, ShieldCheck, ArrowRight, Award } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/70 via-white to-white py-20 lg:py-28 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-100/70 text-brand-800 text-xs font-semibold uppercase tracking-wider mb-6 border border-brand-200/60 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>AI-Powered 1-on-1 Mentorship</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Connect with verified mentors who have walked your path.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Personalized matching algorithms pair you with senior engineers, engineering leads, and specialists. Book conflict-free slots and meet 1-on-1 in your browser.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>Find Your Mentor</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/mentors"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Browse All Mentors</span>
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-slate-500 text-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Admin-Verified Mentors</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600" />
              <span>Instant Slot Booking</span>
            </div>
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-indigo-600" />
              <span>In-Browser WebRTC Calls</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Designed for serious career progression
            </h2>
            <p className="mt-3 text-slate-600">
              From intelligent match ranking to structured weekly availability, everything you need for productive mentorship.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Smart Match Engine</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Our recommendation engine analyzes your wanted skills, career goals, schedule overlap, and budget to compute calibrated match scores.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Double-Booking Protection</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Real-time distributed Redis slot locks paired with database-level unique partial indexes ensure you never experience schedule collisions.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Native WebRTC Video</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Hop straight into your call with zero third-party downloads. Audio, video, and screen controls are integrated right inside the browser.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
