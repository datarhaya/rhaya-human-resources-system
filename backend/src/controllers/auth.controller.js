import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import prisma from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  generateResetToken,
  hashToken,
  verifyToken,
  getTokenExpiration
} from '../services/passwordResetToken.service.js';
import {
  sendPasswordResetEmail,
  sendPasswordChangedEmail
} from '../services/email.service.js';

// Login
export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Find user with subordinates
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        role: true,
        division: true,
        supervisor: {
          select: { id: true, name: true, email: true }
        },
        subordinates: {
          where: {
            employeeStatus: { not: 'INACTIVE' }
          },
          select: { 
            id: true, 
            name: true, 
            email: true,
            accessLevel: true,
            role: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!user || user.employeeStatus === 'Inactive') {
      throw new AppError('Invalid credentials', 401);
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    console.log('🔍 Sending user data:', userWithoutPassword);
    console.log('🔍 Access level:', userWithoutPassword.accessLevel);

    res.json({
      token,
      user: {
        ...userWithoutPassword,
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        accessLevel: user.accessLevel,  // ✅ Make sure this is here
        roleId: user.roleId,
        divisionId: user.divisionId,
        role: user.role,
        division: user.division,
        supervisor: user.supervisor,
        subordinates: user.subordinates
      }
    });
  } catch (error) {
    next(error);
  }
};


// Logout (client-side handles token removal, this is just for logging)
export const logout = async (req, res) => {
  res.json({ message: 'Logged out successfully' });
};

// Get current user
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        role: true,
        division: true,
        supervisor: {
          select: { id: true, name: true, email: true }
        },
        subordinates: {
          where: {
            employeeStatus: { not: 'INACTIVE' }
          },
          select: { 
            id: true, 
            name: true, 
            email: true,
            accessLevel: true,
            role: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
};

// Change password
export const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        password: hashedPassword,
        lastPasswordChange: new Date()
      }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

// Request password reset
export const requestPasswordReset = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Always return success message to prevent email enumeration
    const successMessage = 'If an account with that email exists, a password reset link has been sent.';

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // If user doesn't exist, still return success (security)
    if (!user) {
      console.log(`[Password Reset] Email not found: ${email}`);
      return res.json({ message: successMessage });
    }

    // Check if user is active
    if (user.employeeStatus === 'Inactive') {
      console.log(`[Password Reset] Inactive user attempted reset: ${email}`);
      return res.json({ message: successMessage });
    }

    // Generate secure token
    const plainToken = generateResetToken();
    const hashedToken = await hashToken(plainToken);
    const expiresAt = getTokenExpiration(1); // 1 hour

    // Invalidate any existing unused reset tokens for this user
    await prisma.passwordReset.updateMany({
      where: {
        userId: user.id,
        used: false,
        expiresAt: { gt: new Date() }
      },
      data: { used: true, usedAt: new Date() }
    });

    // Create new reset token record
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt: expiresAt,
        ipAddress: req.ip || req.connection.remoteAddress
      }
    });

    // Send reset email
    try {
      await sendPasswordResetEmail(user, plainToken);
      console.log(`✅ Password reset email sent to: ${user.email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send password reset email: ${emailError.message}`);
      // Don't throw error, still return success message
    }

    res.json({ message: successMessage });
  } catch (error) {
    console.error('Password reset request error:', error);
    next(error);
  }
};

// Verify reset token (optional endpoint for frontend validation)
export const verifyResetToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ 
        valid: false,
        message: 'Token is required' 
      });
    }

    // Find all unused, non-expired tokens
    const resetRecords = await prisma.passwordReset.findMany({
      where: {
        used: false,
        expiresAt: { gt: new Date() }
      },
      include: {
        user: {
          select: { id: true, email: true, employeeStatus: true }
        }
      }
    });

    if (!resetRecords || resetRecords.length === 0) {
      return res.status(400).json({
        valid: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Check each token hash
    for (const record of resetRecords) {
      try {
        const isValid = await verifyToken(token, record.token);
        
        if (isValid) {
          // Check if user is still active
          if (record.user.employeeStatus === 'Inactive') {
            return res.status(400).json({
              valid: false,
              message: 'User account is inactive'
            });
          }

          return res.json({
            valid: true,
            email: record.user.email
          });
        }
      } catch (verifyError) {
        console.error('Token verification error:', verifyError);
        // Continue to next token
        continue;
      }
    }

    // Token not found or invalid
    return res.status(400).json({
      valid: false,
      message: 'Invalid or expired reset token'
    });
  } catch (error) {
    console.error('Verify reset token error:', error);
    return res.status(500).json({
      valid: false,
      message: 'Server error verifying token'
    });
  }
};

// Reset password with token
export const resetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new AppError('Token and new password are required', 400);
    }

    // Find all unused, non-expired tokens
    const resetRecords = await prisma.passwordReset.findMany({
      where: {
        used: false,
        expiresAt: { gt: new Date() }
      },
      include: {
        user: true
      }
    });

    let validRecord = null;

    // Check each token hash
    for (const record of resetRecords) {
      const isValid = await verifyToken(token, record.token);
      
      if (isValid) {
        validRecord = record;
        break;
      }
    }

    if (!validRecord) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    // Check if user is still active
    if (validRecord.user.employeeStatus === 'Inactive') {
      throw new AppError('User account is inactive', 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and mark token as used
    await prisma.$transaction([
      // Update user password
      prisma.user.update({
        where: { id: validRecord.userId },
        data: {
          password: hashedPassword,
          lastPasswordChange: new Date()
        }
      }),
      // Mark token as used
      prisma.passwordReset.update({
        where: { id: validRecord.id },
        data: {
          used: true,
          usedAt: new Date()
        }
      })
    ]);

    // Send confirmation email
    try {
      await sendPasswordChangedEmail(validRecord.user);
      console.log(`✅ Password changed confirmation sent to: ${validRecord.user.email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send password changed email: ${emailError.message}`);
      // Don't throw error, password was changed successfully
    }

    res.json({ 
      message: 'Password reset successfully. You can now log in with your new password.' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    next(error);
  }
};