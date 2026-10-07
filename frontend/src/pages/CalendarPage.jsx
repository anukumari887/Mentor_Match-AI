import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Video
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { downloadBookingIcs, listBookings } from '../services/mentors';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Tabs from '../components/Tabs';
import Toast from '../components/Toast';
import Skeleton from '../components/Skeleton';
import Avatar from '../components/Avatar';

function getWeekFirstDay() {
  try {
    const locale = new Intl.Locale(navigator.language || 'en-US');
    if (typeof locale.getWeekInfo === 'function') {
      const info = locale.getWeekInfo();
      return info?.firstDay === 1 ? 1 : 0;
    }
  } catch {}
  return 0; // Default to Sunday
}

function toLocalDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatSessionTimeRange(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  });
  const tzFormatter = new Intl.DateTimeFormat(undefined, {
    timeZoneName: 'short'
  });
  const tzParts = tzFormatter.formatToParts(start);
  const tzName = tzParts.find((p) => p.type === 'timeZoneName')?.value || '';

  return `${timeFormatter.format(start)} – ${timeFormatter.format(end)} ${tzName}`.trim();
}

export default function CalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [downloadingId, setDownloadingId] = useState('');

  const gridRef = useRef(null);

  const firstDayOfWeek = useMemo(() => getWeekFirstDay(), []);

  // Compute month range for fetching
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    // Load only the visible month
    const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    listBookings({
      from: startOfMonth.toISOString(),
      to: endOfMonth.toISOString()
    })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.bookings || []);
        setBookings(list);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Could not load sessions for this month.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [year, month]);

  // Group bookings by viewer's local date
  const bookingsByDate = useMemo(() => {
    const map = {};
    bookings.forEach((booking) => {
      // Show confirmed, completed, and pending
      if (!['confirmed', 'completed', 'pending'].includes(booking.status)) return;
      const key = toLocalDateKey(new Date(booking.startTime));
      if (!map[key]) map[key] = [];
      map[key].push(booking);
    });
    // Sort each day's sessions by start time
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    });
    return map;
  }, [bookings]);

  // Calendar days grid computation
  const { days, weekdayLabels } = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);

    const startDayIndex = firstOfMonth.getDay(); // 0 is Sun
    const totalDaysInMonth = lastOfMonth.getDate();

    // Offset based on firstDayOfWeek (0 for Sun, 1 for Mon)
    let leadPadding = (startDayIndex - firstDayOfWeek + 7) % 7;

    const daysList = [];

    // Prev month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = leadPadding - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      daysList.push({
        date: d,
        dateKey: toLocalDateKey(d),
        isCurrentMonth: false,
        dayNum: d.getDate()
      });
    }

    // Current month days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = new Date(year, month, day);
      daysList.push({
        date: d,
        dateKey: toLocalDateKey(d),
        isCurrentMonth: true,
        dayNum: day
      });
    }

    // Trailing padding to make complete weeks (multiple of 7)
    const trailingPadding = (7 - (daysList.length % 7)) % 7;
    for (let i = 1; i <= trailingPadding; i++) {
      const d = new Date(year, month + 1, i);
      daysList.push({
        date: d,
        dateKey: toLocalDateKey(d),
        isCurrentMonth: false,
        dayNum: d.getDate()
      });
    }

    // Weekday labels
    const labels = [];
    for (let i = 0; i < 7; i++) {
      const dayIdx = (firstDayOfWeek + i) % 7;
      const tempDate = new Date(2026, 9, 4 + dayIdx); // Oct 4, 2026 was a Sunday
      labels.push(
        new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(tempDate)
      );
    }

    return { days: daysList, weekdayLabels: labels };
  }, [year, month, firstDayOfWeek]);

  const selectedDateKey = toLocalDateKey(selectedDate);
  const selectedDaySessions = bookingsByDate[selectedDateKey] || [];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  };

  const handleDownloadIcs = async (bookingId) => {
    setDownloadingId(bookingId);
    try {
      await downloadBookingIcs(bookingId);
      setToast({
        variant: 'success',
        message: 'Calendar file downloaded successfully.'
      });
    } catch {
      setToast({
        variant: 'error',
        message: 'Could not download calendar file. Please try again.'
      });
    } finally {
      setDownloadingId('');
    }
  };

  // Keyboard navigation inside the calendar grid
  const handleKeyDown = (e, index) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight') nextIndex = index + 1;
    else if (e.key === 'ArrowLeft') nextIndex = index - 1;
    else if (e.key === 'ArrowDown') nextIndex = index + 7;
    else if (e.key === 'ArrowUp') nextIndex = index - 7;
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedDate(days[index].date);
      return;
    } else {
      return;
    }

    if (nextIndex >= 0 && nextIndex < days.length) {
      e.preventDefault();
      const nextDate = days[nextIndex].date;
      setSelectedDate(nextDate);
      if (!days[nextIndex].isCurrentMonth) {
        setCurrentDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
      }
      // Set focus to the new day button
      const buttons = gridRef.current?.querySelectorAll('[data-day-btn]');
      if (buttons && buttons[nextIndex]) {
        buttons[nextIndex].focus();
      }
    }
  };

  const renderJoinButton = (booking) => {
    if (!['confirmed', 'completed'].includes(booking.status)) return null;

    const nowTime = Date.now();
    const opensAt = new Date(booking.startTime).getTime() - 10 * 60 * 1000;
    const closesAt = new Date(booking.endTime).getTime() + 15 * 60 * 1000;

    if (nowTime > closesAt) return null;

    if (nowTime < opensAt) {
      const opensAtFormatted = new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit'
      }).format(new Date(opensAt));

      return (
        <div className="inline-flex items-center gap-1.5">
          <span className="text-[11px] text-ink-muted">Opens at {opensAtFormatted}</span>
          <button
            disabled
            className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted opacity-50 cursor-not-allowed"
            type="button"
          >
            <Video size={13} /> Join session
          </button>
        </div>
      );
    }

    return (
      <Link
        className="inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors shadow-sm"
        to={`/session/${booking._id}`}
      >
        <Video size={13} /> Join session
      </Link>
    );
  };

  const todayKey = toLocalDateKey(new Date());
  const monthTitle = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric'
  }).format(new Date(year, month, 1));

  const totalMonthSessions = bookings.filter((b) =>
    ['confirmed', 'completed', 'pending'].includes(b.status)
  ).length;

  return (
    <section className="page-wrap flex-1 py-8 sm:py-12 bg-bg text-ink transition-colors">
      {/* Top Header */}
      <header className="mb-6 border-b border-border pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-accent">Your calendar</p>
          <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-ink">Schedule</h1>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-ink-muted">
            View your upcoming and completed 1-to-1 mentoring sessions on a calendar.
          </p>
        </div>

        {/* List | Calendar switch */}
        <div className="self-start sm:self-auto">
          <Tabs
            tabs={[
              { id: 'list', label: 'List' },
              { id: 'calendar', label: 'Calendar' }
            ]}
            activeTab="calendar"
            onChange={(tabId) => {
              if (tabId === 'list') navigate('/sessions');
            }}
            aria-label="View mode"
          />
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded border border-danger/40 bg-danger/10 p-3.5 text-xs sm:text-sm text-danger" role="alert">
          {error}
        </div>
      )}

      {/* Month Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-lg sm:text-xl font-bold text-ink">{monthTitle}</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleToday}
            className="text-xs ml-2"
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="rounded border border-border bg-surface p-1.5 text-ink hover:bg-surface-raised transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="rounded border border-border bg-surface p-1.5 text-ink hover:bg-surface-raised transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 space-y-4 max-w-4xl" role="status">
          <Skeleton variant="card" height="360px" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
          {/* Main Month Grid */}
          <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-sm">
            {/* Weekday Header */}
            <div className="grid grid-cols-7 border-b border-border bg-surface-raised text-center text-xs font-semibold text-ink-muted">
              {weekdayLabels.map((label, idx) => (
                <div key={idx} className="py-2.5">
                  {label}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div
              ref={gridRef}
              role="grid"
              aria-label={`Calendar grid for ${monthTitle}`}
              className="grid grid-cols-7 divide-x divide-y divide-border"
            >
              {days.map((item, idx) => {
                const daySessions = bookingsByDate[item.dateKey] || [];
                const sessionCount = daySessions.length;
                const isSelected = item.dateKey === selectedDateKey;
                const isToday = item.dateKey === todayKey;

                const dayLabel = `${item.date.toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}${sessionCount > 0 ? `, ${sessionCount} session${sessionCount > 1 ? 's' : ''}` : ''}`;

                return (
                  <button
                    key={idx}
                    type="button"
                    data-day-btn
                    tabIndex={isSelected ? 0 : -1}
                    role="gridcell"
                    aria-selected={isSelected}
                    aria-label={dayLabel}
                    onClick={() => {
                      setSelectedDate(item.date);
                      if (!item.isCurrentMonth) {
                        setCurrentDate(new Date(item.date.getFullYear(), item.date.getMonth(), 1));
                      }
                    }}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    className={`min-h-[82px] sm:min-h-[105px] p-1.5 sm:p-2 text-left flex flex-col justify-between transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      !item.isCurrentMonth ? 'bg-surface-raised/40 text-ink-muted' : 'bg-surface text-ink'
                    } ${isSelected ? 'ring-2 ring-accent bg-accent/5' : 'hover:bg-surface-raised/60'}`}
                  >
                    {/* Day number & count indicator */}
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full ${
                          isToday
                            ? 'bg-accent text-accent-text font-bold'
                            : isSelected
                            ? 'font-bold text-accent'
                            : ''
                        }`}
                      >
                        {item.dayNum}
                      </span>

                      {sessionCount > 0 && (
                        <span
                          className="inline-flex items-center gap-1 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent"
                          title={`${sessionCount} session${sessionCount > 1 ? 's' : ''}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                          <span>{sessionCount}</span>
                        </span>
                      )}
                    </div>

                    {/* Session chips (up to 2 + more link) */}
                    <div className="mt-1 space-y-1 w-full overflow-hidden">
                      {daySessions.slice(0, 2).map((b) => {
                        const isPending = b.status === 'pending';
                        const otherPerson =
                          user?.role === 'learner'
                            ? b.mentorId?.name || 'Mentor'
                            : b.learnerId?.name || 'Learner';
                        const startFormatted = new Intl.DateTimeFormat(undefined, {
                          hour: 'numeric',
                          minute: '2-digit'
                        }).format(new Date(b.startTime));

                        return (
                          <div
                            key={b._id}
                            className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight font-medium ${
                              isPending
                                ? 'bg-warning/10 text-warning border border-warning/30'
                                : 'bg-accent/10 text-accent border border-accent/20'
                            }`}
                            title={`${startFormatted} - ${otherPerson} (${b.status})`}
                          >
                            <span className="font-semibold">{startFormatted}</span> {otherPerson}
                          </div>
                        );
                      })}
                      {sessionCount > 2 && (
                        <div className="text-[10px] font-semibold text-accent hover:underline">
                          +{sessionCount - 2} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Side / Bottom List for Selected Day */}
          <div className="space-y-4">
            <Card variant="default" padding="md" className="border border-border">
              <div className="border-b border-border pb-3 mb-3">
                <p className="text-xs font-semibold text-accent uppercase tracking-wider">
                  Selected day
                </p>
                <h3 className="font-serif text-base font-semibold text-ink mt-0.5">
                  {selectedDate.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </h3>
              </div>

              {selectedDaySessions.length === 0 ? (
                <div className="py-6 text-center text-xs text-ink-muted">
                  <CalendarIcon size={24} className="mx-auto text-ink-muted mb-2 opacity-50" />
                  <p>No sessions scheduled for this day.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {selectedDaySessions.map((b) => {
                    const otherPerson =
                      user?.role === 'learner'
                        ? b.mentorId?.name || 'Mentor'
                        : b.learnerId?.name || 'Learner';
                    const timeRange = formatSessionTimeRange(b.startTime, b.endTime);
                    const isPending = b.status === 'pending';

                    return (
                      <div
                        key={b._id}
                        className={`rounded-lg border p-3 text-xs space-y-2.5 transition-colors ${
                          isPending
                            ? 'border-warning/40 bg-warning/5'
                            : 'border-border bg-surface-raised/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-serif font-bold text-sm text-ink">{otherPerson}</p>
                            <p className="text-[11px] text-ink-muted flex items-center gap-1 mt-0.5">
                              <Clock size={11} className="shrink-0" />
                              <span>{timeRange}</span>
                            </p>
                          </div>
                          <div>
                            {isPending ? (
                              <Badge variant="warning" size="sm">
                                Payment pending
                              </Badge>
                            ) : b.status === 'completed' ? (
                              <Badge variant="neutral" size="sm">
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="success" size="sm">
                                Confirmed
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-1 flex flex-wrap items-center gap-2">
                          {renderJoinButton(b)}

                          {['confirmed', 'completed'].includes(b.status) && (
                            <button
                              type="button"
                              onClick={() => handleDownloadIcs(b._id)}
                              disabled={downloadingId === b._id}
                              className="inline-flex items-center gap-1 rounded border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface-raised transition-colors"
                            >
                              <Download size={12} />
                              <span>{downloadingId === b._id ? 'Downloading...' : 'Add to calendar'}</span>
                            </button>
                          )}

                          <Link
                            to={isPending ? `/checkout/${b._id}` : `/session/${b._id}`}
                            className="inline-flex items-center gap-1 text-xs text-accent font-semibold hover:underline px-1 py-1"
                          >
                            <span>Details</span>
                            <ExternalLink size={11} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Empty month message if month has 0 sessions */}
            {totalMonthSessions === 0 && (
              <div className="rounded border border-border bg-surface p-4 text-center text-xs text-ink-muted">
                <p className="font-medium text-ink mb-1">No sessions this month.</p>
                {user?.role === 'learner' ? (
                  <Link to="/mentors" className="text-accent font-semibold hover:underline">
                    Browse mentors to book a session →
                  </Link>
                ) : (
                  <Link to="/profile" className="text-accent font-semibold hover:underline">
                    Update your availability windows →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <Toast
          variant={toast.variant}
          message={toast.message}
          onClose={() => setToast(null)}
          duration={5000}
        />
      )}
    </section>
  );
}
