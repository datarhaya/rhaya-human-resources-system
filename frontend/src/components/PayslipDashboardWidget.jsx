// frontend/src/components/PayslipDashboardWidget.jsx
// Monthly payslip statistics widget for PayslipManagement page

import { useState, useEffect } from 'react';
import apiClient from '../api/client';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PayslipDashboardWidget = ({ year, month, onRefresh }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showMissing, setShowMissing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [year, month, onRefresh]);

  const fetchStats = async () => {
    if (!year || !month) return;
    
    setLoading(true);
    try {
      const res = await apiClient.get('/payslips/monthly-stats', {
        params: { year, month }
      });
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to fetch monthly stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          {MONTH_NAMES[stats.period.month]} {stats.period.year} Summary
        </h3>
        <button
          onClick={fetchStats}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          disabled={loading}
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Total Employees */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Active Employees</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</div>
        </div>

        {/* Employees with Payslips */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-sm text-green-700 mb-1">With Payslips</div>
          <div className="text-2xl font-bold text-green-700">{stats.employeesWithPayslips}</div>
        </div>

        {/* Missing Employees */}
        <div className={`rounded-lg p-4 border ${
          stats.missingCount === 0 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className={`text-sm mb-1 ${
            stats.missingCount === 0 ? 'text-green-700' : 'text-red-700'
          }`}>Missing Payslips</div>
          <div className={`text-2xl font-bold ${
            stats.missingCount === 0 ? 'text-green-700' : 'text-red-700'
          }`}>{stats.missingCount}</div>
        </div>

        {/* Completion Percentage */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-sm text-blue-700 mb-1">Completion</div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-blue-700">{stats.completionPercentage}%</div>
            <div className="text-xs text-blue-600">
              ({stats.employeesWithPayslips}/{stats.totalEmployees})
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">Overall Progress</span>
          <span className="font-medium text-gray-900">{stats.employeesWithPayslips} of {stats.totalEmployees} employees</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              stats.completionPercentage === 100 
                ? 'bg-green-500' 
                : stats.completionPercentage >= 50 
                  ? 'bg-blue-500' 
                  : 'bg-yellow-500'
            }`}
            style={{ width: `${stats.completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Breakdown by Company */}
      {stats.byCompany && stats.byCompany.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Payslips by Company</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {stats.byCompany.map(company => (
              <div key={company.companyId} className="bg-gray-50 rounded px-3 py-2 border border-gray-200">
                <div className="text-xs text-gray-600">{company.companyCode}</div>
                <div className="font-semibold text-gray-900">{company.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Employees List */}
      {stats.missingCount > 0 && (
        <div>
          <button
            onClick={() => setShowMissing(!showMissing)}
            className="w-full flex items-center justify-between text-sm font-medium text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg px-4 py-2 border border-red-200 transition-colors"
          >
            <span>
              {stats.missingCount} employee{stats.missingCount !== 1 ? 's' : ''} missing payslip{stats.missingCount !== 1 ? 's' : ''}
            </span>
            <svg 
              className={`w-4 h-4 transition-transform ${showMissing ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showMissing && (
            <div className="mt-3 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {stats.missingEmployees.map(emp => (
                  <div 
                    key={emp.id} 
                    className="flex items-center justify-between bg-white border border-red-200 rounded-lg px-3 py-2 text-sm hover:bg-red-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{emp.name}</div>
                      <div className="text-xs text-gray-500">
                        NIK: {emp.nik} • {emp.companyCode || 'No Company'}
                        {emp.joinDate && (
                          <> • Joined: {new Date(emp.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {emp.email}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* All Complete Message */}
      {stats.missingCount === 0 && stats.totalEmployees > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <div className="text-sm font-medium text-green-900">All payslips issued!</div>
            <div className="text-xs text-green-700">All active employees have received their payslips for this month.</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayslipDashboardWidget;