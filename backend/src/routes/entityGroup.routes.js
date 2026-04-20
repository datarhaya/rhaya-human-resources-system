import express from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import * as entityGroupController from "../controllers/entityGroup.controller.js";

const router = express.Router();

router.use(authenticate);

// Get all groups (Level 2 sees only their scoped groups)
router.get("/", entityGroupController.getAllEntityGroups);

// Get single group
router.get("/:id", entityGroupController.getEntityGroupById);

// Get audit log
router.get(
  "/:id/audit",
  requireRole([1, 2]),
  entityGroupController.getGroupAuditLog,
);

// Level 1 only: Create, update, delete groups
router.post("/", requireRole([1]), entityGroupController.createEntityGroup);
router.put("/:id", requireRole([1]), entityGroupController.updateEntityGroup);
router.delete(
  "/:id",
  requireRole([1]),
  entityGroupController.deleteEntityGroup,
);

// Assign entities to group
router.post(
  "/:id/assign-entities",
  requireRole([1]),
  entityGroupController.assignEntitiesToGroup,
);

export default router;
