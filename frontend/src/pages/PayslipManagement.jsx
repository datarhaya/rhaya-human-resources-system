// frontend/src/pages/PayslipManagement.jsx

import { useState, useEffect } from 'react';
import Select from 'react-select';
import apiClient from '../api/client';

export default function PayslipManagement() {
  const [payslips, setPayslips] = useState([]);
  const [users, setUsers] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [existingPayslip, setExistingPayslip] = useState(null);
  
  // Filters
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [uploadData, setUploadData] = useState({
    employeeId: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    file: null,
    sendNotification: true
  });

  const [batchUploadData, setBatchUploadData] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    files: [],
    sendNotifications: true
  });

  const [showBatchModal, setShowBatchModal] = useState(false);  

  // Selected employee for searchable dropdown
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [payslipsRes, usersRes, divisionsRes] = await Promise.all([
        apiClient.get('/payslips'),
        apiClient.get('/users'),
        apiClient.get('/divisions')
      ]);
      setPayslips(payslipsRes.data.data || []);
      setUsers(usersRes.data.data || []);
      setDivisions(divisionsRes.data.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Check if payslip already exists for employee + period
  const checkExistingPayslip = () => {
    const existing = payslips.find(p => 
      p.employeeId === uploadData.employeeId &&
      p.year === uploadData.year &&
      p.month === uploadData.month
    );
    return existing;
  };

  const handleUploadAttempt = async (e) => {
    e.preventDefault();
    
    if (!uploadData.file) {
      alert('Please select a PDF file');
      return;
    }

    if (!uploadData.employeeId) {
      alert('Please select an employee');
      return;
    }

    // Check if payslip already exists
    const existing = checkExistingPayslip();
    
    if (existing) {
      // Show warning modal
      setExistingPayslip(existing);
      setShowWarningModal(true);
    } else {
      // Proceed with upload directly
      await performUpload();
    }
  };

  const performUpload = async () => {
    try {
      const formData = new FormData();
      formData.append('file', uploadData.file);
      formData.append('employeeId', uploadData.employeeId);
      formData.append('year', uploadData.year);
      formData.append('month', uploadData.month);
      formData.append('sendNotification', uploadData.sendNotification); 

      await apiClient.post('/payslips/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const notificationMsg = uploadData.sendNotification 
        ? ' and email notification sent' 
        : '';
      alert(`Payslip uploaded successfully${notificationMsg}`);
      
      setShowUploadModal(false);
      setShowWarningModal(false);
      setUploadData({
        employeeId: '',
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        file: null,
        sendNotification: true  
      });
      setSelectedEmployee(null);
      setExistingPayslip(null);
      fetchData();
    } catch (error) {
      console.error('Upload error:', error);
      alert(error.response?.data?.error || 'Upload failed');
    }
  };

  // Batch upload handler
  const handleBatchUpload = async (e) => {
    e.preventDefault();
    
    if (batchUploadData.files.length === 0) {
      alert('Please select at least one PDF file');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      
      // Append all files
      batchUploadData.files.forEach(file => {
        formData.append('files', file);
      });
      
      formData.append('year', batchUploadData.year);
      formData.append('month', batchUploadData.month);
      formData.append('sendNotifications', batchUploadData.sendNotifications);

      const res = await apiClient.post('/payslips/batch-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { success, failed, emailNotifications } = res.data.data;
      
      let message = `Batch upload complete:\n`;
      message += `✅ ${success.length} payslips uploaded\n`;
      if (failed.length > 0) {
        message += `❌ ${failed.length} failed\n`;
      }
      if (emailNotifications) {
        message += `📧 ${emailNotifications.sent} notifications sent`;
      }

      alert(message);
      
      setShowBatchModal(false);
      setBatchUploadData({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        files: [],
        sendNotifications: true
      });
      fetchData();
    } catch (error) {
      console.error('Batch upload error:', error);
      alert(error.response?.data?.error || 'Batch upload failed');
    } finally {
      setLoading(false);
    }
  };

  // Resend notification for single payslip
  const handleResendNotification = async (payslipId, employeeName) => {
    if (!confirm(`Send payslip notification to ${employeeName}?`)) {
      return;
    }

    try {
      await apiClient.post(`/payslips/${payslipId}/notify`);
      alert('Notification sent successfully');
    } catch (error) {
      console.error('Notification error:', error);
      alert(error.response?.data?.error || 'Failed to send notification');
    }
  };

  // Blast notification to all employees for the month
  const handleBlastNotification = async () => {
    if (!filterYear || !filterMonth) {
      alert('Please select both Year and Month to send notifications');
      return;
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const periodText = `${monthNames[filterMonth - 1]} ${filterYear}`;

    if (!confirm(`Send payslip notifications to ALL employees for ${periodText}?`)) {
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.post('/payslips/notify-all', {
        year: filterYear,
        month: filterMonth
      });

      const { notificationsSent, notificationsFailed } = res.data.data;
      
      let message = `Notifications sent!\n`;
      message += `✅ ${notificationsSent} emails sent`;
      if (notificationsFailed > 0) {
        message += `\n❌ ${notificationsFailed} failed`;
      }

      alert(message);
    } catch (error) {
      console.error('Blast notification error:', error);
      alert(error.response?.data?.error || 'Failed to send notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (payslipId, employeeName) => {
    if (!confirm(`Are you sure you want to delete this payslip for ${employeeName}?`)) {
      return;
    }

    try {
      await apiClient.delete(`/payslips/${payslipId}`);
      alert('Payslip deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Delete error:', error);
      alert(error.response?.data?.error || 'Failed to delete payslip');
    }
  };

  const handleDownload = async (payslipId, fileName) => {
    try {
      const response = await apiClient.get(`/payslips/${payslipId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download payslip');
    }
  };

  // Filter payslips
  const filteredPayslips = payslips.filter(p => {
    const matchesYear = !filterYear || p.year === parseInt(filterYear);
    const matchesMonth = !filterMonth || p.month === parseInt(filterMonth);
    const matchesEmployee = !filterEmployee || p.employeeId === filterEmployee;
    const matchesDivision = !filterDivision || p.employee?.division?.id === filterDivision;
    const matchesSearch = !searchTerm || 
      p.employee?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.employee?.nip?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.employee?.email.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesYear && matchesMonth && matchesEmployee && matchesDivision && matchesSearch;
  });

  // Generate year options (current year and 2 years back/forward)
  const yearOptions = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear - 2; i <= currentYear + 2; i++) {
    yearOptions.push(i);
  }

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Truncate filename
  const truncateFilename = (filename, maxLength = 30) => {
    if (!filename) return '-';
    if (filename.length <= maxLength) return filename;
    
    const extension = filename.split('.').pop();
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4);
    
    return `${truncatedName}...${extension}`;
  };

  // Prepare employee options for react-select
  const employeeOptions = users.map(user => ({
    value: user.id,
    label: `${user.name}${user.nip ? ` (${user.nip})` : ''}`,
    employee: user
  }));

  // Custom styles for react-select to match your design
  const selectStyles = {
    control: (base) => ({
      ...base,
      minHeight: '42px',
      borderColor: '#d1d5db',
      '&:hover': {
        borderColor: '#9ca3af'
      }
    }),
    menu: (base) => ({
      ...base,
      zIndex: 9999
    })
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold text-gray-900">Payslip Management</h1>
      
      <div className="flex space-x-3">
        {/* ADD: Batch Upload Button */}
        <button
          onClick={() => setShowBatchModal(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span>Batch Upload</span>
        </button>

        {/* Existing Single Upload Button */}
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Upload Payslip</span>
        </button>
      </div>
    </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Name, NIP, Email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Years</option>
              {yearOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Months</option>
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          {/* Employee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Employees</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Division */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Division</label>
            <select
              value={filterDivision}
              onChange={(e) => setFilterDivision(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Divisions</option>
              {divisions.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {filterYear && filterMonth && filteredPayslips.length > 0 && (
          <div className="border-t mt-4 pt-4">
            <button
              onClick={handleBlastNotification}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span>Send Notifications to All ({filteredPayslips.length} employees)</span>
            </button>
            <p className="text-sm text-gray-500 mt-2">
              Send email notifications to all employees with payslips for {filterMonth}/{filterYear}
            </p>
          </div>
        )}

        <div className="mt-4">
          <button
            onClick={() => {
              setFilterYear(new Date().getFullYear());
              setFilterMonth('');
              setFilterEmployee('');
              setFilterDivision('');
              setSearchTerm('');
            }}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Payslips</p>
          <p className="text-2xl font-bold text-gray-900">{filteredPayslips.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Unique Employees</p>
          <p className="text-2xl font-bold text-blue-600">
            {new Set(filteredPayslips.map(p => p.employeeId)).size}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Current Year</p>
          <p className="text-2xl font-bold text-green-600">
            {filteredPayslips.filter(p => p.year === currentYear).length}
          </p>
        </div>
      </div>

      {/* Payslips Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Division</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayslips.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No payslips found
                  </td>
                </tr>
              ) : (
                filteredPayslips.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{p.employee?.name}</div>
                        <div className="text-sm text-gray-500">
                          {p.employee?.nip && `NIP: ${p.employee.nip}`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{p.employee?.division?.name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(p.year, p.month - 1).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long' 
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900" title={p.fileName}>
                        {truncateFilename(p.fileName)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(p.fileSize / 1024).toFixed(1)} KB
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(p.uploadedAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        by {p.uploadedBy?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {/* Download Button */}
                        <button
                          onClick={() => handleDownload(p.id, p.fileName)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>

                        <button
                          onClick={() => handleResendNotification(p.id, p.employee?.name)}
                          className="text-green-600 hover:text-green-900"
                          title="Resend notification email"
                        >
                          Resend Email
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(p.id, p.employee?.name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900">Upload Payslip</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedEmployee(null);
                  setUploadData({
                    employeeId: '',
                    year: new Date().getFullYear(),
                    month: new Date().getMonth() + 1,
                    file: null
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUploadAttempt} className="space-y-4">
              {/* Employee - Searchable Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee <span className="text-red-500">*</span>
                </label>
                <Select
                  value={selectedEmployee}
                  onChange={(option) => {
                    setSelectedEmployee(option);
                    setUploadData({...uploadData, employeeId: option?.value || ''});
                  }}
                  options={employeeOptions}
                  styles={selectStyles}
                  placeholder="Search employee by name or NIP..."
                  isClearable
                  isSearchable
                  className="react-select-container"
                  classNamePrefix="react-select"
                  noOptionsMessage={() => "No employees found"}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Type to search by name or NIP
                </p>
              </div>

              {/* Year and Month */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={uploadData.year}
                    onChange={(e) => setUploadData({...uploadData, year: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {yearOptions.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Month <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={uploadData.month}
                    onChange={(e) => setUploadData({...uploadData, month: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* PDF File */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PDF File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  required
                  onChange={(e) => setUploadData({...uploadData, file: e.target.files[0]})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  📄 Max file size: 5MB • PDF format only
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  📋 The system will check if a payslip already exists for this employee and period before uploading.
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="sendNotification"
                  checked={uploadData.sendNotification}
                  onChange={(e) => setUploadData({
                    ...uploadData,
                    sendNotification: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="sendNotification" className="ml-2 block text-sm text-gray-900">
                  Send email notification to employee
                </label>
              </div>

              {/* Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedEmployee(null);
                    setUploadData({
                      employeeId: '',
                      year: new Date().getFullYear(),
                      month: new Date().getMonth() + 1,
                      file: null
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Check & Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Upload Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Batch Upload Payslips</h2>
            
            <form onSubmit={handleBatchUpload}>
              {/* Year */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <select
                  value={batchUploadData.year}
                  onChange={(e) => setBatchUploadData({
                    ...batchUploadData,
                    year: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  {yearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Month */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Month
                </label>
                <select
                  value={batchUploadData.month}
                  onChange={(e) => setBatchUploadData({
                    ...batchUploadData,
                    month: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  {['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December']
                    .map((month, idx) => (
                      <option key={idx + 1} value={idx + 1}>{month}</option>
                    ))
                  }
                </select>
              </div>

              {/* Files */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PDF Files (multiple)
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={(e) => setBatchUploadData({
                    ...batchUploadData,
                    files: Array.from(e.target.files)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
                {batchUploadData.files.length > 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    {batchUploadData.files.length} file(s) selected
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  File naming: employeeId.pdf or employeeId_payslip_YYYY_MM.pdf
                </p>
              </div>

              {/* Send Notifications Checkbox */}
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="batchSendNotifications"
                  checked={batchUploadData.sendNotifications}
                  onChange={(e) => setBatchUploadData({
                    ...batchUploadData,
                    sendNotifications: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="batchSendNotifications" className="ml-2 block text-sm text-gray-900">
                  Send email notifications to all employees
                </label>
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBatchModal(false);
                    setBatchUploadData({
                      year: new Date().getFullYear(),
                      month: new Date().getMonth() + 1,
                      files: [],
                      sendNotifications: true
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Upload {batchUploadData.files.length} File(s)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warning Modal - Existing Payslip Found */}
      {showWarningModal && existingPayslip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex items-start mb-4">
              {/* Warning Icon */}
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>

              <div className="ml-4 flex-1">
                <h3 className="text-lg font-bold text-gray-900">
                  Payslip Already Exists
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  A payslip for this employee and period has already been uploaded. Continuing will replace the existing file.
                </p>

                {/* Existing Payslip Details */}
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Existing Payslip Details:</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Employee:</dt>
                      <dd className="font-medium text-gray-900">{existingPayslip.employee?.name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Period:</dt>
                      <dd className="font-medium text-gray-900">
                        {new Date(existingPayslip.year, existingPayslip.month - 1).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long' 
                        })}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Current File:</dt>
                      <dd className="font-medium text-gray-900 truncate max-w-xs" title={existingPayslip.fileName}>
                        {truncateFilename(existingPayslip.fileName, 25)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Uploaded:</dt>
                      <dd className="font-medium text-gray-900">
                        {new Date(existingPayslip.uploadedAt).toLocaleDateString()} by {existingPayslip.uploadedBy?.name}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">File Size:</dt>
                      <dd className="font-medium text-gray-900">
                        {(existingPayslip.fileSize / 1024).toFixed(1)} KB
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* New File Info */}
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-700 mb-2">New File to Upload:</h4>
                  <p className="text-sm text-blue-900 font-medium">{uploadData.file?.name}</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Size: {(uploadData.file?.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                {/* Warning Message */}
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-red-800">
                      <strong>Warning:</strong> The old file will be permanently deleted and cannot be recovered.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowWarningModal(false);
                  setExistingPayslip(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={performUpload}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
              >
                Replace Payslip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}