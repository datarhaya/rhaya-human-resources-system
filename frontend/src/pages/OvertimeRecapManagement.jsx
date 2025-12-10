// frontend/src/pages/OvertimeRecapManagement.jsx

import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronRight, Clock, FileText } from 'lucide-react';

export default function OvertimeRecapManagement() {
  const [recaps, setRecaps] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  
  // Expanded recaps for detail view
  const [expandedRecaps, setExpandedRecaps] = useState(new Set());

  const [bulkData, setBulkData] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
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

  useEffect(() => {
    fetchData();
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

  // const handleExpireToil = async () => {
  //   if (!confirm('This will expire all old TOIL entries. Continue?')) {
  //     return;
  //   }

  //   try {
  //     const response = await apiClient.post('/overtime-recap/toil/expire');
  //     alert(response.data.message);
  //     fetchData();
  //   } catch (error) {
  //     console.error('Expire TOIL error:', error);
  //     alert(error.response?.data?.error || 'Failed to expire TOIL');
  //   }
  // };

  const handleBulkRecap = async (e) => {
    e.preventDefault();
    
    const periodName = new Date(bulkData.year, bulkData.month - 1).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
    
    if (!confirm(`⚠️ Process ALL employees' overtime for ${periodName}?\n\nThis will create recaps for all employees with approved overtime in this period.`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post('/overtime-recap/bulk-recap', bulkData);
      
      const { success, failed } = response.data.data;
      
      alert(
        `✅ Bulk Processing Complete!\n\n` +
        `✓ Successfully processed: ${success.length} employees\n` +
        `✗ Failed: ${failed.length} employees\n\n` +
        `${response.data.message}`
      );
      
      setShowBulkModal(false);
      fetchData();
    } catch (error) {
      console.error('Bulk recap error:', error);
      alert(error.response?.data?.error || 'Failed to process bulk recap');
    } finally {
      setLoading(false);
    }
  };

  // Toggle recap expansion
  const toggleRecapExpansion = (recapId) => {
    const newExpanded = new Set(expandedRecaps);
    if (newExpanded.has(recapId)) {
      newExpanded.delete(recapId);
    } else {
      newExpanded.add(recapId);
    }
    setExpandedRecaps(newExpanded);
  };

  // Filter recaps
  const filteredRecaps = recaps.filter(r => {
    const matchesYear = !filterYear || r.year === parseInt(filterYear);
    const matchesMonth = !filterMonth || r.month === parseInt(filterMonth);
    const matchesEmployee = !filterEmployee || r.employeeId === filterEmployee;
    const matchesName = !filterEmployeeName || 
      r.employee?.name?.toLowerCase().includes(filterEmployeeName.toLowerCase());
    return matchesYear && matchesMonth && matchesEmployee && matchesName;
  });
  
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
          <button
            onClick={exportToExcel}
            disabled={filteredRecaps.length === 0}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center space-x-2 disabled:bg-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export to Excel</span>
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Bulk Process All</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Individual Recap</span>
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
                  <>
                    {/* Main Row */}
                    <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleRecapExpansion(r.id)}>
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
                  </>
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