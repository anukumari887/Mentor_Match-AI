import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  DollarSign,
  HelpCircle,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
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
    <div className="page-wrap flex-1 py-8 sm:py-12">
      {/* Page Header */}
      <div className="mb-8 border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-700">
            <ShieldCheck size={14} />
            <span>Admin Control Center</span>
          </div>
          <h1 className="mt-1.5 text-3xl font-extrabold text-slate-900 sm:text-4xl">Platform Operations</h1>
          <p className="mt-2 text-sm text-slate-600">
            Monitor transactions, verify mentors, manage user access, issue refunds, and process payouts.
          </p>
        </div>

        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="btn-secondary self-start md:self-auto inline-flex items-center gap-2 text-xs"
          type="button"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Feedback Alerts */}
      {error && (
        <div className="notice-error mb-6 flex items-center justify-between gap-3 rounded-lg p-4 text-sm font-medium" role="alert">
          <span>{error}</span>
          <button className="text-slate-400 hover:text-slate-600" onClick={() => setError('')} type="button">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 p-4 mb-6 flex items-center justify-between text-sm font-medium">
          <span>{success}</span>
          <button className="text-emerald-600 hover:text-emerald-800" onClick={() => setSuccess('')} type="button">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 mb-8 pb-px">
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
              className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-bold transition-all ${
                isSelected
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
              type="button"
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Spinner */}
      {loading && (
        <div className="py-20 text-center text-sm text-slate-600" role="status">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-3 font-medium">Loading details...</p>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {!loading && activeTab === 'overview' && stats && (
        <div className="space-y-8">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="card p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Gross Merchandise Value</span>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{formatRupees(stats.financials.gmv)}</p>
              <span className="mt-1 block text-xs text-emerald-600 font-semibold">Total Paid Consultation Volume</span>
            </div>

            <div className="card p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Platform Revenue</span>
              <p className="mt-2 text-2xl font-extrabold text-brand-700">{formatRupees(stats.financials.platformFees)}</p>
              <span className="mt-1 block text-xs text-slate-500">Platform Commission (15%)</span>
            </div>

            <div className="card p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Owed to Mentors</span>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{formatRupees(stats.financials.owedToMentors)}</p>
              <span className="mt-1 block text-xs text-slate-500">Net Balance Awaiting Payout</span>
            </div>

            <div className="card p-5 border-amber-300 bg-amber-50/20 dark:border-amber-800 dark:bg-amber-950/20">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Refunds Due</span>
              <p className="mt-2 text-2xl font-extrabold text-amber-700 dark:text-amber-400">
                {stats.refundsDue.count} ({formatRupees(stats.refundsDue.amount)})
              </p>
              <span className="mt-1 block text-xs text-amber-600 font-semibold">Cancelled / Expired Actions</span>
            </div>
          </div>

          {/* Breakdown Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Users Breakdown */}
            <div className="card p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Users size={18} className="text-brand-600" />
                <span>Users ({stats.users.total})</span>
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Learners</span>
                  <span className="font-bold text-slate-900">{stats.users.learners}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Mentors</span>
                  <span className="font-bold text-slate-900">{stats.users.mentors}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-600">Administrators</span>
                  <span className="font-bold text-slate-900">{stats.users.admins}</span>
                </div>
              </div>
            </div>

            {/* Mentors Approval Breakdown */}
            <div className="card p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ClipboardCheck size={18} className="text-brand-600" />
                <span>Mentor Status ({stats.mentors.total})</span>
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Approved (Active)</span>
                  <span className="font-bold text-emerald-600">{stats.mentors.approved}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Pending Review</span>
                  <span className="font-bold text-amber-600">{stats.mentors.pending}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-600">Rejected</span>
                  <span className="font-bold text-rose-600">{stats.mentors.rejected}</span>
                </div>
              </div>
            </div>

            {/* Bookings Breakdown */}
            <div className="card p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-brand-600" />
                <span>Bookings ({stats.bookings.total})</span>
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Completed</span>
                  <span className="font-bold text-slate-900">{stats.bookings.completed}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Confirmed (Upcoming)</span>
                  <span className="font-bold text-emerald-600">{stats.bookings.confirmed}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Pending Hold</span>
                  <span className="font-bold text-amber-600">{stats.bookings.pending}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Cancelled</span>
                  <span className="font-bold text-rose-600">{stats.bookings.cancelled}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Hold Expired</span>
                  <span className="font-bold text-slate-500">{stats.bookings.expired}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MENTOR REVIEWS */}
      {!loading && activeTab === 'mentors' && (
        <div className="space-y-6">
          {pendingMentors.length === 0 ? (
            <div className="card p-12 text-center">
              <UserCheck className="mx-auto text-brand-600" size={32} />
              <h2 className="mt-4 text-2xl font-bold text-slate-900">No mentor applications pending</h2>
              <p className="mt-2 text-sm text-slate-600">
                All submitted mentor profiles have been reviewed and processed.
              </p>
            </div>
          ) : (
            pendingMentors.map((mentor) => (
              <article key={mentor.id} className="card p-6">
                <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
                  <div>
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-800 font-extrabold text-base">
                        {mentor.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">{mentor.name}</h2>
                        <p className="text-xs text-slate-500">{mentor.email}</p>
                        <p className="text-sm font-medium text-slate-700 mt-1">{mentor.headline || 'No headline'}</p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-600">{mentor.bio || 'No biography submitted.'}</p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {(mentor.skills || []).map((skill) => (
                        <span key={skill} className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-6 text-xs text-slate-500">
                      <span>Experience: <strong className="text-slate-900">{mentor.experienceYears} years</strong></span>
                      <span>Rate: <strong className="text-slate-900">Rs. {mentor.pricePerHour}/hr</strong></span>
                    </div>
                  </div>

                  {/* Review Actions */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 dark:bg-slate-900/50 p-4 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Review Action</h3>
                      <label htmlFor={`reject-reason-${mentor.id}`} className="sr-only">Rejection reason</label>
                      <input
                        id={`reject-reason-${mentor.id}`}
                        aria-label={`Rejection reason for ${mentor.name}`}
                        className="input-field text-xs mb-3"
                        placeholder="Rejection reason (required if rejecting)"
                        value={reasons[mentor.id] || ''}
                        onChange={(e) => setReasons({ ...reasons, [mentor.id]: e.target.value })}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        className="btn-primary flex-1 py-2 text-xs"
                        disabled={busyMentorId === mentor.id}
                        onClick={() => handleReviewMentor(mentor, 'approve')}
                        type="button"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        className="btn-danger flex-1 py-2 text-xs"
                        disabled={busyMentorId === mentor.id}
                        onClick={() => handleReviewMentor(mentor, 'reject')}
                        type="button"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {/* TAB 3: USERS */}
      {!loading && activeTab === 'users' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="card p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                className="input-field pl-9 text-sm"
                placeholder="Search user by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setRefreshKey((k) => k + 1)}
              />
            </div>
            <select
              className="input-field sm:w-44 text-sm"
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
              className="btn-secondary text-xs"
              type="button"
            >
              Search
            </button>
          </div>

          {/* Users Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Joined</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'mentor'
                            ? 'bg-brand-100 text-brand-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                          u.isActive ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          <span className={`h-2 w-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {u.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          className={`btn-secondary py-1 px-3 text-xs ${
                            u.isActive ? 'hover:text-rose-600' : 'hover:text-emerald-600'
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
                      <td colSpan="5" className="py-12 text-center text-slate-500">
                        No users found matching query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BOOKINGS */}
      {!loading && activeTab === 'bookings' && (
        <div className="space-y-6">
          {/* Status Filter */}
          <div className="card p-4 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filter By Status:</span>
            <div className="flex flex-wrap gap-2">
              {['', 'confirmed', 'completed', 'pending', 'cancelled', 'expired'].map((status) => (
                <button
                  key={status}
                  onClick={() => setBookingStatusFilter(status)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-all ${
                    bookingStatusFilter === status
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-slate-900'
                  }`}
                  type="button"
                >
                  {status || 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Bookings Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 px-4">Booking ID</th>
                    <th className="py-3.5 px-4">Learner</th>
                    <th className="py-3.5 px-4">Mentor</th>
                    <th className="py-3.5 px-4">Scheduled Time</th>
                    <th className="py-3.5 px-4">Price</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {String(b._id).slice(-8)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{b.learnerId?.name || 'Learner'}</div>
                        <div className="text-xs text-slate-500">{b.learnerId?.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{b.mentorId?.name || 'Mentor'}</div>
                        <div className="text-xs text-slate-500">{b.mentorId?.email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {new Date(b.startTime).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        Rs. {b.priceAtBooking}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                          b.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'completed'
                            ? 'bg-slate-100 text-slate-700'
                            : b.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-500">
                        No bookings found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PAYMENTS & REFUNDS */}
      {!loading && activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Status Filter */}
          <div className="card p-4 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filter By Status:</span>
            <div className="flex flex-wrap gap-2">
              {['', 'refund_due', 'paid', 'refunded', 'created', 'failed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setPaymentStatusFilter(status)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-all ${
                    paymentStatusFilter === status
                      ? 'bg-brand-600 text-white'
                      : status === 'refund_due'
                      ? 'bg-amber-100 text-amber-800 font-extrabold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-slate-900'
                  }`}
                  type="button"
                >
                  {status === 'refund_due' ? 'Refund Due (!)' : status || 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Payments Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 px-4">Order / Reference</th>
                    <th className="py-3.5 px-4">Learner</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Fee Split</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p._id} className={p.status === 'refund_due' ? 'bg-amber-50/50 dark:bg-amber-950/20' : 'hover:bg-slate-50/50'}>
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-xs text-slate-900 font-bold">{p.gatewayOrderId}</div>
                        <div className="text-xs text-slate-500 capitalize">{p.gateway} gateway</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{p.learnerId?.name}</div>
                        <div className="text-xs text-slate-500">{p.learnerId?.email}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatRupees(p.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        <div>Mentor: <strong className="text-slate-900">{formatRupees(p.mentorEarning)}</strong></div>
                        <div>Fee: <strong className="text-brand-700">{formatRupees(p.platformFee)}</strong></div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                          p.status === 'refund_due'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : p.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'refunded'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {p.status}
                        </span>
                        {p.refundReference && (
                          <div className="mt-1 font-mono text-[10px] text-slate-500">
                            Ref: {p.refundReference}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {p.status === 'refund_due' && (
                          <button
                            className="btn-primary py-1 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white"
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
                      <td colSpan="6" className="py-12 text-center text-slate-500">
                        No payments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Refund Confirmation Modal */}
          {selectedRefundPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="card w-full max-w-md p-6">
                <h3 className="text-lg font-bold text-slate-900">Mark Refund Completed</h3>
                <p className="mt-2 text-xs text-slate-600">
                  Record the bank or gateway refund transaction reference for order{' '}
                  <code className="font-mono font-bold text-slate-800">{selectedRefundPayment.gatewayOrderId}</code>{' '}
                  ({formatRupees(selectedRefundPayment.amount)}).
                </p>

                <div className="mt-4">
                  <label htmlFor="refund-ref-input" className="block text-xs font-bold text-slate-700 mb-1">
                    Gateway Refund Reference:
                  </label>
                  <input
                    id="refund-ref-input"
                    className="input-field text-sm"
                    placeholder="e.g., RFND_RZP_12345678"
                    value={refundReference}
                    onChange={(e) => setRefundReference(e.target.value)}
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => {
                      setSelectedRefundPayment(null);
                      setRefundReference('');
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary text-xs"
                    disabled={busyPaymentId === selectedRefundPayment._id || !refundReference.trim()}
                    onClick={handleMarkRefunded}
                    type="button"
                  >
                    Confirm Refund
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: PAYOUTS */}
      {!loading && activeTab === 'payouts' && (
        <div className="space-y-8">
          {/* Mentor Payout Summary */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Mentor Balances Awaiting Payout</h2>
              <p className="text-xs text-slate-500">Only completed sessions with cleared payments count towards earned balances.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 px-4">Mentor</th>
                    <th className="py-3.5 px-4">Total Earned</th>
                    <th className="py-3.5 px-4">Paid Out</th>
                    <th className="py-3.5 px-4">Current Balance</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payoutsSummary.map((m) => (
                    <tr key={m.mentorId} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{m.mentorName}</div>
                        <div className="text-xs text-slate-500">{m.mentorEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">{formatRupees(m.earned)}</td>
                      <td className="py-3.5 px-4 text-slate-500">{formatRupees(m.paidOut)}</td>
                      <td className="py-3.5 px-4 font-extrabold text-emerald-600">{formatRupees(m.balance)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          className="btn-primary py-1 px-3 text-xs"
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
                      <td colSpan="5" className="py-12 text-center text-slate-500">
                        No mentor records available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Payouts History */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Recorded Payouts Ledger</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Mentor</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Reference</th>
                    <th className="py-3.5 px-4">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentPayouts.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {p.mentorId?.name || 'Mentor'}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-emerald-600">
                        {formatRupees(p.amount)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {p.reference}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {p.recordedBy?.name || 'Admin'}
                      </td>
                    </tr>
                  ))}
                  {recentPayouts.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-500">
                        No payouts recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Record Payout Modal */}
          {selectedMentorPayout && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="card w-full max-w-md p-6">
                <h3 className="text-lg font-bold text-slate-900">Record Mentor Payout</h3>
                <p className="mt-1 text-xs text-slate-600">
                  Transfer to <strong className="text-slate-900">{selectedMentorPayout.mentorName}</strong>. Available balance:{' '}
                  <strong className="text-emerald-600">{formatRupees(selectedMentorPayout.balance)}</strong>.
                </p>

                <div className="mt-4 space-y-3">
                  <div>
                    <label htmlFor="payout-amount-input" className="block text-xs font-bold text-slate-700 mb-1">
                      Amount (in Rupees):
                    </label>
                    <input
                      id="payout-amount-input"
                      type="number"
                      step="0.01"
                      className="input-field text-sm"
                      value={payoutAmountRupees}
                      onChange={(e) => setPayoutAmountRupees(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="payout-reference-input" className="block text-xs font-bold text-slate-700 mb-1">
                      Transfer Reference (UPI / NEFT / IMPS ID):
                    </label>
                    <input
                      id="payout-reference-input"
                      className="input-field text-sm"
                      placeholder="e.g., UPI/2026/0987654321"
                      value={payoutReference}
                      onChange={(e) => setPayoutReference(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    className="btn-secondary text-xs"
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
                    className="btn-primary text-xs"
                    disabled={busyPayout || !payoutAmountRupees || !payoutReference.trim()}
                    onClick={handleRecordPayout}
                    type="button"
                  >
                    Record Payout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: COMPLAINTS */}
      {!loading && activeTab === 'complaints' && (
        <div className="space-y-6">
          {/* Status Filter */}
          <div className="card p-4 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filter By Status:</span>
            <div className="flex gap-2">
              {['open', 'resolved', ''].map((status) => (
                <button
                  key={status}
                  onClick={() => setComplaintStatusFilter(status)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-all ${
                    complaintStatusFilter === status
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-slate-900'
                  }`}
                  type="button"
                >
                  {status || 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Complaints List */}
          <div className="space-y-4">
            {complaints.map((c) => (
              <article key={c._id} className="card p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                        c.status === 'open' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {c.status}
                      </span>
                      <span className="text-xs text-slate-500">
                        Submitted {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mt-2">{c.subject}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Filed by: <strong className="text-slate-800">{c.userId?.name}</strong> ({c.userId?.email}, {c.userId?.role})
                    </p>
                    <p className="mt-3 text-sm text-slate-700 leading-relaxed bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      {c.description}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {c.status === 'open' ? (
                      <button
                        className="btn-primary py-1.5 px-4 text-xs"
                        onClick={() => setSelectedComplaint(c)}
                        type="button"
                      >
                        Resolve Issue
                      </button>
                    ) : (
                      <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 size={14} /> Resolved
                      </div>
                    )}
                  </div>
                </div>

                {c.resolutionNote && (
                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                    <strong>Resolution note:</strong> {c.resolutionNote}
                    {c.resolvedAt && (
                      <span className="text-slate-400 block mt-0.5">
                        Resolved on {new Date(c.resolvedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
              </article>
            ))}

            {complaints.length === 0 && (
              <div className="card p-12 text-center text-slate-500">
                No complaints recorded in this queue.
              </div>
            )}
          </div>

          {/* Resolve Complaint Modal */}
          {selectedComplaint && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="card w-full max-w-md p-6">
                <h3 className="text-lg font-bold text-slate-900">Resolve Complaint</h3>
                <p className="mt-1 text-xs text-slate-600">
                  Topic: <strong className="text-slate-900">{selectedComplaint.subject}</strong>
                </p>

                <div className="mt-4">
                  <label htmlFor="complaint-note-input" className="block text-xs font-bold text-slate-700 mb-1">
                    Resolution Action / Notes:
                  </label>
                  <textarea
                    id="complaint-note-input"
                    className="input-field text-sm"
                    rows="3"
                    placeholder="Describe how the complaint was addressed (e.g. issued credit, contacted mentor)..."
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => {
                      setSelectedComplaint(null);
                      setResolutionNote('');
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary text-xs"
                    disabled={busyComplaintId === selectedComplaint._id || !resolutionNote.trim()}
                    onClick={handleResolveComplaint}
                    type="button"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
