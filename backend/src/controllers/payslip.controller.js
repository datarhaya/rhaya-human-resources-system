// backend/src/controllers/payslip.controller.js
// UPDATED: Added email notifications

import { PrismaClient } from '@prisma/client';
import { uploadPayslip, getFileFromR2, deleteFromR2 } from '../config/storage.js';
import { sendPayslipNotificationEmail, sendBatchPayslipNotification } from '../services/email.service.js';
import { encryptPayslipPDF, validateBirthDate } from '../utils/pdfEncryption.js';
import { 
      getExcelSheetNames, 
      getRecommendedSheetName,
      parsePayrollSheet,
      fillTemplateAndConvertToPDF,
      confirmAndUploadPayslips 
} from '../services/payslipGenerator.template.service.js';
import { generatePayslipFilename } from '../utils/payslipFilename.js';

const prisma = new PrismaClient();

/**
 * Upload payslip (single)
 * POST /api/payslips/upload
 */
export const uploadPayslipController = async (req, res) => {
  try {
    const { employeeId, year, month, grossSalary, netSalary, notes, sendNotification = 'true' } = req.body;
    const file = req.file;

    console.log('Upload request:', { employeeId, year, month, file: file?.originalname, sendNotification });

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!employeeId || !year || !month) {
      return res.status(400).json({ 
        error: 'Missing required fields: employeeId, year, month' 
      });
    }

    // Get employee with date of birth AND plotting company
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        employeeStatus: true,
        dateOfBirth: true,
        plottingCompanyId: true,                        
        plottingCompany: {                              
          select: { id: true, code: true, name: true }
        }
      }
    });

    if (!employee) {
      return res.status(404).json({ 
        error: 'Employee not found' 
      });
    }

    // Validate plotting company exists
    if (!employee.plottingCompany) {
      return res.status(400).json({ 
        error: 'Employee must be assigned to a plotting company before uploading payslip.',
        field: 'plottingCompanyId',
        employeeId: employee.id,
        employeeName: employee.name
      });
    }

    // BLOCK UPLOAD if no date of birth
    if (!validateBirthDate(employee.dateOfBirth)) {
      return res.status(400).json({ 
        error: 'Tanggal lahir karyawan harus diisi sebelum upload payslip. Mohon update data karyawan terlebih dahulu.',
        field: 'dateOfBirth',
        employeeId: employee.id,
        employeeName: employee.name
      });
    }

    console.log(`Birth date validation passed for employee: ${employee.name}`);

    // Check if payslip already exists (with new unique constraint)
    const existing = await prisma.payslip.findUnique({
      where: {
        employeeId_year_month_plottingCompanyId: {      
          employeeId,
          year: parseInt(year),
          month: parseInt(month),
          plottingCompanyId: employee.plottingCompanyId  
        }
      }
    });

    // ENCRYPT PDF with date of birth password (DDMMYYYY)
    let encryptedBuffer;
    try {
      console.log(`Encrypting PDF for employee: ${employee.name}`);
      encryptedBuffer = await encryptPayslipPDF(file.buffer, employee.dateOfBirth);
      console.log(`PDF encrypted successfully (size: ${encryptedBuffer.length} bytes)`);
    } catch (encryptError) {
      console.error('PDF encryption failed:', encryptError);
      return res.status(500).json({ 
        error: 'Gagal mengenkripsi file PDF. Mohon coba lagi atau hubungi IT support.',
        details: encryptError.message
      });
    }

    // GENERATE NEW FILENAME FORMAT
    const filename = generatePayslipFilename(
      employee.name,
      employee.plottingCompany.code,
      { year: parseInt(year), month: parseInt(month) }
    );

    console.log(`Generated filename: ${filename}`);

    // Upload ENCRYPTED file to R2
    let r2Key;
    try {
      r2Key = await uploadPayslip(
        encryptedBuffer,
        employeeId, 
        parseInt(year), 
        parseInt(month), 
        filename  // Use generated filename
      );
      console.log('Encrypted file uploaded to R2:', r2Key);
    } catch (uploadError) {
      console.error('Error uploading to R2:', uploadError);
      return res.status(500).json({ 
        error: 'Failed to save file',
        message: uploadError.message
      });
    }

    let payslip;
    let isNewUpload = false;

    if (existing) {
      // Delete old file from R2
      try {
        await deleteFromR2(existing.fileUrl);
        console.log('Old file deleted from R2:', existing.fileUrl);
      } catch (deleteError) {
        console.warn('Warning: Could not delete old file:', deleteError.message);
      }

      // Update existing payslip
      payslip = await prisma.payslip.update({
        where: { id: existing.id },
        data: {
          fileName: filename,           
          fileUrl: r2Key,
          fileSize: encryptedBuffer.length,
          grossSalary: grossSalary ? parseFloat(grossSalary) : null,
          netSalary: netSalary ? parseFloat(netSalary) : null,
          notes,
          uploadedById: req.user.id,
          uploadedAt: new Date()
        },
        include: {
          employee: { select: { name: true, email: true } },
          plottingCompany: { select: { code: true, name: true } }  
        }
      });

      console.log(`Updated existing payslip: ${payslip.id}`);
    } else {
      // Create new payslip
      isNewUpload = true;
      payslip = await prisma.payslip.create({
        data: {
          employeeId,
          year: parseInt(year),
          month: parseInt(month),
          plottingCompanyId: employee.plottingCompanyId,  
          fileName: filename,                              
          fileUrl: r2Key,
          fileSize: encryptedBuffer.length,
          grossSalary: grossSalary ? parseFloat(grossSalary) : null,
          netSalary: netSalary ? parseFloat(netSalary) : null,
          notes,
          uploadedById: req.user.id,
          uploadedAt: new Date()
        },
        include: {
          employee: { select: { name: true, email: true } },
          plottingCompany: { select: { code: true, name: true } }  
        }
      });

      console.log(`Created new payslip: ${payslip.id}`);
    }

    // Send email notification if requested
    if ((sendNotification === 'true' || sendNotification === true) && 
        employee.employeeStatus !== 'INACTIVE') {
      try {
        await sendPayslipNotificationEmail(employee, {
          year: parseInt(year),
          month: parseInt(month),
          plottingCompanyName: employee.plottingCompany.name  
        });
        console.log(`Email notification sent to: ${employee.email}`);
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }
    }

    return res.status(isNewUpload ? 201 : 200).json({
      success: true,
      message: isNewUpload ? 'Payslip uploaded successfully' : 'Payslip updated successfully',
      data: payslip
    });

  } catch (error) {
    console.error('Error in uploadPayslipController:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Batch upload payslips (multiple employees for same month)
 * POST /api/payslips/batch-upload
 */
export const batchUploadPayslips = async (req, res) => {
  try {
    const { year, month, sendNotifications = 'true' } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    if (!year || !month) {
      return res.status(400).json({ error: 'Missing required fields: year, month' });
    }

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    for (const file of files) {
      try {
        // Extract employeeId from filename
        // Support both old format (employeeId_payslip_YYYY_MM.pdf) and new format
        let employeeId;
        
        // Try old format first
        const oldMatch = file.originalname.match(/^(.+)_payslip_\d{4}_\d{1,2}\.pdf$/);
        if (oldMatch) {
          employeeId = oldMatch[1];
        } else {
          // Try to extract from new format or just use filename without extension
          employeeId = file.originalname.replace(/\.pdf$/i, '').split(' - ')[0];
        }

        if (!employeeId) {
          results.failed.push({
            filename: file.originalname,
            error: 'Could not extract employee ID from filename'
          });
          continue;
        }

        // Get employee with plotting company
        const employee = await prisma.user.findUnique({
          where: { id: employeeId },
          select: {
            id: true,
            name: true,
            email: true,
            employeeStatus: true,
            dateOfBirth: true,
            plottingCompanyId: true,
            plottingCompany: {
              select: { id: true, code: true, name: true }
            }
          }
        });

        if (!employee) {
          results.failed.push({
            filename: file.originalname,
            employeeId,
            error: 'Employee not found'
          });
          continue;
        }

        if (!employee.plottingCompany) {
          results.skipped.push({
            filename: file.originalname,
            employeeId,
            employeeName: employee.name,
            reason: 'Employee not assigned to a plotting company'
          });
          continue;
        }

        if (!validateBirthDate(employee.dateOfBirth)) {
          results.skipped.push({
            filename: file.originalname,
            employeeId,
            employeeName: employee.name,
            reason: 'Date of birth not set'
          });
          continue;
        }

        // Encrypt PDF
        const encryptedBuffer = await encryptPayslipPDF(file.buffer, employee.dateOfBirth);

        // Generate filename
        const filename = generatePayslipFilename(
          employee.name,
          employee.plottingCompany.code,
          { year: parseInt(year), month: parseInt(month) }
        );

        // Upload to R2
        const r2Key = await uploadPayslip(
          encryptedBuffer,
          employeeId,
          parseInt(year),
          parseInt(month),
          filename
        );

        // Check if payslip exists
        const existing = await prisma.payslip.findUnique({
          where: {
            employeeId_year_month_plottingCompanyId: {
              employeeId,
              year: parseInt(year),
              month: parseInt(month),
              plottingCompanyId: employee.plottingCompanyId
            }
          }
        });

        let payslip;
        if (existing) {
          await deleteFromR2(existing.fileUrl);
          payslip = await prisma.payslip.update({
            where: { id: existing.id },
            data: {
              fileName: filename,
              fileUrl: r2Key,
              fileSize: encryptedBuffer.length,
              uploadedById: req.user.id,
              uploadedAt: new Date()
            }
          });
        } else {
          payslip = await prisma.payslip.create({
            data: {
              employeeId,
              year: parseInt(year),
              month: parseInt(month),
              plottingCompanyId: employee.plottingCompanyId,
              fileName: filename,
              fileUrl: r2Key,
              fileSize: encryptedBuffer.length,
              uploadedById: req.user.id,
              uploadedAt: new Date()
            }
          });
        }

        // Send email notification
        if ((sendNotifications === 'true' || sendNotifications === true) &&
            employee.employeeStatus !== 'INACTIVE') {
          try {
            await sendPayslipNotificationEmail(employee, {
              year: parseInt(year),
              month: parseInt(month),
              plottingCompanyName: employee.plottingCompany.name
            });
          } catch (emailError) {
            console.error(`Email failed for ${employee.name}:`, emailError);
          }
        }

        results.success.push({
          filename: file.originalname,
          newFilename: filename,
          employeeId,
          employeeName: employee.name,
          payslipId: payslip.id
        });

      } catch (error) {
        console.error(`Error processing ${file.originalname}:`, error);
        results.failed.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    const status = results.failed.length > 0 ? 207 : 200;

    return res.status(status).json({
      success: true,
      message: `Batch upload complete: ${results.success.length} uploaded, ${results.failed.length} failed, ${results.skipped.length} skipped`,
      data: results
    });

  } catch (error) {
    console.error('Error in batchUploadPayslips:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Send notification for existing payslip (manual trigger)
 * POST /api/payslips/:payslipId/notify
 */
export const sendPayslipNotification = async (req, res) => {
  try {
    const { payslipId } = req.params;

    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        employee: {
          select: { id: true, name: true, email: true, employeeStatus: true }
        }
      }
    });

    if (!payslip) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    if (payslip.employee.employeeStatus === 'INACTIVE') {
      return res.status(400).json({ 
        error: 'Cannot send notification to inactive employee' 
      });
    }

    // Send notification
    await sendPayslipNotificationEmail(
      payslip.employee,
      { year: payslip.year, month: payslip.month }
    );

    console.log(`Manual payslip notification sent to: ${payslip.employee.email}`);

    res.json({
      success: true,
      message: 'Notification sent successfully'
    });

  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      error: 'Failed to send notification',
      message: error.message
    });
  }
};

/**
 * Send notifications for all payslips of a specific month (blast)
 * POST /api/payslips/notify-all
 */
export const notifyAllForMonth = async (req, res) => {
  try {
    const { year, month } = req.body;

    if (!year || !month) {
      return res.status(400).json({ 
        error: 'Missing required fields: year, month' 
      });
    }

    // Get all payslips for the month with active employees
    const payslips = await prisma.payslip.findMany({
      where: {
        year: parseInt(year),
        month: parseInt(month)
      },
      include: {
        employee: {
          select: { id: true, name: true, email: true, employeeStatus: true }
        }
      }
    });

    if (payslips.length === 0) {
      return res.status(404).json({ 
        error: 'No payslips found for this period' 
      });
    }

    // Filter active employees
    const activeEmployees = payslips
      .filter(p => p.employee.employeeStatus !== 'INACTIVE')
      .map(p => p.employee);

    if (activeEmployees.length === 0) {
      return res.status(400).json({ 
        error: 'No active employees found for this period' 
      });
    }

    // Send batch notifications
    const result = await sendBatchPayslipNotification(
      activeEmployees,
      { year: parseInt(year), month: parseInt(month) }
    );

    console.log(`Blast notifications complete: ${result.success} sent, ${result.failed} failed`);

    res.json({
      success: true,
      message: `Notifications sent to ${result.success} employees`,
      data: {
        totalPayslips: payslips.length,
        notificationsSent: result.success,
        notificationsFailed: result.failed,
        failedEmails: result.failedEmails
      }
    });

  } catch (error) {
    console.error('Notify all error:', error);
    res.status(500).json({
      error: 'Failed to send notifications',
      message: error.message
    });
  }
};

/**
 * Get all payslips (Admin/HR view)
 * GET /api/payslips
 */
export const getAllPayslips = async (req, res) => {
  try {
    const { year, month, employeeId } = req.query;

    const where = {};
    if (year) where.year = parseInt(year);
    if (month) where.month = parseInt(month);
    if (employeeId) where.employeeId = employeeId;

    const payslips = await prisma.payslip.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            nip: true,
            division: {
              select: { id: true, name: true }
            }
          }
        },
        uploadedBy: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { employee: { name: 'asc' } }
      ]
    });

    res.json({
      success: true,
      data: payslips
    });

  } catch (error) {
    console.error('Get payslips error:', error);
    res.status(500).json({
      error: 'Failed to fetch payslips',
      message: error.message
    });
  }
};

/**
 * Get my payslips (Employee view)
 * GET /api/payslips/my-payslips
 */
export const getMyPayslips = async (req, res) => {
  try {
    const employeeId = req.user.id;

    const payslips = await prisma.payslip.findMany({
      where: { employeeId },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });

    res.json({
      success: true,
      data: payslips
    });

  } catch (error) {
    console.error('Get my payslips error:', error);
    res.status(500).json({
      error: 'Failed to fetch payslips',
      message: error.message
    });
  }
};

/**
 * Download/View payslip
 * GET /api/payslips/:payslipId/download
 */
export const downloadPayslip = async (req, res) => {
  try {
    const { payslipId } = req.params;
    const userId = req.user.id;

    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        employee: {
          select: { id: true, name: true }
        }
      }
    });

    if (!payslip) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    // Check authorization
    const isOwnPayslip = payslip.employeeId === userId;
    const isAdminOrHR = req.user.accessLevel <= 2;

    if (!isOwnPayslip && !isAdminOrHR) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get file from R2
    const fileBuffer = await getFileFromR2(payslip.fileUrl);

    // Update view count
    await prisma.payslip.update({
      where: { id: payslipId },
      data: {
        viewCount: { increment: 1 },
        viewedAt: new Date()
      }
    });

    // Send file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${payslip.fileName}"`);
    res.send(fileBuffer);

  } catch (error) {
    console.error('Download payslip error:', error);
    res.status(500).json({
      error: 'Failed to download payslip',
      message: error.message
    });
  }
};

/**
 * Delete payslip
 * DELETE /api/payslips/:payslipId
 */
export const deletePayslip = async (req, res) => {
  try {
    const { payslipId } = req.params;

    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId }
    });

    if (!payslip) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    // Delete file from R2
    try {
      await deleteFromR2(payslip.fileUrl);
      console.log('🗑️  File deleted from R2:', payslip.fileUrl);
    } catch (deleteError) {
      console.warn('Could not delete file from R2:', deleteError.message);
    }

    // Delete from database
    await prisma.payslip.delete({
      where: { id: payslipId }
    });

    res.json({
      success: true,
      message: 'Payslip deleted successfully'
    });

  } catch (error) {
    console.error('Delete payslip error:', error);
    res.status(500).json({
      error: 'Failed to delete payslip',
      message: error.message
    });
  }
};

/**
 * Generate payslips from Excel file (bulk)
 * POST /api/payslips/generate-from-excel
 *
 * Body (multipart/form-data):
 *   file              - Excel file (.xlsx)
 *   year              - e.g. 2025
 *   month             - e.g. 7
 *   payDate           - e.g. 2025-07-28  (optional, defaults to 28th of month)
 *   sendNotifications - 'true' | 'false'  (default: 'true')
 */
export const generateFromExcel = async (req, res) => {
  try {
    const { year, month, payDate, sendNotifications = 'true' } = req.body;
    const file = req.file;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!file) {
      return res.status(400).json({ error: 'No Excel file uploaded' });
    }

    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Only .xlsx / .xls files are allowed' });
    }

    if (!year || !month) {
      return res.status(400).json({ error: 'Missing required fields: year, month' });
    }

    const yearInt  = parseInt(year);
    const monthInt = parseInt(month);

    if (isNaN(yearInt) || yearInt < 2020 || yearInt > 2100) {
      return res.status(400).json({ error: 'Invalid year' });
    }
    if (isNaN(monthInt) || monthInt < 1 || monthInt > 12) {
      return res.status(400).json({ error: 'Invalid month (must be 1–12)' });
    }

    console.log(
      `[generateFromExcel] Starting | Period: ${monthInt}/${yearInt} | ` +
      `File: ${file.originalname} | HR: ${req.user.id}`
    );

    // ── Run pipeline ──────────────────────────────────────────────────────────
    const results = await generatePayslipsFromExcel(
      file.buffer,
      {
        year: yearInt,
        month: monthInt,
        payDate: payDate || null,
      },
      req.user.id,
      sendNotifications === 'true' || sendNotifications === true
    );

    // ── Response ──────────────────────────────────────────────────────────────
    const status = results.failed.length === 0 ? 200 : 207; // 207 = partial success

    return res.status(status).json({
      success: true,
      message:
        `Payslip generation complete: ${results.success.length} generated` +
        (results.failed.length > 0 ? `, ${results.failed.length} failed` : ''),
      data: {
        period: { year: yearInt, month: monthInt },
        summary: {
          total:     results.success.length + results.failed.length + results.skipped.length,
          generated: results.success.length,
          failed:    results.failed.length,
          skipped:   results.skipped.length,
        },
        generated: results.success,
        failed:    results.failed,
        skipped:   results.skipped,
      },
    });

  } catch (error) {
    console.error('generateFromExcel error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate payslips from Excel',
      message: error.message,
    });
  }
};

/**
 * Generate payslip preview from Excel (Step 1: Parse + Generate PDFs)
 * POST /api/payslips/generate-preview
 *
 * Body (multipart/form-data):
 *   file     - Excel file (.xlsx)
 *   year     - e.g. 2025
 *   month    - e.g. 7
 *   payDate  - e.g. 2025-07-28 (optional)
 *
 /**
 * Detect sheet names from uploaded Excel (Step 0: Sheet Detection)
 * POST /api/payslips/detect-sheets
 *
 * Body (multipart/form-data):
 *   file  - Excel file (.xlsx)
 *   month - Current month number (for recommendation)
 *
 * Returns:
 *   {
 *     sheets: ['Sheet1', 'February', 'Format'],
 *     recommended: 'February'
 *   }
 */
export const detectSheets = async (req, res) => {
  try {
    const { month } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No Excel file uploaded' });
    }

    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Only .xlsx / .xls files are allowed' });
    }

    console.log(`[detectSheets] File: ${file.originalname} | HR: ${req.user.id}`);

    const sheetNames = await getExcelSheetNames(file.buffer);
    const recommended = getRecommendedSheetName(sheetNames, parseInt(month) || new Date().getMonth() + 1);

    return res.status(200).json({
      success: true,
      data: {
        sheets: sheetNames,
        recommended,
      },
    });

  } catch (error) {
    console.error('detectSheets error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to detect sheets',
      message: error.message,
    });
  }
};

/**
 * Generate payslip preview from Excel using template (Step 1: Parse + Generate PDFs)
 * POST /api/payslips/generate-preview
 *
 * Body (multipart/form-data):
 *   file      - Excel file (.xlsx)
 *   sheetName - Selected sheet name
 *   year      - e.g. 2025
 *   month     - e.g. 2
 *   payDate   - e.g. 2025-02-28 (optional)
 *
 * Returns:
 *   {
 *     employees: [{ employeeId, name, nik, grossPay, netPay, pdfBase64, checked: true }, ...],
 *     failed: [{ name, nik, reason }, ...]
 *   }
 */
export const generatePreview = async (req, res) => {
  try {
    const { year, month, payDate, sheetName } = req.body;
    const file = req.file;

    // Validation
    if (!file) {
      return res.status(400).json({ error: 'No Excel file uploaded' });
    }

    if (!sheetName) {
      return res.status(400).json({ error: 'Sheet name is required' });
    }

    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Only .xlsx / .xls files are allowed' });
    }

    if (!year || !month) {
      return res.status(400).json({ error: 'Missing required fields: year, month' });
    }

    const yearInt  = parseInt(year);
    const monthInt = parseInt(month);

    if (isNaN(yearInt) || yearInt < 2020 || yearInt > 2100) {
      return res.status(400).json({ error: 'Invalid year' });
    }
    if (isNaN(monthInt) || monthInt < 1 || monthInt > 12) {
      return res.status(400).json({ error: 'Invalid month (must be 1–12)' });
    }

    console.log(
      `[generatePreview] Starting | Period: ${monthInt}/${yearInt} | ` +
      `Sheet: ${sheetName} | File: ${file.originalname} | HR: ${req.user.id}`
    );

    // Run preview generation with template
    const results = await generatePayslipsPreviewWithTemplate(file.buffer, sheetName, {
      year: yearInt,
      month: monthInt,
      payDate: payDate || null,
    });

    return res.status(200).json({
      success: true,
      message: `Preview generated: ${results.employees.length} employees, ${results.failed.length} failed`,
      data: {
        period: { year: yearInt, month: monthInt, payDate },
        employees: results.employees,
        failed: results.failed,
      },
    });

  } catch (error) {
    console.error('generatePreview error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate preview',
      message: error.message,
    });
  }
};

/**
 * Confirm and upload selected payslips (Step 2: Encrypt + Upload R2 + Send Emails)
 * POST /api/payslips/confirm-upload
 *
 * Body (JSON):
 *   {
 *     selectedEmployees: [
 *       { employeeId, pdfBase64, grossPay, netPay },
 *       ...
 *     ],
 *     period: { year, month, payDate },
 *     sendNotifications: true/false
 *   }
 */
export const confirmUpload = async (req, res) => {
  try {
    const { selectedEmployees, period, sendNotifications = true } = req.body;

    if (!selectedEmployees || !Array.isArray(selectedEmployees) || selectedEmployees.length === 0) {
      return res.status(400).json({ error: 'No employees selected' });
    }

    if (!period || !period.year || !period.month) {
      return res.status(400).json({ error: 'Period data missing' });
    }

    console.log(
      `[confirmUpload] Starting upload for ${selectedEmployees.length} employees | ` +
      `Period: ${period.month}/${period.year} | HR: ${req.user.id}`
    );

    // Run upload
    const results = await confirmAndUploadPayslips(
      selectedEmployees,
      period,
      req.user.id,
      sendNotifications
    );

    const status = results.failed.length === 0 ? 200 : 207;

    return res.status(status).json({
      success: true,
      message: `Upload complete: ${results.success.length} uploaded${results.failed.length > 0 ? `, ${results.failed.length} failed` : ''}`,
      data: {
        summary: {
          uploaded: results.success.length,
          failed: results.failed.length,
        },
        uploaded: results.success,
        failed: results.failed,
      },
    });

  } catch (error) {
    console.error('confirmUpload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload payslips',
      message: error.message,
    });
  }
};

/**
 * Generate payslip preview with real-time progress streaming (SSE)
 * POST /api/payslips/generate-preview-stream
 * 
 * Uses Server-Sent Events to stream progress updates to the client
 */
export const generatePreviewStream = async (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Helper to send progress events
  const sendProgress = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { year, month, payDate, sheetName } = req.body;
    
    // Get file from multipart (stored in memory by multer)
    const file = req.file;

    if (!file || !sheetName || !year || !month) {
      sendProgress({ 
        type: 'error', 
        message: 'Missing required fields' 
      });
      return res.end();
    }

    const yearInt = parseInt(year);
    const monthInt = parseInt(month);
    const period = { year: yearInt, month: monthInt, payDate: payDate || null };

    // Step 1: Parse Excel
    sendProgress({ 
      type: 'status', 
      message: 'Reading Excel file...',
      stage: 'parsing'
    });

    const payrollRows = await parsePayrollSheet(file.buffer, sheetName);
    
    if (payrollRows.length === 0) {
      sendProgress({ 
        type: 'error', 
        message: `No employee data found in sheet "${sheetName}"` 
      });
      return res.end();
    }

    sendProgress({ 
      type: 'status', 
      message: `Found ${payrollRows.length} employees in Excel`,
      stage: 'parsed',
      total: payrollRows.length
    });

    // Step 2: Fetch employees from DB
    sendProgress({ 
      type: 'status', 
      message: 'Fetching employee data from database...',
      stage: 'fetching'
    });

    const dbEmployees = await prisma.user.findMany({
      where: { employeeStatus: { not: 'INACTIVE' } },
      select: {
        id: true,
        name: true,
        email: true,
        nip: true,
        nik: true,
        dateOfBirth: true,
        plottingCompany: { 
          select: { 
            id: true,
            name: true, 
            code: true
          } 
        },
        leaveBalances: {
          select: { annualRemaining: true, toilBalance: true, toilUsed: true },
          orderBy: { year: 'desc' },
          take: 1,
        },
      },
    });

    const nikMap = new Map();
    for (const emp of dbEmployees) {
      if (emp.nik) nikMap.set(String(emp.nik).trim(), emp);
    }

    // Step 3: Process each employee with progress updates
    const results = { employees: [], failed: [] };
    let processedCount = 0;

    for (const row of payrollRows) {
      processedCount++;
      
      // Send progress update
      sendProgress({
        type: 'progress',
        current: processedCount,
        total: payrollRows.length,
        percentage: Math.round((processedCount / payrollRows.length) * 100),
        currentEmployee: row.nik ? nikMap.get(row.nik)?.name || 'Unknown' : 'Unknown',
        stage: 'generating'
      });

      // Validation checks
      if (!row.nik) {
        results.failed.push({ nik: row.nik, reason: 'NIK is empty' });
        continue;
      }

      const employee = nikMap.get(row.nik);
      if (!employee) {
        results.failed.push({ nik: row.nik, reason: `No employee found with NIK ${row.nik}` });
        continue;
      }

      if (!employee.dateOfBirth) {
        results.failed.push({
          name: employee.name,
          nik: row.nik,
          reason: 'Date of birth missing',
        });
        continue;
      }

      // Generate PDF
      try {
        const leaveData = employee.leaveBalances?.[0];
        
        const pdfBuffer = await fillTemplateAndConvertToPDF({
          id: employee.id,
          name: employee.name,
          email: employee.email,
          nip: employee.nip,
          plottingCompanyName: employee.plottingCompany?.name,
          annualRemaining: leaveData?.annualRemaining || 0,
          toilBalance: leaveData?.toilBalance || 0,
          toilUsed: leaveData?.toilUsed || 0,
        }, row, period);

        // Validate deductions
        const calculatedNet = (row.basicPay + row.overtimePay) - 
                            (row.pph21Adjust + row.bpjstk + row.bpjskes + row.kompensasiA1);
        const deductionMismatch = Math.abs(calculatedNet - row.netPay) > 1; // Allow 1 IDR rounding difference

        // Format as IDR
        const formatIDR = (amount) => {
          return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(Math.round(amount));
        };

        results.employees.push({
          employeeId: employee.id,
          name: employee.name,
          nik: row.nik,
          email: employee.email,
          position: row.position,
          plottingCompanyId: employee.plottingCompany?.id,
          plottingCompanyCode: employee.plottingCompany?.code,
          plottingCompanyName: employee.plottingCompany?.name,
          grossPay: row.grossPay,
          netPay: row.netPay,
          grossPayFormatted: formatIDR(row.grossPay),
          netPayFormatted: formatIDR(row.netPay),
          pdfBase64: pdfBuffer.toString('base64'),
          checked: true,
          deductionWarning: deductionMismatch 
            ? `Deduction mismatch: Expected ${formatIDR(calculatedNet)} but got ${formatIDR(row.netPay)}` 
            : null,
        });

      } catch (err) {
        console.error(`Failed to generate for ${employee.name}:`, err.message);
        results.failed.push({ name: employee.name, nik: row.nik, reason: err.message });
      }
    }

    // Send completion event with final results
    sendProgress({
      type: 'complete',
      data: {
        period,
        employees: results.employees,
        failed: results.failed,
      },
      summary: {
        total: payrollRows.length,
        generated: results.employees.length,
        failed: results.failed.length,
      }
    });

    // Close connection
    res.end();

  } catch (error) {
    console.error('generatePreviewStream error:', error);
    sendProgress({ 
      type: 'error', 
      message: error.message 
    });
    res.end();
  }
};

/**
 * Get monthly payslip statistics
 * GET /api/payslips/monthly-stats?year=2026&month=2
 * 
 * Returns summary for dashboard widget:
 * - Total active employees
 * - Payslips issued (count)
 * - Missing employees (list)
 */
export const getMonthlyStats = async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ 
        error: 'Missing required parameters: year, month' 
      });
    }

    const yearInt = parseInt(year);
    const monthInt = parseInt(month);

    if (isNaN(yearInt) || isNaN(monthInt) || monthInt < 1 || monthInt > 12) {
      return res.status(400).json({ 
        error: 'Invalid year or month' 
      });
    }

    console.log(`[getMonthlyStats] Fetching stats for ${monthInt}/${yearInt}`);

    // Count total active employees
    const monthEndDate = new Date(yearInt, monthInt, 0); // Last day of the month

    const totalEmployees = await prisma.user.count({
      where: { 
        employeeStatus: { not: 'INACTIVE' },
        accessLevel: { notIn: [1, 2] },  // Exclude Admin (1) and HR (2)
        OR: [
          { joinDate: null },  // Include if joinDate not set (legacy data)
          { joinDate: { lte: monthEndDate } }  // Include if joined on or before month end
        ]
      }
    });

    // Count payslips issued for this month (can be more than employees due to multi-company)
    const issuedCount = await prisma.payslip.count({
      where: { 
        year: yearInt, 
        month: monthInt 
      }
    });

    // Get unique employee IDs who have payslips this month
    const issuedEmployeeIds = await prisma.payslip.findMany({
      where: { 
        year: yearInt, 
        month: monthInt 
      },
      select: { 
        employeeId: true 
      },
      distinct: ['employeeId'],
    });

    const issuedIds = new Set(issuedEmployeeIds.map(p => p.employeeId));
    const employeesWithPayslips = issuedIds.size;

    // 4. Find employees WITHOUT payslips (missing)
    const missingEmployees = await prisma.user.findMany({
      where: {
        employeeStatus: { not: 'INACTIVE' },
        accessLevel: { notIn: [1, 2] },       // Exclude Admin and HR
        OR: [
          { joinDate: null },                 // Include if joinDate not set (legacy data)
          { joinDate: { lte: monthEndDate } }  // Include if joined on or before month end
        ],
        id: { notIn: Array.from(issuedIds) },
      },
      select: { 
        id: true, 
        name: true, 
        nik: true,
        email: true,
        plottingCompany: {
          select: {
            code: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // 5. Get breakdown by company (how many payslips per company)
    const companiesCounts = await prisma.payslip.groupBy({
      by: ['plottingCompanyId'],
      where: {
        year: yearInt,
        month: monthInt
      },
      _count: {
        id: true
      }
    });

    // Fetch company names for the counts
    const companyIds = companiesCounts.map(c => c.plottingCompanyId);
    const companies = await prisma.plottingCompany.findMany({
      where: { id: { in: companyIds } },
      select: { id: true, code: true, name: true }
    });

    const companyMap = new Map(companies.map(c => [c.id, c]));
    
    const byCompany = companiesCounts.map(c => ({
      companyId: c.plottingCompanyId,
      companyCode: companyMap.get(c.plottingCompanyId)?.code || 'Unknown',
      companyName: companyMap.get(c.plottingCompanyId)?.name || 'Unknown',
      count: c._count.id
    })).sort((a, b) => b.count - a.count);

    // 6. Calculate completion percentage
    const completionPercentage = totalEmployees > 0 
      ? Math.round((employeesWithPayslips / totalEmployees) * 100) 
      : 0;

    const stats = {
      period: { year: yearInt, month: monthInt },
      totalEmployees,
      employeesWithPayslips,
      missingCount: missingEmployees.length,
      issuedCount, // Total payslips (can be > employees due to multi-company)
      completionPercentage,
      missingEmployees: missingEmployees.map(emp => ({
        id: emp.id,
        name: emp.name,
        nik: emp.nik,
        email: emp.email,
        companyCode: emp.plottingCompany?.code,
        companyName: emp.plottingCompany?.name
      })),
      byCompany, // Breakdown by plotting company
    };

    console.log(`✅ Stats: ${employeesWithPayslips}/${totalEmployees} employees (${completionPercentage}%), ${missingEmployees.length} missing`);

    return res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ getMonthlyStats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly statistics',
      message: error.message
    });
  }
};

export default {
  uploadPayslipController,
  batchUploadPayslips,
  sendPayslipNotification,
  notifyAllForMonth,
  getAllPayslips,
  getMyPayslips,
  downloadPayslip,
  deletePayslip,
  generateFromExcel,
  detectSheets,
  generatePreview,
  confirmUpload,
  generatePreviewStream,
  getMonthlyStats
};