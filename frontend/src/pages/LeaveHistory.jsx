// frontend/src/pages/LeaveHistory.jsx
// MOBILE-RESPONSIVE VERSION - Responsive balance cards, tabs, filters, form, and history

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
import { useNavigate } from 'react-router-dom';


export default function LeaveHistory() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('submit');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [balance, setBalance] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [errorDialog, setErrorDialog] = useState({
    show: false,
    title: '',
    messages: [],
    isSuccess: false
  });
  
  const navigate = useNavigate();
  
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
    attachmentFiles: [],
    attachmentUrl: '',
  });

  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => {
      const isValid = file.type === 'application/pdf' || 
                    file.type.startsWith('image/');
      return isValid && file.size <= 10 * 1024 * 1024; // 10MB
    });
    
    setFormData(prev => ({
      ...prev,
      attachmentFiles: [...prev.attachmentFiles, ...validFiles]
    }));
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      attachmentFiles: [...prev.attachmentFiles, ...files]
    }));
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      attachmentFiles: prev.attachmentFiles.filter((_, i) => i !== index)
    }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Notes display state
  const [showAllNotes, setShowAllNotes] = useState(false);

  // Get available leave types based on gender
  const getAvailableLeaveTypes = () => {
    const allLeaveTypes = [
      { value: 'ANNUAL_LEAVE', labelKey: 'annualLeave', isPaid: true, requiresAttachment: false },
      { value: 'SICK_LEAVE', labelKey: 'sickLeave', isPaid: true, requiresAttachment: 'conditional', noteKey: 'attachmentNote' },
      { value: 'MATERNITY_LEAVE', labelKey: 'maternityLeave', isPaid: true, requiresAttachment: false, femaleOnly: true },
      { value: 'MENSTRUAL_LEAVE', labelKey: 'menstrualLeave', isPaid: true, requiresAttachment: false, femaleOnly: true },
      { value: 'PATERNITY_LEAVE', labelKey: 'paternityLeave', isPaid: true, requiresAttachment: false, maleOnly: true, noteKey: 'paternityNote' },
      { value: 'MARRIAGE_LEAVE', labelKey: 'marriageLeave', isPaid: true, requiresAttachment: false },
      { value: 'BEREAVEMENT_LEAVE', labelKey: 'bereavementLeave', isPaid: true, requiresAttachment: false, noteKey: 'bereavementNote' },
      { value: 'UNPAID_LEAVE', labelKey: 'unpaidLeave', isPaid: false, requiresAttachment: false, noteKey: 'unpaidNote' }
    ];

    // Filter based on gender
    if (user?.gender === 'Male') {
      return allLeaveTypes.filter(type => !type.femaleOnly);
    } else if (user?.gender === 'Female') {
      return allLeaveTypes.filter(type => !type.maleOnly);
    }
    
    return allLeaveTypes;
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      PENDING: 'bg-orange-50 text-orange-600 border-orange-100',
      APPROVED: 'bg-green-50 text-green-600 border-green-100',
      REJECTED: 'bg-red-50 text-red-600 border-red-100'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const isAttachmentRequired = (leaveType, totalDays) => {
    const leaveTypeConfig = leaveTypes.find(lt => lt.value === leaveType);
    
    if (!leaveTypeConfig) return false;
    
    // If requiresAttachment is 'conditional', check totalDays
    if (leaveTypeConfig.requiresAttachment === 'conditional') {
      // Sick leave requires attachment only if > 2 days
      if (leaveType === 'SICK_LEAVE') {
        return totalDays > 2;
      }
    }
    
    // Otherwise return the boolean value
    return leaveTypeConfig.requiresAttachment === true;
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
    }
    // Menstrual leave allows 1-2 days, so no auto-set for endDate
  }, [formData.leaveType, formData.startDate]);

  // Reset showAllNotes when leave type changes
  useEffect(() => {
    setShowAllNotes(false);
  }, [formData.leaveType]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.startDate || !formData.endDate) {
        setErrorDialog({
          show: true,
          title: t('leave.errorTitle') || 'Error',
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
          title: t('leave.errorTitle') || 'Error',
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
          title: t('leave.errorTitle') || 'Error',
          messages: ['Maximum 5 working days per leave request (weekends excluded)'],
          isSuccess: false
        });
        setLoading(false);
        return;
      }

      // Updated validation: Menstrual leave can be 1-2 days
      if (formData.leaveType === 'MENSTRUAL_LEAVE' && (totalDays < 1 || totalDays > 2)) {
        setErrorDialog({
          show: true,
          title: t('leave.errorTitle') || 'Error',
          messages: ['Menstrual leave can be 1 or 2 days'],
          isSuccess: false
        });
        setLoading(false);
        return;
      }

      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('leaveType', formData.leaveType);
      formDataToSend.append('startDate', format(formData.startDate, 'yyyy-MM-dd'));
      formDataToSend.append('endDate', format(formData.endDate, 'yyyy-MM-dd'));
      formDataToSend.append('totalDays', totalDays);
      formDataToSend.append('reason', formData.reason);
      
      // Append files
      formData.attachmentFiles.forEach((file) => {
        formDataToSend.append('attachmentFiles', file);
      });
      
      // Append URL if provided
      if (formData.attachmentUrl) {
        formDataToSend.append('attachmentUrl', formData.attachmentUrl);
      }

      await apiClient.post('/leave/submit', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setErrorDialog({
        show: true,
        title: t('leave.successTitle') || 'Success',
        messages: [t('leave.submitSuccess') || 'Leave request submitted successfully!'],
        isSuccess: true
      });

      // Reset form after delay to match new state structure
      setTimeout(() => {
        setFormData({
          leaveType: 'ANNUAL_LEAVE',
          startDate: null,
          endDate: null,
          reason: '',
          attachment: null,
          attachmentFiles: [],
          attachmentUrl: ''
        });

        // Refresh data
        fetchLeaveData();
        fetchLeaveBalance();
        setActiveTab('history');
        setErrorDialog({ show: false, title: '', messages: [], isSuccess: false });
      }, 1500);

    } catch (error) {
      console.error('Submit error:', error.message || error);
      const errorMessage = error.response?.data?.error || t('leave.submitError');
      setErrorDialog({
        show: true,
        title: t('leave.errorTitle'),
        messages: Array.isArray(errorMessage) ? errorMessage : [errorMessage],
        isSuccess: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('leave.deleteConfirm'))) return;

    try {
      await apiClient.delete(`/leave/${id}`);
      await fetchLeaveData();
      setErrorDialog({
        show: true,
        title: t('leave.successTitle'),
        messages: [t('leave.deleteSuccess')],
        isSuccess: true
      });
    } catch (error) {
      console.error('Delete error:', error);
      setErrorDialog({
        show: true,
        title: t('leave.errorTitle'),
        messages: [error.response?.data?.error || t('leave.deleteError')],
        isSuccess: false
      });
    }
  };

  const calculateWorkingDays = (start, end) => {
    if (!start || !end) return 0;
    
    let count = 0;
    let currentDate = new Date(start);
    const endDate = new Date(end);

    while (currentDate <= endDate) {
      const dayOfWeek = getDay(currentDate);
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        count++;
      }
      currentDate = addDays(currentDate, 1);
    }
    
    return count;
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
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
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-fadeIn">
          {/* Header */}
          <div className={`${bgColor} text-white px-4 sm:px-6 py-3 sm:py-4 rounded-t-lg flex items-center justify-between`}>
            <div className="flex items-center">
              {isSuccess ? (
                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <h3 className="text-base sm:text-lg font-semibold">{errorDialog.title}</h3>
            </div>
            <button
              onClick={() => setErrorDialog({ show: false, title: '', messages: [], isSuccess: false })}
              className="text-white hover:text-gray-200 transition-colors"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-4 sm:px-6 py-4 max-h-96 overflow-y-auto">
            {errorDialog.messages.length === 1 ? (
              <p className="text-gray-700 text-sm sm:text-base">{errorDialog.messages[0]}</p>
            ) : (
              <ul className="space-y-2">
                {errorDialog.messages.map((message, index) => (
                  <li key={index} className="flex items-start">
                    <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor} mr-2 mt-0.5 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isSuccess ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      )}
                    </svg>
                    <span className="text-gray-700 text-sm">{message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 rounded-b-lg flex justify-end">
            <button
              onClick={() => setErrorDialog({ show: false, title: '', messages: [], isSuccess: false })}
              className={`px-4 sm:px-6 py-2 ${buttonColor} text-white rounded-lg transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${isSuccess ? 'focus:ring-green-500' : 'focus:ring-red-500'} text-sm sm:text-base`}
            >
              {t('common.close') || 'Close'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header - Mobile Optimized */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{t('leave.title')}</h1>
        <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">{t('leave.description')}</p>
      </div>

      {/* Leave Balance Summary - Mobile Optimized */}
      {balance && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-lg shadow p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600">{t('leave.annualQuota')}</div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{balance.annualQuota || 14}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600">{t('leave.annualUsed')}</div>
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{balance.annualUsed || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600">{t('leave.annualRemaining')}</div>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{balance.annualRemaining || 14}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600">{t('leave.available')}</div>
            <div className="text-xl sm:text-2xl font-bold text-purple-600">{(leaveBalance?.annualRemaining || 0) + (leaveBalance?.toilBalance || 0)} {t('leave.days')}</div>
            <p className="text-xs opacity-75 mt-1">
              {t('leave.annual')}: {leaveBalance?.annualRemaining || 0} | {t('leave.toilBalance')}: {leaveBalance?.toilBalance || 0}
            </p>
          </div>
        </div>
      )}

      {/* Tabs - Mobile: Horizontal Scroll */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200">
          {/* Mobile: Scrollable tabs */}
          <nav className="flex sm:hidden overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('submit')}
              className={`flex-shrink-0 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'submit'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {t('leave.submitRequest')}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-shrink-0 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {t('leave.myRequests')}
            </button>
          </nav>

          {/* Desktop: Normal tabs */}
          <nav className="hidden sm:flex -mb-px">
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

        <div className="p-4 sm:p-6">
          {activeTab === 'submit' ? (
            /* Submit Form - Mobile Optimized */
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Important Notes - Mobile Optimized with Contextual Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-medium text-blue-900">{t('leave.importantNotes')}</h3>
                    <ul className="mt-1 text-xs sm:text-sm text-blue-800 list-disc list-inside space-y-1">
                      {(() => {
                        // Define relevant notes for each leave type
                        const relevantNotes = {
                          ANNUAL_LEAVE: ['note1', 'note2', 'note3'],
                          SICK_LEAVE: ['note1', 'note9'],
                          MENSTRUAL_LEAVE: ['note1', 'note4', 'note8', 'note9'],
                          PATERNITY_LEAVE: ['note1', 'note6'],
                          BEREAVEMENT_LEAVE: ['note1', 'note7', 'note10'],
                          MATERNITY_LEAVE: ['note1', 'note5'],
                          MARRIAGE_LEAVE: ['note1', 'note2'],
                          UNPAID_LEAVE: ['note1', 'note2']
                        };

                        const allNotes = ['note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7', 'note8', 'note9', 'note10'];
                        const currentNotes = relevantNotes[formData.leaveType] || ['note1'];
                        const notesToDisplay = showAllNotes ? allNotes : currentNotes;

                        return (
                          <>
                            {notesToDisplay.map((noteKey) => (
                              <li key={noteKey}>{t(`leave.${noteKey}`)}</li>
                            ))}
                            {!showAllNotes && currentNotes.length < allNotes.length && (
                              <li className="list-none mt-2">
                                <button
                                  type="button"
                                  onClick={() => setShowAllNotes(true)}
                                  className="text-blue-600 hover:text-blue-800 font-medium underline text-xs"
                                >
                                  {t('leave.showAllNotes') || 'Show all notes'}
                                </button>
                              </li>
                            )}
                            {showAllNotes && (
                              <li className="list-none mt-2">
                                <button
                                  type="button"
                                  onClick={() => setShowAllNotes(false)}
                                  className="text-blue-600 hover:text-blue-800 font-medium underline text-xs"
                                >
                                  {t('leave.showLess') || 'Show less'}
                                </button>
                              </li>
                            )}
                          </>
                        );
                      })()}
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
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  required
                >
                  {leaveTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {t(`leave.${type.labelKey}`)} {!type.isPaid && ' (Unpaid)'}
                    </option>
                  ))}
                </select>
                
                {currentLeaveType?.noteKey && (
                  <p className="mt-2 text-xs sm:text-sm text-gray-600">
                    {t(`leave.${currentLeaveType.noteKey}`)}
                  </p>
                )}
              </div>

              {/* Date Selection - Mobile Optimized */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('leave.startDate')} <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    selected={formData.startDate}
                    onChange={(date) => setFormData({ ...formData, startDate: date })}
                    minDate={
                      formData.leaveType === 'SICK_LEAVE' || 
                      formData.leaveType === 'MENSTRUAL_LEAVE' || 
                      formData.leaveType === 'BEREAVEMENT_LEAVE'
                        ? addDays(new Date(), -2)  // Allow 2 days backdating
                        : new Date()                // Today for other leave types
                    }
                    locale={i18n.language}
                    dateFormat="dd MMM yyyy"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholderText={t('leave.selectStartDate')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('leave.endDate')} <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    selected={formData.endDate}
                    onChange={(date) => setFormData({ ...formData, endDate: date })}
                    minDate={formData.startDate || new Date()}
                    locale={i18n.language}
                    dateFormat="dd MMM yyyy"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholderText={t('leave.selectEndDate')}
                    required
                    disabled={formData.leaveType === 'MATERNITY_LEAVE'}
                  />
                </div>
              </div>

              {/* Working Days Info */}
              {formData.startDate && formData.endDate && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-green-800">
                    <span className="font-medium">{t('leave.workingDays')}:</span> {workingDays} {t('leave.days')}
                  </p>
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
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y text-sm sm:text-base"
                  placeholder={t('leave.reasonPlaceholder')}
                  required
                />
              </div>

              {/* Attachment - Conditional for Sick Leave */}
              {(() => {
                const totalDays = calculateWorkingDays(formData.startDate, formData.endDate);
                const attachmentRequired = isAttachmentRequired(formData.leaveType, totalDays);
                
                return attachmentRequired && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('leave.attachment')} <span className="text-red-500">*</span>
                    </label>
                    
                    {/* Button to open attachment modal */}
                    <button
                      type="button"
                      onClick={() => setShowAttachmentModal(true)}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors flex items-center justify-center space-x-2 text-gray-600 hover:text-blue-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-sm font-medium">
                        {formData.attachmentFiles.length > 0 || formData.attachmentUrl 
                          ? `${formData.attachmentFiles.length} file(s) + ${formData.attachmentUrl ? '1 URL' : '0 URL'}`
                          : t('leave.addAttachment') || 'Add Attachment'}
                      </span>
                    </button>

                    {/* Show attached items */}
                    {formData.attachmentFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {formData.attachmentFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded text-sm">
                            <span className="truncate flex-1">{file.name} ({formatFileSize(file.size)})</span>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {formData.attachmentUrl && (
                      <div className="mt-2 px-3 py-2 bg-blue-50 rounded text-sm">
                        <span className="text-blue-700">{formData.attachmentUrl}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* Submit Button - Mobile Optimized */}
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors text-sm sm:text-base"
                >
                  {loading ? t('leave.submitting') : t('leave.submitRequest')}
                </button>
              </div>
            </form>
          ) : (
            /* History Tab - Mobile Optimized */
            <div className="space-y-4">
              {/* Filter Section - Mobile Optimized */}
              <div className="mb-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span>{showFilters ? t('leave.hideFilters') : t('leave.showFilters')}</span>
                  {hasActiveFilters && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex-shrink-0">
                      {Object.values(filters).filter(v => v !== '').length}
                    </span>
                  )}
                </button>

                {showFilters && (
                  <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Leave Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('leave.type')}
                        </label>
                        <select
                          value={filters.leaveType}
                          onChange={(e) => setFilters({...filters, leaveType: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="">{t('leave.allStatuses')}</option>
                          <option value="PENDING">{t('leave.pending')}</option>
                          <option value="APPROVED">{t('leave.approved')}</option>
                          <option value="REJECTED">{t('leave.rejected')}</option>
                        </select>
                      </div>
                    </div>

                    {/* Date Ranges - Mobile: Stack, Desktop: Grid */}
                    <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
                      {/* Request Date Range */}
                      <div className="border-l-4 border-blue-500 pl-3 sm:pl-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">{t('leave.requestDateRange')}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">{t('leave.from')}</label>
                            <input
                              type="date"
                              value={filters.requestDateFrom}
                              onChange={(e) => setFilters({...filters, requestDateFrom: e.target.value})}
                              className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">{t('leave.to')}</label>
                            <input
                              type="date"
                              value={filters.requestDateTo}
                              onChange={(e) => setFilters({...filters, requestDateTo: e.target.value})}
                              className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Leave Date Range */}
                      <div className="border-l-4 border-green-500 pl-3 sm:pl-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">{t('leave.leaveDateRange')}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">{t('leave.from')}</label>
                            <input
                              type="date"
                              value={filters.leaveDateFrom}
                              onChange={(e) => setFilters({...filters, leaveDateFrom: e.target.value})}
                              className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">{t('leave.to')}</label>
                            <input
                              type="date"
                              value={filters.leaveDateTo}
                              onChange={(e) => setFilters({...filters, leaveDateTo: e.target.value})}
                              className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Clear Filters Button */}
                    {hasActiveFilters && (
                      <div className="flex justify-end">
                        <button
                          onClick={clearFilters}
                          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium hover:bg-white rounded-lg transition-colors"
                        >
                          {t('leave.clearAll')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Results Cards */}
              {requests.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">{t('leave.noRequests')}</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by submitting your first leave request.</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {requests.map((request) => (
                  <div 
                    key={request.id}
                    className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col h-full overflow-hidden transition-all hover:shadow-md"
                  >
                    {/* 1. Card Header */}
                    <div className="p-5 flex items-center justify-between border-b border-gray-50 bg-white">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base flex-1 min-w-0 truncate">
                            {getLeaveTypeLabel(request.leaveType)}
                          </h3>
                          <p className="text-[12px] text-gray-400 uppercase font-bold mt-1 tracking-tighter">
                            {request.totalDays} {t('leave.days')}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={request.status} />
                        {!request.isPaid && (
                          <span className="text-[9px] font-black text-orange-600 uppercase tracking-tighter">
                            Unpaid
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2. Card Body: 2x2 Info Grid */}
                    <div className="p-5 flex-1 space-y-5">
                      <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                        <div className="space-y-0.5">
                          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                            {t('leave.startDate')}
                          </p>
                          <p className="text-xs font-bold text-gray-900">{formatDate(request.startDate)}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                            {t('leave.endDate')}
                          </p>
                          <p className="text-xs font-bold text-gray-900">{formatDate(request.endDate)}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                            {t('leave.submitted')}
                          </p>
                          <p className="text-xs font-bold text-gray-900">{formatDate(request.createdAt)}</p>
                        </div>
                        {request.currentApprover && (
                          <div className="space-y-0.5">
                            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                              {t('overtime.currentApprover')}
                            </p>
                            <p className="text-xs font-bold text-blue-600 uppercase truncate">{request.currentApprover.name}</p>
                          </div>
                        )}
                      </div>

                      {/* Logic-Based Status Messages */}
                      {request.status === 'APPROVED' && request.approvedAt && (
                        <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-xl border border-green-100">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <p className="text-[10px] font-bold text-green-700 uppercase tracking-tighter">
                            Approved on {formatDate(request.approvedAt)}
                          </p>
                        </div>
                      )}

                      {request.status === 'REJECTED' && request.supervisorComment && (
                        <div className="bg-red-50/50 rounded-xl p-3 border border-red-100">
                          <p className="text-[10px] font-bold text-red-400 uppercase mb-1">Rejection Reason</p>
                          <p className="text-xs text-red-800 italic leading-relaxed line-clamp-2">
                            "{request.supervisorComment}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 3. Card Footer: Sticky Action Bar */}
                    <div className="mt-auto border-t border-gray-50 flex">
                      {request.status === 'PENDING' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(request.id);
                          }}
                          className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-red-400 hover:bg-red-50 transition-colors border-r border-gray-50"
                        >
                          {t('common.delete')}
                        </button>
                      )}
                      <button 
                        onClick={() => navigate(`/leave/${request.id}`)}
                        className="flex-[2] py-4 text-[11px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                      >
                        View Detail <span className="text-sm">→</span>
                      </button>
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

      {/* Attachment Upload Modal */}
      {showAttachmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('leave.uploadAttachment') || 'Upload Attachment'}
              </h3>
              <button
                onClick={() => setShowAttachmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {/* Drag & Drop Zone */}
              <div
                onDrop={handleFileDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  {t('leave.dragDropFiles') || 'Drag and drop files here, or'}
                </p>
                <label className="mt-2 inline-block">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <span className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer inline-block text-sm">
                    {t('leave.browseFiles') || 'Browse Files'}
                  </span>
                </label>
                <p className="mt-2 text-xs text-gray-500">
                  PDF, PNG, JPEG (Max 10MB per file)
                </p>
              </div>

              {/* Selected Files List */}
              {formData.attachmentFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    {t('leave.selectedFiles') || 'Selected Files'} ({formData.attachmentFiles.length})
                  </p>
                  {formData.attachmentFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="ml-3 text-red-500 hover:text-red-700 flex-shrink-0"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* OR Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    {t('leave.or') || 'OR'}
                  </span>
                </div>
              </div>

              {/* URL Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('leave.provideUrl') || 'Provide a URL'}
                </label>
                <input
                  type="url"
                  value={formData.attachmentUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, attachmentUrl: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t('leave.urlExample') || 'Example: Google Drive, OneDrive, or any document link'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAttachmentModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => setShowAttachmentModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                {t('common.done') || 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}