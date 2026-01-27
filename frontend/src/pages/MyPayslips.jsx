// frontend/src/pages/MyPayslips.jsx
// MOBILE-RESPONSIVE VERSION - Beautiful card design with filters and enhanced UX

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import { Download, FileText, Calendar, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';

export default function MyPayslips() {
  const { t } = useTranslation();
  const [payslips, setPayslips] = useState([]);
  const [filteredPayslips, setFilteredPayslips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  
  // Filter & Search state
  const [selectedYear, setSelectedYear] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedYears, setExpandedYears] = useState({});

  useEffect(() => {
    fetchPayslips();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [payslips, selectedYear, searchQuery]);

  // Auto-expand current year on load
  useEffect(() => {
    if (payslips.length > 0 && Object.keys(expandedYears).length === 0) {
      const currentYear = new Date().getFullYear();
      setExpandedYears({ [currentYear]: true });
    }
  }, [payslips]);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/payslips/my-payslips');
      const sortedPayslips = (res.data.data || []).sort((a, b) => {
        // Sort by year desc, then month desc
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
      setPayslips(sortedPayslips);
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...payslips];

    // Filter by year
    if (selectedYear !== 'all') {
      filtered = filtered.filter(p => p.year === parseInt(selectedYear));
    }

    // Search filter (by month name or year)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const monthName = new Date(p.year, p.month - 1).toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
        return monthName.includes(query) || p.year.toString().includes(query);
      });
    }

    setFilteredPayslips(filtered);
  };

  const downloadPayslip = async (payslipId, fileName) => {
    try {
      setDownloadingId(payslipId);
      const res = await apiClient.get(`/payslips/${payslipId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
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
    } finally {
      setDownloadingId(null);
    }
  };

  // Get unique years
  const availableYears = [...new Set(payslips.map(p => p.year))].sort((a, b) => b - a);

  // Group payslips by year
  const payslipsByYear = filteredPayslips.reduce((acc, payslip) => {
    if (!acc[payslip.year]) {
      acc[payslip.year] = [];
    }
    acc[payslip.year].push(payslip);
    return acc;
  }, {});

  const toggleYear = (year) => {
    setExpandedYears(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  const formatMonthYear = (year, month) => {
    return new Date(year, month - 1).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const formatUploadDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header - Mobile Optimized */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
          {t('payslips.title') || 'My Payslips'}
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          {t('payslips.description') || 'View and download your monthly payslips'}
        </p>
      </div>

      {/* Stats Summary - Mobile Optimized */}
      {payslips.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-3 sm:p-4 text-white">
            <p className="text-xs sm:text-sm opacity-90">{t('payslips.totalPayslips') || 'Total Payslips'}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{payslips.length}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-3 sm:p-4 text-white">
            <p className="text-xs sm:text-sm opacity-90">{t('payslips.years') || 'Years'}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{availableYears.length}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-3 sm:p-4 text-white">
            <p className="text-xs sm:text-sm opacity-90">{t('payslips.latestPayslip') || 'Latest'}</p>
            <p className="text-base sm:text-lg font-bold mt-1 truncate">
              {payslips[0] ? formatMonthYear(payslips[0].year, payslips[0].month) : '-'}
            </p>
          </div>
        </div>
      )}

      {/* Filters & Search - Mobile Optimized */}
      <div className="bg-white rounded-lg shadow-md mb-4 sm:mb-6 overflow-hidden">
        <div className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('payslips.searchPlaceholder') || 'Search by month or year...'}
                className="w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-lg transition-colors text-sm font-medium ${
                showFilters || selectedYear !== 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">{t('payslips.filter') || 'Filter'}</span>
              {selectedYear !== 'all' && (
                <span className="bg-white text-blue-600 rounded-full px-2 py-0.5 text-xs font-bold">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    {t('payslips.filterByYear') || 'Filter by Year'}
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="all">{t('payslips.allYears') || 'All Years'}</option>
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedYear !== 'all' && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedYear('all');
                      setSearchQuery('');
                    }}
                    className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 font-medium"
                  >
                    {t('payslips.clearFilters') || 'Clear All Filters'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">{t('common.loading') || 'Loading...'}</p>
        </div>
      ) : filteredPayslips.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
            {t('payslips.noPayslips') || 'No payslips available'}
          </h3>
          <p className="text-sm text-gray-500">
            {searchQuery || selectedYear !== 'all'
              ? (t('payslips.noMatchingPayslips') || 'No payslips match your filters')
              : (t('payslips.noPayslipsYet') || 'Your payslips will appear here once uploaded')}
          </p>
          {(searchQuery || selectedYear !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedYear('all');
              }}
              className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('payslips.clearFilters') || 'Clear Filters'}
            </button>
          )}
        </div>
      ) : (
        /* Payslips List - Grouped by Year */
        <div className="space-y-4">
          {Object.keys(payslipsByYear).sort((a, b) => b - a).map(year => (
            <div key={year} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Year Header - Collapsible */}
              <button
                onClick={() => toggleYear(year)}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-colors flex items-center justify-between border-b border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">{year}</h2>
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs sm:text-sm font-medium rounded-full">
                    {payslipsByYear[year].length} {payslipsByYear[year].length === 1 ? 'payslip' : 'payslips'}
                  </span>
                </div>
                {expandedYears[year] ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {/* Payslip Cards */}
              {expandedYears[year] && (
                <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {payslipsByYear[year].map(payslip => (
                    <div
                      key={payslip.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-blue-300 transition-all group"
                    >
                      {/* Month Badge */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm sm:text-base">
                              {new Date(payslip.year, payslip.month - 1).toLocaleDateString('en-US', { month: 'short' })}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                                {new Date(payslip.year, payslip.month - 1).toLocaleDateString('en-US', { month: 'long' })}
                              </h3>
                              <p className="text-xs text-gray-500">{payslip.year}</p>
                            </div>
                          </div>
                        </div>
                        <FileText className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                      </div>

                      {/* Upload Info */}
                      <div className="mb-3 pb-3 border-b border-gray-100">
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">{t('payslips.uploaded')} : </span> {formatUploadDate(payslip.uploadedAt)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          <span className="font-medium">{t('payslips.file')} : </span> {payslip.fileName}
                        </p>
                      </div>

                      {/* Download Button */}
                      <button
                        onClick={() => downloadPayslip(payslip.id, payslip.fileName)}
                        disabled={downloadingId === payslip.id}
                        className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-sm group-hover:shadow-md"
                      >
                        {downloadingId === payslip.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>{t('payslips.downloading') || 'Downloading...'}</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>{t('payslips.download') || 'Download PDF'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Results Count */}
      {filteredPayslips.length > 0 && (
        <div className="mt-4 text-center text-xs sm:text-sm text-gray-500">
          {t('payslips.showing') || 'Showing'} {filteredPayslips.length} {t('payslips.of') || 'of'} {payslips.length} {t('payslips.payslips') || 'payslips'}
        </div>
      )}
    </div>
  );
}