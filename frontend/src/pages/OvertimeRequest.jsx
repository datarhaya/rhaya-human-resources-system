// frontend/src/pages/OvertimeRequest.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitOvertimeRequest } from '../api/client';
import { format, subDays, getDay } from 'date-fns';

export default function OvertimeRequest() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([
    { date: '', hours: '', description: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Calculate date limits
  const today = format(new Date(), 'yyyy-MM-dd');
  const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  // Check if date is a weekday
  const isWeekday = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const day = getDay(date); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    return day >= 1 && day <= 5; // Monday to Friday
  };

  // Get day name from date
  const getDayName = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return format(date, 'EEEE'); // Full day name (e.g., "Monday")
  };

  // Add new entry row
  const addEntry = () => {
    setEntries([...entries, { date: '', hours: '', description: '' }]);
  };

  // Remove entry row
  const removeEntry = (index) => {
    if (entries.length === 1) {
      setError('At least one entry is required');
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
        setError(`Entry ${i + 1}: All fields are required`);
        return false;
      }

      // Validate hours range
      const hours = parseFloat(entry.hours);
      if (isNaN(hours) || hours <= 0 || hours > 12) {
        setError(`Entry ${i + 1}: Hours must be between 0.5 and 12`);
        return false;
      }

      // Check date range
      const entryDate = new Date(entry.date);
      const minDate = new Date(sevenDaysAgo);
      const maxDate = new Date(today);

      if (entryDate < minDate) {
        setError(`Entry ${i + 1}: Date is more than 7 days ago`);
        return false;
      }

      if (entryDate > maxDate) {
        setError(`Entry ${i + 1}: Cannot submit future dates`);
        return false;
      }
    }

    // Check duplicate dates in form
    const dates = entries.map(e => e.date);
    const uniqueDates = new Set(dates);
    if (dates.length !== uniqueDates.size) {
      setError('Duplicate dates found. Each date must be unique.');
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

      setSuccess('Overtime request submitted successfully!');
      
      // Redirect to history after 2 seconds
      setTimeout(() => {
        navigate('/overtime-history');
      }, 2000);

    } catch (err) {
      console.error('Submit error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to submit overtime request');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Submit Overtime Request</h1>
        <p className="text-sm text-gray-600 mt-1">
          Submit overtime hours within 7 days of the work date. Maximum 12 hours per day.
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
              <h3 className="text-sm font-medium text-blue-900">Important Notes:</h3>
              <ul className="mt-1 text-sm text-blue-800 list-disc list-inside space-y-1">
                <li>You can only submit overtime within 7 days of the work date</li>
                <li>Maximum 12 hours per day</li>
                <li>Overtime should typically be for weekends or holidays</li>
                <li>Cannot submit duplicate dates (check your pending/approved requests)</li>
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
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      {/* Date Input */}
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(e) => updateEntry(index, 'date', e.target.value)}
                        min={sevenDaysAgo}
                        max={today}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      
                      {/* Day Display + Warning */}
                      {entry.date && (
                        <div className="flex items-center space-x-2">
                          {/* Day Name */}
                          <span className={`text-xs font-medium ${
                            isWeekday(entry.date) 
                              ? 'text-orange-600' 
                              : 'text-green-600'
                          }`}>
                            {getDayName(entry.date)}
                          </span>
                          
                          {/* Weekday Warning Icon */}
                          {isWeekday(entry.date) && (
                            <div className="group relative">
                              <div className="flex items-center justify-center w-5 h-5 bg-orange-100 border-2 border-orange-400 rounded-full cursor-help">
                                <span className="text-orange-600 text-xs font-bold">!</span>
                              </div>
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
                                  <div className="font-semibold mb-1">Weekday Selected</div>
                                  <div>Overtime is typically for weekends/holidays</div>
                                  <div className="text-gray-300 mt-1">Please verify this date is correct</div>
                                  {/* Tooltip Arrow */}
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                    <div className="border-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Weekend/Holiday Indicator */}
                          {/* {!isWeekday(entry.date) && (
                            <div className="flex items-center space-x-1">
                              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs text-green-600 font-medium">Weekend</span>
                            </div>
                          )} */}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="12"
                      value={entry.hours}
                      onChange={(e) => updateEntry(index, 'hours', e.target.value)}
                      placeholder="Max 12"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={entry.description}
                      onChange={(e) => updateEntry(index, 'description', e.target.value)}
                      placeholder="e.g., Client deployment, Bug fixing"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </td>
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
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Another Date
          </button>
        </div>

        {/* Summary */}
        <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Total Summary</p>
              <div className="mt-1 space-x-6">
                <span className="text-lg font-semibold text-gray-900">
                  {totals.hours} hours
                </span>
                <span className="text-sm text-gray-500">
                  ({totals.days} days)
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => navigate('/overtime-history')}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
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
                    Submitting...
                  </span>
                ) : (
                  'Submit Overtime Request'
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}