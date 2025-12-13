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
 * Check if user's role level is <= maximum allowed level
 * REVERSE hierarchy: 1 = highest, 5 = lowest
 * Example: maxLevel=4 allows 1,2,3,4 but excludes 5 (interns)
 */
export const requireMaxRoleLevel = (maxLevel) => {
  return async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { role: true }
      });

      if (!user || !user.role) {
        return res.status(403).json({ message: 'User role not found' });
      }

      // Check if user's role level is <= maximum allowed level
      // Example: maxLevel=4 allows 1,2,3,4 but not 5
      if (user.role.level > maxLevel) {
        return res.status(403).json({ 
          message: `Access denied. Maximum role level ${maxLevel} required.`,
          currentLevel: user.role.level
        });
      }

      req.userRole = user.role;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ message: 'Error checking permissions' });
    }
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

/**
 * Check if user is HR or admin
 */
export const authorizeHR = requireRole([1, 2]);

/**
 * Allow access for level <= 4 (everyone except interns)
 * This allows: Admin(1), Subsidiary(2), Manager(3), Staff(4)
 * Excludes: Intern(5)
 */
export const requireStaffOrAbove = requireMaxRoleLevel(4);

/**
 * Alias for authenticate (backward compatibility)
 */
export const authenticateToken = authenticate;