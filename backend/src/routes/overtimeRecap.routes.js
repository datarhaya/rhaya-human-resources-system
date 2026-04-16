// backend/src/routes/overtimeRecap.routes.js
// Overtime Recap V2 Routes

import express from "express";
import * as overtimeRecapController from "../controllers/overtimeRecap.controller.js";
import { generateRecapPDF } from "../controllers/overtimeRecapPDF.controller.js";
import { generateCombinedRecapPDF } from "../controllers/overtimeRecapCombinedPDF.controller.js";
import { authenticate, requireAdmin, requireRole } from "../middleware/auth.js";

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
  "/check-previous-failures",
  authenticate,
  requireRole([1, 2]),
  overtimeRecapController.checkPreviousFailures,
);

// Send email reminder to all employees
router.post(
  "/send-reminder",
  authenticate,
  requireRole([1, 2]),
  overtimeRecapController.sendReminderEmail,
);

// Bulk recap with date range
router.post(
  "/bulk-recap",
  authenticate,
  requireRole([1, 2]),
  overtimeRecapController.bulkRecap,
);

// Retry only failed employees
router.post(
  "/retry-failed",
  authenticate,
  requireRole([1, 2]),
  overtimeRecapController.retryFailed,
);

// Get failed recaps
router.get(
  "/failed",
  authenticate,
  requireRole([1, 2]),
  overtimeRecapController.getFailedRecaps,
);

router.post(
  "/late-addition",
  authenticate,
  requireRole([1, 2]),
  overtimeRecapController.addLateOvertime,
);

// Manual date adjustment
router.patch(
  "/adjust-date",
  authenticate,
  requireRole([1, 2]),
  overtimeRecapController.adjustRecapDate,
);

// Get date adjustment history (audit log)
router.get(
  "/date-adjustments",
  authenticate,
  requireRole([1, 2]),
  overtimeRecapController.getDateAdjustments,
);

// Get system settings (including last recap date)
router.get(
  "/system-settings",
  authenticate,
  overtimeRecapController.getSystemSettings,
);

// ============================================
// EXISTING ROUTES (ENHANCED)
// ============================================

// Get all recaps (with filters, enhanced with status filter)
router.get(
  "/recap",
  authenticate,
  requireRole([1, 2]),
  overtimeRecapController.getAllRecaps,
);

// Get single recap detail
router.get(
  "/recap/:recapId",
  authenticate,
  requireRole([1, 2]),
  overtimeRecapController.getRecapDetail,
);

// Download recap as PDF (must be accessible by employee or admin)
router.get("/recap/:recapId/pdf", authenticate, generateRecapPDF);

// Download combined PDF for year or all-time
router.get("/combined-pdf", authenticate, generateCombinedRecapPDF);

// Create individual recap for single employee
router.post(
  "/recap",
  authenticate,
  requireRole([1, 2]),
  overtimeRecapController.createIndividualRecap,
);

export default router;
