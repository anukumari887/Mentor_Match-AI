import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
              M
            </div>
            <span className="font-semibold text-slate-800 text-sm">Mentor-Match AI</span>
            <span className="text-slate-400 text-sm">© {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center space-x-6 text-sm text-slate-500">
            <Link to="/terms" className="hover:text-slate-900 transition-colors">
              Terms of Service
            </Link>
            <Link to="/privacy" className="hover:text-slate-900 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/refund-policy" className="hover:text-slate-900 transition-colors">
              Refund Policy
            </Link>
            <Link to="/status" className="hover:text-slate-900 transition-colors">
              System Health
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
