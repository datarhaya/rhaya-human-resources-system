// backend/src/utils/payslipFilename.js
// Shared utility for generating consistent payslip filenames

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Abbreviate employee name: "Muhammad Harun Asrori" → "Muhammad Harun A."
 * 
 * @param {string} fullName - Full employee name
 * @returns {string} Abbreviated name
 */
export const abbreviateName = (fullName) => {
  if (!fullName) return '';
  
  const words = fullName.trim().split(' ');
  if (words.length <= 2) return fullName;
  
  const firstTwo = words.slice(0, 2).join(' ');
  const restAbbrev = words.slice(2).map(w => w.charAt(0).toUpperCase() + '.').join(' ');
  return `${firstTwo} ${restAbbrev}`;
};

/**
 * Generate payslip filename with new format
 * Format: {CompanyCode} - Payslip {AbbrevName} - {Month} {Year}.pdf
 * Example: "RFI - Payslip Muhammad Harun A. - February 2026.pdf"
 * 
 * @param {string} employeeName - Full employee name
 * @param {string} plottingCompanyCode - Company code (e.g., "RFI", "RFK")
 * @param {object} period - { year: 2026, month: 2 }
 * @returns {string} Generated filename
 */
export const generatePayslipFilename = (employeeName, plottingCompanyCode, period) => {
  const abbrevName = abbreviateName(employeeName);
  const monthName = MONTH_NAMES[period.month] || 'Unknown';
  const companyCode = plottingCompanyCode || 'UNK';
  
  return `${companyCode} - Payslip ${abbrevName} - ${monthName} ${period.year}.pdf`;
};

/**
 * Parse old format filename to extract metadata (for backwards compatibility)
 * Old format: {employeeId}_payslip_{year}_{month}.pdf
 * 
 * @param {string} filename - Old format filename
 * @returns {object|null} { employeeId, year, month } or null if invalid
 */
export const parseOldFilename = (filename) => {
  const match = filename.match(/^(.+)_payslip_(\d{4})_(\d{1,2})\.pdf$/);
  if (!match) return null;
  
  return {
    employeeId: match[1],
    year: parseInt(match[2]),
    month: parseInt(match[3]),
  };
};