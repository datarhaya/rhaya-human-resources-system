// backend/src/routes/plottingCompany.routes.js
import express from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import {
  getAllPlottingCompanies,
  getPlottingCompanyById,
  createPlottingCompany,
  updatePlottingCompany,
  deletePlottingCompany
} from '../controllers/plottingCompany.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all plotting companies (accessible to all authenticated users)
router.get('/', getAllPlottingCompanies);

// Get single plotting company
router.get('/:id', getPlottingCompanyById);

// Admin-only routes
router.post('/create', authorizeAdmin, createPlottingCompany);
router.put('/:id', authorizeAdmin, updatePlottingCompany);
router.delete('/:id', authorizeAdmin, deletePlottingCompany);

export default router;