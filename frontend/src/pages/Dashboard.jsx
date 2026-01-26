// frontend/src/pages/Dashboard.jsx
// MOBILE-RESPONSIVE VERSION - Optimized for all screen sizes

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMyOvertimeBalance, getMyOvertimeRequests, getMyLeaveBalance } from '../api/client';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Fetch overtime balance with caching
  const { data: overtimeBalance, isLoading: balanceLoading } = useQuery({
    queryKey: ['overtimeBalance'],
    queryFn: getMyOvertimeBalance,
    staleTime: 3 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  // Fetch leave balance with caching
  const { data: leaveBalance, isLoading: leaveBalanceLoading } = useQuery({
    queryKey: ['leaveBalance'],
    queryFn: getMyLeaveBalance,
    staleTime: 3 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  // Fetch pending requests count with caching
  const { data: pendingRequests, isLoading: pendingLoading } = useQuery({
    queryKey: ['overtimeRequests', 'pending'],
    queryFn: () => getMyOvertimeRequests({ status: 'PENDING' }),
    staleTime: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    select: (data) => data.length,
  });

  const loading = balanceLoading || pendingLoading || leaveBalanceLoading;

  // Get access level label
  const getAccessLevelLabel = (level) => {
    switch(level) {
      case 1: return t('accessLevel.admin');
      case 2: return t('accessLevel.subsidiary');
      case 3: return t('accessLevel.manager');
      case 4: return t('accessLevel.staff');
      case 5: return t('accessLevel.intern');
      default: return t('accessLevel.unknown');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Header - Mobile Optimized */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
          <div className="flex-1">
            {/* Responsive heading - smaller on mobile */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 break-words">
              {t('dashboard.welcomeBack', { name: user?.name })}
            </h1>
            
            {/* Role & Division - Wrappable on mobile */}
            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm sm:text-base">
              <p className="text-gray-600">
                {user?.role?.name}
              </p>
              <span className="text-gray-400">•</span>
              <p className="text-gray-600 break-words">
                {user?.division?.name}
              </p>
              {user?.accessLevel === 5 && (
                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full whitespace-nowrap">
                  {t('dashboard.intern')}
                </span>
              )}
            </div>
            
            {/* Supervisor info */}
            {user?.supervisor && (
              <p className="text-xs sm:text-sm text-gray-500 mt-1 break-words">
                {t('dashboard.reportsTo')} {user.supervisor.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards - Mobile Optimized Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Leave Balance Card */}
        <div 
          className="bg-white rounded-lg shadow p-4 sm:p-6 cursor-pointer hover:shadow-md transition-shadow active:scale-98"
          onClick={() => navigate('/leave/history')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs sm:text-sm text-gray-600 font-medium">
              {t('dashboard.leaveBalance')}
            </div>
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-blue-600">
            {loading ? (
              <span className="text-xl sm:text-2xl">...</span>
            ) : leaveBalance ? (
              <>
                {((leaveBalance?.annualRemaining || 0) + (leaveBalance?.toilBalance || 0))}{' '}
                <span className="text-base sm:text-lg text-gray-600">{t('dashboard.days')}</span>
              </>
            ) : (
              <>
                0 <span className="text-base sm:text-lg text-gray-600">{t('dashboard.days')}</span>
              </>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1 break-words">
            {t('leave.annual')}: {leaveBalance?.annualRemaining || 0} | {t('leave.toilBalance')}: {leaveBalance?.toilBalance || 0}
          </div>
          <div className="text-xs text-blue-600 mt-1 font-medium">
            {t('dashboard.clickToView')} →
          </div>
        </div>
        
        {/* Overtime Balance Card */}
        <div 
          className="bg-white rounded-lg shadow p-4 sm:p-6 cursor-pointer hover:shadow-md transition-shadow active:scale-98"
          onClick={() => navigate('/overtime/history')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs sm:text-sm text-gray-600 font-medium">
              {t('dashboard.overtimeBalance')}
            </div>
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-green-600">
            {loading ? (
              <span className="text-xl sm:text-2xl">...</span>
            ) : overtimeBalance ? (
              <>
                {overtimeBalance.currentBalance.toFixed(1)}{' '}
                <span className="text-base sm:text-lg text-gray-600">hrs</span>
              </>
            ) : (
              <>
                0.0 <span className="text-base sm:text-lg text-gray-600">hrs</span>
              </>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {t('dashboard.hoursApproved')}
          </div>
          <div className="text-xs text-green-600 mt-1 font-medium">
            {t('dashboard.clickToView')} →
          </div>
        </div>
        
        {/* Pending Requests Card */}
        <div 
          className="bg-white rounded-lg shadow p-4 sm:p-6 cursor-pointer hover:shadow-md transition-shadow active:scale-98"
          onClick={() => navigate('/overtime/history')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs sm:text-sm text-gray-600 font-medium">
              {t('dashboard.pendingRequests')}
            </div>
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-orange-600">
            {loading ? (
              <span className="text-xl sm:text-2xl">...</span>
            ) : (
              pendingRequests || 0
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {t('dashboard.awaitingApproval')}
          </div>
          <div className="text-xs text-orange-600 mt-1 font-medium">
            {t('dashboard.clickToView')} →
          </div>
        </div>
        
        {/* Payslips Card */}
        <div 
          className="bg-white rounded-lg shadow p-4 sm:p-6 cursor-pointer hover:shadow-md transition-shadow active:scale-98"
          onClick={() => navigate('/payslips/my-payslips')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs sm:text-sm text-gray-600 font-medium">
              {t('dashboard.payslips')}
            </div>
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-purple-600">0</div>
          <div className="text-xs text-gray-500 mt-1">
            {t('dashboard.availableToDownload')}
          </div>
          <div className="text-xs text-purple-600 mt-1 font-medium">
            {t('dashboard.clickToView')} →
          </div>
        </div>
      </div>

      {/* User Info Card - Mobile Optimized */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">
          {t('dashboard.profileInformation')}
        </h2>
        
        {/* Mobile: Single column, Tablet+: Two columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
          <div className="flex flex-col sm:flex-row sm:items-start">
            <span className="text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-0">
              {t('dashboard.username')}:
            </span>
            <span className="font-medium text-gray-900 sm:ml-2 break-all">
              {user?.username}
            </span>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-start">
            <span className="text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-0">
              {t('dashboard.email')}:
            </span>
            <span className="font-medium text-gray-900 sm:ml-2 break-all">
              {user?.email}
            </span>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-start">
            <span className="text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-0">
              {t('dashboard.accessLevel')}:
            </span>
            <span className="font-medium text-gray-900 sm:ml-2">
              {getAccessLevelLabel(user?.accessLevel)}
            </span>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-start">
            <span className="text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-0">
              {t('dashboard.status')}:
            </span>
            <span className="font-medium text-gray-900 sm:ml-2">
              {user?.employeeStatus}
            </span>
          </div>
          
          {user?.supervisor && (
            <div className="flex flex-col sm:col-span-2">
              <span className="text-gray-600 text-xs sm:text-sm font-medium mb-1">
                {t('dashboard.supervisor')}:
              </span>
              <span className="font-medium text-gray-900 break-words">
                {user.supervisor.name}
              </span>
            </div>
          )}
          
          {user?.subordinates && user.subordinates.length > 0 && (
            <div className="flex flex-col sm:col-span-2">
              <span className="text-gray-600 text-xs sm:text-sm font-medium mb-1">
                {t('dashboard.subordinates')}:
              </span>
              <span className="font-medium text-gray-900">
                {user.subordinates.length} {user.subordinates.length > 1 ? t('dashboard.employees') : t('dashboard.employee')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}