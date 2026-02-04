// backend/src/routes/overtime.routes.js
import express from 'express';
import * as overtimeController from '../controllers/overtime.controller.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import { checkRecapLock } from '../middleware/recapLock.middleware.js';

const router = express.Router();

// ============================================
// EMPLOYEE ROUTES
// ============================================

// Submit new overtime request
router.post('/submit', authenticate, overtimeController.submitOvertimeRequest);

// Get my overtime requests (with filters)
router.get('/my-requests', authenticate, overtimeController.getMyOvertimeRequests);

// Get my overtime balance
router.get('/my-balance', authenticate, overtimeController.getMyOvertimeBalance);

// Edit pending overtime request
router.put('/:requestId', authenticate, overtimeController.editOvertimeRequest);

// Delete pending overtime request
router.delete('/:requestId', authenticate, overtimeController.deleteOvertimeRequest);

// Get single overtime request details
router.get('/:requestId', authenticate, overtimeController.getOvertimeRequestById);

// ============================================
// APPROVER ROUTES
// ============================================

// Get requests pending my approval
router.get('/pending-approval/list', authenticate, overtimeController.getPendingApprovals);

// Approve overtime request
// router.post('/:requestId/approve', authenticate, overtimeController.approveOvertimeRequest);
router.post('/:requestId/approve', authenticate, checkRecapLock, overtimeController.approveOvertimeRequest);

// Reject overtime request
// router.post('/:requestId/reject', authenticate, overtimeController.rejectOvertimeRequest);
router.post('/:requestId/reject', authenticate, checkRecapLock, overtimeController.rejectOvertimeRequest);


// Request revision
router.post('/:requestId/request-revision', authenticate, overtimeController.requestRevision);

// ============================================
// ADMIN/HR ROUTES
// ============================================

// Get all overtime requests (with filters)
router.get('/admin/all-requests', authenticate, overtimeController.getAllOvertimeRequests);

// Process monthly balance (HR processes on 20th/4th week)
router.post('/admin/process-balance', authenticate, overtimeController.processMonthlyBalance);

// Reset employee balance
router.post('/admin/reset-balance/:userId', authenticate, overtimeController.resetEmployeeBalance);

// Get overtime statistics
router.get('/admin/statistics', authenticate, overtimeController.getOvertimeStatistics);

router.post('/:requestId/admin-reject', authenticate, authorizeAdmin, overtimeController.adminRejectApprovedOvertime);

router.put('/:requestId/admin-edit', authenticate, authorizeAdmin, overtimeController.adminEditOvertime);


export default router;