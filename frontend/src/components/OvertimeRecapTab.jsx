// frontend/src/components/OvertimeRecapTab.jsx
import { useState, useEffect } from 'react';
import apiClient from '../api/client';

export default function OvertimeRecapTab({ userId, isAdmin }) {
  const [activeSubTab, setActiveSubTab] = useState('recapped'); // 'recapped' or 'unrecapped'
  const [recaps, setRecaps] = useState([]);
  const [unrecappedRequests, setUnrecappedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecap, setSelectedRecap] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [downloadingCombined, setDownloadingCombined] = useState(false);

  useEffect(() => {
    fetchRecaps();
  }, [userId, filterYear]);

  useEffect(() => {
    fetchUnrecappedRequests();
  }, [userId, filterYear]);


  const fetchRecaps = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('employeeId', userId);
      if (filterYear) params.append('year', filterYear);

      const res = await apiClient.get(`/overtime-recap/recap?${params.toString()}`);
      setRecaps(res.data.data || []);
    } catch (error) {
      console.error('Fetch recaps error:', error);
      alert('Failed to load overtime recaps');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnrecappedRequests = async () => {
    try {
      
      const params = {
        status: 'APPROVED',      // Backend expects uppercase
        isRecapped: 'false'      // String 'false', not boolean
      };

      // If admin viewing another user's data, use admin endpoint
      let endpoint = '/overtime/my-requests'; // Default: user's own data
      console.log('User is admin:', isAdmin); // DEBUG
      if (isAdmin) {
        endpoint = '/overtime/admin/all-requests';
        params.employeeId = userId; // Specify which employee to fetch
      }

      console.log('Fetching unrecapped - endpoint:', endpoint, 'params:', params); // DEBUG

      const res = await apiClient.get(endpoint, { params });
      
      console.log('Response:', res.data); // DEBUG
      
      let filtered = res.data.data || [];
      
      console.log('Before year filter:', filtered.length); // DEBUG
      
      // Filter by year if selected
      if (filterYear) {
        filtered = filtered.filter(req => {
          const submittedYear = new Date(req.submittedAt).getFullYear();
          return submittedYear === parseInt(filterYear);
        });
      }
      
      console.log('After year filter:', filtered.length); // DEBUG
      
      setUnrecappedRequests(filtered);
    } catch (error) {
      console.error('Fetch unrecapped requests error:', error);
      alert('Failed to load unrecapped overtime');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecapDetail = async (recapId) => {
    try {
      const res = await apiClient.get(`/overtime-recap/recap/${recapId}`);
      setSelectedRecap(res.data.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Fetch recap detail error:', error);
      alert('Failed to load recap details');
    }
  };

  const handleDownloadPDF = async (recapId, month, year) => {
    try {
      const res = await apiClient.get(`/overtime-recap/recap/${recapId}/pdf`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Overtime_Recap_${formatMonth(month)}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download PDF error:', error);
      alert('Failed to download PDF');
    }
  };

  const handleDownloadCombinedPDF = async (scope) => {
    try {
      setDownloadingCombined(true);
      const params = new URLSearchParams();
      params.append('employeeId', userId);
      
      if (scope === 'year' && filterYear) {
        params.append('year', filterYear);
      }

      const res = await apiClient.get(`/overtime-recap/combined-pdf?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = scope === 'year' 
        ? `Overtime_Recap_${filterYear}_Combined.pdf`
        : `Overtime_Recap_All_Time.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download combined PDF error:', error);
      alert(error.response?.data?.error || 'Failed to download combined PDF');
    } finally {
      setDownloadingCombined(false);
    }
  };

  const formatMonth = (month) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || month;
  };

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
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      approved: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Generate year options (current year and 3 years back)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - i);

  // Calculate total hours for unrecapped requests
  const totalUnrecappedHours = unrecappedRequests.reduce((sum, req) => sum + (req.totalHours || 0), 0);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading overtime data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filter and Download Options */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col gap-4">
          {/* Title and Year Filter Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Overtime Records</h3>
              <p className="text-sm text-gray-600 mt-1">
                {activeSubTab === 'recapped' 
                  ? `${recaps.length} recap(s)` 
                  : `${unrecappedRequests.length} unrecapped request(s), ${totalUnrecappedHours} hours total`
                }
                {filterYear && ` for ${filterYear}`}
              </p>
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto">
              {/* Year Filter */}
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Years</option>
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Combined Download Buttons - Only for Recapped Tab */}
          {activeSubTab === 'recapped' && recaps.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
              <button
                onClick={() => handleDownloadCombinedPDF('year')}
                disabled={!filterYear || downloadingCombined}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {downloadingCombined ? 'Generating...' : `Download ${filterYear} Combined PDF`}
              </button>
              
              <button
                onClick={() => handleDownloadCombinedPDF('all')}
                disabled={downloadingCombined}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {downloadingCombined ? 'Generating...' : 'Download All-Time Combined PDF'}
              </button>

              <p className="text-xs text-gray-500 self-center ml-2">
                Combined PDF includes all periods in one document
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sub-tabs: Recapped / Unrecapped */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveSubTab('recapped')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeSubTab === 'recapped'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Recapped
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100">
                {recaps.length}
              </span>
            </button>
            <button
              onClick={() => setActiveSubTab('unrecapped')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeSubTab === 'unrecapped'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Unrecapped
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">
                {unrecappedRequests.length}
              </span>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeSubTab === 'recapped' ? (
            // RECAPPED TAB CONTENT
            recaps.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No recapped overtime found</h3>
                <p className="text-gray-500">
                  {filterYear ? `No recaps for ${filterYear}` : 'No recaps available'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">TOIL Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cash Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recapped</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recaps.map((recap) => (
                      <tr key={recap.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {formatMonth(recap.month)} {recap.year}
                          </div>
                          <div className="text-xs text-gray-500">
                            {recap.overtimeRequests?.length || 0} request(s)
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="font-medium">{recap.totalHours || 0} hrs</div>
                          {recap.carryOverHours > 0 && (
                            <div className="text-xs text-blue-600">
                              +{recap.carryOverHours} hrs carryover
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {recap.toilDays || 0} days
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {recap.cashHours || 0} hrs
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(recap.recapStatus)}`}>
                            {recap.recapStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div>{formatDate(recap.recappedAt)}</div>
                          {recap.recappedBy && (
                            <div className="text-xs">by {recap.recappedBy.name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => fetchRecapDetail(recap.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View details"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(recap.id, recap.month, recap.year)}
                              className="text-green-600 hover:text-green-900"
                              title="Download PDF"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            // UNRECAPPED TAB CONTENT
            unrecappedRequests.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-500">No unrecapped overtime requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Unrecapped Requests Table */}
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overtime Dates</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approved By</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {unrecappedRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {formatDateTime(request.submittedAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {request.entries && request.entries.length > 0 ? (
                                <div className="space-y-1">
                                  {request.entries.slice(0, 2).map((entry) => (
                                    <div key={entry.id} className="flex items-center text-xs">
                                      <span className="font-medium">{formatDate(entry.date)}</span>
                                      <span className="mx-2">•</span>
                                      <span className="text-blue-600">{entry.hours} hrs</span>
                                    </div>
                                  ))}
                                  {request.entries.length > 2 && (
                                    <div className="text-xs text-gray-500">
                                      +{request.entries.length - 2} more date(s)
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-gray-900">
                              {request.totalHours || 0} hrs
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(request.status)}`}>
                              {request.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {request.finalApprover?.name || 
                             request.divisionHead?.name || 
                             request.supervisor?.name || 
                             '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Detail Modal - Same as before */}
      {showDetailModal && selectedRecap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Overtime Recap Details
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {formatMonth(selectedRecap.month)} {selectedRecap.year}
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
              {/* Summary Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Total Hours</div>
                    <div className="text-lg font-bold text-gray-900">{selectedRecap.totalHours || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">TOIL Days</div>
                    <div className="text-lg font-bold text-green-600">{selectedRecap.toilDays || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Cash Hours</div>
                    <div className="text-lg font-bold text-blue-600">{selectedRecap.cashHours || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Carryover</div>
                    <div className="text-lg font-bold text-purple-600">{selectedRecap.carryOverHours || 0}</div>
                  </div>
                </div>
              </div>

              {/* Overtime Requests */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Overtime Requests ({selectedRecap.overtimeRequests?.length || 0})</h3>
                {selectedRecap.overtimeRequests && selectedRecap.overtimeRequests.length > 0 ? (
                  <div className="space-y-4">
                    {selectedRecap.overtimeRequests.map((request, idx) => (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-medium text-gray-900">Request #{idx + 1}</div>
                            <div className="text-sm text-gray-500">
                              Submitted: {formatDateTime(request.submittedAt)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {request.totalHours} hours
                            </div>
                          </div>
                        </div>

                        {/* Overtime Entries */}
                        {request.entries && request.entries.length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs font-medium text-gray-700 mb-2">Overtime Dates:</div>
                            <div className="space-y-2">
                              {request.entries.map((entry) => (
                                <div key={entry.id} className="flex justify-between items-start text-sm bg-gray-50 p-2 rounded">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">
                                      {formatDate(entry.date)}
                                    </div>
                                    {entry.description && (
                                      <div className="text-xs text-gray-600 mt-1">
                                        {entry.description}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right ml-4">
                                    <div className="font-medium text-blue-600">
                                      {entry.hours} hrs
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No overtime requests for this period</p>
                )}
              </div>

              {/* Notes */}
              {selectedRecap.notes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded border border-yellow-200">
                    {selectedRecap.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => handleDownloadPDF(selectedRecap.id, selectedRecap.month, selectedRecap.year)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </button>
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