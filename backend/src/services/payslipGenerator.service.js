// backend/src/services/payslipGenerator.service.js
// Generates payslip PDFs from Excel data using PDFKit

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { uploadPayslip } from '../config/storage.js';
import { encryptPayslipPDF } from '../utils/pdfEncryption.js';
import { sendPayslipNotificationEmail } from '../services/email.service.js';
import prisma from '../config/database.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND = {
  primary: '#1a1a2e',      // dark navy
  accent: '#e94560',       // red accent
  light: '#f5f5f5',        // light gray bg
  text: '#333333',
  muted: '#888888',
  white: '#ffffff',
};

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ─── Excel Reader ─────────────────────────────────────────────────────────────

/**
 * Parse Format sheet from Excel buffer
 * Returns array of employee payroll data objects
 */
export const parseExcelPayroll = async (excelBuffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(excelBuffer);

  const sheet = workbook.getWorksheet('Format');
  if (!sheet) {
    throw new Error('Sheet "Format" not found in Excel file');
  }

  const employees = [];

  // Data starts at row 10, header is rows 7-9
  // Only process rows where col B (NAMA) has a string value
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < 10) return;

    const name = row.getCell('B').value;
    if (!name || typeof name !== 'string') return;

    const getCellValue = (col) => {
      const cell = row.getCell(col);
      const v = cell.value;
      // Handle formula results
      if (v && typeof v === 'object' && 'result' in v) return v.result;
      return v;
    };

    const parseNum = (col) => {
      const v = getCellValue(col);
      if (!v) return 0;
      // Handle currency strings like "Rp149,660"
      if (typeof v === 'string') {
        const cleaned = v.replace(/[^0-9.-]/g, '');
        return parseFloat(cleaned) || 0;
      }
      return typeof v === 'number' ? v : 0;
    };

    employees.push({
      rowNumber,
      name: name.trim(),
      position:       getCellValue('C') || '',
      dateOfBirth:    getCellValue('D'),       // used for matching only
      nik:            String(getCellValue('E') || '').trim(),
      npwp:           String(getCellValue('F') || ''),
      statusPtkp:     getCellValue('G') || '',

      // Earnings
      basicPay:       parseNum('H'),           // GAJI/PENSIUN
      bpjskesEmployer:parseNum('N'),           // PREMI BPJSKES 4% (Health & Wellness)
      premiBpjsAia:   parseNum('O'),           // PREMI AIA
      lembur:         parseNum('Z'),           // LEMBUR (overtime amount)
      bdd:            parseNum('Y'),           // BDD: THR + BONUS + OVERTIME
      bonusQ2:        parseNum('AA'),          // BONUS Q2
      totalBruto:     parseNum('AC'),          // JUMLAH PENGHASILAN BRUTO

      // Deductions
      pph21:          parseNum('AF'),          // PPH 21 TERUTANG SEBULAN
      adjust:         parseNum('AG'),          // ADJUST
      zakatPotongan:  parseNum('AH'),          // ZAKAT/SUMBANGAN
      potonganLain:   parseNum('AI'),          // POTONGAN LAIN-LAIN

      // Take home
      takeHomePay:    parseNum('AK'),          // TAKE HOME PAY

      // Tax info
      kategoriTer:    getCellValue('AD') || '',
      tarifTer:       parseNum('AE'),
    });
  });

  return employees;
};

// ─── PDF Generator ────────────────────────────────────────────────────────────

/**
 * Format number as IDR currency string
 */
const formatIDR = (amount) => {
  if (!amount || isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
};

/**
 * Draw a horizontal rule
 */
const drawHR = (doc, y, color = '#cccccc', width = 0.5) => {
  doc.save()
    .strokeColor(color)
    .lineWidth(width)
    .moveTo(40, y)
    .lineTo(555, y)
    .stroke()
    .restore();
};

/**
 * Draw table row with borders
 */
const drawTableRow = (doc, y, height, cols, options = {}) => {
  const { fill = null, borderColor = '#dddddd', fontSize = 9, bold = false } = options;
  
  // Background
  if (fill) {
    doc.rect(40, y, 515, height).fill(fill);
  }
  
  // Borders
  doc.strokeColor(borderColor).lineWidth(0.5);
  
  // Horizontal lines
  doc.moveTo(40, y).lineTo(555, y).stroke();
  doc.moveTo(40, y + height).lineTo(555, y + height).stroke();
  
  // Vertical lines
  let x = 40;
  cols.forEach((col, i) => {
    doc.moveTo(x, y).lineTo(x, y + height).stroke();
    x += col.width;
  });
  doc.moveTo(555, y).lineTo(555, y + height).stroke();
  
  // Text
  doc.fontSize(fontSize).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#000000');
  x = 40;
  cols.forEach(col => {
    const textY = y + (height - fontSize) / 2 + 2;
    if (col.align === 'right') {
      doc.text(col.text, x + 5, textY, { width: col.width - 10, align: 'right' });
    } else {
      doc.text(col.text, x + 8, textY, { width: col.width - 16 });
    }
    x += col.width;
  });
};

/**
 * Generate a single payslip PDF buffer from payroll data + employee DB record
 */
export const generatePayslipPDF = (payrollRow, employee, period) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: `Payslip - ${employee.name} - ${MONTH_NAMES[period.month]} ${period.year}`,
        Author: 'PT Rhayakan Film Indonesia',
      },
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const margin = 40;
    let y = margin;

    // ── Header ────────────────────────────────────────────────────────────────
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#000000')
      .text('Rhaya Flicks', margin, y, { continued: true })
      .fontSize(16).font('Helvetica-Bold')
      .text('  PAYSLIP', { align: 'left' });
    
    y += 25;
    doc.fontSize(9).font('Helvetica').fillColor('#333333')
      .text('Sapphire Commercial SRC 009 Summarecon Bandung', margin, y);
    y += 12;
    doc.text('info@rhayaflicks.com', margin, y);
    
    y += 20;
    drawHR(doc, y);
    
    // ── Period & Company Row ──────────────────────────────────────────────────
    y += 15;
    const payDateStr = period.payDate
      ? new Date(period.payDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
      : `28/07/${String(period.year).slice(-2)}`;
    
    doc.fontSize(9).font('Helvetica').fillColor('#000000')
      .text(payDateStr, margin, y)
      .text(`${MONTH_NAMES[period.month]} ${period.year}`, 150, y)
      .text('PT Rhayakan Film Indonesia', 400, y);
    
    y += 20;
    drawHR(doc, y);
    
    // ── Employee Info Section ─────────────────────────────────────────────────
    y += 15;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000')
      .text('EMPLOYEE INFORMATION', margin, y)
      .text('PAY DATE', 250, y)
      .text('PERIOD', 400, y);
    
    y += 14;
    doc.fontSize(10).font('Helvetica-Bold')
      .text(employee.name, margin, y);
    doc.fontSize(9).font('Helvetica')
      .text(payDateStr, 250, y)
      .text(`${MONTH_NAMES[period.month]} ${period.year}`, 400, y);
    
    y += 14;
    doc.fontSize(9)
      .text(payrollRow.position || employee.position || '', margin, y)
      .text('Employee ID', 250, y)
      .text('PAY TYPE', 400, y);
    
    y += 14;
    doc.text(employee.email || '', margin, y)
      .text(employee.nip || '-', 250, y)
      .text('Monthly', 400, y);
    
    y += 14;
    const sisaCuti = employee.remainingLeave !== null ? employee.remainingLeave : '-';
    doc.text(`Sisa Cuti  ${sisaCuti}`, margin, y)
      .text('Payment Method', 250, y)
      .text('Bank Transfer', 400, y);
    
    y += 14;
    doc.text('Currency  Rupiah (IDR)', margin, y);
    
    y += 20;
    drawHR(doc, y);
    
    // ── Earnings Table ────────────────────────────────────────────────────────
    y += 15;
    
    // Header row
    drawTableRow(doc, y, 20, [
      { text: 'EARNINGS', width: 200 },
      { text: 'DAY/ ITEM / HOURS', width: 100, align: 'right' },
      { text: 'FIXED RATE', width: 100, align: 'right' },
      { text: 'Total', width: 115, align: 'right' },
    ], { bold: true, borderColor: '#000000' });
    y += 20;
    
    // Earnings rows
    const earningRows = [
      { label: 'Basic Pay', hours: 20, rate: payrollRow.basicPay, total: payrollRow.basicPay },
      { label: 'Overtime', hours: payrollRow.lembur > 0 ? (payrollRow.lembur / 37500).toFixed(1) : 0, rate: payrollRow.lembur, total: payrollRow.lembur },
      { label: 'Transportation', hours: 0, rate: 0, total: 0 },
      { label: 'Prepaid Expense From:\nTHR: Bonus Q1: Overtime April', hours: 0, rate: payrollRow.bdd, total: payrollRow.bdd },
      { label: 'Commission and Bonus', hours: 0, rate: payrollRow.bonusQ2, total: payrollRow.bonusQ2 },
      { label: 'Sick Pay', hours: 0, rate: 0, total: 0 },
      { label: 'Health & Wellness', hours: 0, rate: payrollRow.bpjskesEmployer, total: payrollRow.bpjskesEmployer },
      { label: 'Others', hours: 0, rate: 0, total: 0 },
    ];
    
    earningRows.forEach(row => {
      drawTableRow(doc, y, 18, [
        { text: row.label, width: 200 },
        { text: String(row.hours), width: 100, align: 'right' },
        { text: row.rate > 0 ? formatIDR(row.rate).replace('Rp', '').trim() : '0', width: 100, align: 'right' },
        { text: row.total > 0 ? formatIDR(row.total).replace('Rp', '').trim() : '0', width: 115, align: 'right' },
      ]);
      y += 18;
    });
    
    // Gross pay row
    drawTableRow(doc, y, 22, [
      { text: 'GROSS PAY', width: 400 },
      { text: formatIDR(payrollRow.totalBruto), width: 115, align: 'right' },
    ], { bold: true, fill: '#f0f0f0', borderColor: '#000000' });
    
    y += 30;
    
    // ── Deductions Table ──────────────────────────────────────────────────────
    drawTableRow(doc, y, 20, [
      { text: 'DEDUCTIONS', width: 200 },
      { text: 'Percentage', width: 100, align: 'right' },
      { text: 'Amount', width: 100, align: 'right' },
      { text: 'Total', width: 115, align: 'right' },
    ], { bold: true, borderColor: '#000000' });
    y += 20;
    
    const deductionRows = [
      { label: 'Pph 21', pct: `${(payrollRow.tarifTer * 100).toFixed(2)}%`, amount: payrollRow.pph21, total: payrollRow.pph21 },
      { label: 'BPJSTK', pct: '0.00%', amount: 0, total: 0 },
      { label: 'BPJSKES', pct: '0.00%', amount: 0, total: 0 },
      { label: 'Employee loan', pct: '0.00%', amount: 0, total: 0 },
      { label: 'Others', pct: '0.00%', amount: 0, total: 0 },
    ];
    
    deductionRows.forEach(row => {
      drawTableRow(doc, y, 18, [
        { text: row.label, width: 200 },
        { text: row.pct, width: 100, align: 'right' },
        { text: row.amount > 0 ? formatIDR(row.amount).replace('Rp', '').trim() : '0', width: 100, align: 'right' },
        { text: row.total > 0 ? formatIDR(row.total).replace('Rp', '').trim() : '0', width: 115, align: 'right' },
      ]);
      y += 18;
    });
    
    // Total deductions row
    const totalDeductions = payrollRow.pph21 || 0;
    drawTableRow(doc, y, 22, [
      { text: 'TOTAL DEDUCTIONS', width: 400 },
      { text: formatIDR(totalDeductions), width: 115, align: 'right' },
    ], { bold: true, fill: '#f0f0f0', borderColor: '#000000' });
    
    y += 30;
    
    // ── Take Home Pay ─────────────────────────────────────────────────────────
    drawTableRow(doc, y, 28, [
      { text: 'TAKE HOME PAY', width: 400 },
      { text: formatIDR(payrollRow.takeHomePay), width: 115, align: 'right' },
    ], { bold: true, fontSize: 11, fill: '#e8e8e8', borderColor: '#000000' });
    
    y += 40;
    
    // ── Footer ────────────────────────────────────────────────────────────────
    doc.fontSize(8).font('Helvetica').fillColor('#000000')
      .text('If you have any questions about this payslip, please contact:', margin, y);
    y += 12;
    doc.fontSize(8).fillColor('#0066cc')
      .text('ismi@rhayaflicks.com', margin, y, { underline: true, link: 'mailto:ismi@rhayaflicks.com' });

    doc.end();
  });
};

// ─── Preview Function ─────────────────────────────────────────────────────────

/**
 * Generate preview data from Excel (no upload, no encryption)
 * 
 * @param {Buffer} excelBuffer
 * @param {object} period  { year, month, payDate }
 * @returns {object} { employees: [{ name, nik, grossPay, netPay, pdfBase64, ... }], failed: [] }
 */
export const generatePayslipsPreview = async (excelBuffer, period) => {
  const results = { employees: [], failed: [] };

  // 1. Parse Excel
  let payrollRows;
  try {
    payrollRows = await parseExcelPayroll(excelBuffer);
  } catch (err) {
    throw new Error(`Failed to parse Excel: ${err.message}`);
  }

  if (payrollRows.length === 0) {
    throw new Error('No employee data found in Format sheet (starting row 10)');
  }

  // 2. Fetch all active employees from DB (keyed by NIK)
  const dbEmployees = await prisma.user.findMany({
    where: { employeeStatus: { not: 'Inactive' } },
    select: {
      id: true,
      name: true,
      email: true,
      nip: true,
      nik: true,
      dateOfBirth: true,
      employeeStatus: true,
      leaveBalances: {
        select: { annualRemaining: true },
        orderBy: { year: 'desc' },
        take: 1,
      },
    },
  });

  const nikMap = new Map();
  for (const emp of dbEmployees) {
    if (emp.nik) nikMap.set(String(emp.nik).trim(), emp);
  }

  // 3. Process each payroll row → generate unencrypted PDF
  for (const row of payrollRows) {
    const nik = row.nik;

    if (!nik) {
      results.failed.push({ name: row.name, reason: 'NIK is empty in Excel' });
      continue;
    }

    const employee = nikMap.get(nik);
    if (!employee) {
      results.failed.push({ name: row.name, nik, reason: `No DB employee found with NIK ${nik}` });
      continue;
    }

    if (!employee.dateOfBirth) {
      results.failed.push({
        name: employee.name,
        nik,
        reason: 'Date of birth missing in DB — required for PDF encryption',
      });
      continue;
    }

    try {
      const remainingLeave = employee.leaveBalances?.[0]?.annualRemaining ?? null;

      // Generate unencrypted PDF
      const pdfBuffer = await generatePayslipPDF(row, {
        name: employee.name,
        email: employee.email,
        nip: employee.nip || employee.id,
        position: row.position,
        remainingLeave,
      }, period);

      // Convert to base64 for frontend
      const pdfBase64 = pdfBuffer.toString('base64');

      results.employees.push({
        employeeId: employee.id,
        name: employee.name,
        nik,
        email: employee.email,
        position: row.position,
        grossPay: row.totalBruto || 0,
        netPay: row.takeHomePay || 0,
        pdfBase64,  // Frontend can use this to display PDF
        checked: true,  // Default: all checked
      });

    } catch (err) {
      console.error(`❌ Preview generation failed for ${row.name} (NIK: ${nik}):`, err.message);
      results.failed.push({ name: row.name, nik, reason: err.message });
    }
  }

  console.log(
    `✅ Preview generation complete: ${results.employees.length} generated, ${results.failed.length} failed`
  );

  return results;
};

// ─── Confirm & Upload Function ────────────────────────────────────────────────

/**
 * Confirm selected employees → encrypt PDFs, upload R2, save DB, send emails
 * 
 * @param {Array} selectedEmployees  [{ employeeId, pdfBase64, grossPay, netPay }, ...]
 * @param {object} period  { year, month, payDate }
 * @param {string} uploadedById
 * @param {boolean} sendNotifications
 * @returns {object} { success: [], failed: [] }
 */
export const confirmAndUploadPayslips = async (
  selectedEmployees,
  period,
  uploadedById,
  sendNotifications = true
) => {
  const results = { success: [], failed: [] };

  // Fetch employees with dateOfBirth (needed for encryption)
  const employeeIds = selectedEmployees.map(e => e.employeeId);
  const dbEmployees = await prisma.user.findMany({
    where: { id: { in: employeeIds } },
    select: {
      id: true,
      name: true,
      email: true,
      dateOfBirth: true,
      employeeStatus: true,
    },
  });

  const employeeMap = new Map(dbEmployees.map(e => [e.id, e]));

  for (const item of selectedEmployees) {
    const employee = employeeMap.get(item.employeeId);
    if (!employee) {
      results.failed.push({ employeeId: item.employeeId, reason: 'Employee not found in DB' });
      continue;
    }

    if (!employee.dateOfBirth) {
      results.failed.push({ employeeId: item.employeeId, name: employee.name, reason: 'Date of birth missing' });
      continue;
    }

    try {
      // 1. Decrypt base64 → buffer
      const pdfBuffer = Buffer.from(item.pdfBase64, 'base64');

      // 2. Encrypt PDF
      const encryptedBuffer = await encryptPayslipPDF(pdfBuffer, employee.dateOfBirth);

      // 3. Upload to R2
      const filename = `${employee.id}_payslip_${period.year}_${String(period.month).padStart(2, '0')}.pdf`;
      const r2Key = await uploadPayslip(encryptedBuffer, employee.id, period.year, period.month, filename);

      // 4. Upsert DB record
      const existing = await prisma.payslip.findUnique({
        where: {
          employeeId_year_month: {
            employeeId: employee.id,
            year: period.year,
            month: period.month,
          },
        },
      });

      const payslipData = {
        fileName: filename,
        fileUrl: r2Key,
        fileSize: encryptedBuffer.length,
        grossSalary: item.grossPay || null,
        netSalary: item.netPay || null,
        notes: `Generated from Excel — ${MONTH_NAMES[period.month]} ${period.year}`,
        uploadedById,
        uploadedAt: new Date(),
      };

      let payslip;
      if (existing) {
        payslip = await prisma.payslip.update({
          where: { id: existing.id },
          data: payslipData,
        });
      } else {
        payslip = await prisma.payslip.create({
          data: {
            employeeId: employee.id,
            year: period.year,
            month: period.month,
            ...payslipData,
          },
        });
      }

      // 5. Send email
      if (sendNotifications && employee.employeeStatus !== 'Inactive') {
        try {
          await sendPayslipNotificationEmail(employee, { year: period.year, month: period.month });
        } catch (emailErr) {
          console.warn(`⚠️  Email failed for ${employee.name}: ${emailErr.message}`);
        }
      }

      results.success.push({
        employeeId: employee.id,
        name: employee.name,
        payslipId: payslip.id,
        emailSent: sendNotifications,
      });

    } catch (err) {
      console.error(`❌ Upload failed for ${employee.name}:`, err.message);
      results.failed.push({ employeeId: employee.id, name: employee.name, reason: err.message });
    }
  }

  console.log(
    `✅ Upload complete: ${results.success.length} uploaded, ${results.failed.length} failed`
  );

  return results;
};