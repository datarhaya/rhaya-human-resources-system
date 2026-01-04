// frontend/src/pages/Dashboard.jsx
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
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t('dashboard.welcomeBack', { name: user?.name })}
            </h1>
            <p className="text-gray-600 mt-2">
              {user?.role?.name} • {user?.division?.name}
              {user?.accessLevel === 5 && (
                <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                  {t('dashboard.intern')}
                </span>
              )}
            </p>
            {user?.supervisor && (
              <p className="text-sm text-gray-500 mt-1">
                {t('dashboard.reportsTo')} {user.supervisor.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div 
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/leave/history')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">{t('dashboard.leaveBalance')}</div>
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {loading ? (
              <span className="text-2xl">...</span>
            ) : leaveBalance ? (
              `${leaveBalance.annualRemaining || 0} ${t('dashboard.days')}`
            ) : (
              `0 ${t('dashboard.days')}`
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {t('dashboard.annualLeaveRemaining')} • {t('dashboard.clickToView')}
          </div>
        </div>
        
        <div 
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/overtime/history')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">{t('dashboard.overtimeBalance')}</div>
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-green-600">
            {loading ? (
              <span className="text-2xl">...</span>
            ) : overtimeBalance ? (
              overtimeBalance.currentBalance.toFixed(1)
            ) : (
              '0.0'
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {t('dashboard.hoursApproved')} • {t('dashboard.clickToView')}
          </div>
        </div>
        
        <div 
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/overtime/history')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">{t('dashboard.pendingRequests')}</div>
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-orange-600">
            {loading ? (
              <span className="text-2xl">...</span>
            ) : (
              pendingRequests || 0
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {t('dashboard.awaitingApproval')} • {t('dashboard.clickToView')}
          </div>
        </div>
        
        <div 
          className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/payslips/my-payslips')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">{t('dashboard.payslips')}</div>
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-purple-600">0</div>
          <div className="text-xs text-gray-500 mt-1">{t('dashboard.availableToDownload')}</div>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">{t('dashboard.profileInformation')}</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">{t('dashboard.username')}:</span>
            <span className="ml-2 font-medium">{user?.username}</span>
          </div>
          <div>
            <span className="text-gray-600">{t('dashboard.email')}:</span>
            <span className="ml-2 font-medium">{user?.email}</span>
          </div>
          <div>
            <span className="text-gray-600">{t('dashboard.accessLevel')}:</span>
            <span className="ml-2 font-medium">
              {getAccessLevelLabel(user?.accessLevel)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">{t('dashboard.status')}:</span>
            <span className="ml-2 font-medium">{user?.employeeStatus}</span>
          </div>
          {user?.supervisor && (
            <div className="col-span-2">
              <span className="text-gray-600">{t('dashboard.supervisor')}:</span>
              <span className="ml-2 font-medium">{user.supervisor.name}</span>
            </div>
          )}
          {user?.subordinates && user.subordinates.length > 0 && (
            <div className="col-span-2">
              <span className="text-gray-600">{t('dashboard.subordinates')}:</span>
              <span className="ml-2 font-medium">
                {user.subordinates.length} {user.subordinates.length > 1 ? t('dashboard.employees') : t('dashboard.employee')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}