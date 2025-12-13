// frontend/src/pages/LeaveApproval.jsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';

export default function LeaveApproval() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]); // Store unfiltered
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState(''); // 'approve' or 'reject'
  const [comment, setComment] = useState('');
  const [divisions, setDivisions] = useState([]);

  // Filter state
  const [filters, setFilters] = useState({
    leaveType: '',
    requestDateFrom: '',
    requestDateTo: '',
    leaveDateFrom: '',
    leaveDateTo: '',
    divisionId: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const isAdmin = user?.accessLevel === 1;

  const leaveTypes = [
    { value: 'ANNUAL_LEAVE', labelKey: 'annualLeave' },
    { value: 'SICK_LEAVE', labelKey: 'sickLeave' },
    { value: 'MATERNITY_LEAVE', labelKey: 'maternityLeave' },
    { value: 'MENSTRUAL_LEAVE', labelKey: 'menstrualLeave' },
    { value: 'MARRIAGE_LEAVE', labelKey: 'marriageLeave' },
    { value: 'UNPAID_LEAVE', labelKey: 'unpaidLeave' }
  ];

  useEffect(() => {
    fetchRequests();
  }, [activeTab]);

  useEffect(() => {
    fetchDivisions();
  }, []);

  // Apply filters when filters change
  useEffect(() => {
    applyFilters();
  }, [filters, allRequests]);

  const fetchDivisions = async () => {
    try {
      const response = await apiClient.get('/divisions');
      setDivisions(response.data.data || []);
    } catch (error) {
      console.error('Fetch divisions error:', error);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let response;
      if (activeTab === 'pending') {
        response = await apiClient.get('/leave/pending-approval/list');
      } else if (isAdmin) {
        const status = activeTab === 'all' ? '' : activeTab.toUpperCase();
        response = await apiClient.get(`/leave/admin/all-requests${status ? `?status=${status}` : ''}`);
      } else {
        // Non-admin can only see pending
        response = { data: { data: [] } };
      }
      setAllRequests(response.data.data || []);
      setRequests(response.data.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      alert(t('leave.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allRequests];

    // Filter by leave type
    if (filters.leaveType) {
      filtered = filtered.filter(req => req.leaveType === filters.leaveType);
    }

    // Filter by division
    if (filters.divisionId) {
      filtered = filtered.filter(req => req.employee?.divisionId === filters.divisionId);
    }

    // Filter by search (employee name or NIP)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(req => 
        req.employee?.name?.toLowerCase().includes(searchLower) ||
        req.employee?.nip?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by request date range
    if (filters.requestDateFrom) {
      filtered = filtered.filter(req => 
        new Date(req.createdAt) >= new Date(filters.requestDateFrom)
      );
    }
    if (filters.requestDateTo) {
      filtered = filtered.filter(req => 
        new Date(req.createdAt) <= new Date(filters.requestDateTo + 'T23:59:59')
      );
    }

    // Filter by leave date range
    if (filters.leaveDateFrom) {
      filtered = filtered.filter(req => 
        new Date(req.startDate) >= new Date(filters.leaveDateFrom)
      );
    }
    if (filters.leaveDateTo) {
      filtered = filtered.filter(req => 
        new Date(req.endDate) <= new Date(filters.leaveDateTo)
      );
    }

    setRequests(filtered);
  };

  const clearFilters = () => {
    setFilters({
      leaveType: '',
      requestDateFrom: '',
      requestDateTo: '',
      leaveDateFrom: '',
      leaveDateTo: '',
      divisionId: '',
      search: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  const handleAction = async () => {
    if (actionType === 'reject' && !comment.trim()) {
      alert(t('leave.commentRequired'));
      return;
    }

    setLoading(true);
    try {
      const endpoint = actionType === 'approve' ? 'approve' : 'reject';
      await apiClient.post(`/leave/${selectedRequest.id}/${endpoint}`, {
        comment: comment || null
      });

      alert(t('leave.actionSuccess'));
      setShowModal(false);
      setSelectedRequest(null);
      setComment('');
      fetchRequests();
    } catch (error) {
      console.error('Action error:', error);
      alert(error.response?.data?.error || t('leave.actionFailed'));
    } finally {
      setLoading(false);
    }
  };

  const openActionModal = (request, type) => {
    setSelectedRequest(request);
    setActionType(type);
    setComment('');
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getLeaveTypeLabel = (type) => {
    const typeMap = {
      ANNUAL_LEAVE: 'annualLeave',
      SICK_LEAVE: 'sickLeave',
      MATERNITY_LEAVE: 'maternityLeave',
      MENSTRUAL_LEAVE: 'menstrualLeave',
      MARRIAGE_LEAVE: 'marriageLeave',
      UNPAID_LEAVE: 'unpaidLeave'
    };
    return typeMap[type] ? t(`leave.${typeMap[type]}`) : type;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('leave.approvalTitle')}</h1>
        <p className="text-sm text-gray-600 mt-1">{t('leave.reviewApprove')}</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('leave.pending')}
              {requests.filter(r => r.status === 'PENDING').length > 0 && activeTab !== 'pending' && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {requests.filter(r => r.status === 'PENDING').length}
                </span>
              )}
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('leave.allRequests')}
                </button>
                <button
                  onClick={() => setActiveTab('approved')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'approved'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('leave.approved')}
                </button>
                <button
                  onClick={() => setActiveTab('rejected')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'rejected'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('leave.rejected')}
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Filter Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {activeTab === 'pending' ? t('leave.pendingRequests') : 
                   activeTab === 'all' ? t('leave.allRequests') : 
                   activeTab === 'approved' ? t('leave.approvedRequests') : t('leave.rejectedRequests')}
                </h3>
                <span className="text-sm text-gray-500">
                  ({requests.length} {requests.length === 1 ? t('leave.request') : t('leave.requests')})
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {hasActiveFilters && (
                  <span className="text-sm text-blue-600 font-medium">
                    {requests.length} {t('leave.of')} {allRequests.length} {t('leave.shown')}
                  </span>
                )}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                    showFilters || hasActiveFilters
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span>{t('leave.filter')}</span>
                  {hasActiveFilters && (
                    <span className="bg-white text-blue-600 rounded-full px-2 py-0.5 text-xs font-bold">
                      {Object.values(filters).filter(v => v !== '').length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                {/* First Row - Type, Division, Search */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Leave Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('leave.type')}
                    </label>
                    <select
                      value={filters.leaveType}
                      onChange={(e) => setFilters({...filters, leaveType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">{t('leave.allTypes')}</option>
                      {leaveTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {t(`leave.${type.labelKey}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Division */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('leave.division')}
                    </label>
                    <select
                      value={filters.divisionId}
                      onChange={(e) => setFilters({...filters, divisionId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">{t('leave.allDivisions')}</option>
                      {divisions.map(div => (
                        <option key={div.id} value={div.id}>
                          {div.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('leave.searchEmployee')}
                    </label>
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                      placeholder={t('leave.nameOrNip')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Date Ranges */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Request Date Range */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">{t('leave.requestDateRange')}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t('leave.from')}</label>
                        <input
                          type="date"
                          value={filters.requestDateFrom}
                          onChange={(e) => setFilters({...filters, requestDateFrom: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t('leave.to')}</label>
                        <input
                          type="date"
                          value={filters.requestDateTo}
                          onChange={(e) => setFilters({...filters, requestDateTo: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Leave Date Range */}
                  <div className="border-l-4 border-green-500 pl-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">{t('leave.leaveDateRange')}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t('leave.from')}</label>
                        <input
                          type="date"
                          value={filters.leaveDateFrom}
                          onChange={(e) => setFilters({...filters, leaveDateFrom: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t('leave.to')}</label>
                        <input
                          type="date"
                          value={filters.leaveDateTo}
                          onChange={(e) => setFilters({...filters, leaveDateTo: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {hasActiveFilters && (
                  <div className="flex justify-end">
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                    >
                      {t('leave.clearAll')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results */}
          {loading ? (
            <div className="text-center py-12">
              <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-4 text-gray-600">{t('common.loading')}</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t('leave.noRequests')}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === 'pending' ? t('leave.noPendingReview') : t('leave.noRequests')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="border rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {request.employee?.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{request.employee?.name}</h3>
                          <p className="text-xs text-gray-500">
                            {request.employee?.division?.name} • {request.employee?.role?.name}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                        {!request.isPaid && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                            Unpaid
                          </span>
                        )}
                      </div>

                      {/* Leave Details */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs mb-1">{t('leave.type')}</p>
                            <p className="font-medium text-gray-900">{getLeaveTypeLabel(request.leaveType)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">{t('leave.startDate')}</p>
                            <p className="font-medium text-gray-900">{formatDate(request.startDate)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">{t('leave.endDate')}</p>
                            <p className="font-medium text-gray-900">{formatDate(request.endDate)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">{t('leave.duration')}</p>
                            <p className="font-medium text-gray-900">{request.totalDays} {t('leave.days')}</p>
                          </div>
                        </div>
                      </div>

                      {/* Reason */}
                      <div className="mb-3">
                        <p className="text-sm text-gray-500 mb-1">{t('leave.reason')}:</p>
                        <p className="text-sm text-gray-900">{request.reason}</p>
                      </div>

                      {/* Attachment */}
                      {request.attachment && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-500 mb-1">{t('leave.attachment')}:</p>
                          <a 
                            href={request.attachment} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {t('leave.viewDocument')} →
                          </a>
                        </div>
                      )}

                      {/* Approval Info */}
                      {request.status !== 'PENDING' && (
                        <div className="mt-3 pt-3 border-t">
                          {request.status === 'APPROVED' && (
                            <p className="text-sm text-green-600">
                              ✓ {t('leave.approvedOn')} {formatDate(request.approvedAt)}
                              {request.currentApprover && ` ${t('leave.by')} ${request.currentApprover.name}`}
                            </p>
                          )}
                          {request.status === 'REJECTED' && (
                            <div className="text-sm">
                              <p className="text-red-600 mb-2">
                                ✗ {t('leave.rejectedOn')} {formatDate(request.rejectedAt)}
                              </p>
                              {request.supervisorComment && (
                                <div className="bg-red-50 p-3 rounded">
                                  <p className="text-xs text-gray-600 mb-1">{t('leave.reason')}:</p>
                                  <p className="text-sm text-red-900">{request.supervisorComment}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-gray-400 mt-3">
                        {t('leave.submitted')} {formatDate(request.createdAt)}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    {request.status === 'PENDING' && (
                      <div className="ml-4 flex flex-col space-y-2">
                        <button
                          onClick={() => openActionModal(request, 'approve')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap"
                        >
                          {t('leave.approve')}
                        </button>
                        <button
                          onClick={() => openActionModal(request, 'reject')}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap"
                        >
                          {t('leave.reject')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {actionType === 'approve' ? t('leave.approve') : t('leave.reject')} {t('leave.request')}
            </h2>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">{t('leave.employee')}: <span className="font-medium text-gray-900">{selectedRequest.employee?.name}</span></p>
              <p className="text-sm text-gray-600">{t('leave.type')}: <span className="font-medium text-gray-900">{getLeaveTypeLabel(selectedRequest.leaveType)}</span></p>
              <p className="text-sm text-gray-600">{t('leave.duration')}: <span className="font-medium text-gray-900">{selectedRequest.totalDays} {t('leave.days')}</span></p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('leave.commentLabel')} {actionType === 'reject' && <span className="text-red-600">*</span>}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('leave.commentPlaceholder')}
                required={actionType === 'reject'}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedRequest(null);
                  setComment('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('leave.cancel')}
              </button>
              <button
                onClick={handleAction}
                disabled={loading}
                className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors ${
                  actionType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:bg-gray-400`}
              >
                {loading ? t('leave.processing') : actionType === 'approve' ? t('leave.approve') : t('leave.reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}