// backend/src/routes/leave.routes.js
import express from "express";
import {
  authenticate,
  authorizeAdmin,
  requireActiveUser,
  requireRole,
} from "../middleware/auth.js";
import {
  submitLeaveRequest,
  getMyLeaveRequests,
  getMyLeaveBalance,
  getPendingApprovalList,
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  getLeaveRequestDetails,
  deleteLeaveRequest,
  getLeaveBalanceByYear,
  cancelLeaveRequest,
  getAttachmentDownloadUrl,
} from "../controllers/leave.controller.js";
import { uploadDocument } from "../config/upload.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Employee routes
router.post(
  "/submit",
  uploadDocument.array("attachmentFiles", 5),
  requireActiveUser,
  submitLeaveRequest,
);
router.get("/my-requests", getMyLeaveRequests);
router.get("/my-balance", getMyLeaveBalance);
router.get("/:requestId", getLeaveRequestDetails);
router.get("/:requestId/attachment/:attachmentIndex", getAttachmentDownloadUrl);
router.delete("/:requestId", requireActiveUser, deleteLeaveRequest);
router.post("/:requestId/cancel", requireActiveUser, cancelLeaveRequest);

// Approver routes (Level 1-4)
router.get("/pending-approval/list", getPendingApprovalList);
router.post("/:requestId/approve", approveLeaveRequest);
router.post("/:requestId/reject", rejectLeaveRequest);

// Admin routes (Level 1)
router.get("/admin/all-requests", requireRole([1, 2]), getAllLeaveRequests);

router.get("/balance/:year", authenticate, getLeaveBalanceByYear);

export default router;
