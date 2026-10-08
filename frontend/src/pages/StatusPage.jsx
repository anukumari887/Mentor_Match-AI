import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  Mail,
  RefreshCw,
  Server,
  XCircle
} from 'lucide-react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { EmptyStateNetworkError } from '../components/Illustrations';

export default function StatusPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const parseHealthData = (data, latency) => {
    if (!data || typeof data !== 'object') return null;
    const { status, mongo, redis, ml, email } = data;
    if (!status && !mongo && !redis) return null;
    return {
      status: status || (mongo === 'ok' && redis === 'ok' ? 'ok' : 'down'),
      mongo: mongo || 'down',
      redis: redis || 'down',
      ml: ml || 'disabled',
      email: email || 'disabled',
      clientLatencyMs: latency
    };
  };

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();
    try {
      const res = await api.get('/api/health', {
        validateStatus: () => true
      });
      const latency = Math.round(performance.now() - startTime);

      const parsed = parseHealthData(res.data, latency);
      if (parsed) {
        setHealth(parsed);
        setError(null);
        setLastChecked(new Date().toLocaleTimeString());
      } else {
        setHealth(null);
        setError('The server did not answer. Try again in a minute.');
      }
    } catch (err) {
      const latency = Math.round(performance.now() - startTime);
      const parsed = parseHealthData(err?.response?.data, latency);
      if (parsed) {
        setHealth(parsed);
        setError(null);
        setLastChecked(new Date().toLocaleTimeString());
      } else {
        setHealth(null);
        setError('The server did not answer. Try again in a minute.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (state) => {
    if (state === 'Working') {
      return (
        <Badge variant="success" size="sm">
          <CheckCircle2 className="h-3.5 w-3.5" /> Working
        </Badge>
      );
    }
    if (state === 'Demo mode') {
      return (
        <Badge variant="accent" size="sm">
          <CheckCircle2 className="h-3.5 w-3.5" /> Demo mode
        </Badge>
      );
    }
    if (state === 'Not set up') {
      return (
        <Badge variant="neutral" size="sm">
          <AlertTriangle className="h-3.5 w-3.5" /> Not set up
        </Badge>
      );
    }
    return (
      <Badge variant="danger" size="sm">
        <XCircle className="h-3.5 w-3.5" /> Not reachable
      </Badge>
    );
  };

  const getSummaryLine = () => {
    if (!health) return '';
    if (health.status === 'ok') {
      return 'All platform systems are operational.';
    }
    if (health.status === 'degraded') {
      return 'Some platform services are degraded, but core functionality is available.';
    }
    return 'Core infrastructure is unreachable. Platform is experiencing an outage.';
  };

  const rows = health
    ? [
        {
          name: 'Database',
          description: 'MongoDB primary datastore and unique indexing',
          icon: <Database className="w-5 h-5 text-accent" />,
          state: health.mongo === 'ok' ? 'Working' : 'Not reachable'
        },
        {
          name: 'Cache',
          description: 'Redis distributed locks and recommendation cache',
          icon: <Server className="w-5 h-5 text-accent" />,
          state: health.redis === 'ok' ? 'Working' : 'Not reachable'
        },
        {
          name: 'Recommendation service',
          description: 'Machine learning scoring and vector matching service',
          icon: <Cpu className="w-5 h-5 text-accent" />,
          state:
            health.ml === 'ok'
              ? 'Working'
              : health.ml === 'disabled'
              ? 'Not set up'
              : 'Not reachable'
        },
        {
          name: 'Email',
          description: 'Transactional email notifications and session delivery',
          icon: <Mail className="w-5 h-5 text-accent" />,
          state:
            health.email === 'ok'
              ? 'Working'
              : health.email === 'demo'
              ? 'Demo mode'
              : health.email === 'disabled'
              ? 'Not set up'
              : 'Not reachable'
        }
      ]
    : [];

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
          className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-raised transition-colors cursor-pointer"
          type="button"
          aria-label="Refresh system status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && !health && !error && (
        <div className="py-16 text-center">
          <p className="text-xs text-ink-muted">Querying cluster components...</p>
        </div>
      )}

      {error && !health && (
        <div className="mt-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 rounded border border-danger/40 bg-danger/10 p-5 text-xs sm:text-sm text-danger">
          <EmptyStateNetworkError className="w-24 h-20 shrink-0" />
          <div className="text-center sm:text-left">
            <h3 className="font-semibold text-sm">System Unreachable</h3>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {health && (
        <div className="mt-8 space-y-6">
          {/* Overall summary banner */}
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
              <p className="text-xs sm:text-sm text-ink-muted mt-1">{getSummaryLine()}</p>
              {lastChecked && (
                <span className="text-xs text-ink-muted mt-1 block">
                  Last verified at {lastChecked} ({health.clientLatencyMs}ms roundtrip)
                </span>
              )}
            </div>
            <div>{getStatusBadge(health.status === 'ok' ? 'Working' : health.status === 'degraded' ? 'Working' : 'Not reachable')}</div>
          </Card>

          {/* Subsystems - Individual Rows */}
          <Card variant="default" padding="none" className="divide-y divide-border overflow-hidden">
            {rows.map((row) => (
              <div
                key={row.name}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 hover:bg-surface-raised/40 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-surface-raised border border-border text-ink flex items-center justify-center shrink-0">
                    {row.icon}
                  </div>
                  <div>
                    <h3 className="font-serif text-sm sm:text-base font-semibold text-ink leading-tight">
                      {row.name}
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">{row.description}</p>
                  </div>
                </div>
                <div className="self-start sm:self-center shrink-0">
                  {getStatusBadge(row.state)}
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
