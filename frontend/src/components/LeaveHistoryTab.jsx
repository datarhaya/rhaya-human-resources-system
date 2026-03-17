// frontend/src/components/LeaveHistoryTab.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';

export default function LeaveHistoryTab({ userId }) {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.accessLevel <= 2;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchLeaveRequests();
  }, [userId, isAdmin]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);

      const params = {};
      
      // Choose endpoint based on admin status
      let endpoint = '/leave/my-requests';
      
      if (isAdmin) {
        endpoint = '/leave/admin/all-requests';
        params.employeeId = userId;
      }

      const res = await apiClient.get(endpoint, { params });
      setRequests(res.data.data || []);
    } catch (error) {
      console.error('Fetch leave requests error:', error);
      alert('Failed to load leave history');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequestDetail = async (requestId) => {
    try {
      const res = await apiClient.get(`/leave/${requestId}`);
      setSelectedRequest(res.data.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Fetch request detail error:', error);
      alert('Failed to load request details');
    }
  };

  // Apply filters
  const filteredRequests = requests.filter(req => {
    // Year filter
    if (filterYear) {
      const reqYear = new Date(req.startDate).getFullYear();
      if (reqYear !== parseInt(filterYear)) return false;
    }

    // Status filter
    if (filterStatus && req.status !== filterStatus) return false;

    // Type filter
    if (filterType && req.leaveType !== filterType) return false;

    return true;
  });

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  const formatDateTime = (date) => date ? new Date(date).toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '-';

  const getStatusBadge = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatLeaveType = (type) => {
    const types = {
      ANNUAL_LEAVE: 'Annual Leave',
      SICK_LEAVE: 'Sick Leave',
      MENSTRUAL_LEAVE: 'Menstrual Leave',
      UNPAID_LEAVE: 'Unpaid Leave',
      MATERNITY_LEAVE: 'Maternity Leave',
      PATERNITY_LEAVE: 'Paternity Leave',
      BEREAVEMENT_LEAVE: 'Bereavement Leave',
      MARRIAGE_LEAVE: 'Marriage Leave'
    };
    return types[type] || type;
  };

  // Generate year options (current year and 3 years back)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - i);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leave history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Leave History</h3>
              <p className="text-sm text-gray-600 mt-1">
                {filteredRequests.length} request(s) {filterYear && `for ${filterYear}`}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            {/* Year Filter */}
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="">All Years</option>
              {yearOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="">All Types</option>
              <option value="ANNUAL_LEAVE">Annual Leave</option>
              <option value="SICK_LEAVE">Sick Leave</option>
              <option value="MENSTRUAL_LEAVE">Menstrual Leave</option>
              <option value="UNPAID_LEAVE">Unpaid Leave</option>
              <option value="MATERNITY_LEAVE">Maternity Leave</option>
              <option value="PATERNITY_LEAVE">Paternity Leave</option>
              <option value="BEREAVEMENT_LEAVE">Bereavement Leave</option>
              <option value="MARRIAGE_LEAVE">Marriage Leave</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No leave requests found</h3>
            <p className="text-gray-500">
              {filterYear || filterStatus || filterType ? 'No requests match your filters' : 'No leave requests yet'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {formatLeaveType(request.leaveType)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <div>{formatDate(request.startDate)}</div>
                        <div className="text-xs text-gray-500">to {formatDate(request.endDate)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {request.totalDays} {request.totalDays === 1 ? 'day' : 'days'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={request.reason}>
                        {request.reason}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDateTime(request.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <button
                        onClick={() => fetchRequestDetail(request.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View details"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Leave Request Details</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {formatLeaveType(selectedRequest.leaveType)}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(selectedRequest.status)}`}>
                  {selectedRequest.status}
                </span>
                {selectedRequest.isPaid === false && (
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-orange-100 text-orange-800">
                    Unpaid
                  </span>
                )}
              </div>

              {/* Leave Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Start Date</div>
                  <div className="text-sm font-medium text-gray-900">{formatDate(selectedRequest.startDate)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">End Date</div>
                  <div className="text-sm font-medium text-gray-900">{formatDate(selectedRequest.endDate)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Total Days</div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedRequest.totalDays} {selectedRequest.totalDays === 1 ? 'day' : 'days'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Submitted</div>
                  <div className="text-sm font-medium text-gray-900">{formatDateTime(selectedRequest.createdAt)}</div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Reason</div>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                  {selectedRequest.reason}
                </div>
              </div>

              {/* Approval Info */}
              {selectedRequest.supervisor && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Supervisor</div>
                  <div className="text-sm text-gray-900">{selectedRequest.supervisor.name}</div>
                  {selectedRequest.supervisorStatus && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(selectedRequest.supervisorStatus)}`}>
                        {selectedRequest.supervisorStatus}
                      </span>
                      {selectedRequest.supervisorDate && (
                        <span className="text-xs text-gray-500">{formatDate(selectedRequest.supervisorDate)}</span>
                      )}
                    </div>
                  )}
                  {selectedRequest.supervisorComment && (
                    <div className="text-xs text-gray-600 mt-1 italic">"{selectedRequest.supervisorComment}"</div>
                  )}
                </div>
              )}

              {selectedRequest.divisionHead && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Division Head</div>
                  <div className="text-sm text-gray-900">{selectedRequest.divisionHead.name}</div>
                  {selectedRequest.divisionHeadStatus && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(selectedRequest.divisionHeadStatus)}`}>
                        {selectedRequest.divisionHeadStatus}
                      </span>
                      {selectedRequest.divisionHeadDate && (
                        <span className="text-xs text-gray-500">{formatDate(selectedRequest.divisionHeadDate)}</span>
                      )}
                    </div>
                  )}
                  {selectedRequest.divisionHeadComment && (
                    <div className="text-xs text-gray-600 mt-1 italic">"{selectedRequest.divisionHeadComment}"</div>
                  )}
                </div>
              )}

              {/* Cancellation Info */}
              {selectedRequest.status === 'CANCELLED' && selectedRequest.cancellationReason && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <div className="text-xs font-medium text-red-800 mb-1">Cancellation Reason</div>
                  <div className="text-sm text-red-900">{selectedRequest.cancellationReason}</div>
                  {selectedRequest.cancelledAt && (
                    <div className="text-xs text-red-600 mt-1">Cancelled: {formatDateTime(selectedRequest.cancelledAt)}</div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
