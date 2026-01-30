// frontend/src/pages/LeaveDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import { format, parseISO } from 'date-fns';
import { Calendar, User, Briefcase, FileText, Clock, XCircle, ArrowLeft, CheckCircle, AlertCircle, Ban } from 'lucide-react';

export default function LeaveDetail() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchRequest();
  }, [requestId]);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/leave/${requestId}`);
      setRequest(response.data.data);
      setError('');
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.error || 'Failed to load leave request');
    } finally {
      setLoading(false);
    }
  };

  // Check if leave has started
  const hasStarted = () => {
    if (!request) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const leaveStart = new Date(request.startDate);
    leaveStart.setHours(0, 0, 0, 0);
    return leaveStart <= today;
  };

  // Handle cancel leave
  const handleCancelLeave = async () => {
    try {
      setCancelling(true);
      
      const response = await apiClient.post(`/leave/${requestId}/cancel`, {
        reason: cancelReason.trim() || undefined
      });
      
      if (response.data.success) {
        alert('Cuti berhasil dibatalkan. Saldo cuti telah dikembalikan.');
        setShowCancelModal(false);
        setCancelReason('');
        await fetchRequest(); // Refresh to show updated status
      }
    } catch (error) {
      console.error('Cancel error:', error);
      const errorMsg = error.response?.data?.error || 'Gagal membatalkan cuti';
      alert(errorMsg);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading leave request...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-4xl mx-auto mt-8 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error</h3>
              <p className="text-red-600">{error || 'Leave request not found'}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/leave-history')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Leave History
          </button>
        </div>
      </div>
    );
  }

  const isOwner = request.employeeId === user?.id;

  // Build timeline events
  const timelineEvents = [];

  // 1. Request Submitted
  timelineEvents.push({
    type: 'SUBMITTED',
    label: 'Request Submitted',
    actor: request.employee?.name,
    date: request.createdAt,
    icon: FileText,
    color: 'blue'
  });

  // 2. Approved (if has approvedAt - regardless of current status)
  // This shows approval even if later cancelled
  if (request.approvedAt) {
    timelineEvents.push({
      type: 'APPROVED',
      label: 'Approved',
      actor: request.currentApprover?.name || request.supervisor?.name || 'Approver',
      date: request.approvedAt,
      comment: request.supervisorComment || request.comment,
      icon: CheckCircle,
      color: 'green'
    });
  }

  // 3. Rejected (if rejected)
  if (request.status === 'REJECTED' && request.rejectedAt) {
    timelineEvents.push({
      type: 'REJECTED',
      label: 'Rejected',
      actor: request.currentApprover?.name || request.supervisor?.name || 'Approver',
      date: request.rejectedAt,
      comment: request.supervisorComment || request.comment,
      icon: XCircle,
      color: 'red'
    });
  }

  // 4. Cancelled (if cancelled - shows after approval)
  if (request.status === 'CANCELLED' && request.cancelledAt) {
    timelineEvents.push({
      type: 'CANCELLED',
      label: 'Cancelled by Employee',
      actor: request.employee?.name,
      date: request.cancelledAt,
      comment: request.cancellationReason,
      icon: Ban,
      color: 'gray'
    });
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-2 pb-20">
      {/* 1. Navigation & Header */}
      <header className="py-2">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors mb-4"
        >
          <ArrowLeft size={14} className="mr-1" /> {t('common.back')}
        </button>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1">{t('leave.management')}</p>
            <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">{t('leave.detailTitle')}</h1>
          </div>
          <StatusBadge status={request.status} />
        </div>
      </header>

      {/* 2. Employee Profile Card */}
      <section className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 sm:p-8">
        <div className="flex items-center space-x-4 pb-6 border-b border-gray-50 mb-6">
          <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-100">
            {request.employee?.name?.charAt(0)}
          </div>
          <div>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none mb-1">{t('profile.employeeInformation')}</p>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">{request.employee?.name}</h2>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-y-6 gap-x-4">
          <InfoItem label={t('profile.employeeId')} value={request.employee?.nip} />
          <InfoItem label={t('profile.role')} value={request.employee?.role?.name} />
          <div className="col-span-2">
            <InfoItem label={t('profile.division')} value={request.employee?.division?.name} />
          </div>
        </dl>
      </section>

      {/* 3. Leave Summary Details */}
      <section className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center space-x-2 text-gray-400">
          <Calendar size={18} />
          <h3 className="text-xs font-black uppercase tracking-widest">{t('leave.requestSummary')}</h3>
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-end pb-8 border-b border-gray-50">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('leave.totalDays')}</p>
              <p className="text-4xl font-black text-gray-900 leading-none tracking-tighter">
                {request.totalDays} <span className="text-sm font-bold text-gray-400 lowercase">{t('leave.days')}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('leave.type')}</p>
              <p className="text-lg font-black text-blue-600 uppercase tracking-tighter">{request.leaveType?.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <InfoItem label={t('leave.startDate')} value={format(parseISO(request.startDate), 'EEEE, MMM dd, yyyy')} />
            <InfoItem label={t('leave.endDate')} value={format(parseISO(request.endDate), 'EEEE, MMM dd, yyyy')} />
            
            <div className="sm:col-span-2 bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t('leave.reason')}</p>
              <p className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-line italic">"{request.reason}"</p>
            </div>

            {/* Attachment if exists */}
            {request.attachment && (
              <div className="sm:col-span-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Attachment</p>
                <a
                  href={request.attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-bold"
                >
                  <FileText size={16} className="mr-2" />
                  View Attachment
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Approval Timeline */}
      <section className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center space-x-2 text-gray-400">
          <Briefcase size={18} />
          <h3 className="text-xs font-black uppercase tracking-widest">Request Timeline</h3>
        </div>
        <div className="p-6 sm:p-8">
          {/* Supervisor Info (if exists) */}
          {request.supervisor && (
            <div className="flex items-center space-x-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 mb-6">
              <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-gray-400 border border-gray-100">
                <User size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{t('profile.supervisor')}</p>
                <p className="text-sm font-bold text-gray-900">{request.supervisor.name}</p>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="relative pl-8">
            <div className="space-y-8">
              {/* Timeline Events - each event handles its own connector line */}
              {timelineEvents.map((event, index) => (
                <TimelineEvent 
                  key={index} 
                  event={event} 
                  isLast={index === timelineEvents.length - 1} 
                />
              ))}
            </div>
          </div>

          {/* Pending status - OUTSIDE timeline container */}
          {request.status === 'PENDING' && (
            <div className="relative pl-8 mt-8">
              <div className="relative">
                <div className="absolute -left-8 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 bg-orange-400 animate-pulse" />
                <div className="bg-orange-50/50 rounded-2xl border border-orange-100 p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Clock size={18} className="text-orange-600" />
                    <div>
                      <p className="text-[10px] font-bold text-orange-600 uppercase tracking-tight">Pending Approval</p>
                      <p className="text-sm font-bold text-orange-900">{request.currentApprover?.name || 'Awaiting Approver'}</p>
                    </div>
                  </div>
                  <p className="text-xs text-orange-700 mt-2">Waiting for approval decision</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. Employee Actions - Cancel Button */}
      {isOwner && request.status === 'APPROVED' && !hasStarted() && (
        <button 
          onClick={() => setShowCancelModal(true)}
          className="w-full py-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-red-100 transition-all"
        >
          <XCircle size={16} />
          Cancel Leave
        </button>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <Ban className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-gray-900 mb-2">
                  Batalkan Cuti?
                </h3>
                <p className="text-sm text-gray-600">
                  Apakah Anda yakin ingin membatalkan cuti ini?
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 font-bold mb-2">
                ℹ️ Yang akan terjadi:
              </p>
              <ul className="text-sm text-blue-700 space-y-1 ml-4 list-disc">
                <li>Status cuti berubah menjadi "Dibatalkan"</li>
                {request.leaveType === 'ANNUAL_LEAVE' && (
                  <li>Saldo cuti Anda akan dikembalikan (+{request.totalDays} hari)</li>
                )}
                <li>Notifikasi akan dikirim ke atasan</li>
                <li>Anda diharapkan hadir pada tanggal cuti yang dibatalkan</li>
              </ul>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Alasan Pembatalan (Opsional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Contoh: Ada pekerjaan mendesak yang harus diselesaikan..."
                disabled={cancelling}
              />
              <p className="text-xs text-gray-500 mt-1">
                Memberikan alasan membantu tim memahami situasi Anda
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                disabled={cancelling}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-bold disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleCancelLeave}
                disabled={cancelling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold disabled:opacity-50 flex items-center justify-center"
              >
                {cancelling ? (
                  <>
                    <Clock className="animate-spin h-4 w-4 mr-2" />
                    Membatalkan...
                  </>
                ) : (
                  'Ya, Batalkan Cuti'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Timeline Event Component
const TimelineEvent = ({ event, isLast }) => {
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
      {/* Timeline dot - positioned at -32px (left-8 = -2rem = -32px) */}
      <div className={`absolute -left-8 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${colors.dot}`} />
      
      {/* Vertical line connector - centered with dot */}
      {/* Dot: left-8 = -32px, width 16px (w-4), so center is at -32px + 8px = -24px */}
      {/* Line should be at -24px - 1px (half of w-0.5 which is 2px) = -25px */}
      {!isLast && (
        <div className="absolute left-[-25px] top-[24px] w-0.5 bg-gray-200" style={{ height: 'calc(100% + 16px)' }} />
      )}
      
      {/* Event card */}
      <div className={`${colors.bg} rounded-2xl border ${colors.border} p-4`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-3">
            <Icon size={18} className={colors.text} />
            <div>
              <p className={`text-[10px] font-bold ${colors.text} uppercase tracking-tight`}>{event.label}</p>
              <p className={`text-sm font-bold ${colors.textDark}`}>{event.actor}</p>
            </div>
          </div>
          {event.date && (
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
              {format(new Date(event.date), 'MMM dd, yyyy • HH:mm')}
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
      </div>
    </div>
  );
};

// Helper Components
const InfoItem = ({ label, value }) => (
  <div>
    <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</dt>
    <dd className="text-sm font-bold text-gray-900">{value || '—'}</dd>
  </div>
);

const StatusBadge = ({ status, isSmall }) => {
  const styles = {
    PENDING: 'bg-orange-50 text-orange-600 border-orange-100',
    APPROVED: 'bg-green-50 text-green-600 border-green-100',
    REJECTED: 'bg-red-50 text-red-600 border-red-100',
    CANCELLED: 'bg-gray-50 text-gray-600 border-gray-200'
  };
  return (
    <span className={`rounded-lg border font-black uppercase tracking-tighter ${isSmall ? 'px-2 py-0.5 text-[9px]' : 'px-4 py-1.5 text-xs'} ${styles[status] || styles.PENDING}`}>
      {status}
    </span>
  );
};