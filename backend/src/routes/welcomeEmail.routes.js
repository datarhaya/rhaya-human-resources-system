// backend/src/routes/welcomeEmail.routes.js
// Routes for welcome email distribution

import express from 'express';
import { body } from 'express-validator';
import * as welcomeEmailController from '../controllers/welcomeEmail.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/auth/welcome-stats
 * Get statistics about employees ready for welcome emails
 * Requires: Admin/HR (accessLevel 1-2)
 */
router.get('/welcome-stats', 
  authenticate,
  welcomeEmailController.getWelcomeEmailStats
);

/**
 * POST /api/auth/send-welcome-test
 * Send test welcome email to specific email
 * Requires: Admin/HR (accessLevel 1-2)
 * Body: { email: "test@example.com" }
 */
router.post('/send-welcome-test',
  authenticate,
  [
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail()
  ],
  welcomeEmailController.sendTestWelcomeEmail
);

/**
 * POST /api/auth/send-welcome-all
 * Send welcome emails to ALL active employees
 * Requires: Admin/HR (accessLevel 1-2)
 * 
 * WARNING: This sends emails to all active employees!
 * Test with send-welcome-test first!
 */
router.post('/send-welcome-all',
  authenticate,
  welcomeEmailController.sendWelcomeEmailsToAllEmployees
);

export default router;
