// backend/src/controllers/overtime.controller.js
import * as overtimeService from '../services/overtime.service.js';
import * as revisionService from '../services/overtimeRevision.service.js';
import { isAfter, subDays, startOfDay } from 'date-fns';
import { PrismaClient } from '@prisma/client';
import { 
  sendOvertimeApprovedEmail, 
  sendOvertimeRejectedEmail,
  sendOvertimeRequestNotification,
  sendOvertimeRevisionRequestedEmail 
} from '../services/email.service.js';
const prisma = new PrismaClient();

// ============================================
// EMPLOYEE CONTROLLERS
// ============================================

/**
 * Submit new overtime request (weekly batch)
 * POST /api/overtime/submit
 * Body: {
 *   entries: [
 *     { date: "2025-01-20", hours: 3, description: "Client deployment" },
 *     { date: "2025-01-21", hours: 2, description: "Bug fixing" }
 *   ]
 * }
 */
export const submitOvertimeRequest = async (req, res) => {
  try {
    const { entries } = req.body;
    const employeeId = req.user.id;

    // Validation
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'At least one overtime entry is required' });
    }

    // Validate each entry
    const today = startOfDay(new Date());
    const sevenDaysAgo = subDays(today, 7);

    for (const entry of entries) {
      // Check required fields
      if (!entry.date || !entry.hours || !entry.description) {
        return res.status(400).json({ 
          error: 'Each entry must have date, hours, and description' 
        });
      }

      // Validate hours (max 12 per day)
      if (entry.hours <= 0 || entry.hours > 12) {
        return res.status(400).json({ 
          error: `Invalid hours for ${entry.date}. Must be between 0.5 and 12 hours` 
        });
      }

      // Check 7-day deadline
      const entryDate = startOfDay(new Date(entry.date));
      if (isAfter(sevenDaysAgo, entryDate)) {
        return res.status(400).json({ 
          error: `Date ${entry.date} is more than 7 days ago. Cannot submit.` 
        });
      }

      // Check future date
      if (isAfter(entryDate, today)) {
        return res.status(400).json({ 
          error: `Date ${entry.date} is in the future. Cannot submit.` 
        });
      }
    }

    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'system-settings-singleton' }
    });
    
    if (settings?.lastRecapDate) {
      for (const entry of entries) {
        const entryDate = new Date(entry.date);
        if (entryDate <= settings.lastRecapDate) {
          return res.status(400).json({
            error: `Lembur untuk tanggal ${formatDate(entryDate)} sudah direkap.`
          });
        }
      }
    }

    // Check for duplicate dates in this submission
    const dates = entries.map(e => e.date);
    const uniqueDates = new Set(dates);
    if (dates.length !== uniqueDates.size) {
      return res.status(400).json({ 
        error: 'Duplicate dates found in submission. Each date must be unique.' 
      });
    }

    // Check for duplicate dates in existing requests (PENDING or APPROVED)
    const existingDates = await overtimeService.checkDuplicateDates(employeeId, dates);
    if (existingDates.length > 0) {
      return res.status(400).json({ 
        error: `The following dates already exist in your pending or approved requests: ${existingDates.join(', ')}. Please delete/reject them first.`,
        duplicateDates: existingDates
      });
    }

    // Get employee data for calculation
    const employee = await overtimeService.getEmployeeData(employeeId);
    
    // Calculate totals
    const totalHours = entries.reduce((sum, e) => sum + parseFloat(e.hours), 0);
    const overtimeRate = parseFloat(employee.overtimeRate) || 37500; // Default rate
    const totalAmount = (totalHours / 8) * overtimeRate;

    // Determine approver (supervisor or division head or HR/Admin)
    const approverId = await overtimeService.determineApprover(employee);

    // Add this debug:
    console.log('Debug - Approver determination:');
    console.log('Employee ID:', employeeId);
    console.log('Employee supervisor:', employee.supervisorId);
    console.log('Determined approverId:', approverId);
    
    // Create overtime request WITH currentApproverId
    const overtimeRequest = await overtimeService.createOvertimeRequest({
      employeeId,
      entries,
      totalHours,
      totalAmount,
      approverId,
      currentApproverId: approverId, 
      supervisorId: employee.supervisorId 
    });
    console.log('Created request with currentApproverId:', overtimeRequest.currentApproverId);

    // ✅ NEW: Log submission in revision history
    await revisionService.logSubmission(
      overtimeRequest.id,
      employeeId,
      {
        totalHours,
        totalAmount,
        entries: entries
      }
    );

    // Update pending hours in balance
    await overtimeService.updatePendingHours(employeeId, totalHours, 'ADD');
    console.log('✅ Pending hours updated for employee:', employeeId);

    // Send email notification to approver
    try {
      const approver = await prisma.user.findUnique({
        where: { id: approverId },
        select: { id: true, name: true, email: true }
      });

      if (approver && approver.email) {
        await sendOvertimeRequestNotification(approver, overtimeRequest, employee);
        console.log('✅ Overtime request notification sent to:', approver.email);
      }
    } catch (emailError) {
      // Don't fail the request if email fails
      console.error('⚠️ Email notification failed:', emailError.message);
    }

    res.status(201).json({
      message: 'Overtime request submitted successfully',
      data: overtimeRequest
    });

  } catch (error) {
    console.error('Submit overtime error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit overtime request' });
  }
};

/**
 * Get my overtime requests
 * GET /api/overtime/my-requests?status=PENDING&year=2025
 */
export const getMyOvertimeRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const where = { employeeId: userId };
    if (status && status !== 'all') {
      where.status = status;
    }

    const requests = await prisma.overtimeRequest.findMany({
      where,
      include: {
        entries: { orderBy: { date: 'asc' } },
        currentApprover: {
          select: { id: true, name: true, email: true }
        },
        supervisor: {
          select: { id: true, name: true }
        },
        divisionHead: {
          select: { id: true, name: true }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    return res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Get my requests error:', error);
    return res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

/**
 * Get my overtime balance
 * GET /api/overtime/my-balance
 */
export const getMyOvertimeBalance = async (req, res) => {
  try {
    const employeeId = req.user.id;

    let balance = await overtimeService.getOvertimeBalance(employeeId);

    // Create balance if doesn't exist
    if (!balance) {
      balance = await overtimeService.createOvertimeBalance(employeeId);
    }

    res.json({ data: balance });

  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Edit overtime request (only PENDING or REVISION_REQUESTED)
 * PUT /api/overtime/:requestId
 * Body: {
 *   entries: [...]
 * }
 */
export const editOvertimeRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { entries } = req.body;
    const employeeId = req.user.id;

    // Get existing request
    const existingRequest = await overtimeService.getOvertimeRequestById(requestId);

    if (!existingRequest) {
      return res.status(404).json({ error: 'Overtime request not found' });
    }

    // Check ownership
    if (existingRequest.employeeId !== employeeId) {
      return res.status(403).json({ error: 'Not authorized to edit this request' });
    }

    // Check if editable
    if (!['PENDING', 'REVISION_REQUESTED'].includes(existingRequest.status)) {
      return res.status(400).json({ 
        error: 'Can only edit requests with PENDING or REVISION_REQUESTED status' 
      });
    }

    // Validate new entries (same validation as submit)
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'At least one overtime entry is required' });
    }

    // Validate each entry (similar to submit validation)
    const today = startOfDay(new Date());
    const sevenDaysAgo = subDays(today, 7);

    for (const entry of entries) {
      if (!entry.date || !entry.hours || !entry.description) {
        return res.status(400).json({ 
          error: 'Each entry must have date, hours, and description' 
        });
      }

      if (entry.hours <= 0 || entry.hours > 12) {
        return res.status(400).json({ 
          error: `Invalid hours for ${entry.date}. Must be between 0.5 and 12 hours` 
        });
      }

      const entryDate = startOfDay(new Date(entry.date));
      if (isAfter(sevenDaysAgo, entryDate)) {
        return res.status(400).json({ 
          error: `Date ${entry.date} is more than 7 days ago. Cannot submit.` 
        });
      }

      if (isAfter(entryDate, today)) {
        return res.status(400).json({ 
          error: `Date ${entry.date} is in the future. Cannot submit.` 
        });
      }
    }

    // Check duplicate dates in submission
    const dates = entries.map(e => e.date);
    const uniqueDates = new Set(dates);
    if (dates.length !== uniqueDates.size) {
      return res.status(400).json({ 
        error: 'Duplicate dates found in submission.' 
      });
    }

    // Check duplicate with OTHER requests (exclude current request)
    const existingDates = await overtimeService.checkDuplicateDatesExcluding(
      employeeId, 
      dates, 
      requestId
    );
    if (existingDates.length > 0) {
      return res.status(400).json({ 
        error: `Dates already exist in other requests: ${existingDates.join(', ')}`,
        duplicateDates: existingDates
      });
    }

    // Get employee data for recalculation
    const employee = await overtimeService.getEmployeeData(employeeId);
    
    // Recalculate totals
    const newTotalHours = entries.reduce((sum, e) => sum + parseFloat(e.hours), 0);
    const overtimeRate = parseFloat(employee.overtimeRate) || 37500;
    const newTotalAmount = (newTotalHours / 8) * overtimeRate;

    // Update pending hours (subtract old, add new)
    const oldTotalHours = existingRequest.totalHours;
    await overtimeService.updatePendingHours(employeeId, oldTotalHours, 'SUBTRACT');
    await overtimeService.updatePendingHours(employeeId, newTotalHours, 'ADD');

    // Update request
    const updatedRequest = await overtimeService.updateOvertimeRequest(requestId, {
      entries,
      totalHours: newTotalHours,
      totalAmount: newTotalAmount,
      status: 'PENDING' // Reset to PENDING if was REVISION_REQUESTED
    });

    // Log revision
    await revisionService.logEdit(
      requestId,
      employeeId,
      {
        totalHours: oldTotalHours,
        totalAmount: existingRequest.totalAmount,
        entries: existingRequest.entries
      },
      {
        totalHours: newTotalHours,
        totalAmount: newTotalAmount,
        entries: entries
      }
    );

    res.json({
      message: 'Overtime request updated successfully',
      data: updatedRequest
    });

  } catch (error) {
    console.error('Edit overtime error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete overtime request (only PENDING or REVISION_REQUESTED or REJECTED)
 * DELETE /api/overtime/:requestId
 */
export const deleteOvertimeRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const employeeId = req.user.id;

    const request = await overtimeService.getOvertimeRequestById(requestId);

    if (!request) {
      return res.status(404).json({ error: 'Overtime request not found' });
    }

    // Check ownership
    if (request.employeeId !== employeeId) {
      return res.status(403).json({ error: 'Not authorized to delete this request' });
    }

    // Check if deletable
    if (!['PENDING', 'REVISION_REQUESTED', 'REJECTED'].includes(request.status)) {
      return res.status(400).json({ 
        error: 'Cannot delete approved overtime requests' 
      });
    }

    // Update pending hours if PENDING or REVISION_REQUESTED
    if (['PENDING', 'REVISION_REQUESTED'].includes(request.status)) {
      await overtimeService.updatePendingHours(
        employeeId, 
        request.totalHours, 
        'SUBTRACT'
      );
    }

    // Delete request
    await overtimeService.deleteOvertimeRequest(requestId);

    res.json({ message: 'Overtime request deleted successfully' });

  } catch (error) {
    console.error('Delete overtime error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get single overtime request details
 * GET /api/overtime/:requestId
 */
export const getOvertimeRequestById = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const request = await overtimeService.getOvertimeRequestById(requestId);

    if (!request) {
      return res.status(404).json({ error: 'Overtime request not found' });
    }

    // Check access (owner or approver or admin)
    const isOwner = request.employeeId === userId;
    const isApprover = request.currentApproverId === userId;
    const isAdmin = req.user.accessLevel <= 2; // Admin or Subsidiary

    if (!isOwner && !isApprover && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to view this request' });
    }

    res.json({ data: request });

  } catch (error) {
    console.error('Get request by ID error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// APPROVER CONTROLLERS
// ============================================

/**
 * Get pending approvals
 * For regular users: Only requests assigned to them
 * For Admin/HR (accessLevel 1-2): ALL pending requests
 * GET /api/overtime/pending-approval/list
 */
export const getPendingApprovals = async (req, res) => {
  try {
    const userId = req.user.id;
    const accessLevel = req.user.accessLevel;

    // Build where clause based on access level
    let whereClause = {
      status: 'PENDING'
    };

    // Admin/HR (accessLevel 1-2) see ALL pending requests
    if (accessLevel === 1 || accessLevel === 2) {
      // No additional filter - show all pending
      console.log(`Admin/HR viewing all pending requests`);
    } 
    // Regular users only see requests assigned to them
    else {
      whereClause.currentApproverId = userId;
      console.log(`Regular user viewing assigned requests only`);
    }

    const requests = await prisma.overtimeRequest.findMany({
      where: whereClause,
      include: {
        employee: {
          include: {
            role: true,
            division: true
          }
        },
        entries: {
          orderBy: { date: 'asc' }
        },
        currentApprover: true,
        supervisor: true,
        divisionHead: true
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    console.log(`Found ${requests.length} pending requests for user ${userId} (accessLevel ${accessLevel})`);

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
 * Approve overtime request
 * POST /api/overtime/:requestId/approve
 * Body: { comment: "Approved for project work" }
 */
export const approveOvertimeRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { comment } = req.body;
    const approverId = req.user.id;
    const approverLevel = req.user.accessLevel;

    const request = await prisma.overtimeRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: {
          include: {
            supervisor: true,
            division: true
          }
        },
        currentApprover: true
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Overtime request not found' });
    }
    if (request.status === 'APPROVED') {
      return res.status(400).json({ error: 'Request already approved' });
    }
    if (request.status === 'REJECTED') {
      return res.status(400).json({ error: 'Request already rejected' });
    }

    // Authorization check
    const isAdmin = approverLevel <= 2; 
    const isCurrentApprover = request.currentApproverId === approverId;

    if (!isAdmin && !isCurrentApprover) {
      return res.status(403).json({ 
        error: 'You are not authorized to approve this request' 
      });
    }

    let updateData = {};
    
    // ADMIN OVERRIDE (Level 1-2) - Can approve anything directly
    if (isAdmin && !isCurrentApprover) {
      updateData = {
        status: 'APPROVED',
        approvedAt: new Date(),
        finalApproverId: approverId,
        supervisorStatus: 'APPROVED',
        supervisorComment: comment || 'Approved by Admin',
        supervisorDate: new Date(),
        divisionHeadStatus: 'APPROVED',
        divisionHeadComment: comment || 'Approved by Admin',
        divisionHeadDate: new Date(),
        currentApproverId: approverId
      };
    }
    
    // Supervisor approval
    else if (request.supervisorId && !request.supervisorDate) {
      // const nextApproverId = request.employee.division?.headId || null;
      
      updateData = {
        supervisorStatus: 'APPROVED',
        supervisorComment: comment || null,
        supervisorDate: new Date(),
        currentApproverId: approverId,
        status: 'APPROVED',
        approvedAt: new Date(),

        // currentApproverId: nextApproverId, 
        // status: nextApproverId ? 'PENDING_DIVISION_HEAD' : 'APPROVED', 
        // approvedAt: nextApproverId ? null : new Date()
      };
      
      // if (!nextApproverId) {
      //   updateData.currentApproverId = approverId;
      // }
    }

    // Division head approval 
    else if (request.employee.division?.headId && !request.divisionHeadDate) {
      updateData = {
        divisionHeadStatus: 'APPROVED',
        divisionHeadComment: comment || null,
        divisionHeadDate: new Date(),
        currentApproverId: approverId, 
        status: 'APPROVED',
        approvedAt: new Date()
      };
    }
    // Direct approval (no multi-stage)
    else {
      updateData = {
        status: 'APPROVED',
        approvedAt: new Date(),
        currentApproverId: approverId, 
        supervisorStatus: 'APPROVED',
        supervisorComment: comment || 'Direct approval',
        supervisorDate: new Date()
      };
    }

    console.log('Approval update data:', updateData); // Debug log

    const updatedRequest = await prisma.overtimeRequest.update({
      where: { id: requestId },
      data: updateData,
      include: {
        employee: true,
        currentApprover: true
      }
    });

    console.log('✅ Updated request status:', updatedRequest.status); // Debug log

    // If fully approved, update balance
    if (updatedRequest.status === 'APPROVED') {
      await prisma.overtimeBalance.upsert({
        where: { employeeId: request.employeeId },
        update: {
          currentBalance: { increment: request.totalHours },
          pendingHours: { decrement: request.totalHours }
        },
        create: {
          employeeId: request.employeeId,
          currentBalance: request.totalHours,
          totalPaid: 0
        }
      });
      
      console.log('✅ Balance updated for employee:', request.employeeId);
    }

    // Send email notification
    try {
      await sendOvertimeApprovedEmail(
        request.employee,
        request
      );
      console.log('✅ Approval email sent to:', request.employee.email);
    } catch (emailError) {
      // Don't fail the request if email fails
      console.error('⚠️ Email failed but overtime approved:', emailError);
    }

    if (request.supervisorId && !request.supervisorDate) {
      // Supervisor approval
      await revisionService.logSupervisorApproval(
        requestId,
        approverId,
        comment
      );
    } else if (request.employee.division?.headId && !request.divisionHeadDate) {
      // Division head approval
      await revisionService.logDivisionHeadApproval(
        requestId,
        approverId,
        comment
      );
    } else {
      // Direct/final approval
      await revisionService.logFinalApproval(
        requestId,
        approverId,
        comment
      );
    }

    return res.json({
      success: true,
      message: 'Overtime request approved successfully',
      data: updatedRequest
    });

  } catch (error) {
    console.error('❌ Approve overtime error:', error);
    return res.status(500).json({ error: 'Failed to approve overtime request' });
  }
};


/**
 * Reject overtime request
 * POST /api/overtime/:requestId/reject
 * Body: { comment: "Not a valid holiday" }
 */
export const rejectOvertimeRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { comment } = req.body;
    const approverId = req.user.id;
    const approverLevel = req.user.accessLevel;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment is required for rejection' });
    }

    const request = await prisma.overtimeRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: {
          include: {
            division: true
          }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Overtime request not found' });
    }

    if (request.status === 'APPROVED') {
      return res.status(400).json({ error: 'Cannot reject approved request' });
    }
    if (request.status === 'REJECTED') {
      return res.status(400).json({ error: 'Request already rejected' });
    }

    // Authorization check
    const isAdmin = approverLevel === 1;
    const isCurrentApprover = request.currentApproverId === approverId;

    if (!isAdmin && !isCurrentApprover) {
      return res.status(403).json({ 
        error: 'You are not authorized to reject this request' 
      });
    }

    // Update with rejection - keep currentApproverId for history
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

    const updatedRequest = await prisma.overtimeRequest.update({
      where: { id: requestId },
      data: updateData,
      include: {
        employee: true,
        currentApprover: true 
      }
    });

    if (updatedRequest.status === 'REJECTED') {
      await prisma.overtimeBalance.upsert({
        where: { employeeId: request.employeeId },
        update: {
          pendingHours: { 
            decrement: request.totalHours }
        },
        create: {
          employeeId: request.employeeId,
          currentBalance: request.totalHours,
          totalPaid: 0
        }
      });
    }

    // Send rejection email notification to employee
    try {
      await sendOvertimeRejectedEmail(
        updatedRequest.employee,
        updatedRequest,
        comment,
        req.user.name
      );
      console.log('✅ Rejection email sent to:', updatedRequest.employee.email);
    } catch (emailError) {
      // Don't fail the request if email fails
      console.error('⚠️ Rejection email failed:', emailError.message);
    }

    if (request.supervisorId && !request.supervisorDate) {
      // Supervisor rejection
      await revisionService.logSupervisorRejection(
        requestId,
        approverId,
        comment
      );
    } else if (request.employee.division?.headId && !request.divisionHeadDate) {
      // Division head rejection
      await revisionService.logDivisionHeadRejection(
        requestId,
        approverId,
        comment
      );
    } else {
      // Final rejection
      await revisionService.logFinalRejection(
        requestId,
        approverId,
        comment
      );
    }

    return res.json({
      success: true,
      message: 'Overtime request rejected',
      data: updatedRequest
    });

  } catch (error) {
    console.error('Reject overtime error:', error);
    return res.status(500).json({ error: 'Failed to reject overtime request' });
  }
};

/**
 * Request revision
 * POST /api/overtime/:requestId/request-revision
 * Body: { comment: "Please clarify dates - Jan 20 was not a holiday" }
 */
export const requestRevision = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { comment } = req.body;
    const approverId = req.user.id;
    const approverLevel = req.user.accessLevel;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment is required for revision request' });
    }

    const request = await prisma.overtimeRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: {
          include: {
            division: true
          }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Overtime request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Can only request revision for pending requests' });
    }

    // Authorization check
    const isAdmin = approverLevel === 1;
    const isCurrentApprover = request.currentApproverId === approverId;

    if (!isAdmin && !isCurrentApprover) {
      return res.status(403).json({ 
        error: 'You are not authorized to request revision for this request' 
      });
    }

    // Update request - keep currentApproverId for history
    let updateData = {
      status: 'REVISION_REQUESTED',
      currentApproverId: approverId  
    };

    // Log revision request
    if (request.supervisorId && !request.supervisorDate) {
      updateData.supervisorStatus = 'REVISION_REQUESTED';
      updateData.supervisorComment = comment;
      updateData.supervisorDate = new Date();
    } else if (request.employee.division?.headId && !request.divisionHeadDate) {
      updateData.divisionHeadStatus = 'REVISION_REQUESTED';
      updateData.divisionHeadComment = comment;
      updateData.divisionHeadDate = new Date();
    } else if (isAdmin) {
      updateData.supervisorStatus = 'REVISION_REQUESTED';
      updateData.supervisorComment = comment;
      updateData.supervisorDate = new Date();
    }

    const updatedRequest = await prisma.overtimeRequest.update({
      where: { id: requestId },
      data: updateData,
      include: {
        employee: true,
        currentApprover: true,
        entries: true // Include entries for email
      }
    });

    // Send revision request email notification to employee
    await revisionService.logRevisionRequest(
      requestId,
      approverId,
      comment
    );

    // Send revision request email notification to employee
    try {
      await sendOvertimeRevisionRequestedEmail(
        updatedRequest.employee,
        updatedRequest,
        comment,
        req.user.name
      );
      console.log('✅ Revision request email sent to:', updatedRequest.employee.email);
    } catch (emailError) {
      // Don't fail the request if email fails
      console.error('⚠️ Revision request email failed:', emailError.message);
    }

    // if (updatedRequest.status === 'REVISION_REQUESTED') {
    //   await prisma.overtimeBalance.upsert({
    //     where: { employeeId: request.employeeId },
    //     update: {
    //       pendingHours: { 
    //         decrement: request.totalHours }
    //     },
    //     create: {
    //       employeeId: request.employeeId,
    //       currentBalance: request.totalHours,
    //       totalPaid: 0
    //     }
    //   });
    // }

    return res.json({
      success: true,
      message: 'Revision requested successfully',
      data: updatedRequest
    });

  } catch (error) {
    console.error('Request revision error:', error);
    return res.status(500).json({ error: 'Failed to request revision' });
  }
};



// ============================================
// ADMIN/HR CONTROLLERS
// ============================================

/**
 * Get all overtime requests (Admin/HR)
 * GET /api/overtime/admin/all-requests?status=PENDING&divisionId=xxx
 */
export const getAllOvertimeRequests = async (req, res) => {
  try {
    // Check admin access
    if (req.user.accessLevel > 2) {
      return res.status(403).json({ error: 'Admin/HR access required' });
    }

    const { status, divisionId, employeeId, year, month } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (divisionId) filters.divisionId = divisionId;
    if (employeeId) filters.employeeId = employeeId;
    if (year) filters.year = parseInt(year);
    if (month) filters.month = parseInt(month);

    const requests = await overtimeService.getOvertimeRequests(filters);

    res.json({ data: requests });

  } catch (error) {
    console.error('Get all requests error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Process monthly balance (HR processes approved overtimes)
 * POST /api/overtime/admin/process-balance
 * Body: { 
 *   month: 1, 
 *   year: 2025,
 *   employeeIds: ["user1", "user2"] // optional, if empty = all employees
 * }
 */
export const processMonthlyBalance = async (req, res) => {
  try {
    // Check admin access
    if (req.user.accessLevel > 2) {
      return res.status(403).json({ error: 'Admin/HR access required' });
    }

    const { month, year, employeeIds } = req.body;

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const result = await overtimeService.processMonthlyBalance({
      month,
      year,
      employeeIds
    });

    res.json({
      message: 'Monthly balance processed successfully',
      data: result
    });

  } catch (error) {
    console.error('Process balance error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Reset employee balance (after payment)
 * POST /api/overtime/admin/reset-balance/:userId
 */
export const resetEmployeeBalance = async (req, res) => {
  try {
    // Check admin access
    if (req.user.accessLevel > 2) {
      return res.status(403).json({ error: 'Admin/HR access required' });
    }

    const { userId } = req.params;

    await overtimeService.resetEmployeeBalance(userId);

    res.json({ message: 'Employee overtime balance reset successfully' });

  } catch (error) {
    console.error('Reset balance error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get overtime statistics
 * GET /api/overtime/admin/statistics?year=2025&month=1
 */
export const getOvertimeStatistics = async (req, res) => {
  try {
    // Check admin access
    if (req.user.accessLevel > 2) {
      return res.status(403).json({ error: 'Admin/HR access required' });
    }

    const { year, month, divisionId } = req.query;

    const filters = {};
    if (year) filters.year = parseInt(year);
    if (month) filters.month = parseInt(month);
    if (divisionId) filters.divisionId = divisionId;

    const statistics = await overtimeService.getOvertimeStatistics(filters);

    res.json({ data: statistics });

  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Admin reject approved overtime (Override)
 * POST /api/overtime/:requestId/admin-reject
 * Only for System Administrator (Level 1)
 */
export const adminRejectApprovedOvertime = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { comment } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.name;

    console.log(`[Admin Reject] Admin ${adminName} attempting to reject approved overtime ${requestId}`);

    // Validate comment
    if (!comment || comment.trim().length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Admin rejection reason required (minimum 20 characters)',
        details: ['Please provide a detailed reason for rejecting this approved overtime']
      });
    }

    // Get overtime request with all details
    const overtimeRequest = await prisma.overtimeRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: {
          include: {
            division: true,
            role: true
          }
        },
        entries: true,
        supervisor: {
          select: { id: true, name: true, email: true }
        },
        finalApprover: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!overtimeRequest) {
      return res.status(404).json({
        success: false,
        error: 'Overtime request not found'
      });
    }

    // ✅ Check 1: Must be APPROVED
    if (overtimeRequest.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: 'Can only reject approved overtime requests',
        currentStatus: overtimeRequest.status
      });
    }

    // ✅ Check 2: Cannot reject if already recapped (in payroll)
    if (overtimeRequest.isRecapped) {
      return res.status(400).json({
        success: false,
        error: 'Cannot reject overtime that has been recapped for payroll',
        recappedDate: overtimeRequest.recappedDate
      });
    }

    console.log(`✅ All validations passed. Proceeding with admin rejection...`);

    // Save original data before overwriting (Solves Problem #2!)
    const originalData = {
      supervisorComment: overtimeRequest.supervisorComment,
      approvedAt: overtimeRequest.approvedAt,
      finalApproverId: overtimeRequest.finalApproverId,
      totalHours: overtimeRequest.totalHours,
      status: overtimeRequest.status
    };

    // Update overtime request status to REJECTED
    const updatedRequest = await prisma.overtimeRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        supervisorComment: `[ADMIN OVERRIDE] ${comment}`, // Prefix to indicate admin action
        currentApproverId: adminId // Record who rejected it
      },
      include: {
        employee: {
          include: {
            division: true,
            role: true
          }
        },
        entries: true
      }
    });

    console.log(`✅ Overtime status updated to REJECTED by admin`);

    // ✅ CRITICAL: Log admin rejection (Preserves original data!)
    await revisionService.logAdminRejection(
      requestId,
      adminId,
      comment,
      originalData
    );

    // ✅ Deduct overtime balance (remove the hours that were added)
    try {
      await revisionService.deductOvertimeBalance(
        overtimeRequest.employeeId,
        overtimeRequest.totalHours
      );
      console.log(`✅ Overtime balance deducted: -${overtimeRequest.totalHours} hours`);
    } catch (balanceError) {
      console.error('⚠️ Failed to deduct overtime balance:', balanceError);
      // Don't fail the rejection if balance deduction fails
    }

    // ✅ Send notification emails
    try {
      const { sendAdminRejectOvertimeEmail } = await import('../services/email.service.js');
      
      // Send to employee, supervisor, and HR
      await sendAdminRejectOvertimeEmail(
        overtimeRequest.employee,
        overtimeRequest,
        comment,
        adminName,
        [
          overtimeRequest.supervisor?.email,
          overtimeRequest.finalApprover?.email,
          process.env.HR_EMAIL
        ].filter(email => email) // Remove nulls
      );
      console.log(`✅ Admin rejection notification emails sent`);
    } catch (emailError) {
      console.error('⚠️ Failed to send admin rejection emails:', emailError);
      // Don't fail the rejection if email fails
    }

    // ✅ Log audit trail
    console.log(`[AUDIT] Admin Override Rejection:`, {
      overtimeId: requestId,
      adminId: adminId,
      adminName: adminName,
      employeeId: overtimeRequest.employeeId,
      employeeName: overtimeRequest.employee.name,
      hours: overtimeRequest.totalHours,
      amount: overtimeRequest.totalAmount,
      reason: comment,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: 'Overtime request rejected by admin successfully',
      data: updatedRequest
    });

  } catch (error) {
    console.error('❌ Admin reject overtime error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reject overtime request',
      message: error.message
    });
  }
};