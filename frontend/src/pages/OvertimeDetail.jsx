// frontend/src/pages/OvertimeDetail.jsx
// MOBILE-RESPONSIVE VERSION - Card layout, collapsible sections, touch-friendly

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getOvertimeRequestById } from '../api/client';
import { format } from 'date-fns';

export default function OvertimeDetail() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      setError(err.response?.data?.error || t('overtime.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  // Status badge - Mobile Optimized
  const StatusBadge = ({ status }) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      APPROVED: 'bg-green-100 text-green-800 border-green-200',
      REJECTED: 'bg-red-100 text-red-800 border-red-200',
      REVISION_REQUESTED: 'bg-orange-100 text-orange-800 border-orange-200'
    };

    const labels = {
      PENDING: t('overtime.pendingApproval'),
      APPROVED: t('overtime.approved'),
      REJECTED: t('overtime.rejected'),
      REVISION_REQUESTED: t('overtime.revisionRequested')
    };

    const icons = {
      PENDING: (
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      ),
      APPROVED: (
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      REJECTED: (
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      ),
      REVISION_REQUESTED: (
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    };

    

    return (
      <div className={`inline-flex items-center space-x-1.5 sm:space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border-2 ${styles[status]}`}>
        {icons[status]}
        <span className="text-xs sm:text-sm font-semibold">{labels[status]}</span>
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
          <p className="mt-4 text-sm text-gray-600">{t('overtime.loadingRequest')}</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-4xl mx-auto mt-8 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-red-900">{t('overtime.errorLoadingRequest')}</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => navigate('/overtime/history')}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              {t('overtime.backToHistory')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const ApprovalStep = ({ label, name, status, comment, date }) => (
      <div className="relative pl-8">
        {/* Status Indicator Dot */}
        <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${
          status === 'APPROVED' ? 'bg-green-500' :
          status === 'REJECTED' ? 'bg-red-500' : 'bg-gray-400'
        }`} />
        
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{label}</p>
            <p className="text-sm font-bold text-gray-900">{name}</p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter ${
            status === 'APPROVED' ? 'bg-green-50 text-green-700' :
            status === 'REJECTED' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
          }`}>
            {status}
          </span>
        </div>

        {comment && (
          <div className="bg-gray-50/70 rounded-lg p-3 border border-gray-100">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {comment}
            </p>
            {date && (
              <p className="mt-2 text-[10px] text-gray-400 font-medium italic">
                {format(new Date(date), 'MMM dd, yyyy • HH:mm')}
              </p>
            )}
          </div>
        )}
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header - Mobile Optimized */}
      <div className="mb-4 sm:mb-6">
        <Link
          to="/overtime/history"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-3 sm:mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          {t('overtime.backToHistory')}
        </Link>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{t('overtime.detailTitle')}</h1>
      </div>

      {/* Status & Actions - Mobile: Stack, Desktop: Row */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <StatusBadge status={request.status} />
        {(request.status === 'PENDING' || request.status === 'REVISION_REQUESTED') && (
          <Link
            to={`/overtime/edit/${request.id}`}
            className="inline-flex items-center justify-center px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
          >
            {t('overtime.editRequest')}
          </Link>
        )}
      </div>

      {/* Main Content */}
      <div className="space-y-4 sm:space-y-6">
        {/* Employee Information - Clean Profile Style */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5">
            {/* Profile Header Row */}
            <div className="flex items-center space-x-4 pb-5 border-b border-gray-50 mb-5">
              <div className="h-12 w-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center border border-gray-200 flex-shrink-0">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none mb-1">
                  {t('overtime.employeeInformation')}
                </p>
                <h2 className="text-lg font-bold text-gray-900 truncate">
                  {request.employee.name}
                </h2>
              </div>
            </div>

            {/* Info Grid - 2 columns even on mobile to save space */}
            <dl className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                  {t('overtime.employeeId')}
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-700">
                  {request.employee.nip || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                  {t('overtime.role')}
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-700 truncate">
                  {request.employee.role?.name || '—'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                  {t('overtime.division')}
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-700">
                  {request.employee.division?.name || '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header: Slimmer & Text-only */}
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              {t('overtime.requestSummary')}
            </h2>
          </div>

          <div className="p-5">
            {/* Summary Grid: No backgrounds, just clean typography */}
            <div className="flex justify-between items-end pb-6 border-b border-gray-50">
              <div>
                <p className="text-[10px] uppercase tracking-bold text-gray-400 font-bold">{t('overtime.totalHours')}</p>
                <p className="text-2xl font-black text-gray-900 leading-none mt-1">
                  {request.totalHours}<span className="text-xs ml-1 font-medium text-gray-400">hrs</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-bold text-gray-400 font-bold">{t('overtime.estimatedAmount')}</p>
                <p className="text-xl font-bold text-green-600 leading-none mt-1">
                  Rp {request.totalAmount.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            {/* Individual Entries - Clean Timeline Style */}
            <div className="mt-6">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">
                {t('overtime.detailedBreakdown')}
              </h3>
              
              <div className="space-y-8 relative">
                {/* Vertical Line Connector */}
                <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-100" />

                {request.entries.map((entry, index) => (
                  <div key={entry.id} className="relative pl-8">
                    {/* Dot on the timeline */}
                    <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white bg-blue-500 shadow-sm" />
                    
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-bold text-gray-900 leading-none">
                          {format(new Date(entry.date), 'EEEE, MMM dd')}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {entry.hours}h
                      </span>
                    </div>

                    {/* Description Area */}
                    <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-1 tracking-tight">
                        {t('overtime.description')}
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                        {entry.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Minimal Header */}
        <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            {t('overtime.approvalInformation')}
          </h2>
        </div>

        <div className="p-5">
          {/* Current Approver - Subtle Callout */}
          <div className="mb-8 p-4 bg-blue-50/50 rounded-xl border border-blue-100/50 flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-tight">{t('overtime.currentApprover')}</p>
              <p className="text-sm font-bold text-blue-900 truncate">
                {request.currentApprover?.name || t('overtime.notAssigned')}
              </p>
              {request.currentApprover?.email && (
                <p className="text-[11px] text-blue-600/70 truncate">{request.currentApprover.email}</p>
              )}
            </div>
          </div>

          {/* Timeline Container */}
          <div className="relative space-y-8">
            {/* The Vertical Connecting Line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-100" />

            {/* 1. Supervisor Step */}
            {request.supervisor && (
              <ApprovalStep 
                label={t('overtime.supervisor')}
                name={request.supervisor.name}
                status={request.supervisorStatus}
                comment={request.supervisorComment}
                date={request.supervisorDate}
              />
            )}

            {/* 2. Division Head Step */}
            {request.divisionHead && (
              <ApprovalStep 
                label={t('overtime.divisionHead')}
                name={request.divisionHead.name}
                status={request.divisionHeadStatus}
                comment={request.divisionHeadComment}
                date={request.divisionHeadDate}
              />
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}