// backend/src/routes/overtimeRecap.routes.js

import express from 'express';
import {
  createOvertimeRecap,
  bulkCreateRecap,
  getAllRecaps,
  getRecapDetail,
  getMyRecaps,
  expireOldToil,
  getToilBalance
} from '../controllers/overtimeRecap.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Employee routes
router.get('/my-recaps', getMyRecaps);
router.get('/toil/balance/:employeeId', getToilBalance);

// Admin/HR only routes
router.post('/recap', requireRole([1, 2]), createOvertimeRecap);
router.post('/bulk-recap', requireRole([1, 2]), bulkCreateRecap);
router.get('/recap', requireRole([1, 2]), getAllRecaps);
router.get('/recap/:recapId', requireRole([1, 2]), getRecapDetail);
router.post('/toil/expire', requireRole([1, 2]), expireOldToil);

export default router;