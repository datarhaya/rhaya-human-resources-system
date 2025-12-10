// frontend/src/pages/OvertimeDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getOvertimeRequestById } from '../api/client';
import { format } from 'date-fns';

export default function OvertimeDetail() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRequest();
  }, [requestId]);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      const data = await getOvertimeRequestById(requestId);
      setRequest(data);
      setError('');
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.error || 'Failed to load overtime request');
    } finally {
      setLoading(false);
    }
  };

  // Status badge
  const StatusBadge = ({ status }) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      APPROVED: 'bg-green-100 text-green-800 border-green-200',
      REJECTED: 'bg-red-100 text-red-800 border-red-200',
      REVISION_REQUESTED: 'bg-orange-100 text-orange-800 border-orange-200'
    };

    const labels = {
      PENDING: 'Pending Approval',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      REVISION_REQUESTED: 'Revision Requested'
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
      REVISION_REQUESTED: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Loading overtime request...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-red-900">Error Loading Request</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => navigate('/overtime-history')}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
            >
              Back to History
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/overtime-history"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to History
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Overtime Request Details</h1>
      </div>

      {/* Status & Actions */}
      <div className="mb-6 flex items-center justify-between">
        <StatusBadge status={request.status} />
        <div className="flex space-x-3">
          {(request.status === 'PENDING' || request.status === 'REVISION_REQUESTED') && (
            <>
              <Link
                to={`/overtime-edit/${request.id}`}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                Edit Request
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Employee Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Employee Information</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{request.employee.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Employee ID</dt>
              <dd className="mt-1 text-sm text-gray-900">{request.employee.nip || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Role</dt>
              <dd className="mt-1 text-sm text-gray-900">{request.employee.role?.name || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Division</dt>
              <dd className="mt-1 text-sm text-gray-900">{request.employee.division?.name || 'N/A'}</dd>
            </div>
          </dl>
        </div>

        {/* Request Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Summary</h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium">Total Hours</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{request.totalHours}</p>
              <p className="text-xs text-blue-600 mt-1">hours</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium">Total Days</p>
              <p className="text-3xl font-bold text-green-900 mt-1">
                {(request.totalHours / 8).toFixed(2)}
              </p>
              <p className="text-xs text-green-600 mt-1">working days</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium">Estimated Amount</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                Rp {request.totalAmount.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-purple-600 mt-1">before tax</p>
            </div>
          </div>
          
          <dl className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Submitted Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {format(new Date(request.submittedAt), 'EEEE, MMMM dd, yyyy - HH:mm')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Number of Entries</dt>
              <dd className="mt-1 text-sm text-gray-900">{request.entries.length} dates</dd>
            </div>
          </dl>
        </div>

        {/* Overtime Entries */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Overtime Dates</h2>
          <div className="space-y-3">
            {request.entries.map((entry, index) => (
              <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-800 font-bold">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {format(new Date(entry.date), 'EEEE, MMMM dd, yyyy')}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{entry.hours}</p>
                  <p className="text-xs text-gray-500">hours</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Approval Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Approval Information</h2>
          
          {/* Current Approver */}
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm font-medium text-blue-900">Current Approver</p>
            <p className="text-base text-blue-800 mt-1">
              {request.currentApprover?.name || 'Not assigned'}
            </p>
            {request.currentApprover?.email && (
              <p className="text-sm text-blue-600 mt-1">{request.currentApprover.email}</p>
            )}
          </div>

          {/* Supervisor Approval */}
          {request.supervisor && (
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Supervisor</p>
                  <p className="text-base text-gray-900">{request.supervisor.name}</p>
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    request.supervisorStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    request.supervisorStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {request.supervisorStatus}
                  </span>
                </div>
              </div>
              
              {request.supervisorComment && (
                <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="text-sm text-gray-700">
                    <strong>Comment:</strong> {request.supervisorComment}
                  </p>
                  {request.supervisorDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(request.supervisorDate), 'MMM dd, yyyy - HH:mm')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Division Head Approval (if applicable) */}
          {request.divisionHead && (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Division Head</p>
                  <p className="text-base text-gray-900">{request.divisionHead.name}</p>
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    request.divisionHeadStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    request.divisionHeadStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {request.divisionHeadStatus}
                  </span>
                </div>
              </div>
              
              {request.divisionHeadComment && (
                <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="text-sm text-gray-700">
                    <strong>Comment:</strong> {request.divisionHeadComment}
                  </p>
                  {request.divisionHeadDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(request.divisionHeadDate), 'MMM dd, yyyy - HH:mm')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}