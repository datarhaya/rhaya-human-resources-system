// backend/src/controllers/offboarding.controller.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Create offboarding record
 * POST /api/offboarding
 * Body: { employeeId, offboardingType, lastWorkingDay, resignDate?, resignReason?, reasonDetails? }
 */
export const createOffboarding = async (req, res) => {
  try {
    const {
      employeeId,
      offboardingType,
      lastWorkingDay,
      resignDate,
      resignReason,
      reasonDetails,
    } = req.body;

    const createdBy = req.user.id;

    // Check if offboarding already exists
    const existing = await prisma.offboarding.findUnique({
      where: { employeeId },
    });

    if (existing) {
      return res.status(400).json({
        error: "Offboarding record already exists for this employee",
      });
    }

    // Get employee info
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, supervisorId: true },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Create offboarding record
    const offboarding = await prisma.offboarding.create({
      data: {
        employeeId,
        offboardingType,
        lastWorkingDay: new Date(lastWorkingDay),
        resignDate: resignDate ? new Date(resignDate) : null,
        resignReason,
        reasonDetails,
        createdBy,
        supervisorId: employee.supervisorId,
        status: "IN_PROGRESS",
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            nip: true,
            division: true,
          },
        },
        creator: {
          select: { id: true, name: true },
        },
      },
    });

    return res.json({
      success: true,
      data: offboarding,
    });
  } catch (error) {
    console.error("Create offboarding error:", error);
    return res.status(500).json({
      error: "Failed to create offboarding record",
      details: error.message,
    });
  }
};

/**
 * Get offboarding by employee ID
 * GET /api/offboarding/employee/:employeeId
 */
export const getOffboardingByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const offboarding = await prisma.offboarding.findUnique({
      where: { employeeId },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            nip: true,
            division: true,
            role: true,
            joinDate: true,
          },
        },
        creator: {
          select: { id: true, name: true },
        },
        supervisor: {
          select: { id: true, name: true },
        },
        hrd: {
          select: { id: true, name: true },
        },
      },
    });

    if (!offboarding) {
      return res.status(404).json({
        error: "No offboarding record found for this employee",
      });
    }

    return res.json({
      success: true,
      data: offboarding,
    });
  } catch (error) {
    console.error("Get offboarding error:", error);
    return res.status(500).json({
      error: "Failed to fetch offboarding record",
      details: error.message,
    });
  }
};

/**
 * Update offboarding checklist
 * PUT /api/offboarding/:id/checklist
 * Body: { section, field, value, notes? }
 */
export const updateOffboardingChecklist = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body; // Object with field: value pairs

    const offboarding = await prisma.offboarding.update({
      where: { id },
      data: updates,
      include: {
        employee: {
          select: { id: true, name: true },
        },
      },
    });

    return res.json({
      success: true,
      data: offboarding,
    });
  } catch (error) {
    console.error("Update checklist error:", error);
    return res.status(500).json({
      error: "Failed to update checklist",
      details: error.message,
    });
  }
};

/**
 * Approve offboarding (Employee/Supervisor/HRD)
 * POST /api/offboarding/:id/approve
 * Body: { role: 'EMPLOYEE' | 'SUPERVISOR' | 'HRD' }
 */
export const approveOffboarding = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const userId = req.user.id;

    const updateData = {};
    const now = new Date();

    switch (role) {
      case "EMPLOYEE":
        updateData.employeeAcknowledged = true;
        updateData.employeeSignedAt = now;
        break;
      case "SUPERVISOR":
        updateData.supervisorApproved = true;
        updateData.supervisorSignedAt = now;
        updateData.supervisorId = userId;
        break;
      case "HRD":
        updateData.hrdApproved = true;
        updateData.hrdSignedAt = now;
        updateData.hrdId = userId;
        break;
      default:
        return res.status(400).json({ error: "Invalid role" });
    }

    const offboarding = await prisma.offboarding.update({
      where: { id },
      data: updateData,
    });

    // Check if all approvals are complete
    if (
      offboarding.employeeAcknowledged &&
      offboarding.supervisorApproved &&
      offboarding.hrdApproved
    ) {
      await prisma.offboarding.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: now,
        },
      });

      // ✅ Set employeeStatus to INACTIVE (not isActive)
      await prisma.user.update({
        where: { id: offboarding.employeeId },
        data: { employeeStatus: "INACTIVE" },
      });
    }

    return res.json({
      success: true,
      message: `${role} approval recorded successfully`,
    });
  } catch (error) {
    console.error("Approve offboarding error:", error);
    return res.status(500).json({
      error: "Failed to approve offboarding",
      details: error.message,
    });
  }
};

/**
 * Get all offboarding records (Admin only)
 * GET /api/offboarding/all?status=IN_PROGRESS
 */
export const getAllOffboardings = async (req, res) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }

    const offboardings = await prisma.offboarding.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            nip: true,
            division: true,
            role: true,
          },
        },
        creator: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        lastWorkingDay: "asc",
      },
    });

    return res.json({
      success: true,
      count: offboardings.length,
      data: offboardings,
    });
  } catch (error) {
    console.error("Get all offboardings error:", error);
    return res.status(500).json({
      error: "Failed to fetch offboarding records",
      details: error.message,
    });
  }
};

/**
 * Delete offboarding record
 * DELETE /api/offboarding/:id
 */
export const deleteOffboarding = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.offboarding.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "Offboarding record deleted successfully",
    });
  } catch (error) {
    console.error("Delete offboarding error:", error);
    return res.status(500).json({
      error: "Failed to delete offboarding record",
      details: error.message,
    });
  }
};

export default {
  createOffboarding,
  getOffboardingByEmployee,
  updateOffboardingChecklist,
  approveOffboarding,
  getAllOffboardings,
  deleteOffboarding,
};
