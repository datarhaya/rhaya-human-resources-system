// backend/src/routes/offboarding.routes.js
import express from "express";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";
import {
  createOffboarding,
  getOffboardingByEmployee,
  updateOffboardingChecklist,
  approveOffboarding,
  getAllOffboardings,
  deleteOffboarding,
} from "../controllers/offboarding.controller.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Admin-only routes
router.post("/", authorizeAdmin, createOffboarding);
router.get("/all", authorizeAdmin, getAllOffboardings);
router.delete("/:id", authorizeAdmin, deleteOffboarding);

// Admin or employee can view their own
router.get("/employee/:employeeId", getOffboardingByEmployee);

// Admin-only update
router.put("/:id/checklist", authorizeAdmin, updateOffboardingChecklist);

// Approval routes (different access levels)
router.post("/:id/approve", approveOffboarding);

export default router;
