import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import prisma from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

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
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};