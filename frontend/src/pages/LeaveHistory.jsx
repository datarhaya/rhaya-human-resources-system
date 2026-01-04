// frontend/src/pages/LeaveHistory.jsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import DatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import { id, enUS } from 'date-fns/locale';
import { format, addDays, getDay, addMonths } from 'date-fns';
import i18n from '../i18n';
import "react-datepicker/dist/react-datepicker.css";

export default function LeaveHistory() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('submit');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]); // Store unfiltered data
  const [balance, setBalance] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [errorDialog, setErrorDialog] = useState({
    show: false,
    title: '',
    messages: [],
    isSuccess: false
  });

  // Register locales for DatePicker
  registerLocale('id', id);
  registerLocale('en', enUS);

  // Filter state
  const [filters, setFilters] = useState({
    leaveType: '',
    requestDateFrom: '',
    requestDateTo: '',
    leaveDateFrom: '',
    leaveDateTo: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    leaveType: 'ANNUAL_LEAVE',
    startDate: null,
    endDate: null,
    reason: '',
    attachment: null
  });

  // Get available leave types based on gender
  const getAvailableLeaveTypes = () => {
    const allLeaveTypes = [
      { value: 'ANNUAL_LEAVE', labelKey: 'annualLeave', isPaid: true, requiresAttachment: false },
      { value: 'SICK_LEAVE', labelKey: 'sickLeave', isPaid: true, requiresAttachment: true, noteKey: 'attachmentNote' },
      { value: 'MATERNITY_LEAVE', labelKey: 'maternityLeave', isPaid: true, requiresAttachment: false, femaleOnly: true },
      { value: 'MENSTRUAL_LEAVE', labelKey: 'menstrualLeave', isPaid: true, requiresAttachment: false, femaleOnly: true },
      { value: 'MARRIAGE_LEAVE', labelKey: 'marriageLeave', isPaid: true, requiresAttachment: false },
      { value: 'UNPAID_LEAVE', labelKey: 'unpaidLeave', isPaid: false, requiresAttachment: false, noteKey: 'unpaidNote' }
    ];

    // Filter based on gender
    if (user?.gender === 'Male') {
      return allLeaveTypes.filter(type => !type.femaleOnly);
    }
    
    return allLeaveTypes;
  };

  const leaveTypes = getAvailableLeaveTypes();

  useEffect(() => {
    fetchLeaveData();
    fetchLeaveBalance();
  }, []);

  // Apply filters when filters change
  useEffect(() => {
    applyFilters();
  }, [filters, allRequests]);

  // Auto-calculate end date for maternity leave
  useEffect(() => {
    if (formData.leaveType === 'MATERNITY_LEAVE' && formData.startDate) {
      // Maternity leave is 90 calendar days (3 months)
      const endDate = addDays(formData.startDate, 89); // 89 because we include start day
      setFormData(prev => ({ ...prev, endDate }));
    } else if (formData.leaveType === 'MENSTRUAL_LEAVE' && formData.startDate) {
      // Menstrual leave is always 1 day
      setFormData(prev => ({ ...prev, endDate: formData.startDate }));
    }
  }, [formData.leaveType, formData.startDate]);

  const fetchLeaveData = async () => {
    try {
      const [requestsRes, balanceRes] = await Promise.all([
        apiClient.get('/leave/my-requests'),
        apiClient.get('/leave/my-balance')
      ]);
      setAllRequests(requestsRes.data.data || []);
      setRequests(requestsRes.data.data || []);
      setBalance(balanceRes.data.data || null);
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const response = await apiClient.get(`/leave/balance/${currentYear}`);
      setLeaveBalance(response.data.data);
    } catch (error) {
      console.error('Failed to fetch leave balance:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...allRequests];

    // Filter by leave type
    if (filters.leaveType) {
      filtered = filtered.filter(req => req.leaveType === filters.leaveType);
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(req => req.status === filters.status);
    }

    // Filter by request date range
    if (filters.requestDateFrom) {
      filtered = filtered.filter(req => 
        new Date(req.createdAt) >= new Date(filters.requestDateFrom)
      );
    }
    if (filters.requestDateTo) {
      filtered = filtered.filter(req => 
        new Date(req.createdAt) <= new Date(filters.requestDateTo + 'T23:59:59')
      );
    }

    // Filter by leave date range
    if (filters.leaveDateFrom) {
      filtered = filtered.filter(req => 
        new Date(req.startDate) >= new Date(filters.leaveDateFrom)
      );
    }
    if (filters.leaveDateTo) {
      filtered = filtered.filter(req => 
        new Date(req.endDate) <= new Date(filters.leaveDateTo)
      );
    }

    setRequests(filtered);
  };

  const clearFilters = () => {
    setFilters({
      leaveType: '',
      requestDateFrom: '',
      requestDateTo: '',
      leaveDateFrom: '',
      leaveDateTo: '',
      status: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  // Calculate working days (excluding weekends)
  const calculateWorkingDays = (start, end) => {
    if (!start || !end) return 0;
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    let workingDays = 0;
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workingDays;
  };

  // Check if a date is a weekend
  const isWeekend = (date) => {
    const day = getDay(date);
    return day === 0 || day === 6; // Sunday or Saturday
  };

  // Get day name
  const getDayName = (date) => {
    if (!date) return '';
    return format(date, 'EEEE');
  };

  // Filter out weekends for date picker
  const filterWeekends = (date) => {
    return !isWeekend(date);
  };

  // Get max date for date picker based on leave type
  const getMaxDate = () => {
    if (formData.leaveType === 'MENSTRUAL_LEAVE') {
      // Allow today + up to 2 days forward
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 2);
      return maxDate;
    }
    return null; // No limit for future dates
  };

  // Get min date for date picker based on leave type
  const getMinDate = () => {
    if (formData.leaveType === 'MENSTRUAL_LEAVE') {
      return null; // Can select past dates
    }
    return new Date(); // Future dates only
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.startDate || !formData.endDate) {
        setErrorDialog({
          show: true,
          title: t('leave.error') || 'Error',
          messages: [t('leave.selectDates') || 'Please select start and end dates'],
          isSuccess: false
        });
        setLoading(false);
        return;
      }

      const totalDays = calculateWorkingDays(formData.startDate, formData.endDate);

      if (totalDays <= 0) {
        setErrorDialog({
          show: true,
          title: t('leave.error') || 'Error',
          messages: [t('leave.invalidDates') || 'Invalid date range'],
          isSuccess: false
        });
        setLoading(false);
        return;
      }

      // Additional client-side validation
      if (formData.leaveType !== 'MATERNITY_LEAVE' && totalDays > 5) {
        setErrorDialog({
          show: true,
          title: t('leave.error') || 'Error',
          messages: ['Maximum 5 working days per leave request (weekends excluded)'],
          isSuccess: false
        });
        setLoading(false);
        return;
      }

      if (formData.leaveType === 'MENSTRUAL_LEAVE' && totalDays !== 1) {
        setErrorDialog({
          show: true,
          title: t('leave.error') || 'Error',
          messages: ['Menstrual leave can only be 1 day'],
          isSuccess: false
        });
        setLoading(false);
        return;
      }

      const submitData = {
        leaveType: formData.leaveType,
        startDate: format(formData.startDate, 'yyyy-MM-dd'),
        endDate: format(formData.endDate, 'yyyy-MM-dd'),
        totalDays,
        reason: formData.reason,
        attachment: formData.attachment || null
      };

      await apiClient.post('/leave/submit', submitData);
      
      // Show success dialog
      setErrorDialog({
        show: true,
        title: t('leave.success') || 'Success',
        messages: [t('leave.submitSuccess') || 'Leave request submitted successfully!'],
        isSuccess: true
      });
      
      // Reset form after delay
      setTimeout(() => {
        setFormData({
          leaveType: 'ANNUAL_LEAVE',
          startDate: null,
          endDate: null,
          reason: '',
          attachment: null
        });
        
        // Refresh data
        fetchLeaveData();
        setActiveTab('history');
        setErrorDialog({ show: false, title: '', messages: [], isSuccess: false });
      }, 1500);
      
    } catch (error) {
      console.error('Submit error:', error.message || error);
      
      // Extract error messages from backend response
      let errorMessages = [];
      let errorTitle = t('leave.submitError') || 'Failed to submit leave request';
      
      // Try multiple possible error formats
      let data = null;
      
      // Format 1: Standard axios error (error.response.data)
      if (error.response?.data) {
        data = error.response.data;
      }
      // Format 2: Transformed error (error.data)
      else if (error.data) {
        data = error.data;
      }
      // Format 3: Error is the data itself
      else if (error.details || error.error || error.message) {
        data = error;
      }
      
      if (data) {
        // Format 1: { details: ['error1', 'error2'] }
        if (data.details && Array.isArray(data.details) && data.details.length > 0) {
          errorMessages = data.details;
          errorTitle = t('leave.validationError') || 'Validation Error';
        }
        // Format 2: { error: 'single error message' }
        else if (data.error && typeof data.error === 'string') {
          errorMessages = [data.error];
        }
        // Format 3: { message: 'single error message' }
        else if (data.message && typeof data.message === 'string') {
          errorMessages = [data.message];
        }
        // Format 4: { errors: ['error1', 'error2'] } (alternative)
        else if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          errorMessages = data.errors;
          errorTitle = t('leave.validationError') || 'Validation Error';
        }
      }
      
      // Fallback to generic error
      if (errorMessages.length === 0) {
        errorMessages = [t('leave.submitError') || 'Failed to submit leave request. Please try again.'];
      }
      
      // Show error dialog
      setErrorDialog({
        show: true,
        title: errorTitle,
        messages: errorMessages,
        isSuccess: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (requestId) => {
    if (!confirm(t('leave.deleteConfirm'))) return;

    try {
      await apiClient.delete(`/leave/${requestId}`);
      alert(t('leave.deleteSuccess'));
      fetchLeaveData();
    } catch (error) {
      console.error('Delete error:', error);
      alert(error.response?.data?.error || t('leave.deleteError'));
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getLeaveTypeLabel = (type) => {
    const leaveType = leaveTypes.find(lt => lt.value === type);
    return leaveType ? t(`leave.${leaveType.labelKey}`) : type;
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'dd MMM yyyy');
  };

  const currentLeaveType = leaveTypes.find(lt => lt.value === formData.leaveType);
  const workingDays = calculateWorkingDays(formData.startDate, formData.endDate);

  // Error/Success Dialog Component
  const ErrorDialog = () => {
    if (!errorDialog.show) return null;

    const isSuccess = errorDialog.isSuccess || false;
    const bgColor = isSuccess ? 'bg-green-600' : 'bg-red-600';
    const iconColor = isSuccess ? 'text-green-600' : 'text-red-600';
    const buttonColor = isSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-fadeIn">
          {/* Header */}
          <div className={`${bgColor} text-white px-6 py-4 rounded-t-lg flex items-center justify-between`}>
            <div className="flex items-center">
              {isSuccess ? (
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <h3 className="text-lg font-semibold">{errorDialog.title}</h3>
            </div>
            <button
              onClick={() => setErrorDialog({ show: false, title: '', messages: [], isSuccess: false })}
              className="text-white hover:text-gray-200 transition-colors"
              aria-label="Close dialog"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 max-h-96 overflow-y-auto">
            {errorDialog.messages.length === 1 ? (
              <p className="text-gray-700 text-base">{errorDialog.messages[0]}</p>
            ) : (
              <ul className="space-y-2">
                {errorDialog.messages.map((message, index) => (
                  <li key={index} className="flex items-start">
                    <svg className={`w-5 h-5 ${iconColor} mr-2 mt-0.5 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isSuccess ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      )}
                    </svg>
                    <span className="text-gray-700">{message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end">
            <button
              onClick={() => setErrorDialog({ show: false, title: '', messages: [], isSuccess: false })}
              className={`px-6 py-2 ${buttonColor} text-white rounded-lg transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${isSuccess ? 'focus:ring-green-500' : 'focus:ring-red-500'}`}
            >
              {t('common.close') || 'Close'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('leave.title')}</h1>
        <p className="text-gray-600 mt-2">{t('leave.description')}</p>
      </div>

      {/* Leave Balance Summary */}
      {balance && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">{t('leave.annualQuota')}</div>
            <div className="text-2xl font-bold text-blue-600">{balance.annualQuota || 14}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">{t('leave.annualUsed')}</div>
            <div className="text-2xl font-bold text-orange-600">{balance.annualUsed || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">{t('leave.annualRemaining')}</div>
            <div className="text-2xl font-bold text-green-600">{balance.annualRemaining || 14}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">{t('leave.sickLeaveUsed')}</div>
            <div className="text-2xl font-bold text-purple-600">{balance.sickLeaveUsed || 0}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('submit')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'submit'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('leave.submitRequest')}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('leave.myRequests')}
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'submit' ? (
            /* Submit Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Important Notes */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-blue-900">{t('leave.importantNotes')}</h3>
                    <ul className="mt-1 text-sm text-blue-800 list-disc list-inside space-y-1">
                      <li>{t('leave.note1')}</li>
                      <li>{t('leave.note2')}</li>
                      <li>{t('leave.note3')}</li>
                      <li>{t('leave.note4')}</li>
                      <li>{t('leave.note5')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Leave Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('leave.type')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value, startDate: null, endDate: null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {leaveTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {t(`leave.${type.labelKey}`)} {!type.isPaid && ' (Unpaid)'}
                    </option>
                  ))}
                </select>
                
                {currentLeaveType?.noteKey && (
                  <p className="mt-2 text-sm text-gray-600">
                    ℹ️ {t(`leave.${currentLeaveType.noteKey}`)}
                  </p>
                )}
              </div>

              {/* Date Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('leave.startDate')} <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    selected={formData.startDate}
                    onChange={(date) => setFormData({ ...formData, startDate: date })}
                    minDate={getMinDate()}
                    maxDate={getMaxDate()}
                    filterDate={formData.leaveType !== 'MATERNITY_LEAVE' ? filterWeekends : undefined}
                    dateFormat="dd/MM/yyyy"
                    locale={i18n.language === 'id' ? 'id' : 'en'}
                    placeholderText={t('leave.selectStartDate')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                    wrapperClassName="w-full"
                    required
                    showYearDropdown
                    showMonthDropdown
                    dropdownMode="select"
                  />
                  {formData.startDate && (
                    <p className="mt-1 text-sm text-gray-600">
                      {getDayName(formData.startDate)}
                      {isWeekend(formData.startDate) && formData.leaveType === 'MATERNITY_LEAVE' && (
                        <span className="ml-2 text-orange-600">(Weekend)</span>
                      )}
                    </p>
                  )}
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('leave.endDate')} <span className="text-red-500">*</span>
                  </label>
                  {formData.leaveType === 'MATERNITY_LEAVE' || formData.leaveType === 'MENSTRUAL_LEAVE' ? (
                    <div className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                      {formData.endDate ? format(formData.endDate, 'dd/MM/yyyy') : '-'}
                      <span className="ml-2 text-sm text-gray-500">
                        ({formData.leaveType === 'MATERNITY_LEAVE' ? 'Auto-calculated (90 days)' : 'Same day'})
                      </span>
                    </div>
                  ) : (
                    <>
                      <DatePicker
                        selected={formData.endDate}
                        onChange={(date) => setFormData({ ...formData, endDate: date })}
                        minDate={formData.startDate || getMinDate()}
                        maxDate={getMaxDate()}
                        filterDate={filterWeekends}
                        dateFormat="dd/MM/yyyy"
                        locale={i18n.language === 'id' ? 'id' : 'en'}
                        placeholderText={t('leave.selectEndDate')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                        wrapperClassName="w-full"
                        required
                        disabled={!formData.startDate}
                        showYearDropdown
                        showMonthDropdown
                        dropdownMode="select"
                      />
                      {formData.endDate && (
                        <p className="mt-1 text-sm text-gray-600">
                          {getDayName(formData.endDate)}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Working Days Summary */}
              {formData.startDate && formData.endDate && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Working Days (excluding weekends)</p>
                      <p className="text-2xl font-bold text-blue-600">{workingDays} {workingDays === 1 ? 'day' : 'days'}</p>
                    </div>
                    {formData.leaveType !== 'MATERNITY_LEAVE' && workingDays > 5 && (
                      <div className="text-red-600 text-sm font-medium">
                        ⚠️ Exceeds 5-day limit
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('leave.reason')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('leave.reasonPlaceholder')}
                  required
                  maxLength={500}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.reason.length}/500 characters
                </p>
              </div>

              {/* Attachment (if required) */}
              {currentLeaveType?.requiresAttachment && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('leave.attachment')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.attachment || ''}
                    onChange={(e) => setFormData({ ...formData, attachment: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('leave.attachmentPlaceholder')}
                    required
                  />
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setFormData({
                    leaveType: 'ANNUAL_LEAVE',
                    startDate: null,
                    endDate: null,
                    reason: '',
                    attachment: null
                  })}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t('leave.reset')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  {loading ? t('leave.submitting') : t('leave.submit')}
                </button>
              </div>
            </form>
          ) : (
            /* History Tab */
            <div className="space-y-4">
              {/* Filter Section */}
              <div className="mb-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span>{showFilters ? t('leave.hideFilters') : t('leave.showFilters')}</span>
                  {hasActiveFilters && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {Object.values(filters).filter(v => v !== '').length}
                    </span>
                  )}
                </button>

                {showFilters && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Leave Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('leave.type')}
                        </label>
                        <select
                          value={filters.leaveType}
                          onChange={(e) => setFilters({...filters, leaveType: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">{t('leave.allTypes')}</option>
                          {leaveTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {t(`leave.${type.labelKey}`)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('leave.status')}
                        </label>
                        <select
                          value={filters.status}
                          onChange={(e) => setFilters({...filters, status: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">{t('leave.allStatuses')}</option>
                          <option value="PENDING">{t('leave.pending')}</option>
                          <option value="APPROVED">{t('leave.approved')}</option>
                          <option value="REJECTED">{t('leave.rejected')}</option>
                        </select>
                      </div>
                    </div>

                    {/* Date Ranges */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Request Date Range */}
                      <div className="border-l-4 border-blue-500 pl-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">{t('leave.requestDateRange')}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">{t('leave.from')}</label>
                            <input
                              type="date"
                              value={filters.requestDateFrom}
                              onChange={(e) => setFilters({...filters, requestDateFrom: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">{t('leave.to')}</label>
                            <input
                              type="date"
                              value={filters.requestDateTo}
                              onChange={(e) => setFilters({...filters, requestDateTo: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Leave Date Range */}
                      <div className="border-l-4 border-green-500 pl-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">{t('leave.leaveDateRange')}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">From</label>
                            <input
                              type="date"
                              value={filters.leaveDateFrom}
                              onChange={(e) => setFilters({...filters, leaveDateFrom: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">{t('leave.to')}</label>
                            <input
                              type="date"
                              value={filters.leaveDateTo}
                              onChange={(e) => setFilters({...filters, leaveDateTo: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {hasActiveFilters && (
                      <div className="flex justify-end">
                        <button
                          onClick={clearFilters}
                          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                        >
                          {t('leave.clearAll')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Results */}
              {requests.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">{t('leave.noRequests')}</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by submitting your first leave request.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {getLeaveTypeLabel(request.leaveType)}
                            </h3>
                            {getStatusBadge(request.status)}
                            {!request.isPaid && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                                Unpaid
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                            <div>
                              <span className="font-medium">Start:</span> {formatDate(request.startDate)}
                            </div>
                            <div>
                              <span className="font-medium">End:</span> {formatDate(request.endDate)}
                            </div>
                            <div>
                              <span className="font-medium">Duration:</span> {request.totalDays} day(s)
                            </div>
                            <div>
                              <span className="font-medium">Submitted:</span> {formatDate(request.createdAt)}
                            </div>
                          </div>

                          <div className="text-sm text-gray-700 mb-2">
                            <span className="font-medium">Reason:</span> {request.reason}
                          </div>

                          {request.currentApprover && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Current Approver:</span> {request.currentApprover.name}
                            </div>
                          )}

                          {request.status === 'APPROVED' && request.approvedAt && (
                            <div className="mt-2 text-sm text-green-600">
                              ✓ Approved on {formatDate(request.approvedAt)}
                            </div>
                          )}

                          {request.status === 'REJECTED' && request.supervisorComment && (
                            <div className="mt-2 p-3 bg-red-50 rounded text-sm text-red-800">
                              <span className="font-medium">Rejection Reason:</span> {request.supervisorComment}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        {request.status === 'PENDING' && (
                          <button
                            onClick={() => handleDelete(request.id)}
                            className="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error/Success Dialog */}
      <ErrorDialog />
    </div>
  );
}