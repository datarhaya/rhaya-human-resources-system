// backend/src/routes/payslip.routes.js

import express from 'express';
import {
  uploadPayslipController,
  getAllPayslips,
  getMyPayslips,
  downloadPayslip,
  deletePayslip
} from '../controllers/payslip.controller.js';
import { authenticateToken, authorizeHR, requireRole } from '../middleware/auth.js';
import { uploadPayslip as uploadMiddleware } from '../config/upload.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Employee routes
router.get('/my-payslips', getMyPayslips);
router.get('/:payslipId/download', downloadPayslip);

// Admin/HR only routes
router.post('/upload', requireRole([1, 2]), uploadMiddleware.single('file'), uploadPayslipController);
router.get('/', authorizeHR, getAllPayslips);
router.delete('/:payslipId', authorizeHR, deletePayslip);

export default router;