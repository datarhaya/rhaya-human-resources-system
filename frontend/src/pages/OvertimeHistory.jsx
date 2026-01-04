// frontend/src/pages/OvertimeHistory.jsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getMyOvertimeRequests, getMyOvertimeBalance, deleteOvertimeRequest } from '../api/client';
import apiClient from '../api/client';  
import { format } from 'date-fns';


export default function OvertimeHistory() {
  const [requests, setRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]); // Store unfiltered
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, PENDING, APPROVED, REJECTED
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const { t } = useTranslation();

  // Advanced filter state
  const [filters, setFilters] = useState({
    requestDateFrom: '',
    requestDateTo: '',
    overtimeDateFrom: '',
    overtimeDateTo: '',
    hoursMin: '',
    hoursMax: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchData();
    fetchLeaveBalance();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [filters, statusFilter, allRequests]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all requests
      const requestsData = await getMyOvertimeRequests({});
      setAllRequests(requestsData);
      setRequests(requestsData);

      // Fetch balance
      const balanceData = await getMyOvertimeBalance();
      setBalance(balanceData);

      setError('');
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
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

    // Filter by status tab
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter);
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

    // Filter by overtime date range (check if any entry is within range)
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
      requestDateFrom: '',
      requestDateTo: '',
      overtimeDateFrom: '',
      overtimeDateTo: '',
      hoursMin: '',
      hoursMax: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  // Handle delete request
  const handleDelete = async (requestId) => {
    if (!confirm(t('overtime.deleteConfirm'))) {
      return;
    }

    try {
      setDeleteLoading(requestId);
      await deleteOvertimeRequest(requestId);
      
      // Refresh data
      await fetchData();
      
    } catch (err) {
      console.error('Delete error:', err);
      alert(err.response?.data?.error || 'Failed to delete request');
    } finally {
      setDeleteLoading(null);
    }
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      REVISION_REQUESTED: 'bg-orange-100 text-orange-800'
    };

    const labels = {
      PENDING: t('overtime.pending'),
      APPROVED: t('overtime.approved'),
      REJECTED: t('overtime.rejected'),
      REVISION_REQUESTED: t('overtime.revisionRequested')
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  // Helper function to truncate text
  const truncateText = (text, maxLength = 80) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Filter stats
  const stats = {
    all: allRequests.length,
    PENDING: allRequests.filter(r => r.status === 'PENDING').length,
    APPROVED: allRequests.filter(r => r.status === 'APPROVED').length,
    REJECTED: allRequests.filter(r => r.status === 'REJECTED').length,
    REVISION_REQUESTED: allRequests.filter(r => r.status === 'REVISION_REQUESTED').length
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('nav.overtime')}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {t('overtime.viewManageRequests')}
          </p>
        </div>
        <Link
          to="/overtime/request"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          {t('overtime.submitOvertimeButton')}
        </Link>
      </div>

      {/* Balance Card */}
      {balance && (
        <div className="mb-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold mb-1">{t('overtime.yourOvertimeBalance')}</h2>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-bold">{balance.currentBalance.toFixed(1)}</span>
                <span className="text-xl">{t('overtime.hours')}</span>
              </div>
              <p className="text-blue-100 text-sm mt-2">
                {(balance.currentBalance / 8).toFixed(2)} {t('overtime.workingDays')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-100">{t('overtime.pendingHours')}</p>
              <p className="text-2xl font-semibold">{balance.pendingHours.toFixed(1)}</p>
            </div>
          </div>
          
          {leaveBalance && (
            <div className="mt-4 pt-4 border-t border-blue-400">
              <div className="flex justify-between text-sm">
                <span className="text-blue-100">{t('overtime.convertedToLeave')}</span>
                <span className="font-semibold">{leaveBalance.overtimeConverted || 0} {t('overtime.days')}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Advanced Filters */}
      <div className="mb-4 bg-white rounded-lg shadow p-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center text-sm font-medium text-gray-700">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {showFilters ? t('overtime.hideFilters') : t('overtime.showFilters')}
            {hasActiveFilters && (
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full">
                {Object.values(filters).filter(v => v !== '').length}
              </span>
            )}
          </div>
          <svg 
            className={`w-5 h-5 text-gray-400 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('overtime.to')}</label>
                    <input
                      type="date"
                      value={filters.requestDateTo}
                      onChange={(e) => setFilters({...filters, requestDateTo: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('overtime.to')}</label>
                    <input
                      type="date"
                      value={filters.overtimeDateTo}
                      onChange={(e) => setFilters({...filters, overtimeDateTo: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            {hasActiveFilters && (
              <div className="flex justify-end mt-4">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  {t('overtime.clearFilters')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 border-b border-gray-200 bg-white rounded-t-lg px-4">
        <nav className="-mb-px flex space-x-6">
          {['all', 'PENDING', 'APPROVED', 'REVISION_REQUESTED', 'REJECTED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`pb-3 pt-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                statusFilter === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'all' 
                ? t('overtime.allRequests') 
                : t(`overtime.${tab.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())}`)}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                statusFilter === tab ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {tab === 'all' ? stats.all : stats[tab]}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 bg-white rounded-b-lg">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && requests.length === 0 && (
        <div className="text-center py-12 bg-white rounded-b-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {hasActiveFilters ? 'No results found' : 'No overtime requests'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {hasActiveFilters 
              ? 'Try adjusting your filters to see more results.'
              : 'Get started by submitting your first overtime request.'}
          </p>
          <div className="mt-6">
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Clear Filters
              </button>
            ) : (
              <Link
                to="/overtime/request"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Submit Overtime
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Requests List - Updated Display Format */}
      {!loading && requests.length > 0 && (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <StatusBadge status={request.status} />
                      <span className="text-sm text-gray-500">
                        {t('overtime.submittedOn')} {format(new Date(request.submittedAt), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 ml-4">
                    {(request.status === 'PENDING' || request.status === 'REVISION_REQUESTED') && (
                      <>
                        <Link
                          to={`/overtime/edit/${request.id}`}
                          className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100"
                        >
                          {t('overtime.edit')}
                        </Link>
                        <button
                          onClick={() => handleDelete(request.id)}
                          disabled={deleteLoading === request.id}
                          className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50"
                        >
                          {deleteLoading === request.id ? t('overtime.deleting') : t('overtime.delete')}
                        </button>
                      </>
                    )}
                    {request.status === 'REJECTED' && (
                      <button
                        onClick={() => handleDelete(request.id)}
                        disabled={deleteLoading === request.id}
                        className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50"
                      >
                        {deleteLoading === request.id ? t('overtime.deleting') : t('overtime.delete')}
                      </button>
                    )}
                    <Link
                      to={`/overtime/detail/${request.id}`}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                    >
                      {t('overtime.viewDetails')}
                    </Link>
                  </div>
                </div>

                {/* Improved Display Section - Matching Admin View */}
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

                {/* Approver Info */}
                <div className="flex items-center justify-between text-sm">
                  <p className="text-gray-600">
                    {t('overtime.approver')}: <span className="font-medium text-gray-900">{request.currentApprover?.name || 'N/A'}</span>
                  </p>
                  {request.status !== 'PENDING' && request.currentApprover && (
                    <p className="text-gray-600">
                      {request.status === 'APPROVED' ? `✓ ${t('overtime.approvedBy')}` : `✗ ${t('overtime.rejectedBy')}`} {request.currentApprover.name}
                    </p>
                  )}
                </div>

                {/* Approval Comments */}
                {(request.supervisorComment || request.divisionHeadComment) && (
                  <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-100">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">{t('overtime.comments')}</h4>
                    {request.supervisorComment && (
                      <p className="text-sm text-blue-800">
                        <strong>{t('overtime.supervisor')}:</strong> {request.supervisorComment}
                      </p>
                    )}
                    {request.divisionHeadComment && (
                      <p className="text-sm text-blue-800 mt-1">
                        <strong>{t('overtime.divisionHead')}:</strong> {request.divisionHeadComment}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}