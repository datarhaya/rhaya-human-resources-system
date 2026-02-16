// backend/src/controllers/leave.controller.js
import prisma from '../config/database.js';
import leaveService from '../services/leave.service.js';
import { 
  sendLeaveRequestNotification,
  sendLeaveApprovedEmail,
  sendLeaveRejectedEmail,
  sendLeaveCancellationEmail
} from '../services/email.service.js';
import { uploadDocument as uploadToR2Storage } from '../config/storage.js';

/**
 * Submit leave request
 * POST /api/leave/submit
 */
export const submitLeaveRequest = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { leaveType, startDate, endDate, totalDays, reason, attachmentUrl } = req.body;
    const files = req.files; // Array of uploaded files from multer

    // Parse totalDays to number (comes as string from FormData)
    const totalDaysNumber = parseFloat(totalDays);

    // Validate required fields
    if (!leaveType ) {
      return res.status(400).json({
        error: 'Missing required leaveType field'
      });
    }
    if (!startDate) {
      return res.status(400).json({
        error: 'Missing required startDate field'
      });
    }
    if (!endDate) {
      return res.status(400).json({
        error: 'Missing required endDate field'
      });
    }
    if (!totalDays || isNaN(totalDaysNumber)) {
      return res.status(400).json({
        error: 'Missing required totalDays field'
      });
    }
    if (!reason) {
      return res.status(400).json({
        error: 'Missing required reason field'
      });
    }

    // Validate attachment for sick leave > 2 days (optional for ≤2 days)
    if (leaveType === 'SICK_LEAVE' && totalDaysNumber > 2) {
      if (!files?.length && !attachmentUrl) {
        return res.status(400).json({
          success: false,
          error: 'Surat keterangan dokter diperlukan untuk cuti sakit lebih dari 2 hari',
          details: ['Surat keterangan dokter diperlukan untuk cuti sakit lebih dari 2 hari']
        });
      }
    }

    // Upload files to R2 if provided
    const attachmentData = [];
    
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const r2Key = await uploadToR2Storage(
            file.buffer,
            employeeId,
            'sick-leave',
            `sick_leave_${Date.now()}`,
            file.originalname
          );
          
          attachmentData.push({
            type: 'FILE',
            path: r2Key,
            filename: file.originalname,
            size: file.size,
            mimeType: file.mimetype
          });
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          return res.status(500).json({
            error: 'Failed to upload attachment'
          });
        }
      }
    }
    
    // Add URL if provided
    if (attachmentUrl) {
      attachmentData.push({
        type: 'URL',
        url: attachmentUrl
      });
    }

    // Get employee
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      include: {
        division: true,
        supervisor: true
      }
    });

    // Validate the leave request
    const errors = await leaveService.validateLeaveRequest(
      employeeId,
      leaveType,
      startDate,
      endDate,
      totalDaysNumber  // Use parsed number
    );

    if (errors.length > 0) {
      console.log('Validation errors:', errors);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    // Determine approver
    const approverId = await leaveService.determineLeaveApprover(employee);

    // Create leave request with attachments
    const leaveRequest = await leaveService.createLeaveRequest({
      employeeId,
      leaveType,
      startDate,
      endDate,
      totalDays: totalDaysNumber,  // Use parsed number
      reason,
      attachment: JSON.stringify(attachmentData), // Store as JSON
      approverId,
      supervisorId: employee.supervisorId
    });

    // Send email notification
    try {
      const approver = await prisma.user.findUnique({
        where: { id: approverId },
        select: { id: true, name: true, email: true }
      });

      if (approver && approver.email) {
        const employeeWithRole = await prisma.user.findUnique({
          where: { id: employeeId },
          include: {
            role: true,
            division: true
          }
        });

        await sendLeaveRequestNotification(approver, leaveRequest, employeeWithRole);
        console.log('Leave request notification sent to:', approver.email);
      }
    } catch (emailError) {
      console.error('Email notification failed:', emailError.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: leaveRequest
    });
  } catch (error) {
    console.error('Submit leave error:', error);
    return res.status(500).json({
      error: 'Failed to submit leave request',
      message: error.message
    });
  }
};

/**
 * Get my leave requests
 * GET /api/leave/my-requests
 */
export const getMyLeaveRequests = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { status } = req.query;

    const where = { employeeId };
    if (status) {
      where.status = status;
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        currentApprover: {
          select: { id: true, name: true, email: true }
        },
        supervisor: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Get leave requests error:', error);
    return res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
};

/**
 * Cancel approved leave request
 * POST /api/leave/:requestId/cancel
 */
export const cancelLeaveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    console.log(`[Cancel Leave] User ${userId} attempting to cancel leave ${requestId}`);

    // Get leave request with all relationships
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: {
          include: {
            division: true,
            role: true,
            supervisor: true
          }
        },
        currentApprover: {
          select: { id: true, name: true, email: true }
        },
        supervisor: {
          select: { id: true, name: true, email: true }
        },
        divisionHead: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!leaveRequest) {
      return res.status(404).json({ 
        success: false,
        error: 'Leave request not found' 
      });
    }

    // Check 1: Only employee can cancel their own leave
    if (leaveRequest.employeeId !== userId) {
      return res.status(403).json({ 
        success: false,
        error: 'Only the employee can cancel their own leave request'
      });
    }

    // Check 2: Only APPROVED leaves can be cancelled
    if (leaveRequest.status !== 'APPROVED') {
      return res.status(400).json({ 
        success: false,
        error: 'Only approved leaves can be cancelled',
        currentStatus: leaveRequest.status
      });
    }

    // Check 3: Cannot cancel leave that has already started
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const leaveStart = new Date(leaveRequest.startDate);
    leaveStart.setHours(0, 0, 0, 0); // Start of leave date
    
    if (leaveStart <= today) {
      return res.status(400).json({ 
        success: false,
        error: 'Cannot cancel leave that has already started or is in the past',
        leaveStartDate: leaveRequest.startDate
      });
    }

    console.log(`All validations passed. Cancelling leave...`);

    // Update leave status to CANCELLED
    const updatedLeave = await prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason || 'Cancelled by employee'
      },
      include: {
        employee: {
          include: {
            division: true,
            role: true
          }
        }
      }
    });

    console.log(`Leave status updated to CANCELLED`);

    // Restore leave balance (only for paid leave types)
    if (leaveRequest.leaveType === 'ANNUAL_LEAVE') {
      try {
        await leaveService.restoreLeaveBalance(
          leaveRequest.employeeId,
          leaveRequest.totalDays,
          new Date(leaveRequest.startDate).getFullYear()
        );
        console.log(`Leave balance restored: ${leaveRequest.totalDays} days`);
      } catch (balanceError) {
        console.error('Failed to restore leave balance:', balanceError);
        // Don't fail the cancellation if balance restoration fails
      }
    }

    // Send cancellation notification emails
    try {
      await sendLeaveCancellationEmail(
        leaveRequest.employee,
        leaveRequest,
        reason || 'No reason provided',
        [
          leaveRequest.currentApprover?.email,
          leaveRequest.supervisor?.email,
          leaveRequest.divisionHead?.email
        ].filter(email => email) // Remove null/undefined emails
      );
      console.log(`Cancellation notification emails sent`);
    } catch (emailError) {
      console.error('Failed to send cancellation emails:', emailError);
      // Don't fail the cancellation if email fails
    }

    return res.status(200).json({
      success: true,
      message: 'Leave cancelled successfully',
      data: updatedLeave
    });

  } catch (error) {
    console.error('Cancel leave error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to cancel leave request',
      message: error.message
    });
  }
};

/**
 * Get my leave balance
 * GET /api/leave/my-balance
 */
export const getMyLeaveBalance = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const employee = await prisma.user.findUnique({
      where: { id: employeeId }
    });

    const balance = await leaveService.getOrCreateLeaveBalance(
      employeeId,
      employee.joinDate
    );

    return res.json({
      success: true,
      data: balance
    });
  } catch (error) {
    console.error('Get leave balance error:', error);
    return res.status(500).json({ error: 'Failed to fetch leave balance' });
  }
};

/**
 * Get pending approval list (for approvers)
 * GET /api/leave/pending-approval/list
 */
export const getPendingApprovalList = async (req, res) => {
  try {
    const approverId = req.user.id;
    const userLevel = req.user.accessLevel;

    let requests;

    if (userLevel === 1) {
      // Admin can see all pending requests
      requests = await prisma.leaveRequest.findMany({
        where: { status: 'PENDING' },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              email: true,
              nip: true,
              division: true,
              role: true
            }
          },
          currentApprover: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Others see only requests assigned to them
      requests = await prisma.leaveRequest.findMany({
        where: {
          status: 'PENDING',
          currentApproverId: approverId
        },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              email: true,
              nip: true,
              division: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    return res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
};

/**
 * Get all leave requests (admin only)
 * GET /api/leave/admin/all-requests
 */
export const getAllLeaveRequests = async (req, res) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            nip: true,
            division: true,
            role: true
          }
        },
        currentApprover: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Get all requests error:', error);
    return res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
};

/**
 * Approve leave request
 * POST /api/leave/:requestId/approve
 */
export const approveLeaveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { comment } = req.body;
    const approverId = req.user.id;
    const approverLevel = req.user.accessLevel;

    // ── DEBUG LOG ──────────────────────────────────────────────────
    console.log(`[Approve] ====== START ======`);
    console.log(`[Approve] requestId:      ${requestId}`);
    console.log(`[Approve] approverId:     ${approverId}`);
    console.log(`[Approve] approverLevel:  ${approverLevel}`);
    // ───────────────────────────────────────────────────────────────

    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: {
          include: {
            supervisor: true,
            division: true
          }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    // ── DEBUG LOG ──────────────────────────────────────────────────
    console.log(`[Approve] --- Request state from DB ---`);
    console.log(`[Approve] status:              ${request.status}`);
    console.log(`[Approve] supervisorId:        ${request.supervisorId}`);
    console.log(`[Approve] supervisorStatus:    ${request.supervisorStatus}`);
    console.log(`[Approve] currentApproverId:   ${request.currentApproverId}`);
    console.log(`[Approve] division.headId:     ${request.employee.division?.headId}`);
    console.log(`[Approve] divisionHeadStatus:  ${request.divisionHeadStatus}`);
    console.log(`[Approve] isAdmin:             ${approverLevel === 1}`);
    console.log(`[Approve] isCurrentApprover:   ${request.currentApproverId === approverId}`);
    // ───────────────────────────────────────────────────────────────

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    // Authorization check
    const isAdmin = approverLevel === 1;
    const isCurrentApprover = request.currentApproverId === approverId;

    if (!isAdmin && !isCurrentApprover) {
      return res.status(403).json({
        error: 'You are not authorized to approve this request'
      });
    }

    // Determine next approver or final approval
    let updateData = {};

    const isSupervisorStage = request.supervisorId && request.supervisorStatus !== 'APPROVED';
    const isDivisionHeadStage = request.employee.division?.headId && request.divisionHeadStatus !== 'APPROVED';

    // ── DEBUG LOG ──────────────────────────────────────────────────
    console.log(`[Approve] --- Stage detection ---`);
    console.log(`[Approve] isSupervisorStage:   ${isSupervisorStage}`);
    console.log(`[Approve] isDivisionHeadStage: ${isDivisionHeadStage}`);
    // ───────────────────────────────────────────────────────────────

    if (isSupervisorStage) {
      const divisionHeadId = request.employee.division?.headId || null;
      const needsDivisionHeadApproval = divisionHeadId && divisionHeadId !== approverId;

      // ── DEBUG LOG ────────────────────────────────────────────────
      console.log(`[Approve] STAGE: Supervisor`);
      console.log(`[Approve] divisionHeadId:          ${divisionHeadId}`);
      console.log(`[Approve] needsDivisionHeadApproval: ${needsDivisionHeadApproval}`);
      // ─────────────────────────────────────────────────────────────

      updateData = {
        supervisorStatus: 'APPROVED',
        supervisorComment: comment || null,
        supervisorDate: new Date(),
        status: needsDivisionHeadApproval ? 'PENDING' : 'APPROVED',
        currentApproverId: needsDivisionHeadApproval ? divisionHeadId : approverId,
        approvedAt: needsDivisionHeadApproval ? null : new Date()
      };
    } else if (isDivisionHeadStage) {
      // ── DEBUG LOG ────────────────────────────────────────────────
      console.log(`[Approve] STAGE: Division Head`);
      // ─────────────────────────────────────────────────────────────

      updateData = {
        divisionHeadStatus: 'APPROVED',
        divisionHeadComment: comment || null,
        divisionHeadDate: new Date(),
        status: 'APPROVED',
        currentApproverId: approverId,
        approvedAt: new Date()
      };
    } else {
      // ── DEBUG LOG ────────────────────────────────────────────────
      console.log(`[Approve] STAGE: Direct / Admin override`);
      // ─────────────────────────────────────────────────────────────

      updateData = {
        status: 'APPROVED',
        approvedAt: new Date(),
        currentApproverId: approverId,
        supervisorStatus: 'APPROVED',
        supervisorComment: comment || 'Approved by Admin',
        supervisorDate: new Date()
      };
    }

    // ── DEBUG LOG ──────────────────────────────────────────────────
    console.log(`[Approve] --- updateData ---`);
    console.log(`[Approve]`, JSON.stringify(updateData, null, 2));
    // ───────────────────────────────────────────────────────────────

    const updatedRequest = await prisma.leaveRequest.update({
      where: { id: requestId },
      data: updateData,
      include: {
        employee: true,
        currentApprover: true
      }
    });

    // ── DEBUG LOG ──────────────────────────────────────────────────
    console.log(`[Approve] --- After DB update ---`);
    console.log(`[Approve] final status:     ${updatedRequest.status}`);
    console.log(`[Approve] final approverId: ${updatedRequest.currentApproverId}`);
    console.log(`[Approve] approvedAt:       ${updatedRequest.approvedAt}`);
    console.log(`[Approve] ====== END ======`);
    // ───────────────────────────────────────────────────────────────

    // Update leave balance if approved
    if (updatedRequest.status === 'APPROVED') {
      await leaveService.updateLeaveBalance(updatedRequest);
      
      // Send approval email to employee
      try {
        const employee = await prisma.user.findUnique({
          where: { id: updatedRequest.employeeId },
          include: {
            role: true,
            division: true
          }
        });

        const approver = await prisma.user.findUnique({
          where: { id: approverId },
          select: { name: true }
        });

        if (employee && employee.email) {
          await sendLeaveApprovedEmail(employee, updatedRequest, approver.name);
          console.log('✅ Leave approval email sent to:', employee.email);
        }
      } catch (emailError) {
        // Don't fail the request if email fails
        console.error('⚠️ Leave approval email failed:', emailError.message);
      }
      try {
        const { sendImmediateLeaveReminder } = await import('../services/leaveReminder.service.js');
        await sendImmediateLeaveReminder(updatedRequest.id);
      } catch (reminderError) {
        console.error('⚠️ Leave reminder failed:', reminderError.message);
      }

    }

    return res
      .set('Cache-Control', 'no-store, no-cache, must-revalidate')
      .set('Pragma', 'no-cache')
      .json({
        success: true,
        message: 'Leave request approved successfully',
        data: updatedRequest
      });
  } catch (error) {
    console.error('Approve leave error:', error);
    return res.status(500).json({ error: 'Failed to approve leave request' });
  }
};


/**
 * Reject leave request
 * POST /api/leave/:requestId/reject
 */
export const rejectLeaveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { comment } = req.body;
    const approverId = req.user.id;
    const approverLevel = req.user.accessLevel;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment is required for rejection' });
    }

    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: {
          include: { division: true }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Can only reject pending requests' });
    }

    // Authorization check
    const isAdmin = approverLevel === 1;
    const isCurrentApprover = request.currentApproverId === approverId;

    if (!isAdmin && !isCurrentApprover) {
      return res.status(403).json({
        error: 'You are not authorized to reject this request'
      });
    }

    let updateData = {
      status: 'REJECTED',
      rejectedAt: new Date(),
      currentApproverId: approverId  
    };

    // Log rejection in appropriate field
    if (request.supervisorId && !request.supervisorDate) {
      updateData.supervisorStatus = 'REJECTED';
      updateData.supervisorComment = comment;
      updateData.supervisorDate = new Date();
    } else if (request.employee.division?.headId && !request.divisionHeadDate) {
      updateData.divisionHeadStatus = 'REJECTED';
      updateData.divisionHeadComment = comment;
      updateData.divisionHeadDate = new Date();
    } else if (isAdmin) {
      updateData.supervisorStatus = 'REJECTED';
      updateData.supervisorComment = comment;
      updateData.supervisorDate = new Date();
    }

    const updatedRequest = await prisma.leaveRequest.update({
      where: { id: requestId },
      data: updateData,
      include: {
        employee: true,
        currentApprover: true
      }
    });

    // Send rejection email to employee
    try {
      const employee = await prisma.user.findUnique({
        where: { id: updatedRequest.employeeId },
        include: {
          role: true,
          division: true
        }
      });

      const approver = await prisma.user.findUnique({
        where: { id: approverId },
        select: { name: true }
      });

      if (employee && employee.email) {
        await sendLeaveRejectedEmail(employee, updatedRequest, comment, approver.name);
        console.log('Leave rejection email sent to:', employee.email);
      }
    } catch (emailError) {
      // Don't fail the request if email fails
      console.error('Leave rejection email failed:', emailError.message);
    }

    return res.json({
      success: true,
      message: 'Leave request rejected',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Reject leave error:', error);
    return res.status(500).json({ error: 'Failed to reject leave request' });
  }
};

/**
 * Get leave request details
 * GET /api/leave/:requestId
 */
export const getLeaveRequestDetails = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;
    const userLevel = req.user.accessLevel;

    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            nip: true,
            division: true,
            role: true
          }
        },
        currentApprover: {
          select: { id: true, name: true, email: true }
        },
        supervisor: {
          select: { id: true, name: true }
        },
        divisionHead: {
          select: { id: true, name: true }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    // Check authorization
    const isOwner = request.employeeId === userId;
    const isApprover = request.currentApproverId === userId;
    const isAdmin = userLevel === 1;

    if (!isOwner && !isApprover && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to view this request' });
    }

    return res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Get request details error:', error);
    return res.status(500).json({ error: 'Failed to fetch request details' });
  }
};

/**
 * Get leave balance for a specific year
 * GET /api/leave/balance/:year
 */
export const getLeaveBalanceByYear = async (req, res) => {
  try {
    const { year } = req.params;
    const employeeId = req.user.id;

    const balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_year: {
          employeeId,
          year: parseInt(year)
        }
      }
    });

    if (!balance) {
      // Return default values if no balance exists yet
      return res.json({
        success: true,
        data: {
          employeeId,
          year: parseInt(year),
          annualQuota: 14,
          annualUsed: 0,
          annualRemaining: 14,
          toilBalance: 0,
          toilUsed: 0,
          toilExpired: 0
        }
      });
    }

    res.json({
      success: true,
      data: balance
    });

  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({
      error: 'Failed to fetch leave balance',
      message: error.message
    });
  }
};

/**
 * Delete leave request (only if pending)
 * DELETE /api/leave/:requestId
 */
export const deleteLeaveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (request.employeeId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this request' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Can only delete pending requests' });
    }

    await prisma.leaveRequest.delete({
      where: { id: requestId }
    });

    return res.json({
      success: true,
      message: 'Leave request deleted successfully'
    });
  } catch (error) {
    console.error('Delete leave request error:', error);
    return res.status(500).json({ error: 'Failed to delete leave request' });
  }
};

/**
 * Get attachment download URL
 * GET /api/leave/:requestId/attachment/:attachmentIndex
 */
export const getAttachmentDownloadUrl = async (req, res) => {
  try {
    const { requestId, attachmentIndex } = req.params;
    const userId = req.user.id;

    // Get leave request
    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        employeeId: true,
        currentApproverId: true,
        supervisorId: true,
        attachment: true
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    // Authorization: Only employee, approver, or supervisor can download
    const isAuthorized = 
      request.employeeId === userId ||
      request.currentApproverId === userId ||
      request.supervisorId === userId ||
      req.user.accessLevel <= 2; // HR/Admin

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized to access this attachment' });
    }

    // Parse attachments
    if (!request.attachment) {
      return res.status(404).json({ error: 'No attachments found' });
    }

    let attachments;
    try {
      attachments = JSON.parse(request.attachment);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid attachment data' });
    }

    const index = parseInt(attachmentIndex);
    if (isNaN(index) || index < 0 || index >= attachments.length) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const attachment = attachments[index];

    // If it's a URL, just return it
    if (attachment.type === 'URL') {
      return res.json({
        success: true,
        type: 'URL',
        url: attachment.url
      });
    }

    // If it's a file, generate R2 signed URL
    if (attachment.type === 'FILE') {
      const { getR2DownloadUrl } = await import('../config/storage.js');
      
      try {
        const signedUrl = await getR2DownloadUrl(attachment.path, 3600); // 1 hour expiry
        
        return res.json({
          success: true,
          type: 'FILE',
          url: signedUrl,
          filename: attachment.filename,
          size: attachment.size,
          mimeType: attachment.mimeType
        });
      } catch (r2Error) {
        console.error('R2 download URL error:', r2Error);
        return res.status(500).json({ error: 'Failed to generate download URL' });
      }
    }

    return res.status(400).json({ error: 'Unknown attachment type' });

  } catch (error) {
    console.error('Get attachment download URL error:', error);
    return res.status(500).json({ error: 'Failed to get attachment' });
  }
};