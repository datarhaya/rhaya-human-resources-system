// backend/src/controllers/payslip.controller.js
// UPDATED: Added email notifications

import { PrismaClient } from '@prisma/client';
import { uploadPayslip, getFileFromR2, deleteFromR2 } from '../config/storage.js';
import { sendPayslipNotificationEmail, sendBatchPayslipNotification } from '../services/email.service.js';

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

    // Check if payslip already exists
    const existing = await prisma.payslip.findUnique({
      where: {
        employeeId_year_month: {
          employeeId,
          year: parseInt(year),
          month: parseInt(month)
        }
      }
    });

    // Upload file to R2 (using helper function)
    let r2Key;
    try {
      r2Key = await uploadPayslip(
        file.buffer, 
        employeeId, 
        parseInt(year), 
        parseInt(month), 
        file.originalname
      );
      console.log('✅ File uploaded to R2:', r2Key);
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
        console.log('🗑️  Old file deleted from R2:', existing.fileUrl);
      } catch (deleteError) {
        console.warn('Could not delete old file:', deleteError.message);
      }

      // Update existing payslip
      payslip = await prisma.payslip.update({
        where: { id: existing.id },
        data: {
          fileName: file.originalname,
          fileUrl: r2Key,
          fileSize: file.size,
          grossSalary: grossSalary ? parseFloat(grossSalary) : null,
          netSalary: netSalary ? parseFloat(netSalary) : null,
          notes: notes || null,
          uploadedById: req.user.id,
          uploadedAt: new Date()
        },
        include: {
          employee: {
            select: { id: true, name: true, email: true, employeeStatus: true }
          }
        }
      });

      console.log('✅ Payslip updated:', payslip.id);

    } else {
      // Create new payslip
      payslip = await prisma.payslip.create({
        data: {
          employeeId,
          year: parseInt(year),
          month: parseInt(month),
          fileName: file.originalname,
          fileUrl: r2Key,
          fileSize: file.size,
          grossSalary: grossSalary ? parseFloat(grossSalary) : null,
          netSalary: netSalary ? parseFloat(netSalary) : null,
          notes: notes || null,
          uploadedById: req.user.id
        },
        include: {
          employee: {
            select: { id: true, name: true, email: true, employeeStatus: true }
          }
        }
      });

      isNewUpload = true;
      console.log('✅ Payslip created:', payslip.id);
    }

    // Send email notification if requested and employee is active
    const shouldSendEmail = sendNotification === 'true' || sendNotification === true;
    
    if (shouldSendEmail && payslip.employee.employeeStatus !== 'Inactive') {
      try {
        await sendPayslipNotificationEmail(
          payslip.employee, 
          { year: payslip.year, month: payslip.month }
        );
        console.log(`✅ Payslip notification email sent to: ${payslip.employee.email}`);
      } catch (emailError) {
        console.error(`⚠️ Failed to send payslip notification email: ${emailError.message}`);
        // Don't fail the request if email fails
      }
    }

    res.json({
      success: true,
      message: isNewUpload ? 'Payslip uploaded successfully' : 'Payslip updated successfully',
      data: payslip
    });

  } catch (error) {
    console.error('❌ Upload payslip error:', error);
    
    res.status(500).json({
      error: 'Failed to upload payslip',
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
    const files = req.files; // Using multiple file upload

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    if (!year || !month) {
      return res.status(400).json({ 
        error: 'Missing required fields: year, month' 
      });
    }

    console.log(`[Batch Upload] Starting batch upload for ${month}/${year} - ${files.length} files`);

    const results = {
      success: [],
      failed: [],
      notifiedEmployees: []
    };

    // Process each file
    for (const file of files) {
      try {
        // Extract employeeId from filename
        // Expected format: employeeId_payslip_YYYY_MM.pdf or just employeeId.pdf
        const employeeId = file.originalname.split('_')[0].split('.')[0];

        if (!employeeId) {
          results.failed.push({
            filename: file.originalname,
            error: 'Could not extract employee ID from filename'
          });
          continue;
        }

        // Check if employee exists
        const employee = await prisma.user.findUnique({
          where: { id: employeeId },
          select: { id: true, name: true, email: true, employeeStatus: true }
        });

        if (!employee) {
          results.failed.push({
            filename: file.originalname,
            employeeId,
            error: 'Employee not found'
          });
          continue;
        }

        // Check if payslip already exists
        const existing = await prisma.payslip.findUnique({
          where: {
            employeeId_year_month: {
              employeeId,
              year: parseInt(year),
              month: parseInt(month)
            }
          }
        });

        // Upload file to R2
        const r2Key = await uploadPayslip(
          file.buffer, 
          employeeId, 
          parseInt(year), 
          parseInt(month), 
          file.originalname
        );

        let payslip;

        if (existing) {
          // Delete old file
          try {
            await deleteFromR2(existing.fileUrl);
          } catch (deleteError) {
            console.warn('Could not delete old file:', deleteError.message);
          }

          // Update existing
          payslip = await prisma.payslip.update({
            where: { id: existing.id },
            data: {
              fileName: file.originalname,
              fileUrl: r2Key,
              fileSize: file.size,
              uploadedById: req.user.id,
              uploadedAt: new Date()
            }
          });
        } else {
          // Create new
          payslip = await prisma.payslip.create({
            data: {
              employeeId,
              year: parseInt(year),
              month: parseInt(month),
              fileName: file.originalname,
              fileUrl: r2Key,
              fileSize: file.size,
              uploadedById: req.user.id
            }
          });
        }

        results.success.push({
          employeeId,
          employeeName: employee.name,
          filename: file.originalname,
          payslipId: payslip.id
        });

        // Collect employees for notification
        if (employee.employeeStatus !== 'Inactive') {
          results.notifiedEmployees.push(employee);
        }

      } catch (fileError) {
        results.failed.push({
          filename: file.originalname,
          error: fileError.message
        });
      }
    }

    // Send batch notifications if requested
    const shouldSendNotifications = sendNotifications === 'true' || sendNotifications === true;
    
    if (shouldSendNotifications && results.notifiedEmployees.length > 0) {
      try {
        const notificationResult = await sendBatchPayslipNotification(
          results.notifiedEmployees,
          { year: parseInt(year), month: parseInt(month) }
        );
        
        console.log(`✅ Batch notifications sent: ${notificationResult.success} succeeded, ${notificationResult.failed} failed`);
        
        results.emailNotifications = {
          sent: notificationResult.success,
          failed: notificationResult.failed,
          failedEmails: notificationResult.failedEmails
        };
      } catch (emailError) {
        console.error('⚠️ Batch notification error:', emailError);
        results.emailNotifications = {
          error: emailError.message
        };
      }
    }

    console.log(`[Batch Upload] Complete: ${results.success.length} succeeded, ${results.failed.length} failed`);

    res.json({
      success: true,
      message: `Batch upload complete: ${results.success.length} uploaded, ${results.failed.length} failed`,
      data: results
    });

  } catch (error) {
    console.error('❌ Batch upload error:', error);
    res.status(500).json({
      error: 'Failed to process batch upload',
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

    if (payslip.employee.employeeStatus === 'Inactive') {
      return res.status(400).json({ 
        error: 'Cannot send notification to inactive employee' 
      });
    }

    // Send notification
    await sendPayslipNotificationEmail(
      payslip.employee,
      { year: payslip.year, month: payslip.month }
    );

    console.log(`✅ Manual payslip notification sent to: ${payslip.employee.email}`);

    res.json({
      success: true,
      message: 'Notification sent successfully'
    });

  } catch (error) {
    console.error('❌ Send notification error:', error);
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
      .filter(p => p.employee.employeeStatus !== 'Inactive')
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

    console.log(`✅ Blast notifications complete: ${result.success} sent, ${result.failed} failed`);

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
    console.error('❌ Notify all error:', error);
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

export default {
  uploadPayslipController,
  batchUploadPayslips,
  sendPayslipNotification,
  notifyAllForMonth,
  getAllPayslips,
  getMyPayslips,
  downloadPayslip,
  deletePayslip
};