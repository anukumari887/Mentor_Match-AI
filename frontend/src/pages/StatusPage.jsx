import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  RefreshCw,
  Server,
  XCircle
} from 'lucide-react';

export default function StatusPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const startTime = performance.now();
      const res = await api.get('/api/health');
      const latency = Math.round(performance.now() - startTime);
      setHealth({ ...res.data, clientLatencyMs: latency });
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || 'Failed to fetch system health status.');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status) => {
    if (status === 'ok') {
      return (
        <span className="system-good inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" /> Operational
        </span>
      );
    }
    if (status === 'degraded') {
      return (
        <span className="system-warn inline-flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" /> Degraded
        </span>
      );
    }
    return (
      <span className="system-bad inline-flex items-center gap-1.5">
        <XCircle className="h-3.5 w-3.5" /> Offline
      </span>
    );
  };

  return (
    <div className="page-wrap max-w-4xl flex-1 py-10 sm:py-14">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-7 border-b border-slate-200 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-700">
            <Activity size={13} />
            <span>Infrastructure Health</span>
          </div>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2.5">
            System Health & Service Status
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Real-time telemetry and component heartbeat monitoring.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="quiet-button text-xs py-2 px-3.5"
          type="button"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && !health && (
        <div className="py-16 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="text-xs sm:text-sm text-slate-500 mt-3">Querying cluster components...</p>
        </div>
      )}

      {error && (
        <div className="notice-error mt-8 flex items-start gap-3 rounded-lg p-4">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm">System Unreachable</h3>
            <p className="text-xs sm:text-sm text-rose-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {health && (
        <div className="mt-8 space-y-6">
          {/* Overall status banner */}
          <div
            className={`p-6 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              health.status === 'ok'
                ? 'health-ok'
                : health.status === 'degraded'
                ? 'health-warn'
                : 'health-bad'
            }`}
          >
            <div>
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500">
                Overall Platform Status
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5 capitalize">
                {health.status === 'ok'
                  ? 'All Systems Operational'
                  : health.status === 'degraded'
                  ? 'Degraded Performance'
                  : 'System Outage Detected'}
              </h2>
              {lastChecked && (
                <span className="text-xs text-slate-500 mt-1 block">
                  Last verified at {lastChecked} ({health.clientLatencyMs}ms roundtrip)
                </span>
              )}
            </div>
            <div>{getStatusBadge(health.status)}</div>
          </div>

          {/* Subsystems grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* MongoDB Card */}
            <div className="card p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                {getStatusBadge(health.mongo)}
              </div>
              <div className="mt-5 pt-3 border-t border-slate-200/80">
                <h3 className="font-bold text-slate-900 text-sm">MongoDB</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Primary Datastore & Unique Indexes</p>
              </div>
            </div>

            {/* Redis Card */}
            <div className="card p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                  <Server className="w-5 h-5" />
                </div>
                {getStatusBadge(health.redis)}
              </div>
              <div className="mt-5 pt-3 border-t border-slate-200/80">
                <h3 className="font-bold text-slate-900 text-sm">Redis Cache</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Distributed Locks & Rec Caching</p>
              </div>
            </div>

            {/* ML Service Card */}
            <div className="card p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                {getStatusBadge(health.ml)}
              </div>
              <div className="mt-5 pt-3 border-t border-slate-200/80">
                <h3 className="font-bold text-slate-900 text-sm">ML Recommender</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">FastAPI Scoring Microservice</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
