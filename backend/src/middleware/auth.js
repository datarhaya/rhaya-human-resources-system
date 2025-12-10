// backend/src/middleware/auth.js

import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header: "Bearer <token>"
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: true,
        division: true
      }
    });
    
    if (!user || user.employeeStatus === 'Inactive') {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    
    // Attach user to request (remove password)
    const { password, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    next(error);
  }
};

export const authorizeAdmin = (req, res, next) => {
  // Check if user is System Administrator (Level 1)
  if (req.user.accessLevel !== 1) {
    return res.status(403).json({ 
      error: 'Access denied. System Administrator only.' 
    });
  }
  next();
};

/**
 * Check if user has required access level
 * Usage: requireRole([1, 2]) - allows access level 1 or 2
 */
export const requireRole = (allowedLevels) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!allowedLevels.includes(req.user.accessLevel)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedLevels,
        current: req.user.accessLevel
      });
    }
    
    next();
  };
};

/**
 * Check if user is admin (level 1)
 */
export const requireAdmin = requireRole([1]);

/**
 * Check if user can manage (admin or subsidiary manager)
 */
export const requireManager = requireRole([1, 2, 3]);

export const authorizeHR = requireRole([1, 2]);
export const authenticateToken = authenticate;
