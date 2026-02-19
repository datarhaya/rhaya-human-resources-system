// backend/src/routes/payslip.routes.js

import express from 'express';
import {
  uploadPayslipController,
  batchUploadPayslips,
  sendPayslipNotification,
  notifyAllForMonth,
  getAllPayslips,
  getMyPayslips,
  downloadPayslip,
  generateFromExcel,
  deletePayslip,
  detectSheets,         
  generatePreview,      
  confirmUpload,        
} from '../controllers/payslip.controller.js';
import { authenticateToken, authorizeHR, requireRole } from '../middleware/auth.js';
import { uploadPayslip as uploadMiddleware, uploadGeneric } from '../config/upload.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ============================================
// EMPLOYEE ROUTES
// ============================================

// Get my payslips
router.get('/my-payslips', getMyPayslips);

// Generate payslips from Excel (bulk generate + upload + notify)
router.post(
  '/generate-from-excel',
  requireRole([1, 2]),
  uploadGeneric.single('file'),   // uploadGeneric already imported in your routes file
  generateFromExcel
);

// Download payslip
router.get('/:payslipId/download', downloadPayslip);

// ============================================
// ADMIN/HR ROUTES
// ============================================

// Upload single payslip
router.post('/upload', 
  requireRole([1, 2]), 
  uploadMiddleware.single('file'), 
  uploadPayslipController
);

// Batch upload payslips (multiple files, same month)
router.post('/batch-upload', 
  requireRole([1, 2]), 
  uploadGeneric.array('files', 100), // Allow up to 100 files
  batchUploadPayslips
);

// Send notification for specific payslip (manual trigger)
router.post('/:payslipId/notify', 
  requireRole([1, 2]), 
  sendPayslipNotification
);

// Send notifications to all employees for a specific month (blast)
router.post('/notify-all', 
  requireRole([1, 2]), 
  notifyAllForMonth
);

// Get all payslips
router.get('/', 
  authorizeHR, 
  getAllPayslips
);

// Detect sheet names from uploaded Excel
router.post(
  '/detect-sheets',
  requireRole([1, 2]),
  uploadGeneric.single('file'),
  detectSheets
);

// Generate preview from selected sheet (parse + generate PDFs, no upload)
router.post(
  '/generate-preview',
  requireRole([1, 2]),
  uploadGeneric.single('file'),
  generatePreview
);

// Confirm and upload selected payslips (encrypt + R2 + email)
router.post(
  '/confirm-upload',
  requireRole([1, 2]),
  confirmUpload
);

// Delete payslip
router.delete('/:payslipId', 
  authorizeHR, 
  deletePayslip
);

export default router;