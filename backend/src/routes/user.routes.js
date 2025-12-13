// backend/src/routes/user.routes.js
import express from 'express';
import { authenticate, authorizeAdmin, requireStaffOrAbove } from '../middleware/auth.js';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  permanentDeleteUser,
  adjustUserBalance,
  getUserProfile,
  updateUserProfile,
  hasSubordinates
} from '../controllers/user.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// PROFILE ROUTES (Available to all authenticated users)
router.get('/profile', getUserProfile);           
router.put('/profile', updateUserProfile);        

// Get all users
router.get('/', authorizeAdmin, getAllUsers);

// Check if user has subordinates
router.get('/has-subordinates', authenticate, hasSubordinates);

// Get single user
router.get('/:userId', authorizeAdmin, getUserById);

// Create user
router.post('/create', authorizeAdmin, createUser);

// Update user
router.put('/:userId', authorizeAdmin, updateUser);

// Soft delete (deactivate)
router.put('/:userId/deactivate', authorizeAdmin, deactivateUser);

// Hard delete (permanent)
router.delete('/:userId/permanent', authorizeAdmin, permanentDeleteUser);

// Adjust balance
router.post('/:userId/adjust-balance', authorizeAdmin, adjustUserBalance);

export default router;