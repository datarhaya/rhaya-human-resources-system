// backend/src/routes/overtimeRecap.routes.js
// Overtime Recap V2 Routes

import express from 'express';
import * as overtimeRecapController from '../controllers/overtimeRecap.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// // Middleware to check Admin/HR access (Level 1-2)
// const requireAdmin = (req, res, next) => {
//   if (req.user.accessLevel > 2) {
//     return res.status(403).json({ 
//       error: 'Access denied. Admin/HR only.' 
//     });
//   }
//   next();
// };

// ============================================
// V2 NEW ROUTES
// ============================================

// Check previous failures before starting new recap
router.get(
  '/check-previous-failures', 
  authenticate, 
  requireAdmin, 
  overtimeRecapController.checkPreviousFailures
);

// Send email reminder to all employees
router.post(
  '/send-reminder', 
  authenticate, 
  requireAdmin, 
  overtimeRecapController.sendReminderEmail
);

// Bulk recap with date range
router.post(
  '/bulk-recap', 
  authenticate, 
  requireAdmin, 
  overtimeRecapController.bulkRecap
);

// Retry only failed employees
router.post(
  '/retry-failed', 
  authenticate, 
  requireAdmin, 
  overtimeRecapController.retryFailed
);

// Get failed recaps
router.get(
  '/failed', 
  authenticate, 
  requireAdmin, 
  overtimeRecapController.getFailedRecaps
);

// Manual date adjustment
router.patch(
  '/adjust-date', 
  authenticate, 
  requireAdmin, 
  overtimeRecapController.adjustRecapDate
);

// Get date adjustment history (audit log)
router.get(
  '/date-adjustments', 
  authenticate, 
  requireAdmin, 
  overtimeRecapController.getDateAdjustments
);

// Get system settings (including last recap date)
router.get(
  '/system-settings', 
  authenticate, 
  overtimeRecapController.getSystemSettings
);

// ============================================
// EXISTING ROUTES (ENHANCED)
// ============================================

// Get all recaps (with filters, enhanced with status filter)
router.get(
  '/recap', 
  authenticate, 
  requireAdmin, 
  overtimeRecapController.getAllRecaps
);

// Get single recap detail
router.get(
  '/recap/:recapId', 
  authenticate, 
  requireAdmin, 
  overtimeRecapController.getRecapDetail
);

// Create individual recap for single employee
router.post(
  '/recap', 
  authenticate, 
  requireAdmin, 
  overtimeRecapController.createIndividualRecap
);

export default router;