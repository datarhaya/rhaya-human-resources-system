import express from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import {
  loginLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  changePasswordLimiter
} from '../middleware/rateLimiter.js';
import { passwordValidatorMiddleware } from '../utils/passwordValidator.js';

const router = express.Router();

// POST /api/auth/login - With rate limiting
router.post('/login', 
  loginLimiter,  // 5 attempts per 15 minutes
  [
    body('identifier')
      .notEmpty().withMessage('NIP or Email is required')
      .trim(),
    body('password')
      .notEmpty().withMessage('Password is required')
  ],
  authController.login
);

// POST /api/auth/logout
router.post('/logout', authenticate, authController.logout);

// GET /api/auth/me - Get current user
router.get('/me', authenticate, authController.getCurrentUser);

// POST /api/auth/change-password - With rate limiting and strong password validation
router.post('/change-password',
  authenticate,
  changePasswordLimiter,  // 10 attempts per hour
  [
    body('currentPassword')
      .notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .notEmpty().withMessage('New password is required')
      .custom(passwordValidatorMiddleware)  // Strong password validation
  ],
  authController.changePassword
);

// POST /api/auth/forgot-password - With rate limiting
router.post('/forgot-password',
  forgotPasswordLimiter,  // 3 attempts per hour
  [
    body('email')
      .isEmail().withMessage('Valid email is required')
      .normalizeEmail()
  ],
  authController.requestPasswordReset
);

// GET /api/auth/verify-reset-token/:token - Verify token validity
router.get('/verify-reset-token/:token', authController.verifyResetToken);

// POST /api/auth/reset-password - With rate limiting and strong password validation
router.post('/reset-password',
  resetPasswordLimiter,  // 5 attempts per hour
  [
    body('token')
      .notEmpty().withMessage('Token is required'),
    body('newPassword')
      .notEmpty().withMessage('New password is required')
      .custom(passwordValidatorMiddleware)  // Strong password validation
  ],
  authController.resetPassword
);

export default router;