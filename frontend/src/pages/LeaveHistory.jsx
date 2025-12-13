// frontend/src/pages/LeaveHistory.jsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';

export default function LeaveHistory() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('submit');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]); // Store unfiltered data
  const [balance, setBalance] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState(null);

  // Filter state
  const [filters, setFilters] = useState({
    leaveType: '',
    requestDateFrom: '',
    requestDateTo: '',
    leaveDateFrom: '',
    leaveDateTo: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    leaveType: 'ANNUAL_LEAVE',
    startDate: '',
    endDate: '',
    reason: '',
    attachment: null
  });

  const leaveTypes = [
    { value: 'ANNUAL_LEAVE', labelKey: 'annualLeave', isPaid: true, requiresAttachment: false },
    { value: 'SICK_LEAVE', labelKey: 'sickLeave', isPaid: true, requiresAttachment: true, noteKey: 'attachmentNote' },
    { value: 'MATERNITY_LEAVE', labelKey: 'maternityLeave', isPaid: true, requiresAttachment: false },
    { value: 'MENSTRUAL_LEAVE', labelKey: 'menstrualLeave', isPaid: true, requiresAttachment: false },
    { value: 'MARRIAGE_LEAVE', labelKey: 'marriageLeave', isPaid: true, requiresAttachment: false },
    { value: 'UNPAID_LEAVE', labelKey: 'unpaidLeave', isPaid: false, requiresAttachment: false, noteKey: 'unpaidNote' }
  ];

  useEffect(() => {
    fetchLeaveData();
    fetchLeaveBalance();
  }, []);

  // Apply filters when filters change
  useEffect(() => {
    applyFilters();
  }, [filters, allRequests]);

  const fetchLeaveData = async () => {
    try {
      const [requestsRes, balanceRes] = await Promise.all([
        apiClient.get('/leave/my-requests'),
        apiClient.get('/leave/my-balance')
      ]);
      setAllRequests(requestsRes.data.data || []);
      setRequests(requestsRes.data.data || []);
      setBalance(balanceRes.data.data || null);
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const response = await apiClient.get(`/leave/balance/${currentYear}`);
      setLeaveBalance(response.data.data);
    } catch (error) {
      console.error('Failed to fetch leave balance:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...allRequests];

    // Filter by leave type
    if (filters.leaveType) {
      filtered = filtered.filter(req => req.leaveType === filters.leaveType);
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(req => req.status === filters.status);
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
      status: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end
    return diffDays;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totalDays = calculateDays(formData.startDate, formData.endDate);

      const submitData = {
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        totalDays,
        reason: formData.reason,
        attachment: formData.attachment || null
      };

      await apiClient.post('/leave/submit', submitData);
      
      alert(t('leave.submitSuccess'));
      
      // Reset form
      setFormData({
        leaveType: 'ANNUAL_LEAVE',
        startDate: '',
        endDate: '',
        reason: '',
        attachment: null
      });
      
      // Refresh data
      fetchLeaveData();
      setActiveTab('history');
    } catch (error) {
      console.error('Submit error:', error);
      const errorMsg = error.response?.data?.details?.join(', ') || error.response?.data?.error || t('leave.submitError');
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (requestId) => {
    if (!confirm(t('leave.deleteConfirm'))) return;

    try {
      await apiClient.delete(`/leave/${requestId}`);
      alert(t('leave.deleteSuccess'));
      fetchLeaveData();
    } catch (error) {
      console.error('Delete error:', error);
      alert(error.response?.data?.error || t('leave.deleteError'));
    }
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
    const leaveType = leaveTypes.find(t => t.value === type);
    return leaveType ? t(`leave.${leaveType.labelKey}`) : type;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const selectedLeaveType = leaveTypes.find(t => t.value === formData.leaveType);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('leave.management')}</h1>
        <p className="text-sm text-gray-600 mt-1">{t('leave.submitManage')}</p>
      </div>

      {/* Balance Cards */}
      {console.log('Leave Balance:', leaveBalance) }
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Annual Quota */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">{t('leave.annualQuota')}</h3>
            <svg className="w-6 h-6 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-3xl font-bold">
            {leaveBalance?.annualQuota || 14} {t('leave.days')}
          </p>
          <p className="text-xs opacity-75 mt-1">{t('leave.baseAllocation')}</p>
        </div>

        {/* TOIL Balance */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">{t('leave.toilBalance')}</h3>
            <svg className="w-6 h-6 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">
            {leaveBalance?.toilBalance || 0} {t('leave.days')}
          </p>
          <p className="text-xs opacity-75 mt-1">{t('leave.toilFull')}</p>
        </div>

        {/* Used */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">{t('leave.used')}</h3>
            <svg className="w-6 h-6 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">
            {(leaveBalance?.annualUsed || 0) + (leaveBalance?.toilUsed || 0)} {t('leave.days')}
          </p>
          <p className="text-xs opacity-75 mt-1">
            {t('leave.annual')}: {leaveBalance?.annualUsed || 0} | {t('leave.toilBalance')}: {leaveBalance?.toilUsed || 0}
          </p>
        </div>

        {/* Available */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">{t('leave.available')}</h3>
            <svg className="w-6 h-6 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">
            {(leaveBalance?.annualRemaining || 0) + (leaveBalance?.toilBalance || 0)} {t('leave.days')}
          </p>
          <p className="text-xs opacity-75 mt-1">
            {t('leave.annual')}: {leaveBalance?.annualRemaining || 0} | {t('leave.toilBalance')}: {leaveBalance?.toilBalance || 0}
          </p>
        </div>
      </div>

      {/* Leave Balance Card */}
      {/* {balance && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 mb-6 text-white">
          <h2 className="text-lg font-semibold mb-4">Your Leave Balance ({balance.year})</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/20 rounded-lg p-4">
              <p className="text-sm opacity-90">Annual Quota</p>
              <p className="text-2xl font-bold">{balance.annualQuota} days</p>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <p className="text-sm opacity-90">Used</p>
              <p className="text-2xl font-bold">{balance.annualUsed} days</p>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <p className="text-sm opacity-90">Remaining</p>
              <p className="text-2xl font-bold">{balance.annualRemaining} days</p>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <p className="text-sm opacity-90">Sick Leave</p>
              <p className="text-2xl font-bold">{balance.sickLeaveUsed} days</p>
            </div>
          </div>
        </div>
      )} */}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('submit')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'submit'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('leave.submitLeave')}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('leave.leaveHistory')}
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Submit Tab */}
          {activeTab === 'submit' && (
            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
              {/* Leave Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('leave.type')} *
                </label>
                <select
                  required
                  value={formData.leaveType}
                  onChange={(e) => setFormData({...formData, leaveType: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {leaveTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {t(`leave.${type.labelKey}`)} {!type.isPaid && `(${t('leave.unpaidLeave')})`}
                    </option>
                  ))}
                </select>
                {selectedLeaveType?.noteKey && (
                  <p className="mt-1 text-xs text-gray-500">ℹ️ {t(`leave.${selectedLeaveType.noteKey}`)}</p>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('leave.startDate')} *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('leave.endDate')} *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Total Days Display */}
              {formData.startDate && formData.endDate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">{t('leave.duration')}:</span> {calculateDays(formData.startDate, formData.endDate)} {t('leave.days')}
                  </p>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('leave.reason')} *
                </label>
                <textarea
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('leave.writeReason')}
                />
              </div>

              {/* Attachment (for sick leave) */}
              {selectedLeaveType?.requiresAttachment && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('leave.attachment')}
                    {formData.leaveType === 'SICK_LEAVE' && ` - ${t('leave.attachmentNote')}`}
                  </label>
                  <input
                    type="text"
                    value={formData.attachment || ''}
                    onChange={(e) => setFormData({...formData, attachment: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter document URL or file path"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Upload your document to cloud storage and paste the URL here
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
              >
                {loading ? t('leave.submitting') : t('leave.submitRequest')}
              </button>
            </form>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              {/* Filter Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('leave.leaveHistory')} ({requests.length})
                  </h3>
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

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('leave.status')}
                        </label>
                        <select
                          value={filters.status}
                          onChange={(e) => setFilters({...filters, status: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">{t('leave.allStatuses')}</option>
                          <option value="PENDING">{t('leave.pending')}</option>
                          <option value="APPROVED">{t('leave.approved')}</option>
                          <option value="REJECTED">{t('leave.rejected')}</option>
                        </select>
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
                            <label className="block text-xs text-gray-600 mb-1">From</label>
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
              {requests.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">{t('leave.noRequests')}</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by submitting your first leave request.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {getLeaveTypeLabel(request.leaveType)}
                            </h3>
                            {getStatusBadge(request.status)}
                            {!request.isPaid && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                                Unpaid
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                            <div>
                              <span className="font-medium">Start:</span> {formatDate(request.startDate)}
                            </div>
                            <div>
                              <span className="font-medium">End:</span> {formatDate(request.endDate)}
                            </div>
                            <div>
                              <span className="font-medium">Duration:</span> {request.totalDays} day(s)
                            </div>
                            <div>
                              <span className="font-medium">Submitted:</span> {formatDate(request.createdAt)}
                            </div>
                          </div>

                          <div className="text-sm text-gray-700 mb-2">
                            <span className="font-medium">Reason:</span> {request.reason}
                          </div>

                          {request.currentApprover && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Current Approver:</span> {request.currentApprover.name}
                            </div>
                          )}

                          {request.status === 'APPROVED' && request.approvedAt && (
                            <div className="mt-2 text-sm text-green-600">
                              ✓ Approved on {formatDate(request.approvedAt)}
                            </div>
                          )}

                          {request.status === 'REJECTED' && request.supervisorComment && (
                            <div className="mt-2 p-3 bg-red-50 rounded text-sm text-red-800">
                              <span className="font-medium">Rejection Reason:</span> {request.supervisorComment}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        {request.status === 'PENDING' && (
                          <button
                            onClick={() => handleDelete(request.id)}
                            className="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}