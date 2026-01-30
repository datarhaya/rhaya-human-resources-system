// frontend/src/pages/LeaveDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import { format, parseISO } from 'date-fns';

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

  // Status badge component
  const StatusBadge = ({ status }) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      APPROVED: 'bg-green-100 text-green-800 border-green-200',
      REJECTED: 'bg-red-100 text-red-800 border-red-200',
      CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const labels = {
      PENDING: 'Pending Approval',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      CANCELLED: 'Cancelled'
    };

    const icons = {
      PENDING: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      ),
      APPROVED: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      REJECTED: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      ),
      CANCELLED: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
        </svg>
      )
    };

    return (
      <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg border-2 ${styles[status]}`}>
        {icons[status]}
        <span className="text-sm font-semibold">{labels[status]}</span>
      </div>
    );
  };

  // Leave type badge
  const LeaveTypeBadge = ({ leaveType }) => {
    const types = {
      ANNUAL_LEAVE: { label: 'Annual Leave', color: 'blue'},
      SICK_LEAVE: { label: 'Sick Leave', color: 'red'},
      MATERNITY_LEAVE: { label: 'Maternity Leave', color: 'pink'},
      MENSTRUAL_LEAVE: { label: 'Menstrual Leave', color: 'purple'},
      MARRIAGE_LEAVE: { label: 'Marriage Leave', color: 'yellow'},
      UNPAID_LEAVE: { label: 'Unpaid Leave', color: 'gray'}
    };

    const typeInfo = types[leaveType] || types.ANNUAL_LEAVE;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${typeInfo.color}-100 text-${typeInfo.color}-800`}>
        <span className="mr-1">{typeInfo.icon}</span>
        {typeInfo.label}
      </span>
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
          <p className="mt-4 text-gray-600">Loading leave request...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-4xl mx-auto mt-8 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error</h3>
              <p className="text-red-600">{error || 'Leave request not found'}</p>
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Leave History
          </button>
        </div>
      </div>
    );
  }

  const isOwner = request.employeeId === user?.id;
  const isApprover = request.currentApproverId === user?.id;

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
        navigate('/leave-history');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      const errorMsg = error.response?.data?.error || 'Gagal membatalkan cuti';
      alert(errorMsg);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Leave Request Details
            </h1>
            <div className="mt-3 sm:mt-0">
              <StatusBadge status={request.status} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Employee Information */}
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Employee Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="text-base font-medium text-gray-900">{request.employee?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">NIP</p>
                <p className="text-base font-medium text-gray-900">{request.employee?.nip || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Division</p>
                <p className="text-base font-medium text-gray-900">{request.employee?.division?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="text-base font-medium text-gray-900">{request.employee?.role?.name || '-'}</p>
              </div>
            </div>
          </div>

          {/* Leave Details */}
          <div className="px-6 py-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave Details</h2>
            
            <div className="space-y-4">
              {/* Leave Type */}
              <div className="flex items-start">
                <div className="w-32 text-sm text-gray-500">Leave Type:</div>
                <div className="flex-1">
                  <LeaveTypeBadge leaveType={request.leaveType} />
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-start">
                <div className="w-32 text-sm text-gray-500">Start Date:</div>
                <div className="flex-1 text-base text-gray-900">
                  {format(parseISO(request.startDate), 'EEEE, dd MMMM yyyy')}
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-32 text-sm text-gray-500">End Date:</div>
                <div className="flex-1 text-base text-gray-900">
                  {format(parseISO(request.endDate), 'EEEE, dd MMMM yyyy')}
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-start">
                <div className="w-32 text-sm text-gray-500">Duration:</div>
                <div className="flex-1">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {request.totalDays} {request.totalDays === 1 ? 'day' : 'days'}
                  </span>
                </div>
              </div>

              {/* Reason */}
              <div className="flex items-start">
                <div className="w-32 text-sm text-gray-500">Reason:</div>
                <div className="flex-1 text-base text-gray-900 whitespace-pre-wrap">
                  {request.reason}
                </div>
              </div>

              {/* Attachment */}
              {request.attachment && (
                <div className="flex items-start">
                  <div className="w-32 text-sm text-gray-500">Attachment:</div>
                  <div className="flex-1">
                    <a
                      href={request.attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      View Attachment
                    </a>
                  </div>
                </div>
              )}

              {/* Comment (if approved/rejected) */}
              {request.comment && (
                <div className="flex items-start">
                  <div className="w-32 text-sm text-gray-500">Comment:</div>
                  <div className="flex-1">
                    <div className={`p-3 rounded-lg ${
                      request.status === 'APPROVED' ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <p className="text-sm text-gray-900">{request.comment}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submitted At */}
              <div className="flex items-start">
                <div className="w-32 text-sm text-gray-500">Submitted:</div>
                <div className="flex-1 text-base text-gray-900">
                  {format(parseISO(request.createdAt), 'dd MMM yyyy, HH:mm')}
                </div>
              </div>

              {/* Approved/Rejected At */}
              {request.approvedAt && (
                <div className="flex items-start">
                  <div className="w-32 text-sm text-gray-500">
                    {request.status === 'APPROVED' ? 'Approved At:' : 'Rejected At:'}
                  </div>
                  <div className="flex-1 text-base text-gray-900">
                    {format(parseISO(request.approvedAt), 'dd MMM yyyy, HH:mm')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Approval Flow */}
          {request.currentApprover && (
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Approval Flow</h2>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-32 text-sm text-gray-500">Current Approver:</div>
                  <div className="flex-1 text-base font-medium text-gray-900">
                    {request.currentApprover?.name}
                  </div>
                </div>
                {request.supervisor && (
                  <div className="flex items-center">
                    <div className="w-32 text-sm text-gray-500">Supervisor:</div>
                    <div className="flex-1 text-base text-gray-900">
                      {request.supervisor?.name}
                    </div>
                  </div>
                )}
                {request.divisionHead && (
                  <div className="flex items-center">
                    <div className="w-32 text-sm text-gray-500">Division Head:</div>
                    <div className="flex-1 text-base text-gray-900">
                      {request.divisionHead?.name}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Cancel Button - Now Enabled! */}
              {isOwner && request.status === 'APPROVED' && !hasStarted() && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex-1 sm:flex-initial px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Cancel Leave
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Batalkan Cuti?
                  </h3>
                  <p className="text-sm text-gray-600">
                    Apakah Anda yakin ingin membatalkan cuti ini?
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Yang akan terjadi:</strong>
                </p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4 list-disc">
                  <li>Status cuti berubah menjadi "Dibatalkan"</li>
                  {request.leaveType === 'ANNUAL_LEAVE' && (
                    <li>Saldo cuti Anda akan dikembalikan (+{request.totalDays} hari)</li>
                  )}
                  <li>Notifikasi akan dikirim ke atasan</li>
                  <li>Anda diharapkan hadir pada tanggal cuti yang dibatalkan</li>
                </ul>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleCancelLeave}
                  disabled={cancelling}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 flex items-center justify-center"
                >
                  {cancelling ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
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
    </div>
  );
}