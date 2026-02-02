// frontend/src/pages/OvertimeDetail.jsx
// MOBILE-RESPONSIVE VERSION - Card layout, collapsible sections, touch-friendly

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getOvertimeRequestById } from '../api/client';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import { 
  FileText,      // For submitted
  Clock,         // For pending
  CheckCircle,   // For approved
  XCircle,       // For rejected
  Ban,          // For admin rejection
  Edit3,         // For revision
  User,
  ArrowLeft
} from 'lucide-react';

export default function OvertimeDetail() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user } = useAuth();
  const [showAdminRejectModal, setShowAdminRejectModal] = useState(false);
  const [adminComment, setAdminComment] = useState('');
  const [confirmReject, setConfirmReject] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const isAdmin = user?.accessLevel === 1;

  useEffect(() => {
    fetchRequest();
  }, [requestId]);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      const data = await getOvertimeRequestById(requestId);
      setRequest(data);
      setError('');
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.error || t('overtime.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  // Status badge - Mobile Optimized
  const StatusBadge = ({ status }) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      APPROVED: 'bg-green-100 text-green-800 border-green-200',
      REJECTED: 'bg-red-100 text-red-800 border-red-200',
      REVISION_REQUESTED: 'bg-orange-100 text-orange-800 border-orange-200'
    };

    const labels = {
      PENDING: t('overtime.pendingApproval'),
      APPROVED: t('overtime.approved'),
      REJECTED: t('overtime.rejected'),
      REVISION_REQUESTED: t('overtime.revisionRequested')
    };

    const icons = {
      PENDING: (
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      ),
      APPROVED: (
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      REJECTED: (
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      ),
      REVISION_REQUESTED: (
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    };

    return (
      <div className={`inline-flex items-center space-x-1.5 sm:space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border-2 ${styles[status]}`}>
        {icons[status]}
        <span className="text-xs sm:text-sm font-semibold">{labels[status]}</span>
      </div>
    );
  };


  const handleAdminReject = async () => {
    if (adminComment.trim().length < 20) {
      alert('Rejection reason must be at least 20 characters');
      return;
    }
    if (!confirmReject) {
      alert('Please confirm the rejection');
      return;
    }
    try {
      setRejecting(true);
      const response = await apiClient.post(`/overtime/${requestId}/admin-reject`, {
        comment: adminComment.trim()
      });
      if (response.data.success) {
        alert('Overtime rejected successfully. Balance has been deducted.');
        setShowAdminRejectModal(false);
        await fetchRequest(); // Refresh to show updated status
      }
    } catch (error) {
      console.error('Admin reject error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to reject overtime';
      alert(errorMsg);
    } finally {
      setRejecting(false);
    }
  };

  const buildTimelineEvents = (request) => {
    const events = [];

    // ✅ Use revision history if available (accurate timeline)
    if (request.revisions && request.revisions.length > 0) {
      console.log(`Building timeline from ${request.revisions.length} revisions`);
      
      request.revisions.forEach(revision => {
        const event = mapRevisionToEvent(revision);
        if (event) {
          events.push(event);
        }
      });
      
      return events;
    }

    // ⚠️ Fallback to old method if no revisions (backwards compatibility)
    console.log('No revisions found, using fallback timeline');
    
    // 1. Request Submitted
    events.push({
      type: 'SUBMITTED',
      label: 'Request Submitted',
      actor: request.employee?.name,
      date: request.submittedAt || request.createdAt,
      icon: FileText,
      color: 'blue'
    });

    // 2. Supervisor Action
    if (request.supervisor && request.supervisorStatus !== 'PENDING') {
      if (request.supervisorStatus === 'APPROVED') {
        events.push({
          type: 'SUPERVISOR_APPROVED',
          label: 'Approved by Supervisor',
          actor: request.supervisor.name,
          date: request.supervisorDate,
          comment: request.supervisorComment,
          icon: CheckCircle,
          color: 'green'
        });
      } else if (request.supervisorStatus === 'REJECTED') {
        events.push({
          type: 'SUPERVISOR_REJECTED',
          label: 'Rejected by Supervisor',
          actor: request.supervisor.name,
          date: request.supervisorDate,
          comment: request.supervisorComment,
          icon: XCircle,
          color: 'red'
        });
      }
    }

    // 3. Division Head Action
    if (request.divisionHead && request.divisionHeadStatus !== 'PENDING') {
      if (request.divisionHeadStatus === 'APPROVED') {
        events.push({
          type: 'DIVHEAD_APPROVED',
          label: 'Approved by Division Head',
          actor: request.divisionHead.name,
          date: request.divisionHeadDate,
          comment: request.divisionHeadComment,
          icon: CheckCircle,
          color: 'green'
        });
      } else if (request.divisionHeadStatus === 'REJECTED') {
        events.push({
          type: 'DIVHEAD_REJECTED',
          label: 'Rejected by Division Head',
          actor: request.divisionHead.name,
          date: request.divisionHeadDate,
          comment: request.divisionHeadComment,
          icon: XCircle,
          color: 'red'
        });
      }
    }

    return events;
  };

  const mapRevisionToEvent = (revision) => {
    // Event configuration map
    const eventMap = {
      SUBMITTED: {
        label: 'Request Submitted',
        icon: FileText,
        color: 'blue',
        showChanges: true
      },
      EDITED: {
        label: 'Request Edited',
        icon: Edit3,
        color: 'blue',
        showChanges: true
      },
      APPROVED_SUPERVISOR: {
        label: 'Approved by Supervisor',
        icon: CheckCircle,
        color: 'green'
      },
      REJECTED_SUPERVISOR: {
        label: 'Rejected by Supervisor',
        icon: XCircle,
        color: 'red'
      },
      APPROVED_DIVHEAD: {
        label: 'Approved by Division Head',
        icon: CheckCircle,
        color: 'green'
      },
      REJECTED_DIVHEAD: {
        label: 'Rejected by Division Head',
        icon: XCircle,
        color: 'red'
      },
      REVISION_REQUESTED: {
        label: 'Revision Requested',
        icon: Edit3,
        color: 'orange'
      },
      ADMIN_REJECTED: {
        label: 'Rejected by HR Admin (Override)',
        icon: Ban,
        color: 'gray',
        showOriginalData: true
      },
      FINAL_APPROVED: {
        label: 'Finally Approved',
        icon: CheckCircle,
        color: 'green'
      },
      FINAL_REJECTED: {
        label: 'Finally Rejected',
        icon: XCircle,
        color: 'red'
      },
      DELETED: {
        label: 'Request Deleted',
        icon: XCircle,
        color: 'gray'
      }
    };

    const config = eventMap[revision.action];
    if (!config) {
      console.warn(`Unknown revision action: ${revision.action}`);
      return null;
    }

    const event = {
      type: revision.action,
      label: config.label,
      actor: revision.reviser?.name || 'System',
      actorRole: revision.reviser?.role?.name,  // ✅ CORRECTED: role.name exists
      actorAccessLevel: revision.reviser?.accessLevel, // ✅ CORRECTED: accessLevel is on User
      date: revision.createdAt,
      comment: revision.comment,
      changes: revision.changes,
      icon: config.icon,
      color: config.color,
      showChanges: config.showChanges,
      showOriginalData: config.showOriginalData
    };

    return event;
  };

  const TimelineEvent = ({ event, isLast }) => {
    const [showChanges, setShowChanges] = useState(false);

    const colorClasses = {
      blue: {
        dot: 'bg-blue-500',
        bg: 'bg-blue-50/50',
        border: 'border-blue-100',
        text: 'text-blue-600',
        textDark: 'text-blue-900'
      },
      green: {
        dot: 'bg-green-500',
        bg: 'bg-green-50/50',
        border: 'border-green-100',
        text: 'text-green-600',
        textDark: 'text-green-900'
      },
      red: {
        dot: 'bg-red-500',
        bg: 'bg-red-50/50',
        border: 'border-red-100',
        text: 'text-red-600',
        textDark: 'text-red-900'
      },
      orange: {
        dot: 'bg-orange-500',
        bg: 'bg-orange-50/50',
        border: 'border-orange-100',
        text: 'text-orange-600',
        textDark: 'text-orange-900'
      },
      gray: {
        dot: 'bg-gray-500',
        bg: 'bg-gray-50/50',
        border: 'border-gray-200',
        text: 'text-gray-600',
        textDark: 'text-gray-900'
      }
    };

    const colors = colorClasses[event.color] || colorClasses.gray;
    const Icon = event.icon;

    return (
      <div className="relative">
        {/* Timeline dot */}
        <div className={`absolute -left-8 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${colors.dot}`} />
        
        {/* Vertical line connector */}
        {!isLast && (
          <div className="absolute left-[-25px] top-[22px] w-0.5 bg-gray-200" style={{ height: 'calc(100% + 10px)' }} />
        )}
        
        {/* Event card */}
        <div className={`${colors.bg} rounded-2xl border ${colors.border} p-4`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-3 flex-1">
              <Icon size={18} className={colors.text} />
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-bold ${colors.text} uppercase tracking-tight`}>
                  {event.label}
                </p>
                <p className={`text-sm font-bold ${colors.textDark} truncate`}>
                  {event.actor}
                </p>
                {/* ✅ CORRECTED: Show role name from role.name */}
                {event.actorRole && (
                  <p className="text-[10px] text-gray-500">{event.actorRole}</p>
                )}
              </div>
            </div>
            {event.date && (
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter flex-shrink-0 ml-2">
                {format(new Date(event.date), 'MMM dd • HH:mm')}
              </p>
            )}
          </div>

          {/* Comment if exists */}
          {event.comment && (
            <div className="mt-3 bg-white/50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs text-gray-600 italic leading-relaxed">
                "{event.comment}"
              </p>
            </div>
          )}

          {/* Show changes for EDITED action */}
          {event.type === 'EDITED' && event.changes && (
            <div className="mt-3">
              <button
                onClick={() => setShowChanges(!showChanges)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {showChanges ? 'Hide Changes' : 'View Changes'}
              </button>
              
              {showChanges && (
                <div className="mt-2 bg-white/70 rounded-lg p-3 border border-gray-200 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-bold text-red-600 mb-1">Before:</p>
                      <p>Hours: {event.changes.before?.totalHours || 0}</p>
                      <p>Amount: Rp {event.changes.before?.totalAmount?.toLocaleString('id-ID') || 0}</p>
                      <p>Entries: {event.changes.before?.entriesCount || event.changes.before?.entries?.length || 0}</p>
                    </div>
                    <div>
                      <p className="font-bold text-green-600 mb-1">After:</p>
                      <p>Hours: {event.changes.after?.totalHours || 0}</p>
                      <p>Amount: Rp {event.changes.after?.totalAmount?.toLocaleString('id-ID') || 0}</p>
                      <p>Entries: {event.changes.after?.entriesCount || event.changes.after?.entries?.length || 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Show original data for admin rejection */}
          {event.type === 'ADMIN_REJECTED' && event.changes?.originalSupervisorComment && (
            <div className="mt-3 bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <p className="text-[10px] font-bold text-yellow-800 uppercase mb-1">
                ⚠️ Original Approval (Overridden):
              </p>
              <p className="text-xs text-yellow-700 italic">
                "{event.changes.originalSupervisorComment}"
              </p>
              <p className="text-[10px] text-yellow-600 mt-1">
                Originally approved: {event.changes.originalApprovedAt ? format(new Date(event.changes.originalApprovedAt), 'MMM dd, yyyy • HH:mm') : 'N/A'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-sm text-gray-600">{t('overtime.loadingRequest')}</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-4xl mx-auto mt-8 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-red-900">{t('overtime.errorLoadingRequest')}</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => navigate(-1)} 
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              {t('overtime.backToHistory')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const ApprovalStep = ({ label, name, status, comment, date }) => (
      <div className="relative pl-8">
        {/* Status Indicator Dot */}
        <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${
          status === 'APPROVED' ? 'bg-green-500' :
          status === 'REJECTED' ? 'bg-red-500' : 'bg-gray-400'
        }`} />
        
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{label}</p>
            <p className="text-sm font-bold text-gray-900">{name}</p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter ${
            status === 'APPROVED' ? 'bg-green-50 text-green-700' :
            status === 'REJECTED' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
          }`}>
            {status}
          </span>
        </div>

        {comment && (
          <div className="bg-gray-50/70 rounded-lg p-3 border border-gray-100">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {comment}
            </p>
            {date && (
              <p className="mt-2 text-[10px] text-gray-400 font-medium italic">
                {format(new Date(date), 'MMM dd, yyyy • HH:mm')}
              </p>
            )}
          </div>
        )}
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header - Mobile Optimized */}
      <div className="mb-4 sm:mb-6">
        {/* <Link
          to="/overtime/history"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-3 sm:mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          {t('overtime.backToHistory')}
        </Link> */}
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors mb-4"
        >
          <ArrowLeft size={14} className="mr-1" /> {t('common.back')}
        </button>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{t('overtime.detailTitle')}</h1>
      </div>

      {/* Status & Actions - Mobile: Stack, Desktop: Row */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <StatusBadge status={request.status} />
        {(request.status === 'PENDING' || request.status === 'REVISION_REQUESTED') && (
          <Link
            to={`/overtime/edit/${request.id}`}
            className="inline-flex items-center justify-center px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
          >
            {t('overtime.editRequest')}
          </Link>
        )}
      </div>

      {/* Main Content */}
      <div className="space-y-4 sm:space-y-6">
        {/* Employee Information - Clean Profile Style */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5">
            {/* Profile Header Row */}
            <div className="flex items-center space-x-4 pb-5 border-b border-gray-50 mb-5">
              <div className="h-12 w-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center border border-gray-200 flex-shrink-0">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none mb-1">
                  {t('overtime.employeeInformation')}
                </p>
                <h2 className="text-lg font-bold text-gray-900 truncate">
                  {request.employee.name}
                </h2>
              </div>
            </div>

            {/* Info Grid - 2 columns even on mobile to save space */}
            <dl className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                  {t('overtime.employeeId')}
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-700">
                  {request.employee.nip || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                  {t('overtime.role')}
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-700 truncate">
                  {request.employee.role?.name || '—'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                  {t('overtime.division')}
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-700">
                  {request.employee.division?.name || '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header: Slimmer & Text-only */}
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              {t('overtime.requestSummary')}
            </h2>
          </div>

          <div className="p-5">
            {/* Summary Grid: No backgrounds, just clean typography */}
            <div className="flex justify-between items-end pb-6 border-b border-gray-50">
              <div>
                <p className="text-[10px] uppercase tracking-bold text-gray-400 font-bold">{t('overtime.totalHours')}</p>
                <p className="text-2xl font-black text-gray-900 leading-none mt-1">
                  {request.totalHours}<span className="text-xs ml-1 font-medium text-gray-400">hrs</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-bold text-gray-400 font-bold">{t('overtime.estimatedAmount')}</p>
                <p className="text-xl font-bold text-green-600 leading-none mt-1">
                  Rp {request.totalAmount.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            {/* Individual Entries - Clean Timeline Style */}
            <div className="mt-6">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">
                {t('overtime.detailedBreakdown')}
              </h3>
              
              <div className="space-y-8 relative">
                {/* Vertical Line Connector */}
                <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-100" />

                {request.entries.map((entry, index) => (
                  <div key={entry.id} className="relative pl-8">
                    {/* Dot on the timeline */}
                    <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white bg-blue-500 shadow-sm" />
                    
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-bold text-gray-900 leading-none">
                          {format(new Date(entry.date), 'EEEE, MMM dd')}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {entry.hours}h
                      </span>
                    </div>

                    {/* Description Area */}
                    <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-1 tracking-tight">
                        {t('overtime.description')}
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                        {entry.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Current Approver - Subtle Callout */}
          {/* Request Timeline - Complete History */}
          <div className="bg-white rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                {t('overtime.approvalInformation')}
              </h2>
            </div>

            <div className="p-5">
              {/* Supervisor Info (if exists) */}
              {request.supervisor && (
                <div className="flex items-center space-x-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 mb-6">
                  <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-gray-400 border border-gray-100">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                      {t('overtime.supervisor')}
                    </p>
                    <p className="text-sm font-bold text-gray-900">{request.supervisor.name}</p>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="relative pl-8">
                <div className="space-y-8">
                  {/* Build timeline events dynamically */}
                  {buildTimelineEvents(request).map((event, index) => (
                    <TimelineEvent 
                      key={index} 
                      event={event} 
                      isLast={index === buildTimelineEvents(request).length - 1} 
                    />
                  ))}

                  {/* Pending status - show current approver */}
                  {request.status === 'PENDING' && (
                    <div className="relative">
                      <div className="absolute -left-8 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 bg-orange-400 animate-pulse" />
                      <div className="bg-orange-50/50 rounded-2xl border border-orange-100 p-4">
                        <div className="flex items-center space-x-3 mb-2">
                          <Clock size={18} className="text-orange-600" />
                          <div>
                            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-tight">
                              Pending Approval
                            </p>
                            <p className="text-sm font-bold text-orange-900">
                              {request.currentApprover?.name || 'Awaiting Approver'}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-orange-700 mt-2">Waiting for approval decision</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

      </div>
    </div>
  </div>
      {isAdmin && request.status === 'APPROVED' && !request.isRecapped && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start space-x-3 mb-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-800">Admin Override</h4>
              <p className="text-xs text-red-700 mt-1">
                As HR Admin, you can reject this approved overtime if there are issues with the approval.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAdminRejectModal(true)}
            className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Admin Reject Overtime</span>
          </button>
        </div>
      )}
      {/* Admin Reject Modal */}
{showAdminRejectModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-start mb-4">
        <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
          <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-black text-gray-900 mb-1">
            Admin Reject Approved Overtime?
          </h3>
          <p className="text-sm text-gray-600">
            This will override the supervisor's approval decision.
          </p>
        </div>
      </div>

      {/* Overtime Details Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Overtime Details</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Employee:</span>
            <span className="font-bold text-gray-900">{request.employee?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Hours:</span>
            <span className="font-bold text-gray-900">{request.totalHours} hours</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Amount:</span>
            <span className="font-bold text-gray-900">
              Rp {request.totalAmount?.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* Warning Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-bold text-yellow-800 mb-2">
          ⚠️ What Will Happen:
        </h4>
        <ul className="text-sm text-yellow-700 space-y-1.5 ml-4 list-disc">
          <li>Status will change to <strong>REJECTED</strong></li>
          <li>Employee's overtime balance will be <strong>deducted ({request.totalHours} hours)</strong></li>
          <li>Notifications will be sent to employee, supervisor, and HR</li>
          <li>This action will be logged in the system</li>
          <li>This overtime <strong>will not</strong> be included in payroll</li>
        </ul>
      </div>
      
      {/* Rejection Reason */}
      <div className="mb-4">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Rejection Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          value={adminComment}
          onChange={(e) => setAdminComment(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
          placeholder="Explain in detail why this approved overtime is being rejected..."
          disabled={rejecting}
        />
        <div className="flex justify-between items-center mt-1">
          <p className="text-xs text-gray-500">
            Minimum 20 characters required
          </p>
          <p className={`text-xs font-bold ${adminComment.length >= 20 ? 'text-green-600' : 'text-red-600'}`}>
            {adminComment.length}/20
          </p>
        </div>
      </div>

      {/* Confirmation Checkbox */}
      <div className="mb-6">
        <label className="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmReject}
            onChange={(e) => setConfirmReject(e.target.checked)}
            disabled={rejecting}
            className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
          />
          <span className="text-sm text-gray-700">
            I confirm that this overtime rejection is necessary and I understand the consequences.
          </span>
        </label>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            setShowAdminRejectModal(false);
            setAdminComment('');
            setConfirmReject(false);
          }}
          disabled={rejecting}
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-bold text-sm disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleAdminReject}
          disabled={rejecting || adminComment.trim().length < 20 || !confirmReject}
          className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm disabled:opacity-50 flex items-center justify-center"
        >
          {rejecting ? (
            <>
              <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Rejecting...
            </>
          ) : (
            'Confirm Rejection'
          )}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
    
  );
}