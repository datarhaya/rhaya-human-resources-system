// backend/src/routes/division.routes.js
import express from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import {
  getAllDivisions,
  getDivisionById,
  createDivision,
  updateDivision,
  deleteDivision
} from '../controllers/division.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all divisions (accessible to all authenticated users)
router.get('/', getAllDivisions);

// Get single division
router.get('/:id', getDivisionById);

// Admin-only routes
router.post('/create', authorizeAdmin, createDivision);
router.put('/:id', authorizeAdmin, updateDivision);
router.delete('/:id', authorizeAdmin, deleteDivision);

export default router;