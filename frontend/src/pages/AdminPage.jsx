import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  DollarSign,
  HelpCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import {
  getAdminStats,
  getAdminUsers,
  updateUserStatus,
  getAdminBookings,
  getAdminPayments,
  markPaymentRefunded,
  getPayoutsSummary,
  recordPayout,
  getAdminPayouts,
  getAdminComplaints,
  resolveComplaint
} from '../services/admin';
import { approveMentor, listPendingMentors, rejectMentor } from '../services/mentors';
import Card from '../components/Card';
import Badge from '../components/Badge';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'mentors', label: 'Mentor Reviews', icon: ClipboardCheck },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'bookings', label: 'Bookings', icon: Calendar },
  { id: 'payments', label: 'Payments & Refunds', icon: CreditCard },
  { id: 'payouts', label: 'Payouts', icon: DollarSign },
  { id: 'complaints', label: 'Complaints', icon: HelpCircle }
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Tab: Overview
  const [stats, setStats] = useState(null);

  // Tab: Mentors
  const [pendingMentors, setPendingMentors] = useState([]);
  const [reasons, setReasons] = useState({});
  const [busyMentorId, setBusyMentorId] = useState('');

  // Tab: Users
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [busyUserId, setBusyUserId] = useState('');

  // Tab: Bookings
  const [bookings, setBookings] = useState([]);
  const [bookingStatusFilter, setBookingStatusFilter] = useState('');

  // Tab: Payments & Refunds
  const [payments, setPayments] = useState([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [selectedRefundPayment, setSelectedRefundPayment] = useState(null);
  const [refundReference, setRefundReference] = useState('');
  const [busyPaymentId, setBusyPaymentId] = useState('');

  // Tab: Payouts
  const [payoutsSummary, setPayoutsSummary] = useState([]);
  const [recentPayouts, setRecentPayouts] = useState([]);
  const [selectedMentorPayout, setSelectedMentorPayout] = useState(null);
  const [payoutAmountRupees, setPayoutAmountRupees] = useState('');
  const [payoutReference, setPayoutReference] = useState('');
  const [busyPayout, setBusyPayout] = useState(false);

  // Tab: Complaints
  const [complaints, setComplaints] = useState([]);
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('open');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [busyComplaintId, setBusyComplaintId] = useState('');

  // Data Loading per Tab
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const fetchData = async () => {
      try {
        if (activeTab === 'overview') {
          const data = await getAdminStats();
          if (active) setStats(data);
        } else if (activeTab === 'mentors') {
          const data = await listPendingMentors();
          if (active) setPendingMentors(data.items);
        } else if (activeTab === 'users') {
          const data = await getAdminUsers({
            q: userSearch || undefined,
            role: userRoleFilter || undefined,
            limit: 50
          });
          if (active) setUsers(data.items);
        } else if (activeTab === 'bookings') {
          const data = await getAdminBookings({
            status: bookingStatusFilter || undefined,
            limit: 50
          });
          if (active) setBookings(data.items);
        } else if (activeTab === 'payments') {
          const data = await getAdminPayments({
            status: paymentStatusFilter || undefined,
            limit: 50
          });
          if (active) setPayments(data.items);
        } else if (activeTab === 'payouts') {
          const [summaryData, recentData] = await Promise.all([
            getPayoutsSummary(),
            getAdminPayouts()
          ]);
          if (active) {
            setPayoutsSummary(summaryData.summary);
            setRecentPayouts(recentData.payouts);
          }
        } else if (activeTab === 'complaints') {
          const data = await getAdminComplaints({
            status: complaintStatusFilter || undefined,
            limit: 50
          });
          if (active) setComplaints(data.items);
        }
      } catch (err) {
        if (active) setError(err.message || 'Failed to load administration data.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => { active = false; };
  }, [activeTab, refreshKey, userRoleFilter, bookingStatusFilter, paymentStatusFilter, complaintStatusFilter]);

  // Actions
  const handleReviewMentor = async (mentor, action) => {
    if (action === 'reject' && !reasons[mentor.id]?.trim()) {
      setError('Please provide a reason before rejecting this profile.');
      return;
    }
    setBusyMentorId(mentor.id);
    setError('');
    try {
      if (action === 'approve') {
        await approveMentor(mentor.id);
        setSuccess(`Approved ${mentor.name}'s profile.`);
      } else {
        await rejectMentor(mentor.id, reasons[mentor.id].trim());
        setSuccess(`Rejected ${mentor.name}'s profile.`);
      }
      setPendingMentors((prev) => prev.filter((m) => m.id !== mentor.id));
    } catch (err) {
      setError(err.message || 'Failed to update mentor approval status.');
    } finally {
      setBusyMentorId('');
    }
  };

  const handleToggleUser = async (user) => {
    setBusyUserId(user._id);
    setError('');
    try {
      const nextStatus = !user.isActive;
      await updateUserStatus(user._id, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, isActive: nextStatus } : u))
      );
      setSuccess(`User ${user.name} is now ${nextStatus ? 'active' : 'deactivated'}.`);
    } catch (err) {
      setError(err.message || 'Failed to update user status.');
    } finally {
      setBusyUserId('');
    }
  };

  const handleMarkRefunded = async () => {
    if (!selectedRefundPayment || !refundReference.trim()) {
      setError('A refund reference identifier is required.');
      return;
    }
    setBusyPaymentId(selectedRefundPayment._id);
    setError('');
    try {
      await markPaymentRefunded(selectedRefundPayment._id, refundReference.trim());
      setSuccess('Payment marked as refunded.');
      setSelectedRefundPayment(null);
      setRefundReference('');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to mark payment as refunded.');
    } finally {
      setBusyPaymentId('');
    }
  };

  const handleRecordPayout = async () => {
    if (!selectedMentorPayout) return;
    const amountNum = parseFloat(payoutAmountRupees);
    if (!amountNum || amountNum <= 0) {
      setError('Please enter a valid payout amount in Rupees.');
      return;
    }
    if (!payoutReference.trim()) {
      setError('A payment transfer reference string is required.');
      return;
    }

    setBusyPayout(true);
    setError('');
    try {
      const amountPaise = Math.round(amountNum * 100);
      await recordPayout({
        mentorId: selectedMentorPayout.mentorId,
        amount: amountPaise,
        reference: payoutReference.trim()
      });
      setSuccess(`Payout of Rs. ${amountNum.toFixed(2)} recorded for ${selectedMentorPayout.mentorName}.`);
      setSelectedMentorPayout(null);
      setPayoutAmountRupees('');
      setPayoutReference('');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to record payout.');
    } finally {
      setBusyPayout(false);
    }
  };

  const handleResolveComplaint = async () => {
    if (!selectedComplaint || !resolutionNote.trim()) {
      setError('A resolution note is required.');
      return;
    }
    setBusyComplaintId(selectedComplaint._id);
    setError('');
    try {
      await resolveComplaint(selectedComplaint._id, resolutionNote.trim());
      setSuccess('Complaint resolved successfully.');
      setSelectedComplaint(null);
      setResolutionNote('');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to resolve complaint.');
    } finally {
      setBusyComplaintId('');
    }
  };

  const formatRupees = (paise) => `Rs. ${(Number(paise || 0) / 100).toLocaleString('en-IN')}`;

  return (
    <div className="page-wrap flex-1 py-8 sm:py-12 bg-bg text-ink transition-colors">
      {/* Page Header */}
      <div className="mb-8 border-b border-border pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-accent">Admin Control Center</p>
          <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-ink">Platform Operations</h1>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-ink-muted">
            Monitor transactions, verify mentors, manage user access, issue refunds, and process payouts.
          </p>
        </div>

        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex items-center gap-2 rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-raised transition-colors self-start md:self-auto"
          type="button"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Feedback Alerts */}
      {error && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded border border-danger/40 bg-danger/10 p-3.5 text-xs sm:text-sm text-danger font-medium" role="alert">
          <span>{error}</span>
          <button className="text-danger hover:opacity-80" onClick={() => setError('')} type="button">
            <X size={15} />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded border border-success/40 bg-success/10 p-3.5 text-xs sm:text-sm font-semibold text-ink flex items-center justify-between">
          <span>{success}</span>
          <button className="text-ink-muted hover:text-ink" onClick={() => setSuccess('')} type="button">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto gap-2 border-b border-border mb-8 pb-px">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setError('');
                setSuccess('');
              }}
              className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-all outline-none ${
                isSelected
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:text-ink hover:border-border'
              }`}
              type="button"
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Spinner */}
      {loading && (
        <div className="py-20 text-center text-xs text-ink-muted" role="status">
          <p className="mt-3 font-medium">Loading details...</p>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {!loading && activeTab === 'overview' && stats && (
        <div className="space-y-8">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card variant="default" padding="md">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Gross Merchandise Value</span>
              <p className="mt-2 font-serif text-2xl font-bold text-ink">{formatRupees(stats.financials.gmv)}</p>
              <span className="mt-1 block text-xs text-success font-medium">Total Paid Consultation Volume</span>
            </Card>

            <Card variant="default" padding="md">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Platform Revenue</span>
              <p className="mt-2 font-serif text-2xl font-bold text-accent">{formatRupees(stats.financials.platformFees)}</p>
              <span className="mt-1 block text-xs text-ink-muted">Platform Commission (15%)</span>
            </Card>

            <Card variant="default" padding="md">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Owed to Mentors</span>
              <p className="mt-2 font-serif text-2xl font-bold text-ink">{formatRupees(stats.financials.owedToMentors)}</p>
              <span className="mt-1 block text-xs text-ink-muted">Net Balance Awaiting Payout</span>
            </Card>

            <Card variant="raised" padding="md" className="border-warning/40 bg-warning/5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-warning">Refunds Due</span>
              <p className="mt-2 font-serif text-2xl font-bold text-warning">
                {stats.refundsDue.count} ({formatRupees(stats.refundsDue.amount)})
              </p>
              <span className="mt-1 block text-xs text-warning/90 font-medium">Cancelled / Expired Actions</span>
            </Card>
          </div>

          {/* Breakdown Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Users Breakdown */}
            <Card variant="default" padding="md">
              <h2 className="font-serif text-base font-semibold text-ink mb-3.5 flex items-center gap-2">
                <Users size={16} className="text-accent" />
                <span>Users ({stats.users.total})</span>
              </h2>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-ink-muted">Learners</span>
                  <span className="font-semibold text-ink">{stats.users.learners}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-ink-muted">Mentors</span>
                  <span className="font-semibold text-ink">{stats.users.mentors}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-ink-muted">Administrators</span>
                  <span className="font-semibold text-ink">{stats.users.admins}</span>
                </div>
              </div>
            </Card>

            {/* Mentors Approval Breakdown */}
            <Card variant="default" padding="md">
              <h2 className="font-serif text-base font-semibold text-ink mb-3.5 flex items-center gap-2">
                <ClipboardCheck size={16} className="text-accent" />
                <span>Mentor Status ({stats.mentors.total})</span>
              </h2>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-ink-muted">Approved (Active)</span>
                  <span className="font-semibold text-success">{stats.mentors.approved}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-ink-muted">Pending Review</span>
                  <span className="font-semibold text-warning">{stats.mentors.pending}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-ink-muted">Rejected</span>
                  <span className="font-semibold text-danger">{stats.mentors.rejected}</span>
                </div>
              </div>
            </Card>

            {/* Bookings Breakdown */}
            <Card variant="default" padding="md">
              <h2 className="font-serif text-base font-semibold text-ink mb-3.5 flex items-center gap-2">
                <Calendar size={16} className="text-accent" />
                <span>Bookings ({stats.bookings.total})</span>
              </h2>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between py-1 border-b border-border/60">
                  <span className="text-ink-muted">Completed</span>
                  <span className="font-semibold text-ink">{stats.bookings.completed}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/60">
                  <span className="text-ink-muted">Confirmed (Upcoming)</span>
                  <span className="font-semibold text-success">{stats.bookings.confirmed}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/60">
                  <span className="text-ink-muted">Pending Hold</span>
                  <span className="font-semibold text-warning">{stats.bookings.pending}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/60">
                  <span className="text-ink-muted">Cancelled</span>
                  <span className="font-semibold text-danger">{stats.bookings.cancelled}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">Hold Expired</span>
                  <span className="font-semibold text-ink-muted">{stats.bookings.expired}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: MENTOR REVIEWS */}
      {!loading && activeTab === 'mentors' && (
        <div className="space-y-6">
          {pendingMentors.length === 0 ? (
            <Card variant="flat" padding="lg" className="text-center">
              <UserCheck className="mx-auto text-accent mb-2" size={32} />
              <h2 className="font-serif text-xl font-semibold text-ink">No mentor applications pending</h2>
              <p className="mt-1 text-xs sm:text-sm text-ink-muted">
                All submitted mentor profiles have been reviewed and processed.
              </p>
            </Card>
          ) : (
            pendingMentors.map((mentor) => (
              <Card key={mentor.id} variant="default" padding="md">
                <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
                  <div>
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-surface-raised border border-border font-serif font-bold text-sm text-ink">
                        {mentor.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="font-serif text-lg font-semibold text-ink">{mentor.name}</h2>
                        <p className="text-xs text-ink-muted">{mentor.email}</p>
                        <p className="text-xs font-medium text-ink mt-0.5">{mentor.headline || 'No headline'}</p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-ink-muted">{mentor.bio || 'No biography submitted.'}</p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(mentor.skills || []).map((skill) => (
                        <span key={skill} className="rounded border border-border bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-ink">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-6 text-xs text-ink-muted">
                      <span>Experience: <strong className="text-ink">{mentor.experienceYears} years</strong></span>
                      <span>Rate: <strong className="text-ink">₹{mentor.pricePerHour}/hr</strong></span>
                    </div>
                  </div>

                  {/* Review Actions */}
                  <div className="rounded border border-border bg-surface-raised/40 p-4 flex flex-col justify-between">
                    <div>
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-2">Review Action</h3>
                      <label htmlFor={`reject-reason-${mentor.id}`} className="sr-only">Rejection reason</label>
                      <input
                        id={`reject-reason-${mentor.id}`}
                        aria-label={`Rejection reason for ${mentor.name}`}
                        className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent mb-3"
                        placeholder="Rejection reason (required if rejecting)"
                        value={reasons[mentor.id] || ''}
                        onChange={(e) => setReasons({ ...reasons, [mentor.id]: e.target.value })}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        className="flex-1 rounded bg-accent py-1.5 px-3 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors flex items-center justify-center gap-1"
                        disabled={busyMentorId === mentor.id}
                        onClick={() => handleReviewMentor(mentor, 'approve')}
                        type="button"
                      >
                        <Check size={13} /> Approve
                      </button>
                      <button
                        className="flex-1 rounded border border-border bg-surface py-1.5 px-3 text-xs font-medium text-ink hover:text-danger hover:border-danger/30 transition-colors flex items-center justify-center gap-1"
                        disabled={busyMentorId === mentor.id}
                        onClick={() => handleReviewMentor(mentor, 'reject')}
                        type="button"
                      >
                        <X size={13} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* TAB 3: USERS */}
      {!loading && activeTab === 'users' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <Card variant="default" padding="sm" className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-2.5 text-ink-muted" />
              <input
                className="w-full rounded border border-border bg-surface pl-9 pr-3 py-1.5 text-xs sm:text-sm text-ink outline-none focus:border-accent"
                placeholder="Search user by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setRefreshKey((k) => k + 1)}
              />
            </div>
            <select
              className="rounded border border-border bg-surface px-3 py-1.5 sm:w-44 text-xs text-ink outline-none focus:border-accent"
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="learner">Learners</option>
              <option value="mentor">Mentors</option>
              <option value="admin">Admins</option>
            </select>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-raised"
              type="button"
            >
              Search
            </button>
          </Card>

          {/* Users Table */}
          <Card variant="default" padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-surface-raised border-b border-border text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-surface-raised/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink">{u.name}</div>
                        <div className="text-[11px] text-ink-muted">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="neutral" size="sm" className="capitalize">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-ink-muted">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          u.isActive ? 'text-success' : 'text-danger'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? 'bg-success' : 'bg-danger'}`} />
                          {u.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          className={`rounded border border-border bg-surface px-2.5 py-1 text-xs font-medium transition-colors ${
                            u.isActive ? 'text-ink-muted hover:text-danger hover:border-danger/30' : 'text-ink-muted hover:text-success hover:border-success/30'
                          }`}
                          disabled={busyUserId === u._id}
                          onClick={() => handleToggleUser(u)}
                          type="button"
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-xs text-ink-muted">
                        No users found matching query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: BOOKINGS */}
      {!loading && activeTab === 'bookings' && (
        <div className="space-y-6">
          {/* Status Filter */}
          <Card variant="default" padding="sm" className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Filter By Status:</span>
            <div className="flex flex-wrap gap-1.5">
              {['', 'confirmed', 'completed', 'pending', 'cancelled', 'expired'].map((status) => (
                <button
                  key={status}
                  onClick={() => setBookingStatusFilter(status)}
                  className={`rounded px-2.5 py-1 text-xs font-semibold capitalize transition-all ${
                    bookingStatusFilter === status
                      ? 'bg-accent text-accent-text'
                      : 'border border-border bg-surface text-ink-muted hover:text-ink hover:bg-surface-raised'
                  }`}
                  type="button"
                >
                  {status || 'All'}
                </button>
              ))}
            </div>
          </Card>

          {/* Bookings Table */}
          <Card variant="default" padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-surface-raised border-b border-border text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th className="py-3 px-4">Booking ID</th>
                    <th className="py-3 px-4">Learner</th>
                    <th className="py-3 px-4">Mentor</th>
                    <th className="py-3 px-4">Scheduled Time</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bookings.map((b) => (
                    <tr key={b._id} className="hover:bg-surface-raised/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-ink-muted">
                        {String(b._id).slice(-8)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink">{b.learnerId?.name || 'Learner'}</div>
                        <div className="text-[11px] text-ink-muted">{b.learnerId?.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink">{b.mentorId?.name || 'Mentor'}</div>
                        <div className="text-[11px] text-ink-muted">{b.mentorId?.email}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-ink-muted">
                        {new Date(b.startTime).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-ink">
                        ₹{b.priceAtBooking}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            b.status === 'confirmed'
                              ? 'success'
                              : b.status === 'completed'
                              ? 'neutral'
                              : b.status === 'pending'
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                          className="capitalize"
                        >
                          {b.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-xs text-ink-muted">
                        No bookings found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: PAYMENTS & REFUNDS */}
      {!loading && activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Status Filter */}
          <Card variant="default" padding="sm" className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Filter By Status:</span>
            <div className="flex flex-wrap gap-1.5">
              {['', 'refund_due', 'paid', 'refunded', 'created', 'failed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setPaymentStatusFilter(status)}
                  className={`rounded px-2.5 py-1 text-xs font-semibold capitalize transition-all ${
                    paymentStatusFilter === status
                      ? 'bg-accent text-accent-text'
                      : status === 'refund_due'
                      ? 'border border-warning/50 bg-warning/15 text-warning font-bold'
                      : 'border border-border bg-surface text-ink-muted hover:text-ink hover:bg-surface-raised'
                  }`}
                  type="button"
                >
                  {status === 'refund_due' ? 'Refund Due (!)' : status || 'All'}
                </button>
              ))}
            </div>
          </Card>

          {/* Payments Table */}
          <Card variant="default" padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-surface-raised border-b border-border text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th className="py-3 px-4">Order / Reference</th>
                    <th className="py-3 px-4">Learner</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Fee Split</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p) => (
                    <tr key={p._id} className={p.status === 'refund_due' ? 'bg-warning/5' : 'hover:bg-surface-raised/40 transition-colors'}>
                      <td className="py-3 px-4">
                        <div className="font-mono text-xs text-ink font-semibold">{p.gatewayOrderId}</div>
                        <div className="text-[11px] text-ink-muted capitalize">{p.gateway} gateway</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink">{p.learnerId?.name}</div>
                        <div className="text-[11px] text-ink-muted">{p.learnerId?.email}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-ink">
                        {formatRupees(p.amount)}
                      </td>
                      <td className="py-3 px-4 text-xs text-ink-muted">
                        <div>Mentor: <strong className="text-ink">{formatRupees(p.mentorEarning)}</strong></div>
                        <div>Fee: <strong className="text-accent">{formatRupees(p.platformFee)}</strong></div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            p.status === 'refund_due'
                              ? 'warning'
                              : p.status === 'paid'
                              ? 'success'
                              : p.status === 'refunded'
                              ? 'neutral'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {p.status}
                        </Badge>
                        {p.refundReference && (
                          <div className="mt-1 font-mono text-[10px] text-ink-muted">
                            Ref: {p.refundReference}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {p.status === 'refund_due' && (
                          <button
                            className="rounded bg-warning px-2.5 py-1 text-xs font-semibold text-ink hover:opacity-90"
                            onClick={() => setSelectedRefundPayment(p)}
                            type="button"
                          >
                            Mark Refunded
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-xs text-ink-muted">
                        No payments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Refund Confirmation Modal */}
          {selectedRefundPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-[2px] p-4">
              <Card variant="raised" padding="lg" className="w-full max-w-md">
                <h3 className="font-serif text-lg font-semibold text-ink">Mark Refund Completed</h3>
                <p className="mt-1.5 text-xs text-ink-muted leading-relaxed">
                  Record the bank or gateway refund transaction reference for order{' '}
                  <code className="font-mono font-bold text-ink">{selectedRefundPayment.gatewayOrderId}</code>{' '}
                  ({formatRupees(selectedRefundPayment.amount)}).
                </p>

                <div className="mt-4">
                  <label htmlFor="refund-ref-input" className="block text-xs font-semibold text-ink mb-1">
                    Gateway Refund Reference:
                  </label>
                  <input
                    id="refund-ref-input"
                    className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                    placeholder="e.g., RFND_RZP_12345678"
                    value={refundReference}
                    onChange={(e) => setRefundReference(e.target.value)}
                  />
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    className="rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-raised"
                    onClick={() => {
                      setSelectedRefundPayment(null);
                      setRefundReference('');
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-text hover:bg-accent-hover"
                    disabled={busyPaymentId === selectedRefundPayment._id || !refundReference.trim()}
                    onClick={handleMarkRefunded}
                    type="button"
                  >
                    Confirm Refund
                  </button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: PAYOUTS */}
      {!loading && activeTab === 'payouts' && (
        <div className="space-y-8">
          {/* Mentor Payout Summary */}
          <Card variant="default" padding="none" className="overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-serif text-base font-semibold text-ink">Mentor Balances Awaiting Payout</h2>
              <p className="text-xs text-ink-muted mt-0.5">Only completed sessions with cleared payments count towards earned balances.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-surface-raised border-b border-border text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th className="py-3 px-4">Mentor</th>
                    <th className="py-3 px-4">Total Earned</th>
                    <th className="py-3 px-4">Paid Out</th>
                    <th className="py-3 px-4">Current Balance</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payoutsSummary.map((m) => (
                    <tr key={m.mentorId} className="hover:bg-surface-raised/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink">{m.mentorName}</div>
                        <div className="text-[11px] text-ink-muted">{m.mentorEmail}</div>
                      </td>
                      <td className="py-3 px-4 text-ink-muted font-medium">{formatRupees(m.earned)}</td>
                      <td className="py-3 px-4 text-ink-muted">{formatRupees(m.paidOut)}</td>
                      <td className="py-3 px-4 font-bold text-success">{formatRupees(m.balance)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          className="rounded bg-accent px-2.5 py-1 text-xs font-semibold text-accent-text hover:bg-accent-hover disabled:opacity-40"
                          disabled={m.balance <= 0}
                          onClick={() => {
                            setSelectedMentorPayout(m);
                            setPayoutAmountRupees((m.balance / 100).toFixed(2));
                          }}
                          type="button"
                        >
                          Record Payout
                        </button>
                      </td>
                    </tr>
                  ))}
                  {payoutsSummary.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-xs text-ink-muted">
                        No mentor records available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Recent Payouts History */}
          <Card variant="default" padding="none" className="overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-serif text-base font-semibold text-ink">Recorded Payouts Ledger</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-surface-raised border-b border-border text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Mentor</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentPayouts.map((p) => (
                    <tr key={p._id} className="hover:bg-surface-raised/40 transition-colors">
                      <td className="py-3 px-4 text-xs text-ink-muted">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-ink">
                        {p.mentorId?.name || 'Mentor'}
                      </td>
                      <td className="py-3 px-4 font-bold text-success">
                        {formatRupees(p.amount)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-ink-muted">
                        {p.reference}
                      </td>
                      <td className="py-3 px-4 text-xs text-ink-muted">
                        {p.recordedBy?.name || 'Admin'}
                      </td>
                    </tr>
                  ))}
                  {recentPayouts.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-xs text-ink-muted">
                        No payouts recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Record Payout Modal */}
          {selectedMentorPayout && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-[2px] p-4">
              <Card variant="raised" padding="lg" className="w-full max-w-md">
                <h3 className="font-serif text-lg font-semibold text-ink">Record Mentor Payout</h3>
                <p className="mt-1 text-xs text-ink-muted">
                  Transfer to <strong className="text-ink">{selectedMentorPayout.mentorName}</strong>. Available balance:{' '}
                  <strong className="text-success">{formatRupees(selectedMentorPayout.balance)}</strong>.
                </p>

                <div className="mt-4 space-y-3">
                  <div>
                    <label htmlFor="payout-amount-input" className="block text-xs font-semibold text-ink mb-1">
                      Amount (in Rupees):
                    </label>
                    <input
                      id="payout-amount-input"
                      type="number"
                      step="0.01"
                      className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                      value={payoutAmountRupees}
                      onChange={(e) => setPayoutAmountRupees(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="payout-reference-input" className="block text-xs font-semibold text-ink mb-1">
                      Transfer Reference (UPI / NEFT / IMPS ID):
                    </label>
                    <input
                      id="payout-reference-input"
                      className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                      placeholder="e.g., UPI/2026/0987654321"
                      value={payoutReference}
                      onChange={(e) => setPayoutReference(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    className="rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-raised"
                    onClick={() => {
                      setSelectedMentorPayout(null);
                      setPayoutAmountRupees('');
                      setPayoutReference('');
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-text hover:bg-accent-hover disabled:opacity-40"
                    disabled={busyPayout || !payoutAmountRupees || !payoutReference.trim()}
                    onClick={handleRecordPayout}
                    type="button"
                  >
                    Record Payout
                  </button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: COMPLAINTS */}
      {!loading && activeTab === 'complaints' && (
        <div className="space-y-6">
          {/* Status Filter */}
          <Card variant="default" padding="sm" className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Filter By Status:</span>
            <div className="flex gap-1.5">
              {['open', 'resolved', ''].map((status) => (
                <button
                  key={status}
                  onClick={() => setComplaintStatusFilter(status)}
                  className={`rounded px-2.5 py-1 text-xs font-semibold capitalize transition-all ${
                    complaintStatusFilter === status
                      ? 'bg-accent text-accent-text'
                      : 'border border-border bg-surface text-ink-muted hover:text-ink hover:bg-surface-raised'
                  }`}
                  type="button"
                >
                  {status || 'All'}
                </button>
              ))}
            </div>
          </Card>

          {/* Complaints List */}
          <div className="space-y-4">
            {complaints.map((c) => (
              <Card key={c._id} variant="default" padding="md">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={c.status === 'open' ? 'warning' : 'success'} size="sm">
                        {c.status}
                      </Badge>
                      <span className="text-[11px] text-ink-muted">
                        Submitted {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <h3 className="font-serif text-base font-semibold text-ink mt-2">{c.subject}</h3>
                    <p className="mt-1 text-xs text-ink-muted">
                      Filed by: <strong className="text-ink">{c.userId?.name}</strong> ({c.userId?.email}, {c.userId?.role})
                    </p>
                    <p className="mt-2.5 text-xs sm:text-sm text-ink-muted leading-relaxed bg-surface-raised/40 p-3 rounded border border-border">
                      {c.description}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {c.status === 'open' ? (
                      <button
                        className="rounded bg-accent py-1.5 px-3 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors"
                        onClick={() => setSelectedComplaint(c)}
                        type="button"
                      >
                        Resolve Issue
                      </button>
                    ) : (
                      <div className="text-xs text-success font-semibold flex items-center gap-1">
                        <CheckCircle2 size={13} /> Resolved
                      </div>
                    )}
                  </div>
                </div>

                {c.resolutionNote && (
                  <div className="mt-3.5 pt-3 border-t border-border text-xs text-ink-muted">
                    <strong>Resolution note:</strong> {c.resolutionNote}
                    {c.resolvedAt && (
                      <span className="text-ink-muted/70 block mt-0.5">
                        Resolved on {new Date(c.resolvedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
              </Card>
            ))}

            {complaints.length === 0 && (
              <Card variant="flat" padding="lg" className="text-center text-xs text-ink-muted">
                No complaints recorded in this queue.
              </Card>
            )}
          </div>

          {/* Resolve Complaint Modal */}
          {selectedComplaint && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-[2px] p-4">
              <Card variant="raised" padding="lg" className="w-full max-w-md">
                <h3 className="font-serif text-lg font-semibold text-ink">Resolve Complaint</h3>
                <p className="mt-1 text-xs text-ink-muted">
                  Topic: <strong className="text-ink">{selectedComplaint.subject}</strong>
                </p>

                <div className="mt-4">
                  <label htmlFor="complaint-note-input" className="block text-xs font-semibold text-ink mb-1">
                    Resolution Action / Notes:
                  </label>
                  <textarea
                    id="complaint-note-input"
                    className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                    rows="3"
                    placeholder="Describe how the complaint was addressed (e.g. issued credit, contacted mentor)..."
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                  />
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    className="rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-raised"
                    onClick={() => {
                      setSelectedComplaint(null);
                      setResolutionNote('');
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-text hover:bg-accent-hover disabled:opacity-40"
                    disabled={busyComplaintId === selectedComplaint._id || !resolutionNote.trim()}
                    onClick={handleResolveComplaint}
                    type="button"
                  >
                    Mark Resolved
                  </button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
