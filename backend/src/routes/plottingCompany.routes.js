// backend/src/routes/plottingCompany.routes.js
import express from "express";
import {
  authenticate,
  authorizeAdmin,
  requireRole,
  authorizeHR,
} from "../middleware/auth.js";
import {
  getAllPlottingCompanies,
  getPlottingCompanyById,
  createPlottingCompany,
  updatePlottingCompany,
  deletePlottingCompany,
} from "../controllers/plottingCompany.controller.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all plotting companies (accessible to all authenticated users)
router.get("/", getAllPlottingCompanies);

// Get single plotting company
router.get("/:id", getPlottingCompanyById);

// Admin-only routes
router.post("/create", requireRole([1]), createPlottingCompany); // TODO confirm if level 2 can create entity
router.put("/:id", requireRole([1, 2]), updatePlottingCompany);
router.delete("/:id", requireRole([1, 2]), deletePlottingCompany);

export default router;
