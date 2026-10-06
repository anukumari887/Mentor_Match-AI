import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CheckCircle2, Clock, Plus, Save, Trash2, UserRound, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function defaultWindow() {
  return { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' };
}

function formatAvailability(availability = []) {
  return availability.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }));
}

function availabilityIssue(windows) {
  const byDay = new Map();
  for (const window of windows) {
    if (window.startTime >= window.endTime) return 'Each availability window must end after it starts.';
    const start = Number(window.startTime.slice(0, 2)) * 60 + Number(window.startTime.slice(3));
    const end = Number(window.endTime.slice(0, 2)) * 60 + Number(window.endTime.slice(3));
    const dayWindows = byDay.get(window.dayOfWeek) || [];
    if (dayWindows.some(([otherStart, otherEnd]) => start < otherEnd && end > otherStart)) {
      return `Availability windows overlap on ${DAYS[window.dayOfWeek]}.`;
    }
    dayWindows.push([start, end]);
    byDay.set(window.dayOfWeek, dayWindows);
  }
  return '';
}

export default function ProfilePage() {
  const { user, loading: authLoading, updateProfile: updateSessionProfile } = useAuth();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError('');
    api.get('/api/profile')
      .then(({ data }) => {
        if (active) setForm({ ...data.profile, availability: formatAvailability(data.profile.availability) });
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'We could not load your profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [user, retryCount]);

  if (!authLoading && !user) return <Navigate to="/login" replace state={{ from: { pathname: '/profile' } }} />;

  const setField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setSaved(false);
  };

  const setWindow = (index, field, value) => {
    setForm((current) => ({
      ...current,
      availability: current.availability.map((window, row) =>
        row === index ? { ...window, [field]: field === 'dayOfWeek' ? Number(value) : value } : window
      ),
    }));
    setSaved(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const issue = availabilityIssue(form.availability || []);
    if (issue) {
      setError(issue);
      setSaved(false);
      return;
    }

    setSaving(true);
    setError('');
    setSaved(false);
    const payload = user.role === 'learner'
      ? {
          goals: form.goals || '',
          knownSkills: (form.knownSkillsText || '').split(/[\n,]/).map((skill) => skill.trim()).filter(Boolean),
          wantedSkills: (form.wantedSkillsText || '').split(/[\n,]/).map((skill) => skill.trim()).filter(Boolean),
          level: form.level,
          budgetPerHour: Number(form.budgetPerHour || 0),
          availability: form.availability || [],
        }
      : {
          headline: form.headline || '',
          bio: form.bio || '',
          skills: (form.skillsText || '').split(/[\n,]/).map((skill) => skill.trim()).filter(Boolean),
          experienceYears: Number(form.experienceYears || 0),
          pricePerHour: Number(form.pricePerHour || 100),
          timezone: form.timezone || 'Asia/Kolkata',
          availability: form.availability || [],
        };

    try {
      const { data } = await api.put('/api/profile', payload);
      const nextProfile = { ...data.profile, availability: formatAvailability(data.profile.availability) };
      setForm(nextProfile);
      updateSessionProfile(data.profile);
      setSaved(true);
    } catch (requestError) {
      const details = requestError.details?.map((detail) => detail.message).filter(Boolean).join(' ');
      setError(details || requestError.message || 'Your profile could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="page-wrap py-16 text-center text-sm text-slate-600" role="status">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        <p className="mt-3">Loading your profile...</p>
      </div>
    );
  }

  return (
    <section className="page-wrap flex-1 py-10 sm:py-14">
      {/* Header */}
      <div className="mb-8 border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-700">Account settings</p>
          <h1 className="mt-1.5 text-3xl font-extrabold text-slate-900 sm:text-4xl">Profile and availability</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
              <UserRound size={14} className="text-brand-600" /> {user.name}
            </span>
            <span>{user.email}</span>
            <span className="rounded-full bg-brand-50 border border-brand-200 px-2 py-0.5 font-bold capitalize text-brand-800">
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="notice-error mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg p-4 text-sm font-medium">
          <span className="flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </span>
          {!form && (
            <button className="font-bold underline underline-offset-2 hover:opacity-80" onClick={() => setRetryCount((count) => count + 1)} type="button">
              Try again
            </button>
          )}
        </div>
      )}

      {saved && (
        <p role="status" className="mb-6 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200 p-4 text-sm font-semibold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-700 dark:text-emerald-400" /> Your changes have been saved.
        </p>
      )}

      {form && (
        <form className="max-w-3xl space-y-8" onSubmit={handleSubmit}>
          {user.role === 'learner' ? (
            <div className="card p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">What are you working toward?</h2>
                <p className="mt-1 text-xs text-slate-600">
                  This guides our matchmaking algorithm to rank the most relevant mentors for you.
                </p>
              </div>

              <div>
                <label className="form-label" htmlFor="learner-goals">Career goals</label>
                <textarea
                  id="learner-goals"
                  className="form-input mt-1.5 min-h-24 resize-y"
                  maxLength={500}
                  name="goals"
                  onChange={setField}
                  placeholder="e.g. Master distributed system design and prepare for senior engineer interviews"
                  value={form.goals || ''}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="form-label" htmlFor="known-skills">Skills you know</label>
                  <textarea
                    id="known-skills"
                    className="form-input mt-1.5 min-h-20 resize-y"
                    name="knownSkillsText"
                    onChange={setField}
                    placeholder="JavaScript, React, SQL"
                    value={form.knownSkillsText ?? (form.knownSkills || []).join(', ')}
                  />
                  <span className="mt-1 block text-[11px] text-slate-500">Separate with commas</span>
                </div>

                <div>
                  <label className="form-label" htmlFor="wanted-skills">Skills you want to learn</label>
                  <textarea
                    id="wanted-skills"
                    className="form-input mt-1.5 min-h-20 resize-y"
                    name="wantedSkillsText"
                    onChange={setField}
                    placeholder="System design, Kubernetes, Go"
                    value={form.wantedSkillsText ?? (form.wantedSkills || []).join(', ')}
                  />
                  <span className="mt-1 block text-[11px] text-slate-500">Separate with commas</span>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="form-label" htmlFor="learner-level">Current level</label>
                  <select
                    id="learner-level"
                    className="form-input mt-1.5"
                    name="level"
                    onChange={setField}
                    value={form.level || 'beginner'}
                  >
                    <option value="beginner">Beginner (0-2 years)</option>
                    <option value="intermediate">Intermediate (2-5 years)</option>
                    <option value="advanced">Advanced (5+ years)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" htmlFor="learner-budget">Budget per hour (INR)</label>
                  <input
                    id="learner-budget"
                    className="form-input mt-1.5"
                    min="0"
                    name="budgetPerHour"
                    onChange={setField}
                    type="number"
                    value={form.budgetPerHour ?? 0}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Your mentoring profile</h2>
                <p className="mt-1 text-xs text-slate-600">
                  Share concise, specific context so learners understand how your experience can help them.
                </p>
              </div>

              <div>
                <label className="form-label" htmlFor="mentor-headline">Headline</label>
                <input
                  id="mentor-headline"
                  className="form-input mt-1.5"
                  maxLength={120}
                  name="headline"
                  onChange={setField}
                  placeholder="e.g. Senior Backend Engineer at CloudTech"
                  value={form.headline || ''}
                />
              </div>

              <div>
                <label className="form-label" htmlFor="mentor-bio">About your experience</label>
                <textarea
                  id="mentor-bio"
                  className="form-input mt-1.5 min-h-28 resize-y"
                  maxLength={1500}
                  name="bio"
                  onChange={setField}
                  placeholder="Summarize your background, major decisions, and the types of mentorship conversations you enjoy."
                  value={form.bio || ''}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="form-label" htmlFor="mentor-skills">Skills</label>
                  <input
                    id="mentor-skills"
                    className="form-input mt-1.5"
                    name="skillsText"
                    onChange={setField}
                    placeholder="React, leadership"
                    value={form.skillsText ?? (form.skills || []).join(', ')}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="mentor-exp">Years of experience</label>
                  <input
                    id="mentor-exp"
                    className="form-input mt-1.5"
                    max="60"
                    min="0"
                    name="experienceYears"
                    onChange={setField}
                    type="number"
                    value={form.experienceYears ?? 0}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="mentor-price">Price per hour (INR)</label>
                  <input
                    id="mentor-price"
                    className="form-input mt-1.5"
                    max="20000"
                    min="100"
                    name="pricePerHour"
                    onChange={setField}
                    type="number"
                    value={form.pricePerHour ?? 100}
                  />
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="mentor-tz">Time zone</label>
                <input
                  id="mentor-tz"
                  className="form-input mt-1.5"
                  name="timezone"
                  onChange={setField}
                  value={form.timezone || 'Asia/Kolkata'}
                />
              </div>

              {form.approvalStatus && (
                <div className="rounded-lg bg-surface-muted/60 p-3 text-xs text-slate-600 flex items-center justify-between">
                  <span>Profile approval status:</span>
                  <span className="font-bold capitalize text-slate-900">{form.approvalStatus}</span>
                </div>
              )}
            </div>
          )}

          {/* Weekly Availability Card */}
          <div className="card p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Weekly availability</h2>
                <p className="mt-1 text-xs text-slate-600">
                  Recurring windows when you are open for 1-hour sessions.
                </p>
              </div>
              <button
                className="secondary-button text-xs py-2 px-3.5"
                onClick={() => setForm((current) => ({ ...current, availability: [...(current.availability || []), defaultWindow()] }))}
                type="button"
              >
                <Plus size={15} /> Add time
              </button>
            </div>

            {(form.availability || []).length === 0 && (
              <p className="mt-5 rounded-lg bg-surface-muted/50 p-6 text-center text-xs text-slate-500">
                No weekly times added yet. Click "Add time" above to add recurring hours.
              </p>
            )}

            <div className="mt-5 space-y-3">
              {(form.availability || []).map((window, index) => (
                <div
                  key={`${index}-${window.dayOfWeek}`}
                  className="grid items-end gap-3 rounded-lg border border-slate-200 bg-surface-muted/30 p-3 sm:grid-cols-[1.3fr_1fr_1fr_auto]"
                >
                  <div>
                    <label className="form-label text-xs">Day</label>
                    <select
                      className="form-input mt-1 text-xs"
                      onChange={(event) => setWindow(index, 'dayOfWeek', event.target.value)}
                      value={window.dayOfWeek}
                    >
                      {DAYS.map((day, dayIndex) => (
                        <option key={day} value={dayIndex}>{day}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label text-xs">From</label>
                    <input
                      className="form-input mt-1 text-xs font-mono"
                      onChange={(event) => setWindow(index, 'startTime', event.target.value)}
                      type="time"
                      value={window.startTime}
                    />
                  </div>

                  <div>
                    <label className="form-label text-xs">Until</label>
                    <input
                      className="form-input mt-1 text-xs font-mono"
                      onChange={(event) => setWindow(index, 'endTime', event.target.value)}
                      type="time"
                      value={window.endTime}
                    />
                  </div>

                  <button
                    aria-label={`Remove ${DAYS[window.dayOfWeek]} availability`}
                    className="icon-button text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-slate-200 h-10 w-10 shrink-0"
                    onClick={() => setForm((current) => ({ ...current, availability: current.availability.filter((_, row) => row !== index) }))}
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button className="primary-button text-sm px-6 py-2.5" disabled={saving} type="submit">
              <Save size={16} /> {saving ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}