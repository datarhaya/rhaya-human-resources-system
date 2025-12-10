// frontend/src/pages/OvertimeApproval.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import { format } from 'date-fns';

export default function OvertimeApproval() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      alert('Failed to fetch overtime requests');
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
      alert('Please provide a comment');
      return;
    }

    setLoading(true);
    try {
      const endpoint = actionType === 'approve' ? 'approve' : 
                      actionType === 'reject' ? 'reject' : 'request-revision';
      
      await apiClient.post(`/overtime/${selectedRequest.id}/${endpoint}`, {
        comment: comment || null
      });

      alert(`Overtime request ${actionType}d successfully`);
      setShowModal(false);
      setSelectedRequest(null);
      setComment('');
      fetchRequests();
    } catch (error) {
      console.error('Action error:', error);
      alert(error.response?.data?.error || `Failed to ${actionType} overtime request`);
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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Overtime Approval</h1>
        <p className="text-sm text-gray-600 mt-1">Review and approve overtime requests</p>
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
              Pending
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
                  All Requests
                </button>
                <button
                  onClick={() => setActiveTab('approved')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'approved'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Approved
                </button>
                <button
                  onClick={() => setActiveTab('rejected')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'rejected'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Rejected
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
                  {activeTab === 'pending' ? 'Pending Requests' : 
                   activeTab === 'all' ? 'All Requests' : 
                   activeTab === 'approved' ? 'Approved Requests' : 'Rejected Requests'}
                </h3>
                <span className="text-sm text-gray-500">
                  ({requests.length} {requests.length === 1 ? 'request' : 'requests'})
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {hasActiveFilters && (
                  <span className="text-sm text-blue-600 font-medium">
                    {requests.length} of {allRequests.length} shown
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
                  <span>Filter</span>
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
                {/* First Row - Division and Search */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Division
                    </label>
                    <select
                      value={filters.divisionId}
                      onChange={(e) => setFilters({...filters, divisionId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Divisions</option>
                      {divisions.map(div => (
                        <option key={div.id} value={div.id}>{div.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Employee
                    </label>
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                      placeholder="Name or NIP..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Date Ranges */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Request Date Range</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">From</label>
                        <input
                          type="date"
                          value={filters.requestDateFrom}
                          onChange={(e) => setFilters({...filters, requestDateFrom: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">To</label>
                        <input
                          type="date"
                          value={filters.requestDateTo}
                          onChange={(e) => setFilters({...filters, requestDateTo: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Overtime Date Range</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">From</label>
                        <input
                          type="date"
                          value={filters.overtimeDateFrom}
                          onChange={(e) => setFilters({...filters, overtimeDateFrom: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">To</label>
                        <input
                          type="date"
                          value={filters.overtimeDateTo}
                          onChange={(e) => setFilters({...filters, overtimeDateTo: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hours Range */}
                <div className="border-l-4 border-purple-500 pl-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Total Hours Range</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Minimum Hours</label>
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
                      <label className="block text-xs text-gray-600 mb-1">Maximum Hours</label>
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
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No overtime requests</h3>
              <p className="mt-1 text-sm text-gray-500">
                {hasActiveFilters ? 'Try adjusting your filters.' : 'No requests found for this tab.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
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

                      <div className="bg-gray-50 rounded-lg p-4 mb-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Total Hours</p>
                            <p className="font-semibold text-gray-900">{request.totalHours} hours</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Total Days</p>
                            <p className="font-semibold text-gray-900">{(request.totalHours / 8).toFixed(2)} days</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Submitted</p>
                            <p className="font-semibold text-gray-900">{format(new Date(request.submittedAt), 'MMM dd, yyyy')}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Entries</p>
                            <p className="font-semibold text-gray-900">{request.entries?.length || 0} dates</p>
                          </div>
                        </div>
                      </div>

                      {request.status !== 'PENDING' && request.currentApprover && (
                        <p className="text-sm text-gray-600">
                          {request.status === 'APPROVED' ? '✓ Approved' : '✗ Rejected'} by {request.currentApprover.name}
                        </p>
                      )}
                    </div>

                    {request.status === 'PENDING' && (
                      <div className="ml-4 flex flex-col space-y-2">
                        <button
                          onClick={() => openActionModal(request, 'approve')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openActionModal(request, 'reject')}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => openActionModal(request, 'revision')}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
                        >
                          Request Revision
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
            <h2 className="text-xl font-bold mb-4 capitalize">{actionType} Overtime Request</h2>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm"><span className="font-medium">Employee:</span> {selectedRequest.employee?.name}</p>
              <p className="text-sm"><span className="font-medium">Total Hours:</span> {selectedRequest.totalHours}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment {(actionType === 'reject' || actionType === 'revision') && '*'}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows="4"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder={actionType === 'approve' ? 'Optional...' : 'Required...'}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}