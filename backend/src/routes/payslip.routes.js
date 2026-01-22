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
  deletePayslip
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

// Delete payslip
router.delete('/:payslipId', 
  authorizeHR, 
  deletePayslip
);

export default router;