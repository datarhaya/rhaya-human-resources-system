// backend/src/controllers/payslip.controller.js
// UPDATED: Uses generic storage utility

import { PrismaClient } from '@prisma/client';
import { uploadPayslip, getFileFromR2, deleteFromR2 } from '../config/storage.js';

const prisma = new PrismaClient();

/**
 * Upload payslip
 * POST /api/payslips/upload
 */
export const uploadPayslipController = async (req, res) => {
  try {
    const { employeeId, year, month, grossSalary, netSalary, notes } = req.body;
    const file = req.file;

    console.log('Upload request:', { employeeId, year, month, file: file?.originalname });

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

    if (existing) {
      // Delete old file from R2
      try {
        await deleteFromR2(existing.fileUrl);
        console.log('🗑️  Old file deleted from R2:', existing.fileUrl);
      } catch (deleteError) {
        console.warn('Could not delete old file:', deleteError.message);
      }

      // Update existing payslip
      const updated = await prisma.payslip.update({
        where: { id: existing.id },
        data: {
          fileName: file.originalname,
          fileUrl: r2Key, // Store R2 key
          fileSize: file.size,
          grossSalary: grossSalary ? parseFloat(grossSalary) : null,
          netSalary: netSalary ? parseFloat(netSalary) : null,
          notes: notes || null,
          uploadedById: req.user.id,
          uploadedAt: new Date()
        },
        include: {
          employee: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      console.log('✅ Payslip updated:', updated.id);

      return res.json({
        success: true,
        message: 'Payslip updated successfully',
        data: updated
      });
    }

    // Create new payslip
    const payslip = await prisma.payslip.create({
      data: {
        employeeId,
        year: parseInt(year),
        month: parseInt(month),
        fileName: file.originalname,
        fileUrl: r2Key, // Store R2 key
        fileSize: file.size,
        grossSalary: grossSalary ? parseFloat(grossSalary) : null,
        netSalary: netSalary ? parseFloat(netSalary) : null,
        notes: notes || null,
        uploadedById: req.user.id
      },
      include: {
        employee: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    console.log('✅ Payslip created:', payslip.id);

    res.json({
      success: true,
      message: 'Payslip uploaded successfully',
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
  getAllPayslips,
  getMyPayslips,
  downloadPayslip,
  deletePayslip
};