// frontend/src/pages/LeaveApproval.jsx
// MOBILE-RESPONSIVE VERSION - Horizontal tabs, collapsible filters, icon buttons on mobile

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
  const [pendingCount, setPendingCount] = useState(0);

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
        // If we are on the pending tab, we know exactly how many there are
        setPendingCount(response.data.data?.length || 0);
      } else if (isAdmin) {
        const status = activeTab === 'all' ? '' : activeTab.toUpperCase();
        response = await apiClient.get(`/leave/admin/all-requests${status ? `?status=${status}` : ''}`);
        
        // If we are on the 'ALL' tab, update the pending count specifically
        if (activeTab === 'all') {
          const count = response.data.data?.filter(r => r.status === 'PENDING').length || 0;
          setPendingCount(count);
        }
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
    // Validate comment is required for ALL actions (approve, reject)
    if (!comment.trim()) {
      alert(t('leave.commentRequired'));
      return;
    }

    // Validate minimum 20 characters
    if (comment.trim().length < 20) {
      alert('Komentar minimal 20 karakter. Saat ini: ' + comment.trim().length + ' karakter');
      return;
    }

    setLoading(true);
    try {
      const endpoint = actionType === 'approve' ? 'approve' : 'reject';
      await apiClient.post(`/leave/${selectedRequest.id}/${endpoint}`, {
        comment: comment.trim()  // Always send trimmed comment
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
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
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
      {/* Header - Mobile Optimized */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('leave.approvalTitle')}</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">{t('leave.reviewApprove')}</p>
      </div>

      {/* Content Card */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Tabs - Mobile: Horizontal Scroll, Desktop: Normal */}
        <div className="border-b border-gray-200">
          {/* Mobile: Horizontal scrollable tabs */}
          <nav className="flex sm:hidden overflow-x-auto scrollbar-hide px-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-shrink-0 px-3 py-3 border-b-2 font-medium text-xs whitespace-nowrap ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {t('leave.pending')}
              {pendingCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex-shrink-0 px-3 py-3 border-b-2 font-medium text-xs whitespace-nowrap ${
                    activeTab === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500'
                  }`}
                >
                  {t('leave.allRequests')}
                </button>
                <button
                  onClick={() => setActiveTab('approved')}
                  className={`flex-shrink-0 px-3 py-3 border-b-2 font-medium text-xs whitespace-nowrap ${
                    activeTab === 'approved'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500'
                  }`}
                >
                  {t('leave.approved')}
                </button>
                <button
                  onClick={() => setActiveTab('rejected')}
                  className={`flex-shrink-0 px-3 py-3 border-b-2 font-medium text-xs whitespace-nowrap ${
                    activeTab === 'rejected'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500'
                  }`}
                >
                  {t('leave.rejected')}
                </button>
              </>
            )}
          </nav>

          {/* Desktop: Normal flex tabs */}
          <nav className="hidden sm:flex">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('leave.pending')}
              {pendingCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {pendingCount}
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
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('leave.approved')}
                </button>
                <button
                  onClick={() => setActiveTab('rejected')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'rejected'
                      ? 'border-red-500 text-red-600'
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
        <div className="p-4 sm:p-6">
          {/* Filter Section - Mobile Optimized */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center flex-wrap gap-2 sm:gap-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  {activeTab === 'pending' ? t('leave.pendingRequests') : 
                   activeTab === 'all' ? t('leave.allRequests') : 
                   activeTab === 'approved' ? t('leave.approvedRequests') : t('leave.rejectedRequests')}
                </h3>
                <span className="text-xs sm:text-sm text-gray-500">
                  ({requests.length} {requests.length === 1 ? t('leave.request') : t('leave.requests')})
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {hasActiveFilters && (
                  <span className="text-xs sm:text-sm text-blue-600 font-medium">
                    {requests.length} {t('leave.of')} {allRequests.length} {t('leave.shown')}
                  </span>
                )}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-3 sm:px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm ${
                    showFilters || hasActiveFilters
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="hidden sm:inline">{t('leave.filter')}</span>
                  {hasActiveFilters && (
                    <span className="bg-white text-blue-600 rounded-full px-2 py-0.5 text-xs font-bold">
                      {Object.values(filters).filter(v => v !== '').length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Filter Panel - Mobile Optimized */}
            {showFilters && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 space-y-4">
                {/* First Row - Type, Division, Search */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Leave Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('leave.type')}
                    </label>
                    <select
                      value={filters.leaveType}
                      onChange={(e) => setFilters({...filters, leaveType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                {/* Date Ranges - Mobile: Stack, Desktop: Grid */}
                <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
                  {/* Request Date Range */}
                  <div className="border-l-4 border-blue-500 pl-3 sm:pl-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">{t('leave.requestDateRange')}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t('leave.from')}</label>
                        <input
                          type="date"
                          value={filters.requestDateFrom}
                          onChange={(e) => setFilters({...filters, requestDateFrom: e.target.value})}
                          className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t('leave.to')}</label>
                        <input
                          type="date"
                          value={filters.requestDateTo}
                          onChange={(e) => setFilters({...filters, requestDateTo: e.target.value})}
                          className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Leave Date Range */}
                  <div className="border-l-4 border-green-500 pl-3 sm:pl-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">{t('leave.leaveDateRange')}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t('leave.from')}</label>
                        <input
                          type="date"
                          value={filters.leaveDateFrom}
                          onChange={(e) => setFilters({...filters, leaveDateFrom: e.target.value})}
                          className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t('leave.to')}</label>
                        <input
                          type="date"
                          value={filters.leaveDateTo}
                          onChange={(e) => setFilters({...filters, leaveDateTo: e.target.value})}
                          className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clear Button */}
                {hasActiveFilters && (
                  <div className="flex justify-end">
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium hover:bg-white rounded-lg transition-colors"
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
              <p className="mt-4 text-sm text-gray-600">{t('common.loading')}</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 px-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t('leave.noRequests')}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === 'pending' ? t('leave.noPendingReview') : t('leave.noRequests')}
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-4 sm:p-5">
                    <div className="sm:flex sm:gap-4">
                      <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {request.employee?.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{request.employee?.name}</h3>
                            <p className="text-xs text-gray-500 truncate">
                              {request.employee?.division?.name} • {request.employee?.role?.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {getStatusBadge(request.status)}
                            {!request.isPaid && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full whitespace-nowrap">
                                Unpaid
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Leave Details */}
                        <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-3">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-sm">
                            <div>
                              <p className="text-gray-500 text-xs mb-1">{t('leave.type')}</p>
                              <p className="font-medium text-gray-900 text-xs sm:text-sm truncate">{getLeaveTypeLabel(request.leaveType)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-1">{t('leave.startDate')}</p>
                              <p className="font-medium text-gray-900 text-xs sm:text-sm">{formatDate(request.startDate)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-1">{t('leave.endDate')}</p>
                              <p className="font-medium text-gray-900 text-xs sm:text-sm">{formatDate(request.endDate)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-1">{t('leave.duration')}</p>
                              <p className="font-medium text-gray-900 text-xs sm:text-sm">{request.totalDays} {t('leave.days')}</p>
                            </div>
                          </div>
                        </div>

                        {/* Reason */}
                        <div className="mb-3">
                          <p className="text-xs sm:text-sm text-gray-500 mb-1">{t('leave.reason')}:</p>
                          <p className="text-xs sm:text-sm text-gray-900 break-words">{request.reason}</p>
                        </div>

                        {/* Attachment */}
                        {request.attachment && (
                          <div className="mb-3">
                            <p className="text-xs sm:text-sm text-gray-500 mb-1">{t('leave.attachment')}:</p>
                            <a 
                              href={request.attachment} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs sm:text-sm text-blue-600 hover:underline"
                            >
                              {t('leave.viewDocument')} →
                            </a>
                          </div>
                        )}

                        {/* Approval Info */}
                        {request.status !== 'PENDING' && (
                          <div className="mt-3 pt-3 border-t">
                            {request.status === 'APPROVED' && (
                              <p className="text-xs sm:text-sm text-green-600">
                                ✓ {t('leave.approvedOn')} {formatDate(request.approvedAt)}
                                {request.currentApprover && ` ${t('leave.by')} ${request.currentApprover.name}`}
                              </p>
                            )}
                            {request.status === 'REJECTED' && (
                              <div className="text-xs sm:text-sm">
                                <p className="text-red-600 mb-2">
                                  ✗ {t('leave.rejectedOn')} {formatDate(request.rejectedAt)}
                                </p>
                                {request.supervisorComment && (
                                  <div className="bg-red-50 p-2 sm:p-3 rounded">
                                    <p className="text-xs text-gray-600 mb-1">{t('leave.reason')}:</p>
                                    <p className="text-xs sm:text-sm text-red-900 break-words">{request.supervisorComment}</p>
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

                      {/* Action Buttons - Mobile: Icon Only Row, Desktop: Stacked */}
                      {request.status === 'PENDING' && (
                        <div className="flex gap-2 sm:flex-col sm:justify-center sm:space-y-2 sm:gap-0 mt-3 sm:mt-0 sm:min-w-[140px]">
                          <button
                            onClick={() => openActionModal(request, 'approve')}
                            className="flex-1 sm:flex-none px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center"
                            title={t('leave.approve')}
                          >
                            {/* Mobile: Icon only */}
                            <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {/* Desktop: Text */}
                            <span className="hidden sm:inline text-sm">{t('leave.approve')}</span>
                          </button>
                          <button
                            onClick={() => openActionModal(request, 'reject')}
                            className="flex-1 sm:flex-none px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center"
                            title={t('leave.reject')}
                          >
                            {/* Mobile: Icon only */}
                            <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {/* Desktop: Text */}
                            <span className="hidden sm:inline text-sm">{t('leave.reject')}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Modal - Mobile Optimized */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold mb-4">
                {actionType === 'approve' ? t('leave.approve') : t('leave.reject')} {t('leave.request')}
              </h2>

              <div className="mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg space-y-2">
                <p className="text-sm text-gray-600 break-words">
                  {t('leave.employee')}: <span className="font-medium text-gray-900">{selectedRequest.employee?.name}</span>
                </p>
                <p className="text-sm text-gray-600">
                  {t('leave.type')}: <span className="font-medium text-gray-900">{getLeaveTypeLabel(selectedRequest.leaveType)}</span>
                </p>
                <p className="text-sm text-gray-600">
                  {t('leave.duration')}: <span className="font-medium text-gray-900">{selectedRequest.totalDays} {t('leave.days')}</span>
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('leave.commentLabel')} <span className="text-red-600">*</span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({t('leave.minCharacters')}: {comment.trim().length})
                  </span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows="4"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                    comment.trim().length > 0 && comment.trim().length < 20 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder={t('leave.commentPlaceholder')}
                  required
                />
                {comment.trim().length > 0 && comment.trim().length < 20 && (
                  <p className="mt-1 text-xs text-red-600">
                    {/* Kurang {20 - comment.trim().length} karakter lagi */}
                    {comment.trim().length} / 20 {t('leave.characters')}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedRequest(null);
                    setComment('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  {t('leave.cancel')}
                </button>
                <button
                  onClick={handleAction}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors text-sm font-medium ${
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
        </div>
      )}
    </div>
  );
}