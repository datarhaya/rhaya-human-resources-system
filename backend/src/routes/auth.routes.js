import express from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', 
  [
    body('username').notEmpty().withMessage('Username required'),
    body('password').notEmpty().withMessage('Password required')
  ],
  authController.login
);

// POST /api/auth/logout
router.post('/logout', authenticate, authController.logout);

// GET /api/auth/me - Get current user
router.get('/me', authenticate, authController.getCurrentUser);

// POST /api/auth/change-password
router.post('/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }).withMessage('Password min 8 characters')
  ],
  authController.changePassword
);

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password',
  [
    body('email').isEmail().withMessage('Valid email required')
  ],
  authController.requestPasswordReset
);

// GET /api/auth/verify-reset-token/:token - Verify token validity (optional)
router.get('/verify-reset-token/:token', authController.verifyResetToken);

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password',
  [
    body('token').notEmpty().withMessage('Token required'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password min 8 characters')
  ],
  authController.resetPassword
);

export default router;