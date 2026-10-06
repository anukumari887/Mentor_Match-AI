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
import Card from '../components/Card';
import Badge from '../components/Badge';

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
        <Badge variant="success" size="sm">
          <CheckCircle2 className="h-3 w-3" /> Operational
        </Badge>
      );
    }
    if (status === 'degraded') {
      return (
        <Badge variant="warning" size="sm">
          <AlertTriangle className="h-3 w-3" /> Degraded
        </Badge>
      );
    }
    return (
      <Badge variant="danger" size="sm">
        <XCircle className="h-3 w-3" /> Offline
      </Badge>
    );
  };

  return (
    <div className="page-wrap max-w-4xl flex-1 py-10 sm:py-14 bg-bg text-ink transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-7 border-b border-border gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-accent">Infrastructure Health</p>
          <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-ink flex items-center gap-2.5">
            System Health & Service Status
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            Real-time telemetry and component heartbeat monitoring.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-raised transition-colors"
          type="button"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && !health && (
        <div className="py-16 text-center">
          <p className="text-xs text-ink-muted">Querying cluster components...</p>
        </div>
      )}

      {error && (
        <div className="mt-8 flex items-start gap-3 rounded border border-danger/40 bg-danger/10 p-4 text-xs sm:text-sm text-danger">
          <XCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm">System Unreachable</h3>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {health && (
        <div className="mt-8 space-y-6">
          {/* Overall status banner */}
          <Card
            variant="raised"
            padding="lg"
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              health.status === 'ok'
                ? 'border-success/40 bg-success/5'
                : health.status === 'degraded'
                ? 'border-warning/40 bg-warning/5'
                : 'border-danger/40 bg-danger/5'
            }`}
          >
            <div>
              <span className="text-[11px] uppercase font-semibold tracking-wider text-ink-muted">
                Overall Platform Status
              </span>
              <h2 className="font-serif text-xl font-semibold text-ink mt-0.5 capitalize">
                {health.status === 'ok'
                  ? 'All Systems Operational'
                  : health.status === 'degraded'
                  ? 'Degraded Performance'
                  : 'System Outage Detected'}
              </h2>
              {lastChecked && (
                <span className="text-xs text-ink-muted mt-1 block">
                  Last verified at {lastChecked} ({health.clientLatencyMs}ms roundtrip)
                </span>
              )}
            </div>
            <div>{getStatusBadge(health.status)}</div>
          </Card>

          {/* Subsystems grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* MongoDB Card */}
            <Card variant="default" padding="md" className="flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded bg-surface-raised border border-border text-ink flex items-center justify-center">
                  <Database className="w-4 h-4 text-accent" />
                </div>
                {getStatusBadge(health.mongo)}
              </div>
              <div className="mt-4 pt-3 border-t border-border">
                <h3 className="font-serif text-sm font-semibold text-ink">MongoDB</h3>
                <p className="text-[11px] text-ink-muted mt-0.5">Primary Datastore & Unique Indexes</p>
              </div>
            </Card>

            {/* Redis Card */}
            <Card variant="default" padding="md" className="flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded bg-surface-raised border border-border text-ink flex items-center justify-center">
                  <Server className="w-4 h-4 text-accent" />
                </div>
                {getStatusBadge(health.redis)}
              </div>
              <div className="mt-4 pt-3 border-t border-border">
                <h3 className="font-serif text-sm font-semibold text-ink">Redis Cache</h3>
                <p className="text-[11px] text-ink-muted mt-0.5">Distributed Locks & Rec Caching</p>
              </div>
            </Card>

            {/* ML Service Card */}
            <Card variant="default" padding="md" className="flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded bg-surface-raised border border-border text-ink flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-accent" />
                </div>
                {getStatusBadge(health.ml)}
              </div>
              <div className="mt-4 pt-3 border-t border-border">
                <h3 className="font-serif text-sm font-semibold text-ink">ML Recommender</h3>
                <p className="text-[11px] text-ink-muted mt-0.5">FastAPI Scoring Microservice</p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
