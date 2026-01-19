// frontend/src/pages/OvertimeRequest.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { submitOvertimeRequest } from '../api/client';
import { format, subDays, getDay, addDays } from 'date-fns';
import i18n from '../i18n';
import DatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import { id, enUS } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";

export default function OvertimeRequest() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [entries, setEntries] = useState([
    { date: '', hours: '', description: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastRecapDate, setLastRecapDate] = useState(null); 

  useEffect(() => {
      fetchLastRecapDate();
    }, []);

  // Calculate date limits
  const fetchLastRecapDate = async () => {
    try {
      const response = await fetch('/api/overtime-recap/system-settings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setLastRecapDate(data.data?.lastRecapDate || null);
    } catch (error) {
      console.error('Failed to fetch last recap date:', error);
    }
  };

  // Calculate date limits with recap restriction
  const getMinDate = () => {
    const today = new Date();
    const sevenDaysAgo = subDays(today, 7);
    
    if (lastRecapDate) {
      const recapCutoff = new Date(lastRecapDate);
      const dayAfterRecap = addDays(recapCutoff, 1);
      const minDate = dayAfterRecap > sevenDaysAgo ? dayAfterRecap : sevenDaysAgo;
      return minDate;
    }
    
    return sevenDaysAgo;
  };

  const getMaxDate = () => {
    return new Date();
  };

  // Register Indonesian locale
  registerLocale('id', id);
  registerLocale('en', enUS);

  // Check if date is a weekday
  const isWeekday = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString + 'T00:00:00');
    const day = getDay(date); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    return day >= 1 && day <= 5; // Monday to Friday
  };

  // Get day name from date
  const getDayName = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return format(date, 'EEEE'); // Full day name (e.g., "Monday")
  };

  const isLastEntryFilled = () => {
    if (entries.length === 0) return true;
    const lastEntry = entries[entries.length - 1];
    return lastEntry.date && lastEntry.hours && lastEntry.description;
  };

  // Add new entry row
  const addEntry = () => {
    setEntries([...entries, { date: '', hours: '', description: '' }]);
  };

  // Remove entry row
  const removeEntry = (index) => {
    if (entries.length === 1) {
      setError(t('overtime.atLeastOneEntry'));
      return;
    }
    const newEntries = entries.filter((_, i) => i !== index);
    setEntries(newEntries);
  };

  // Update entry field
  const updateEntry = (index, field, value) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    setEntries(newEntries);
    setError(''); // Clear error on change
  };

  // Calculate totals
  const calculateTotals = () => {
    const totalHours = entries.reduce((sum, entry) => {
      const hours = parseFloat(entry.hours) || 0;
      return sum + hours;
    }, 0);

    return {
      hours: totalHours.toFixed(1),
      days: (totalHours / 8).toFixed(2)
    };
  };

  // Validate form
  const validateForm = () => {
    // Check all fields filled
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.date || !entry.hours || !entry.description.trim()) {
        setError(`${t('common.entry')} ${i + 1}: ${t('overtime.allFieldsRequired')}`);
        return false;
      }

      // Validate hours range
      const hours = parseFloat(entry.hours);
      if (isNaN(hours) || hours <= 0 || hours > 12) {
        setError(`${t('common.entry')} ${i + 1}: ${t('overtime.hoursBetween')}`);
        return false;
      }

      // Check date range
      const entryDate = new Date(entry.date + 'T00:00:00');
      const minDate = getMinDate();
      minDate.setHours(0, 0, 0, 0);
      const maxDate = getMaxDate();
      maxDate.setHours(23, 59, 59, 999);

      if (entryDate < minDate) {
        setError(`${t('common.entry')} ${i + 1}: ${t('overtime.dateMoreThan7Days')}`);
        return false;
      }

      if (entryDate > maxDate) {
        setError(`${t('common.entry')} ${i + 1}: ${t('overtime.cannotSubmitFuture')}`);
        return false;
      }
    }

    // Check duplicate dates in form
    const dates = entries.map(e => e.date);
    const uniqueDates = new Set(dates);
    if (dates.length !== uniqueDates.size) {
      setError(t('overtime.duplicateDates'));
      return false;
    }

    return true;
  };

  // Submit form
  const handleSubmit = async (e) => {
    console.log('Token:', localStorage.getItem('token'));
    console.log('API URL:', import.meta.env.VITE_API_URL);
    console.log('Submitting data:', entries);

    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await submitOvertimeRequest({
        entries: entries.map(entry => ({
          date: entry.date,
          hours: parseFloat(entry.hours),
          description: entry.description.trim()
        }))
      });

      setSuccess(t('overtime.submitSuccess'));
      
      // Redirect to history after 2 seconds
      setTimeout(() => {
        navigate('/overtime-history');
      }, 2000);

    } catch (err) {
      console.error('Submit error:', err);
      setError(err.response?.data?.error || err.message || t('overtime.submitError'));
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('overtime.submitTitle')}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {t('overtime.submitDescription')}
        </p>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
        {/* Instructions */}
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900">{t('overtime.importantNotes')}</h3>
              <ul className="mt-1 text-sm text-blue-800 list-disc list-inside space-y-1">
                <li>{t('overtime.note1')}</li>
                <li>{t('overtime.note2')}</li>
                <li>{t('overtime.note3')}</li>
                <li>{t('overtime.note4')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Entries Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('overtime.tableNumber')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('overtime.tableDay')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('overtime.tableDate')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('overtime.tableHours')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('overtime.tableDescription')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('overtime.tableAction')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {index + 1}
                  </td>
                  
                  {/* Day Column */}
                  <td className="px-4 py-3">
                    {entry.date ? (
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium ${
                          isWeekday(entry.date) 
                            ? 'text-yellow-600' 
                            : 'text-green-600'
                        }`}>
                          {getDayName(entry.date)}
                        </span>
                        
                        {/* Weekday Warning Icon */}
                        {isWeekday(entry.date) && (
                          <div className="group relative">
                            <div className="flex items-center justify-center w-5 h-5 bg-yellow-100 border-2 border-yellow-400 rounded-full cursor-help">
                              <span className="text-yellow-600 text-xs font-bold">!</span>
                            </div>
                            
                            {/* Tooltip - positioned to the right */}
                            <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 hidden group-hover:block z-50 pointer-events-none">
                              <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg" style={{ minWidth: '250px' }}>
                                <div className="font-semibold mb-1">{t('overtime.weekdaySelected')}</div>
                                <div>{t('overtime.weekdayWarning')}</div>
                                <div className="text-gray-300 mt-1">{t('overtime.verifyDate')}</div>
                                
                                {/* Tooltip Arrow pointing left */}
                                <div className="absolute right-full top-1/2 transform -translate-y-1/2">
                                  <div className="border-8 border-transparent border-r-gray-900"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>

                  {/* Date Column */}
                  <td className="px-4 py-3">
                    <DatePicker
                      selected={entry.date ? new Date(entry.date + 'T00:00:00') : null}
                      onChange={(date) => {
                        if (date) {
                          // Format date using local timezone (avoid UTC conversion)
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          const formattedDate = `${year}-${month}-${day}`;
                          updateEntry(index, 'date', formattedDate);
                        }
                      }}
                      minDate={getMinDate()}
                      maxDate={getMaxDate()}
                      dateFormat="dd/MM/yyyy"
                      locale={i18n.language === 'id' ? 'id' : 'en'}
                      placeholderText={t('overtime.selectDate')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      wrapperClassName="w-full"
                      required
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                    />
                  </td>

                  {/* Hours Column */}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="12"
                      value={entry.hours}
                      onChange={(e) => updateEntry(index, 'hours', e.target.value)}
                      placeholder={t('overtime.hoursPlaceholder')}
                      className="w-28 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </td>

                  {/* Description Column */}
                  <td className="px-4 py-3">
                    <div className="w-full">
                      <textarea
                        value={entry.description}
                        onChange={(e) => {
                          if (e.target.value.length <= 500) {
                            updateEntry(index, 'description', e.target.value);
                          }
                        }}
                        placeholder={t('overtime.descriptionPlaceholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[80px]"
                        rows="3"
                        maxLength="500"
                        required
                      />
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-500">
                          {t('overtime.supportsFormatting')}
                        </span>
                        <span className={`text-xs ${
                          entry.description.length >= 450 
                            ? 'text-red-600 font-medium' 
                            : entry.description.length >= 400
                            ? 'text-yellow-600'
                            : 'text-gray-500'
                        }`}>
                          {entry.description.length}/500
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Action Column */}
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => removeEntry(index)}
                      className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                      disabled={entries.length === 1}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Entry Button */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={addEntry}
            disabled={entries.length >= 5 || !isLastEntryFilled()}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            {t('overtime.addAnotherDate')}
            {entries.length >= 5 && (
              <span className="ml-2 text-xs">(max 5)</span>
            )}
          </button>
          {!isLastEntryFilled() && entries.length < 5 && (
            <p className="mt-2 text-xs text-gray-500">
              {t('overtime.fillPreviousEntry')}
            </p>
          )}
        </div>

        {/* Summary */}
        <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">{t('overtime.totalSummary')}</p>
              <div className="mt-1 space-x-6">
                <span className="text-lg font-semibold text-gray-900">
                  {totals.hours} {t('overtime.hours')}
                </span>
                <span className="text-sm text-gray-500">
                  ({totals.days} {t('overtime.days')})
                </span>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => navigate('/overtime-history')}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('overtime.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('overtime.submitting')}
                  </span>
                ) : (
                  t('overtime.submitRequest')
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}