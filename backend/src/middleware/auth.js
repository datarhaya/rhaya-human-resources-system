// backend/src/middleware/auth.js

import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        division: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const authorizeAdmin = (req, res, next) => {
  // Check if user is System Administrator (Level 1)
  if (req.user.accessLevel !== 1) {
    return res.status(403).json({
      error: "Access denied. System Administrator only.",
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
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!allowedLevels.includes(req.user.accessLevel)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        required: allowedLevels,
        current: req.user.accessLevel,
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
        include: { role: true },
      });

      if (!user || !user.role) {
        return res.status(403).json({ message: "User role not found" });
      }

      // Check if user's role level is <= maximum allowed level
      // Example: maxLevel=4 allows 1,2,3,4 but not 5
      if (user.role.level > maxLevel) {
        return res.status(403).json({
          message: `Access denied. Maximum role level ${maxLevel} required.`,
          currentLevel: user.role.level,
        });
      }

      req.userRole = user.role;
      next();
    } catch (error) {
      console.error("Role check error:", error);
      res.status(500).json({ message: "Error checking permissions" });
    }
  };
};

/**
 * Middleware to restrict inactive users from certain routes
 * Inactive = employeeStatus === 'INACTIVE'
 */
export const requireActiveUser = (req, res, next) => {
  if (req.user.employeeStatus === "INACTIVE") {
    return res.status(403).json({
      error: "Account is inactive",
      message:
        "Your account has been deactivated. You can only access payslips and profile information.",
    });
  }
  next();
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
