import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Database, Cpu, Server, Activity } from 'lucide-react';

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
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Operational
        </span>
      );
    }
    if (status === 'degraded') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          Degraded
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        Offline
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex-1">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-brand-600" />
            System Health & Service Status
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time telemetry and component heartbeat monitoring.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && !health && (
        <div className="py-16 text-center">
          <div className="inline-block w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 mt-3">Querying cluster components...</p>
        </div>
      )}

      {error && (
        <div className="mt-8 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm">System Unreachable</h3>
            <p className="text-sm text-rose-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {health && (
        <div className="mt-8 space-y-6">
          {/* Overall status banner */}
          <div
            className={`p-6 rounded-2xl border flex items-center justify-between ${
              health.status === 'ok'
                ? 'bg-emerald-50/50 border-emerald-200'
                : health.status === 'degraded'
                ? 'bg-amber-50/50 border-amber-200'
                : 'bg-rose-50/50 border-rose-200'
            }`}
          >
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* MongoDB Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                {getStatusBadge(health.mongo)}
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-slate-900 text-base">MongoDB</h3>
                <p className="text-xs text-slate-500 mt-0.5">Primary Datastore & Unique Indexes</p>
              </div>
            </div>

            {/* Redis Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <Server className="w-5 h-5" />
                </div>
                {getStatusBadge(health.redis)}
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-slate-900 text-base">Redis Cache</h3>
                <p className="text-xs text-slate-500 mt-0.5">Distributed Locks & Rec Caching</p>
              </div>
            </div>

            {/* ML Service Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                {getStatusBadge(health.ml)}
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-slate-900 text-base">ML Recommender</h3>
                <p className="text-xs text-slate-500 mt-0.5">FastAPI Scoring Microservice</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
