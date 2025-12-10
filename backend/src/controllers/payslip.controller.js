// backend/src/controllers/payslip.controller.js
// UPDATED: Move file to final location after upload

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { moveToFinalLocation } from '../config/upload.js';  // ⭐ Import helper

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
      // Delete uploaded temp file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
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

    // ⭐ Move file from temp to final location
    let finalPath;
    try {
      finalPath = moveToFinalLocation(file.path, employeeId, year, month);
    } catch (moveError) {
      console.error('Error moving file:', moveError);
      // Clean up temp file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(500).json({ 
        error: 'Failed to save file',
        message: moveError.message
      });
    }

    if (existing) {
      // Delete old file
      if (fs.existsSync(existing.fileUrl)) {
        fs.unlinkSync(existing.fileUrl);
      }

      // Update existing payslip
      const updated = await prisma.payslip.update({
        where: { id: existing.id },
        data: {
          fileName: file.originalname,
          fileUrl: finalPath,
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
        fileUrl: finalPath,
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
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      error: 'Failed to upload payslip',
      message: error.message
    });
  }
};

// /**
//  * Upload payslip
//  * POST /api/payslips/upload
//  */
// export const uploadPayslip = async (req, res) => {
//   try {
//     const { employeeId, year, month, grossSalary, netSalary, notes } = req.body;
//     const file = req.file;

//     if (!file) {
//       return res.status(400).json({ error: 'No file uploaded' });
//     }

//     // Check if payslip already exists
//     const existing = await prisma.payslip.findUnique({
//       where: {
//         employeeId_year_month: {
//           employeeId,
//           year: parseInt(year),
//           month: parseInt(month)
//         }
//       }
//     });

//     if (existing) {
//       // Delete old file
//       if (fs.existsSync(existing.fileUrl)) {
//         fs.unlinkSync(existing.fileUrl);
//       }

//       // Update existing payslip
//       const updated = await prisma.payslip.update({
//         where: { id: existing.id },
//         data: {
//           fileName: file.originalname,
//           fileUrl: file.path,
//           fileSize: file.size,
//           grossSalary: grossSalary ? parseFloat(grossSalary) : null,
//           netSalary: netSalary ? parseFloat(netSalary) : null,
//           notes: notes || null,
//           uploadedById: req.user.id,
//           uploadedAt: new Date()
//         },
//         include: {
//           employee: {
//             select: { id: true, name: true, email: true }
//           }
//         }
//       });

//       return res.json({
//         success: true,
//         message: 'Payslip updated successfully',
//         data: updated
//       });
//     }

//     // Create new payslip
//     const payslip = await prisma.payslip.create({
//       data: {
//         employeeId,
//         year: parseInt(year),
//         month: parseInt(month),
//         fileName: file.originalname,
//         fileUrl: file.path,
//         fileSize: file.size,
//         grossSalary: grossSalary ? parseFloat(grossSalary) : null,
//         netSalary: netSalary ? parseFloat(netSalary) : null,
//         notes: notes || null,
//         uploadedById: req.user.id
//       },
//       include: {
//         employee: {
//           select: { id: true, name: true, email: true }
//         }
//       }
//     });

//     res.json({
//       success: true,
//       message: 'Payslip uploaded successfully',
//       data: payslip
//     });

//   } catch (error) {
//     console.error('Upload payslip error:', error);
//     res.status(500).json({
//       error: 'Failed to upload payslip',
//       message: error.message
//     });
//   }
// };

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
    // Allow if: own payslip OR admin/HR (level 1-2)
    const isOwnPayslip = payslip.employeeId === userId;
    const isAdminOrHR = req.user.accessLevel <= 2;

    if (!isOwnPayslip && !isAdminOrHR) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(payslip.fileUrl)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Update view count
    await prisma.payslip.update({
      where: { id: payslipId },
      data: {
        viewCount: { increment: 1 },
        viewedAt: new Date()
      }
    });

    // Send file
    res.download(payslip.fileUrl, payslip.fileName);

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

    // Delete file from disk
    if (fs.existsSync(payslip.fileUrl)) {
      fs.unlinkSync(payslip.fileUrl);
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