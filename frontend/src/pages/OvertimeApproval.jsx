// frontend/src/pages/OvertimeApproval.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import { format } from 'date-fns';

export default function OvertimeApproval() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [comment, setComment] = useState('');

  // Filter state
  const [filters, setFilters] = useState({
    divisionId: '',
    search: '',
    requestDateFrom: '',
    requestDateTo: '',
    overtimeDateFrom: '',
    overtimeDateTo: '',
    hoursMin: '',
    hoursMax: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const isAdmin = user?.accessLevel === 1;

  useEffect(() => {
    fetchRequests();
  }, [activeTab]);

  useEffect(() => {
    fetchDivisions();
  }, []);

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
        response = await apiClient.get('/overtime/pending-approval/list');
      } else if (activeTab === 'revision') {
        // Fetch revision requests
        response = await apiClient.get('/overtime/admin/all-requests?status=REVISION_REQUESTED');
      } else if (isAdmin) {
        const status = activeTab === 'all' ? '' : activeTab.toUpperCase();
        response = await apiClient.get(`/overtime/admin/all-requests${status ? `?status=${status}` : ''}`);
      } else {
        response = { data: { data: [] } };
      }
      setAllRequests(response.data.data || []);
      setRequests(response.data.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      alert(t('overtime.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allRequests];

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
        new Date(req.submittedAt) >= new Date(filters.requestDateFrom)
      );
    }
    if (filters.requestDateTo) {
      filtered = filtered.filter(req => 
        new Date(req.submittedAt) <= new Date(filters.requestDateTo + 'T23:59:59')
      );
    }

    // Filter by overtime date range
    if (filters.overtimeDateFrom || filters.overtimeDateTo) {
      filtered = filtered.filter(req => {
        return req.entries.some(entry => {
          const entryDate = new Date(entry.date);
          const matchFrom = !filters.overtimeDateFrom || entryDate >= new Date(filters.overtimeDateFrom);
          const matchTo = !filters.overtimeDateTo || entryDate <= new Date(filters.overtimeDateTo);
          return matchFrom && matchTo;
        });
      });
    }

    // Filter by hours range
    if (filters.hoursMin) {
      filtered = filtered.filter(req => req.totalHours >= parseFloat(filters.hoursMin));
    }
    if (filters.hoursMax) {
      filtered = filtered.filter(req => req.totalHours <= parseFloat(filters.hoursMax));
    }

    setRequests(filtered);
  };

  const clearFilters = () => {
    setFilters({
      divisionId: '',
      search: '',
      requestDateFrom: '',
      requestDateTo: '',
      overtimeDateFrom: '',
      overtimeDateTo: '',
      hoursMin: '',
      hoursMax: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  const handleAction = async () => {
    if ((actionType === 'reject' || actionType === 'revision') && !comment.trim()) {
      alert(t('overtime.commentRequired'));
      return;
    }

    setLoading(true);
    try {
      const endpoint = actionType === 'approve' ? 'approve' : 
                      actionType === 'reject' ? 'reject' : 'request-revision';
      
      await apiClient.post(`/overtime/${selectedRequest.id}/${endpoint}`, {
        comment: comment || null
      });

      alert(t('overtime.actionSuccess'));
      setShowModal(false);
      setSelectedRequest(null);
      setComment('');
      fetchRequests();
    } catch (error) {
      console.error('Action error:', error);
      alert(error.response?.data?.error || t('overtime.actionFailed'));
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
      REJECTED: 'bg-red-100 text-red-800',
      REVISION_REQUESTED: 'bg-orange-100 text-orange-800'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  // Helper function to truncate text
  const truncateText = (text, maxLength = 80) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('overtime.approvalTitle')}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {t('overtime.reviewAndApprove')}
        </p>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('overtime.pending')}
            </button>
            <button
              onClick={() => setActiveTab('revision')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'revision'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('overtime.revision')}
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t('overtime.all')}
                </button>
                <button
                  onClick={() => setActiveTab('approved')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'approved'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t('overtime.approved')}
                </button>
                <button
                  onClick={() => setActiveTab('rejected')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'rejected'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t('overtime.rejected')}
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Filters Section */}
        {isAdmin && (
          <div className="p-6 border-b border-gray-200">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {showFilters ? t('overtime.hideFilters') : t('overtime.showFilters')}
              {hasActiveFilters && (
                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full">
                  {Object.values(filters).filter(v => v !== '').length}
                </span>
              )}
            </button>

            {showFilters && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Division Filter */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('overtime.division')}
                  </label>
                  <select
                    value={filters.divisionId}
                    onChange={(e) => setFilters({...filters, divisionId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('overtime.allDivisions')}</option>
                    {divisions.map(div => (
                      <option key={div.id} value={div.id}>{div.name}</option>
                    ))}
                  </select>
                </div>

                {/* Search Filter */}
                <div className="border-l-4 border-green-500 pl-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('overtime.searchEmployee')}
                  </label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    placeholder={t('overtime.searchPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Request Date Range */}
                <div className="border-l-4 border-yellow-500 pl-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">{t('overtime.requestDateRange')}</p>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">{t('overtime.from')}</label>
                      <input
                        type="date"
                        value={filters.requestDateFrom}
                        onChange={(e) => setFilters({...filters, requestDateFrom: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">{t('overtime.to')}</label>
                      <input
                        type="date"
                        value={filters.requestDateTo}
                        onChange={(e) => setFilters({...filters, requestDateTo: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Overtime Date Range */}
                <div className="border-l-4 border-orange-500 pl-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">{t('overtime.overtimeDateRange')}</p>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">{t('overtime.from')}</label>
                      <input
                        type="date"
                        value={filters.overtimeDateFrom}
                        onChange={(e) => setFilters({...filters, overtimeDateFrom: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">{t('overtime.to')}</label>
                      <input
                        type="date"
                        value={filters.overtimeDateTo}
                        onChange={(e) => setFilters({...filters, overtimeDateTo: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Hours Range */}
                <div className="border-l-4 border-purple-500 pl-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">{t('overtime.hoursRange')}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">{t('overtime.minHours')}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={filters.hoursMin}
                        onChange={(e) => setFilters({...filters, hoursMin: e.target.value})}
                        placeholder="e.g., 8"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">{t('overtime.maxHours')}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={filters.hoursMax}
                        onChange={(e) => setFilters({...filters, hoursMax: e.target.value})}
                        placeholder="e.g., 40"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="flex justify-end">
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                    >
                      {t('overtime.clearAll')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('common.loading')}</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('overtime.noRequestsFound')}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {hasActiveFilters ? t('overtime.tryAdjustingFilters') : t('overtime.noRequestsForTab')}
            </p>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            {requests.map((request) => (
              <div key={request.id} className="border rounded-lg p-5 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
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
                    </div>

                    {/* Improved Display Section */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Total Hours */}
                        <div>
                          <p className="text-gray-500 text-xs mb-1">{t('overtime.totalHours')}</p>
                          <p className="font-semibold text-gray-900">{request.totalHours} {t('overtime.hours')}</p>
                        </div>

                        {/* Overtime Dates */}
                        <div>
                          <p className="text-gray-500 text-xs mb-1">{t('overtime.overtimeDates')}</p>
                          <div className="text-sm text-gray-900">
                            {request.entries && request.entries.length > 0 ? (
                              <ul className="list-disc list-inside space-y-0.5">
                                {request.entries.slice(0, 3).map((entry, idx) => (
                                  <li key={idx} className="text-xs">
                                    {format(new Date(entry.date), 'MMM dd, yyyy')} ({entry.hours}h)
                                  </li>
                                ))}
                                {request.entries.length > 3 && (
                                  <li className="text-xs text-blue-600 font-medium">
                                    +{request.entries.length - 3} more dates
                                  </li>
                                )}
                              </ul>
                            ) : (
                              <span className="text-xs text-gray-400">No dates</span>
                            )}
                          </div>
                        </div>

                        {/* Submitted On */}
                        <div>
                          <p className="text-gray-500 text-xs mb-1">{t('overtime.submittedOn')}</p>
                          <p className="font-semibold text-gray-900 text-sm">
                            {format(new Date(request.submittedAt), 'MMM dd, yyyy')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(request.submittedAt), 'HH:mm')}
                          </p>
                        </div>
                      </div>

                      {/* Entry Descriptions */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-gray-500 text-xs mb-2">{t('overtime.entryDescriptions')}</p>
                        <div className="space-y-2">
                          {request.entries && request.entries.slice(0, 2).map((entry, idx) => (
                            <div key={idx} className="flex items-start space-x-2">
                              <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                              <p className="text-xs text-gray-700">
                                <span className="font-medium">{format(new Date(entry.date), 'MMM dd')}:</span> {truncateText(entry.description, 80)}
                              </p>
                            </div>
                          ))}
                          {request.entries && request.entries.length > 2 && (
                            <p className="text-xs text-blue-600 font-medium pl-4">
                              +{request.entries.length - 2} more entries
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {request.status !== 'PENDING' && request.currentApprover && (
                      <p className="text-sm text-gray-600">
                        {request.status === 'APPROVED' ? `✓ ${t('overtime.approvedBy')}` : `✗ ${t('overtime.rejectedBy')}`} {request.currentApprover.name}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="ml-4 flex flex-col space-y-2">
                    {/* View Details Button (always visible for admin) */}
                    {isAdmin && (
                      <Link
                        to={`/overtime/detail/${request.id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium text-center"
                      >
                        {t('overtime.viewDetails')}
                      </Link>
                    )}

                    {/* Action buttons only for pending/revision requests */}
                    {(request.status === 'PENDING' || request.status === 'REVISION_REQUESTED') && (
                      <>
                        <button
                          onClick={() => openActionModal(request, 'approve')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                        >
                          {t('overtime.approve')}
                        </button>
                        <button
                          onClick={() => openActionModal(request, 'reject')}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                        >
                          {t('overtime.reject')}
                        </button>
                        <button
                          onClick={() => openActionModal(request, 'revision')}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
                        >
                          {t('overtime.requestRevision')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 capitalize">
              {actionType === 'approve' ? t('overtime.approve') : 
               actionType === 'reject' ? t('overtime.reject') : 
               t('overtime.requestRevision')} {t('overtime.overtimeRequest')}
            </h2>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm"><span className="font-medium">{t('overtime.employee')}:</span> {selectedRequest.employee?.name}</p>
              <p className="text-sm"><span className="font-medium">{t('overtime.totalHours')}:</span> {selectedRequest.totalHours}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('overtime.commentLabel')} {(actionType === 'reject' || actionType === 'revision') && '*'}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows="4"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder={t('overtime.commentPlaceholder')}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                {t('overtime.cancel')}
              </button>
              <button
                onClick={handleAction}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? t('overtime.processing') : t('overtime.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}