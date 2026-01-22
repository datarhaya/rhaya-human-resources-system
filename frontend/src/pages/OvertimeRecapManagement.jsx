// frontend/src/pages/OvertimeRecapManagement.jsx

import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import * as XLSX from 'xlsx';
import { format, parseISO, set } from 'date-fns';
import { ChevronDown, ChevronRight, Clock, FileText } from 'lucide-react';

export default function OvertimeRecapManagement() {
  // Data
  const [recaps, setRecaps] = useState([]);
  const [users, setUsers] = useState([]);
  const [failedRecaps, setFailedRecaps] = useState([]);
  const [systemSettings, setSystemSettings] = useState(null);
  
  // Loading & Processing
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showAdjustDateModal, setShowAdjustDateModal] = useState(false);
  const [showEmailPreviewModal, setShowEmailPreviewModal] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  
  // Config for bulk recap
  const [recapConfig, setRecapConfig] = useState({
    fromDate: '',
    toDate: new Date().toISOString().split('T')[0],
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  
  // Progress tracking
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    currentEmployee: ''
  });
  
  // Results after recap
  const [recapResults, setRecapResults] = useState(null);
  const [blockingFailures, setBlockingFailures] = useState([]);
  
  // Date adjustment
  const [adjustDateForm, setAdjustDateForm] = useState({
    newDate: '',
    reason: ''
  });
  
  // Filters
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterEmployeeName, setFilterEmployeeName] = useState('');
  
  // Create form
  const [createData, setCreateData] = useState({
    employeeId: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });
  
  // Expanded recaps for detail view
  const [expandedRecaps, setExpandedRecaps] = useState(new Set());

  // Computed values
  const failedCount = recaps.filter(r => r.recapStatus === 'failed').length;
  
  const filteredRecaps = recaps.filter(recap => {
    if (filterYear && recap.year !== filterYear) return false;
    if (filterMonth && recap.month !== parseInt(filterMonth)) return false;
    if (filterEmployee && recap.employeeId !== filterEmployee) return false;
    if (filterEmployeeName) {
      const searchName = filterEmployeeName.toLowerCase();
      return recap.employee?.name?.toLowerCase().includes(searchName);
    }
    return true;
  });

  // // Filter recaps
  // const filteredRecaps = recaps.filter(r => {
  //   const matchesYear = !filterYear || r.year === parseInt(filterYear);
  //   const matchesMonth = !filterMonth || r.month === parseInt(filterMonth);
  //   const matchesEmployee = !filterEmployee || r.employeeId === filterEmployee;
  //   const matchesName = !filterEmployeeName || 
  //     r.employee?.name?.toLowerCase().includes(filterEmployeeName.toLowerCase());
  //   return matchesYear && matchesMonth && matchesEmployee && matchesName;
  // });

  // Month names helper
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => {
    fetchData();
    fetchSystemSettings();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [recapsRes, usersRes] = await Promise.all([
        apiClient.get('/overtime-recap/recap'),
        apiClient.get('/users')
      ]);
      
      setRecaps(recapsRes.data.data || []);
      setUsers(usersRes.data.data || []);
      
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const response = await apiClient.get('/overtime-recap/system-settings');
      setSystemSettings(response.data.data);
      
      // Auto-fill fromDate based on lastRecapDate
      if (response.data.data?.lastRecapDate) {
        const nextDay = new Date(response.data.data.lastRecapDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        setRecapConfig(prev => ({
          ...prev,
          fromDate: nextDay.toISOString().split('T')[0]
        }));
      }
    } catch (error) {
      console.error('Fetch system settings error:', error);
    }
  };

  const handleCreateRecap = async (e) => {
    e.preventDefault();
    
    if (!createData.employeeId) {
      alert('Please select an employee');
      return;
    }

    try {
      const response = await apiClient.post('/overtime-recap/recap', createData);
      alert(response.data.message);
      
      setShowCreateModal(false);
      setCreateData({
        employeeId: '',
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
      });
      
      fetchData();
    } catch (error) {
      console.error('Create recap error:', error);
      alert(error.response?.data?.error || 'Failed to create recap');
    }
  };

  // Check previous failures before starting new recap
  const checkAndStartRecap = async () => {
    const { year, month } = recapConfig;
    
    try {
      const response = await apiClient.get(
        `/overtime-recap/check-previous-failures?year=${year}&month=${month}`
      );
      
      if (!response.data.canProceed) {
        // Show blocking modal
        setBlockingFailures(response.data.failures);
        setShowBlockedModal(true);
        return;
      }
      
      // No failures, proceed with config modal
      setShowConfigModal(true);
      
    } catch (error) {
      console.error('Check failures error:', error);
      alert('Failed to check previous failures');
    }
  };

  // Start bulk recap
  const handleStartRecap = async () => {
    try {
      setProcessing(true);
      setShowProgressModal(true);
      setShowConfigModal(false);
      
      const response = await apiClient.post('/overtime-recap/bulk-recap', recapConfig);
      
      setProcessing(false);
      setShowProgressModal(false);
      setShowSummaryModal(true);

      if (response.data.data.failed.length > 0) {
        setShowSummaryModal(true);
      }

      setRecapResults(response.data.data);
      
      // Refresh data
      fetchData();
      fetchSystemSettings();
      
    } catch (error) {
      console.error('Bulk recap error:', error);
      alert(error.response?.data?.error || 'Failed to process recap');
      setProcessing(false);
      setShowProgressModal(false);
    }
  };

  // Retry failed employees
  const handleRetryFailed = async () => {
    const { month, year } = recapConfig;
    
    if (failedCount === 0) {
      alert('No failed recaps to retry');
      return;
    }
    
    if (!confirm(`Retry ${failedCount} failed employees?`)) {
      return;
    }
    
    try {
      const response = await apiClient.post('/overtime-recap/retry-failed', { month, year });
      
      alert(`✅ Success: ${response.data.nowSuccess}\n❌ Still Failed: ${response.data.stillFailed}`);
      
      fetchData();
    } catch (error) {
      console.error('Retry failed error:', error);
      alert(error.response?.data?.error || 'Failed to retry');
    }
  };

  // Send email reminder
  const handleSendEmail = async () => {
    try {
      const { fromDate, toDate, month, year } = recapConfig;
      
      if (!fromDate || !toDate) {
        alert('Please configure dates first');
        return;
      }
      
      const response = await apiClient.post('/overtime-recap/send-reminder', {
        recapDate: toDate,
        fromDate: fromDate,
        toDate: toDate,
        periodLabel: `${monthNames[month - 1]} ${year}`
      });
      
      alert(`✅ Emails sent to ${response.data.emailsSent} employees\n❌ Failed: ${response.data.failed}`);
      
    } catch (error) {
      console.error('Send email error:', error);
      alert('Failed to send emails');
    }
  };

  // Adjust recap date
  const handleAdjustDate = async () => {
    const { newDate, reason } = adjustDateForm;
    
    if (!newDate || !reason) {
      alert('Date and reason required');
      return;
    }
    
    try {
      await apiClient.patch('/overtime-recap/adjust-date', { newDate, reason });
      
      alert('✅ Date adjusted successfully');
      
      setShowAdjustDateModal(false);
      setAdjustDateForm({ newDate: '', reason: '' });
      
      fetchSystemSettings();
    } catch (error) {
      console.error('Adjust date error:', error);
      alert('Failed to adjust date');
    }
  };

  // Toggle expanded recap
  const toggleRecapExpansion = (recapId) => {
    setExpandedRecaps(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(recapId)) {
        newExpanded.delete(recapId);
      } else {
        newExpanded.add(recapId);
      }
      return newExpanded;
    });
  };
  
  const formatCurrency = (hours, recap) => {
    let rate;
    if (recap?.employee?.accessLevel === 5) {
      rate = 150000;
    } else {
      rate = recap?.employee?.overtimeRate || 300000;
    }
    
    const amount = hours * rate / 8;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const calculatePayment = (hours, recap) => {
    let rate;
    if (recap?.employee?.accessLevel === 5) {
      rate = 150000;
    } else {
      rate = recap?.employee?.overtimeRate || 300000;
    }
    return hours * rate / 8;
  };

  // Helper function to get unique dates count
  const getUniqueDatesCount = (recap) => {
    const uniqueDates = new Set();
    if (recap.overtimeRequests) {
      recap.overtimeRequests.forEach(request => {
        if (request.entries) {
          request.entries.forEach(entry => {
            uniqueDates.add(entry.date);
          });
        }
      });
    }
    return uniqueDates.size;
  };

  // Helper function to get all entries combined and sorted by date
  const getCombinedEntries = (recap) => {
    const allEntries = [];
    
    if (recap.overtimeRequests) {
      recap.overtimeRequests.forEach(request => {
        if (request.entries) {
          request.entries.forEach(entry => {
            allEntries.push({
              ...entry,
              requestedDate: request.submittedAt // Add requested date to each entry
            });
          });
        }
      });
    }

    // Sort by date chronologically
    return allEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Enhanced Excel export with daily columns
  const exportToExcel = () => {
    if (filteredRecaps.length === 0) {
      alert('No data to export');
      return;
    }

    // Step 1: Collect all dates across all filtered recaps to determine date range
    const allDates = new Set();
    filteredRecaps.forEach(recap => {
      if (recap.overtimeRequests) {
        recap.overtimeRequests.forEach(request => {
          if (request.entries) {
            request.entries.forEach(entry => {
              allDates.add(entry.date);
            });
          }
        });
      }
    });

    // Step 2: Sort dates to get earliest to latest
    const sortedDates = Array.from(allDates).sort();
    
    if (sortedDates.length === 0) {
      alert('No overtime entries found in selected recaps');
      return;
    }

    // Step 3: Prepare export data with dynamic date columns
    const exportData = filteredRecaps.map(r => {
      const row = {
        'Employee Name': r.employee.name,
        'Employee ID': r.employee.nip || '-',
      };

      // Add daily columns with hours (format: "01-Dec")
      sortedDates.forEach(dateStr => {
        const dateLabel = format(parseISO(dateStr), 'dd-MMM');
        let totalHoursForDate = 0;

        // Sum hours for this date across all requests
        if (r.overtimeRequests) {
          r.overtimeRequests.forEach(request => {
            if (request.entries) {
              request.entries.forEach(entry => {
                if (entry.date === dateStr) {
                  totalHoursForDate += entry.hours;
                }
              });
            }
          });
        }

        row[dateLabel] = totalHoursForDate > 0 ? totalHoursForDate.toFixed(1) : 0;
      });

      // Add remaining columns after date columns
      row['Division'] = r.employee.division?.name || '-';
      row['Period'] = new Date(r.year, r.month - 1).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      row['Total Hours'] = r.totalHours.toFixed(1);
      row['Paid Hours'] = r.paidHours.toFixed(1);
      row['Excess Hours'] = r.excessHours.toFixed(1);
      row['Carryover Hours'] = r.carryoverHours.toFixed(1);
      row['TOIL Days Created'] = r.toilDaysCreated;
      row['Remaining Hours'] = r.remainingHours.toFixed(1);
      row['Payment Amount'] = calculatePayment(r.paidHours, r);
      row['Recapped By'] = r.recappedBy?.name || '-';
      row['Recapped Date'] = new Date(r.recappedAt).toLocaleDateString();

      return row;
    });

    // Step 4: Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Step 5: Set column widths
    const colWidths = [
      { wch: 25 }, // Employee Name
      { wch: 15 }, // Employee ID
    ];
    
    // Add widths for dynamic date columns
    sortedDates.forEach(() => {
      colWidths.push({ wch: 10 }); // Each date column
    });
    
    // Add widths for remaining columns
    colWidths.push(
      { wch: 20 }, // Division
      { wch: 20 }, // Period
      { wch: 12 }, // Total Hours
      { wch: 12 }, // Paid Hours
      { wch: 12 }, // Excess Hours
      { wch: 15 }, // Carryover Hours
      { wch: 15 }, // TOIL Days
      { wch: 15 }, // Remaining Hours
      { wch: 20 }, // Payment Amount
      { wch: 20 }, // Recapped By
      { wch: 15 }  // Recapped Date
    );
    
    ws['!cols'] = colWidths;

    // Step 6: Create workbook and download
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Overtime Recap');

    const filename = `Overtime_Recap_${filterYear || 'All'}_${filterMonth || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Overtime Recap Management</h1>
        <div className="flex space-x-3">

          {/* Send Email Reminder Button */}
          <button
            onClick={() => setShowEmailPreviewModal(true)}  // Changed!
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Send Email Reminder</span>
          </button>

          {/* Bulk Process All Button */}
          <button
            onClick={checkAndStartRecap}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Bulk Process All</span>
          </button>

          {/* Retry Failed Button */}
          <button
            onClick={handleRetryFailed}
            disabled={failedCount === 0}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
              failedCount > 0 
                ? 'bg-orange-600 text-white hover:bg-orange-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Retry Failed ({failedCount})</span>
          </button>

          {/* Adjust Recap Date Button */}
          <button
            onClick={() => setShowAdjustDateModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Adjust Date</span>
          </button>

          {/* Export to Excel Button */}
          <button
            onClick={exportToExcel}
            disabled={filteredRecaps.length === 0}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export Excel</span>
          </button>

        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Years</option>
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Months</option>
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employee (Dropdown)</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Employees</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search by Name</label>
            <input
              type="text"
              value={filterEmployeeName}
              onChange={(e) => setFilterEmployeeName(e.target.value)}
              placeholder="Type employee name..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <button
            onClick={() => {
              setFilterYear(new Date().getFullYear());
              setFilterMonth('');
              setFilterEmployee('');
              setFilterEmployeeName('');
            }}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Recaps</p>
          <p className="text-2xl font-bold text-gray-900">{filteredRecaps.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Paid Hours</p>
          <p className="text-2xl font-bold text-blue-600">
            {filteredRecaps.reduce((sum, r) => sum + r.paidHours, 0).toFixed(1)}h
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total TOIL Days</p>
          <p className="text-2xl font-bold text-green-600">
            {filteredRecaps.reduce((sum, r) => sum + r.toilDaysCreated, 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Carryover Hours</p>
          <p className="text-2xl font-bold text-orange-600">
            {filteredRecaps.reduce((sum, r) => sum + r.remainingHours, 0).toFixed(1)}h
          </p>
        </div>
      </div>

      {/* Recaps Table with Expandable Rows */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Hours</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid Hours</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Excess</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">TOIL Days</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Carryover</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRecaps.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                  No recaps found
                </td>
              </tr>
            ) : (
              filteredRecaps.map(r => {
                const isExpanded = expandedRecaps.has(r.id);
                const combinedEntries = getCombinedEntries(r);
                const uniqueDatesCount = getUniqueDatesCount(r);
                
                return (
                  <React.Fragment key={r.id}>
                    {/* Main Row */}
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleRecapExpansion(r.id)}>
                      <td className="px-6 py-4">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{r.employee.name}</div>
                          <div className="text-sm text-gray-500">{r.employee.nip}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(r.year, r.month - 1).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long' 
                        })}
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {r.totalHours.toFixed(1)}h
                      </td>
                      <td className="px-6 py-4 text-right text-blue-600 font-medium">
                        {r.paidHours.toFixed(1)}h
                        <div className="text-xs text-gray-500">
                          {formatCurrency(r.paidHours, r)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-orange-600">
                        {r.excessHours > 0 ? `${r.excessHours.toFixed(1)}h` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {r.toilDaysCreated > 0 ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            {r.toilDaysCreated} day{r.toilDaysCreated > 1 ? 's' : ''}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {r.remainingHours > 0 ? `${r.remainingHours.toFixed(1)}h` : '-'}
                      </td>
                    </tr>

                    {/* Expanded Detail Row with Light Blue Background */}
                    {isExpanded && (
                      <tr>
                        <td colSpan="9" className="px-6 py-6 bg-blue-50">
                          <div className="space-y-6">
                            {/* Calculation Breakdown */}
                            <div className="grid grid-cols-2 gap-6">
                              {/* Left: Recap Summary */}
                              <div className="bg-white rounded-lg p-4 shadow-sm">
                                <h4 className="font-semibold text-gray-900 mb-4">Recap Summary</h4>
                                <dl className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <dt className="text-gray-600">Total Hours:</dt>
                                    <dd className="font-medium text-gray-900">{r.totalHours.toFixed(1)} hrs</dd>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <dt className="text-gray-600">Paid Hours (≤72):</dt>
                                    <dd className="font-medium text-green-600">{r.paidHours.toFixed(1)} hrs</dd>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <dt className="text-gray-600">Excess Hours:</dt>
                                    <dd className="font-medium text-orange-600">{r.excessHours.toFixed(1)} hrs</dd>
                                  </div>
                                  <div className="flex justify-between text-sm border-t pt-2">
                                    <dt className="text-gray-600">Carryover from Prev:</dt>
                                    <dd className="font-medium text-gray-900">{r.carryoverHours.toFixed(1)} hrs</dd>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <dt className="text-gray-600">Total TOIL Hours:</dt>
                                    <dd className="font-medium text-purple-600">{r.totalToilHours.toFixed(1)} hrs</dd>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <dt className="text-gray-600">TOIL Days Created:</dt>
                                    <dd className="font-medium text-purple-600">{r.toilDaysCreated} days</dd>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <dt className="text-gray-600">Remaining (carryover):</dt>
                                    <dd className="font-medium text-gray-900">{r.remainingHours.toFixed(1)} hrs</dd>
                                  </div>
                                  <div className="flex justify-between text-sm border-t pt-2">
                                    <dt className="text-gray-600">Overtime Rate:</dt>
                                    <dd className="font-medium text-gray-900">
                                      Rp {((r.employee.overtimeRate || 300000) / 8).toLocaleString('id-ID')}/hr
                                    </dd>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <dt className="text-gray-600">Estimated Payment:</dt>
                                    <dd className="font-bold text-green-600">
                                      {formatCurrency(r.paidHours, r)}
                                    </dd>
                                  </div>
                                </dl>
                              </div>

                              {/* Right: Meta Info */}
                              <div className="bg-white rounded-lg p-4 shadow-sm">
                                <h4 className="font-semibold text-gray-900 mb-4">ℹ️ Additional Info</h4>
                                <dl className="space-y-2">
                                  <div className="text-sm">
                                    <dt className="text-gray-600">Recapped By:</dt>
                                    <dd className="font-medium text-gray-900 mt-1">
                                      {r.recappedBy?.name || 'System'}
                                    </dd>
                                  </div>
                                  <div className="text-sm">
                                    <dt className="text-gray-600">Recapped At:</dt>
                                    <dd className="font-medium text-gray-900 mt-1">
                                      {new Date(r.recappedAt).toLocaleString()}
                                    </dd>
                                  </div>
                                  <div className="text-sm">
                                    <dt className="text-gray-600">Employee Email:</dt>
                                    <dd className="font-medium text-gray-900 mt-1">
                                      {r.employee.email}
                                    </dd>
                                  </div>
                                  <div className="text-sm">
                                    <dt className="text-gray-600">Division:</dt>
                                    <dd className="font-medium text-gray-900 mt-1">
                                      {r.employee.division?.name || 'N/A'}
                                    </dd>
                                  </div>
                                  <div className="text-sm">
                                    <dt className="text-gray-600">Access Level:</dt>
                                    <dd className="font-medium text-gray-900 mt-1">
                                      Level {r.employee.accessLevel}
                                    </dd>
                                  </div>
                                  <div className="text-sm">
                                    <dt className="text-gray-600">Number of Requests:</dt>
                                    <dd className="font-medium text-gray-900 mt-1">
                                      {r.overtimeRequests?.length || 0} request(s)
                                    </dd>
                                  </div>
                                  <div className="text-sm">
                                    <dt className="text-gray-600">Number of Overtime Dates:</dt>
                                    <dd className="font-medium text-gray-900 mt-1">
                                      {uniqueDatesCount} date(s)
                                    </dd>
                                  </div>
                                </dl>
                              </div>
                            </div>

                            {/* Combined Detailed Overtime Entries */}
                            {combinedEntries.length > 0 && (
                              <div className="bg-white rounded-lg p-4 shadow-sm">
                                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                                  <FileText className="w-5 h-5 mr-2" />
                                  Detailed Overtime Entries ({uniqueDatesCount} unique dates)
                                </h4>
                                
                                <div className="overflow-x-auto">
                                  <table className="w-full">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Requested Date</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {combinedEntries.map((entry, index) => (
                                        <tr key={entry.id} className="hover:bg-gray-50">
                                          <td className="px-4 py-3 text-sm text-gray-900">
                                            {index + 1}
                                          </td>
                                          <td className="px-4 py-3 text-sm text-gray-900">
                                            {format(parseISO(entry.date), 'MMM dd, yyyy')}
                                          </td>
                                          <td className="px-4 py-3 text-sm text-gray-600">
                                            {format(parseISO(entry.date), 'EEEE')}
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                              <Clock className="w-3 h-3 mr-1" />
                                              {entry.hours} hrs
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-sm text-gray-600">
                                            {format(parseISO(entry.requestedDate), 'MMM dd, yyyy')}
                                          </td>
                                          <td className="px-4 py-3 text-sm text-gray-700">
                                            {entry.description}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50">
                                      <tr>
                                        <td colSpan="3" className="px-4 py-2 text-sm font-medium text-gray-700 text-right">
                                          Total:
                                        </td>
                                        <td className="px-4 py-2">
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-bold bg-blue-600 text-white">
                                            {combinedEntries.reduce((sum, e) => sum + e.hours, 0).toFixed(1)} hrs
                                          </span>
                                        </td>
                                        <td colSpan="2"></td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Individual Recap Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Create Overtime Recap</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateRecap} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Employee <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={createData.employeeId}
                  onChange={(e) => setCreateData({...createData, employeeId: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select Employee</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.nip})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Year</label>
                  <select
                    required
                    value={createData.year}
                    onChange={(e) => setCreateData({...createData, year: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {[2024, 2025, 2026].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Month</label>
                  <select
                    required
                    value={createData.month}
                    onChange={(e) => setCreateData({...createData, month: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  📋 This will:
                  <br />• Calculate overtime for selected period
                  <br />• Cap payment at 72 hours
                  <br />• Convert excess to TOIL (8h = 1 day)
                  <br />• Reset employee's overtime balance
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Recap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Config Modal - Bulk Process Configuration */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Configure Overtime Recap</h2>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  From Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={recapConfig.fromDate}
                  onChange={(e) => setRecapConfig({...recapConfig, fromDate: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Start date of overtime period</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  To Date (Cutoff) <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={recapConfig.toDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setRecapConfig({...recapConfig, toDate: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Last day included in this recap</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Payroll Month</label>
                  <select
                    value={recapConfig.month}
                    onChange={(e) => setRecapConfig({...recapConfig, month: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {monthNames.map((name, i) => (
                      <option key={i} value={i + 1}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Year</label>
                  <input
                    type="number"
                    value={recapConfig.year}
                    onChange={(e) => setRecapConfig({...recapConfig, year: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">📋 Recap Summary</p>
                <p className="text-sm text-blue-800">
                  <strong>Period:</strong> {recapConfig.fromDate || '(not set)'} to {recapConfig.toDate}
                  <br />
                  <strong>Payroll:</strong> {monthNames[recapConfig.month - 1]} {recapConfig.year}
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  ⚠️ <strong>This will:</strong>
                  <br />• Process ALL active employees
                  <br />• Cap payment at 72 hours per period
                  <br />• Convert excess to TOIL (8h = 1 day)
                  <br />• Block overtime submissions for these dates
                </p>
              </div>

              <div className="bg-gray-50 border rounded-lg p-4">
                <p className="text-sm font-medium text-gray-900 mb-2">👥 Employees to Process</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Total Active:</p>
                    <p className="font-bold text-green-600">
                      {users.filter(u => 
                        !['RESIGNED', 'INACTIVE'].includes(u.employeeStatus) && 
                        !['ADMIN', 'FREELANCE'].includes(u.employeeType)
                      ).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Excluded:</p>
                    <p className="font-bold text-red-600">
                      {users.filter(u => 
                        ['RESIGNED', 'INACTIVE'].includes(u.employeeStatus) || 
                        ['ADMIN', 'FREELANCE'].includes(u.employeeType)
                      ).length}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Excluded: Resigned, Inactive, Admin, Freelance employees
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartRecap}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Start Recap
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Modal - Previous Month Failures */}
      {showBlockedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-red-600">⚠️ Cannot Start Recap</h2>
                <p className="text-sm text-gray-600 mt-1">Resolve previous failures first</p>
              </div>
              <button
                onClick={() => setShowBlockedModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  You have <strong>{blockingFailures.reduce((sum, f) => sum + f.count, 0)} failed recap(s)</strong> from previous months that must be resolved before starting a new recap.
                </p>
              </div>

              {blockingFailures.map((failure, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    {monthNames[failure.month - 1]} {failure.year} - {failure.count} Failed
                  </h3>
                  <div className="space-y-2">
                    {failure.employees.map((emp, empIdx) => (
                      <div key={empIdx} className="flex items-start space-x-2 text-sm">
                        <span className="text-red-500">❌</span>
                        <div>
                          <p className="font-medium">{emp.name} ({emp.nip})</p>
                          <p className="text-gray-600 text-xs">{emp.division || 'No Division'}</p>
                          <p className="text-red-600 text-xs">{emp.failureReason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowBlockedModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowBlockedModal(false);
                    // Navigate to the failed month
                    const firstFailure = blockingFailures[0];
                    setFilterYear(firstFailure.year);
                    setFilterMonth(firstFailure.month.toString());
                    setRecapConfig({
                      ...recapConfig,
                      month: firstFailure.month,
                      year: firstFailure.year
                    });
                    fetchData();
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Go to {monthNames[blockingFailures[0]?.month - 1]} {blockingFailures[0]?.year}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center">
              <div className="mb-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto"></div>
              </div>
              <h2 className="text-xl font-bold mb-2">Processing Recap...</h2>
              <p className="text-gray-600 mb-4">
                {progress.current > 0 
                  ? `Processing ${progress.current} of ${progress.total} employees`
                  : 'Initializing...'}
              </p>
              {progress.currentEmployee && (
                <p className="text-sm text-gray-500">
                  Current: {progress.currentEmployee}
                </p>
              )}
              <div className="mt-4 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Modal */}
      {showSummaryModal && recapResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Recap Complete - {monthNames[recapConfig.month - 1]} {recapConfig.year}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {recapConfig.fromDate} to {recapConfig.toDate}
                </p>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">Success</p>
                <p className="text-3xl font-bold text-green-600">{recapResults.success?.length || 0}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-3xl font-bold text-red-600">{recapResults.failed?.length || 0}</p>
              </div>
            </div>

            {recapResults.failed && recapResults.failed.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-3 text-red-600">❌ Failed Employees</h3>
                <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                  {recapResults.failed.map((fail, idx) => (
                    <div key={idx} className="p-3 hover:bg-gray-50">
                      <p className="font-medium text-sm">{fail.employeeName} ({fail.nip})</p>
                      <p className="text-xs text-red-600">{fail.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recapResults.success && recapResults.success.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-3 text-green-600">✅ Successfully Processed ({recapResults.success.length})</h3>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                  All employees have been recapped successfully. Check the main table for details.
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                onClick={exportToExcel}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Export to Excel
              </button>
              {recapResults.failed && recapResults.failed.length > 0 && (
                <button
                  onClick={() => {
                    setShowSummaryModal(false);
                    handleRetryFailed();
                  }}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Retry Failed ({recapResults.failed.length})
                </button>
              )}
              <button
                onClick={() => setShowSummaryModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Date Modal */}
      {showAdjustDateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Adjust Last Recap Date</h2>
              <button
                onClick={() => setShowAdjustDateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 border rounded-lg p-3">
                <label className="text-sm font-medium text-gray-600">Current Last Recap Date:</label>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {systemSettings?.lastRecapDate 
                    ? format(parseISO(systemSettings.lastRecapDate), 'dd MMMM yyyy')
                    : 'Not set'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  New Last Recap Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={adjustDateForm.newDate}
                  onChange={(e) => setAdjustDateForm({...adjustDateForm, newDate: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Reason for Change <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={adjustDateForm.reason}
                  onChange={(e) => setAdjustDateForm({...adjustDateForm, reason: e.target.value})}
                  placeholder="Explain why you're changing the date..."
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  required
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  ⚠️ <strong>Warning:</strong>
                  <br />• This will update the submission blocking cutoff
                  <br />• Employees can submit for dates after the new date
                  <br />• This action will be logged in audit trail
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowAdjustDateModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjustDate}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {showEmailPreviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">📧 Send Email Reminder</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Reminder for overtime submission deadline
                </p>
              </div>
              <button
                onClick={() => setShowEmailPreviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Recipients Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-medium text-blue-900">Recipients</p>
                    <p className="text-sm text-blue-800">
                      This email will be sent to <strong>eligible employees only</strong>
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {/* ✅ Updated calculation */}
                      Estimated recipients: {users.filter(u => 
                        !['RESIGNED', 'INACTIVE', 'ADMIN', 'FREELANCE'].includes(u.employeeStatus)
                      ).length} employees
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      <strong>Excluded:</strong> Resigned, Inactive, Admin, Freelance
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Details */}
              <div className="border rounded-lg p-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Subject</label>
                  <p className="text-sm font-medium mt-1">
                    [PENTING] Batas Akhir Submit Lembur - {recapConfig.toDate ? format(parseISO(recapConfig.toDate), 'dd MMMM yyyy') : '(date not set)'}
                  </p>
                </div>

                <div className="border-t pt-3">
                  <label className="text-xs font-medium text-gray-500 uppercase">Email Content Preview</label>
                  <div className="mt-2 bg-gray-50 border rounded-lg p-4 text-sm space-y-2">
                    <p><strong>Kepada [Nama Karyawan],</strong></p>
                    <p>Dengan hormat,</p>
                    <p>
                      Kami informasikan bahwa <strong>hari ini, {recapConfig.toDate ? format(parseISO(recapConfig.toDate), 'dd MMMM yyyy') : '(date not set)'}</strong>, 
                      adalah <strong>batas akhir</strong> untuk submit lembur periode payroll bulan ini.
                    </p>
                    
                    <div className="bg-white border rounded p-3 my-3">
                      <p className="font-semibold mb-2">📅 PERIODE LEMBUR</p>
                      <p className="text-xs space-y-1">
                        <span className="block">Periode: <strong>{monthNames[recapConfig.month - 1]} {recapConfig.year}</strong></span>
                        <span className="block">Dari: <strong>{recapConfig.fromDate ? format(parseISO(recapConfig.fromDate), 'dd MMMM yyyy') : '(not set)'}</strong></span>
                        <span className="block">Sampai: <strong>{recapConfig.toDate ? format(parseISO(recapConfig.toDate), 'dd MMMM yyyy') : '(not set)'}</strong></span>
                      </p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <p className="font-semibold text-yellow-800 mb-2">⚠️ PENTING - HARAP DIPERHATIKAN</p>
                      <p className="text-xs text-yellow-800 space-y-1">
                        ✓ Semua lembur HARUS sudah disubmit hari ini<br/>
                        ✓ Setelah hari ini, submit akan DIKUNCI<br/>
                        ✓ Pastikan sudah diapprove atasan<br/>
                        ✓ Lembur yang belum diapprove tidak akan masuk payroll
                      </p>
                    </div>

                    <p className="text-center py-2">
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs">
                        Submit Lembur Sekarang
                      </button>
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  ⚠️ <strong>Before sending:</strong>
                  <br />• Make sure the dates are correct
                  <br />• This email will be sent immediately to all active employees
                  <br />• Employees without email addresses will be skipped
                </p>
              </div>

              {/* Validation Check */}
              {(!recapConfig.fromDate || !recapConfig.toDate) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800 font-medium">
                    ❌ Cannot send: Please configure dates first
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowEmailPreviewModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowEmailPreviewModal(false);
                    await handleSendEmail();
                  }}
                  disabled={!recapConfig.fromDate || !recapConfig.toDate}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Send Email to All Employees
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Failed Recaps Modal */}
      {showFailedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-red-600">❌ Failed Recaps</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {monthNames[recapConfig.month - 1]} {recapConfig.year} - {failedCount} employees failed
                </p>
              </div>
              <button
                onClick={() => setShowFailedModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Summary Card */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-red-900">Recap Failed for {failedCount} Employees</p>
                    <p className="text-sm text-red-700 mt-1">
                      These employees have pending overtime requests that need approval before they can be recapped.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowFailedModal(false);
                      handleRetryFailed();
                    }}
                    disabled={failedCount === 0}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm whitespace-nowrap disabled:bg-gray-400"
                  >
                    🔄 Retry All Failed
                  </button>
                </div>
              </div>

              {/* Failed Employees List */}
              <div className="border rounded-lg divide-y">
                {filteredRecaps
                  .filter(r => r.recapStatus === 'failed')
                  .map((recap) => (
                    <div key={recap.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="text-2xl">❌</span>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {recap.employee.name}
                              </p>
                              <p className="text-sm text-gray-600">
                                NIP: {recap.employee.nip} • {recap.employee.division?.name || 'No Division'}
                              </p>
                            </div>
                          </div>

                          <div className="bg-red-50 border border-red-100 rounded-lg p-3 ml-11">
                            <p className="text-sm font-medium text-red-900 mb-1">Failure Reason:</p>
                            <p className="text-sm text-red-700">{recap.failureReason}</p>
                          </div>

                          {/* Action Suggestions */}
                          <div className="ml-11 mt-3 flex items-center space-x-2 text-xs">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                              💡 Action needed: Get supervisor to approve pending overtimes
                            </span>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="ml-4 flex flex-col space-y-2">
                          <button
                            onClick={() => {
                              // Navigate to employee's overtime requests
                              window.location.href = `/overtime/requests?employee=${recap.employeeId}`;
                            }}
                            className="px-3 py-1 text-xs border rounded hover:bg-gray-50"
                          >
                            View Overtimes
                          </button>
                          <button
                            onClick={async () => {
                              // Retry just this employee
                              try {
                                await apiClient.post('/overtime-recap/retry-failed', {
                                  month: recap.month,
                                  year: recap.year
                                });
                                fetchData();
                              } catch (error) {
                                alert('Failed to retry');
                              }
                            }}
                            className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                          >
                            Retry
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {filteredRecaps.filter(r => r.recapStatus === 'failed').length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium">No failed recaps found</p>
                  <p className="text-sm">All employees have been recapped successfully</p>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">📋 How to resolve:</p>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Contact the employee's supervisor</li>
                  <li>Ask them to approve or reject the pending overtime requests</li>
                  <li>Once approved/rejected, click "Retry All Failed" or retry individual employees</li>
                  <li>System will automatically process them if there are no more pending requests</li>
                </ol>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowFailedModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowFailedModal(false);
                    handleRetryFailed();
                  }}
                  disabled={failedCount === 0}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Retry All Failed ({failedCount})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Process Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Bulk Process All Employees</h2>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleBulkRecap} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={bulkData.year}
                    onChange={(e) => setBulkData({...bulkData, year: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {[2024, 2025, 2026].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Month <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={bulkData.month}
                    onChange={(e) => setBulkData({...bulkData, month: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-900 mb-2">
                      📊 Bulk Processing
                    </p>
                    <p className="text-sm text-green-800">
                      This will process overtime recap for <strong>ALL employees</strong> who have approved overtime in the selected period.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Actions for each employee:</strong>
                  <br />• Calculate total overtime hours
                  <br />• Cap payment at 72 hours
                  <br />• Convert excess to TOIL (8h = 1 day)
                  <br />• Handle carryover from previous month
                  <br />• Reset overtime balance to 0
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs text-yellow-800">
                    <strong>Warning:</strong> This action cannot be undone. Make sure you've selected the correct period.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Process All Employees
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}