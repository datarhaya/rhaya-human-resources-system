// backend/src/controllers/leave.controller.js
import prisma from '../config/database.js';
import leaveService from '../services/leave.service.js';

/**
 * Submit leave request
 * POST /api/leave/submit
 */
export const submitLeaveRequest = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { leaveType, startDate, endDate, totalDays, reason, attachment } = req.body;

    // Validate required fields
    if (!leaveType || !startDate || !endDate || !totalDays || !reason) {
      return res.status(400).json({
        error: 'Missing required fields: leaveType, startDate, endDate, totalDays, reason'
      });
    }

    // Get employee with relationships
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      include: {
        division: true,
        supervisor: true
      }
    });

    // Validate leave request
    const validationErrors = await leaveService.validateLeaveRequest(
      employeeId,
      leaveType,
      startDate,
      endDate,
      totalDays
    );

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Determine approver
    const approverId = await leaveService.determineLeaveApprover(employee);

    // Create leave request
    const leaveRequest = await leaveService.createLeaveRequest({
      employeeId,
      leaveType,
      startDate,
      endDate,
      totalDays,
      reason,
      attachment,
      approverId,
      supervisorId: employee.supervisorId
    });

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

    if (request.supervisorId && !request.supervisorDate) {
      // Supervisor approval stage
      const nextApproverId = request.employee.division?.headId || null;

      updateData = {
        supervisorStatus: 'APPROVED',
        supervisorComment: comment || null,
        supervisorDate: new Date(),
        status: nextApproverId ? 'PENDING' : 'APPROVED',
        currentApproverId: nextApproverId || approverId,
        approvedAt: nextApproverId ? null : new Date()
      };
    } else if (request.employee.division?.headId && !request.divisionHeadDate) {
      // Division head approval - FINAL
      updateData = {
        divisionHeadStatus: 'APPROVED',
        divisionHeadComment: comment || null,
        divisionHeadDate: new Date(),
        status: 'APPROVED',
        currentApproverId: approverId,
        approvedAt: new Date()
      };
    } else {
      // Direct approval or admin override
      updateData = {
        status: 'APPROVED',
        approvedAt: new Date(),
        currentApproverId: approverId,
        supervisorStatus: 'APPROVED',
        supervisorComment: comment || 'Approved by Admin',
        supervisorDate: new Date()
      };
    }

    const updatedRequest = await prisma.leaveRequest.update({
      where: { id: requestId },
      data: updateData,
      include: {
        employee: true,
        currentApprover: true
      }
    });

    // Update leave balance if approved
    if (updatedRequest.status === 'APPROVED') {
      await leaveService.updateLeaveBalance(updatedRequest);
    }

    return res.json({
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
      rejectedAt: new Date()
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