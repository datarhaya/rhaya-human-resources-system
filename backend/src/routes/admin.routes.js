import express from "express";
import { body } from "express-validator";
import * as adminController from "../controllers/admin.controller.js";
import { requireRole } from "../middleware/auth.js";

const router = express.Router();
// backend/src/routes/admin.routes.js
router.put(
  "/users/:userId/scope",
  authenticate,
  requireRole(1, 2),
  assignScopeToAdmin,
);

export default router;
