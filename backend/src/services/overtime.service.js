// backend/src/services/overtime.service.js
import { PrismaClient } from '@prisma/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';

const prisma = new PrismaClient();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get employee data including role and division
 */
export const getEmployeeData = async (employeeId) => {
  const employee = await prisma.user.findUnique({
    where: { id: employeeId },
    include: {
      role: true,
      division: true,
      supervisor: true
    }
  });

  if (!employee) {
    throw new Error('Employee not found');
  }

  return employee;
};

/**
 * Determine approver based on hierarchy
 * Priority: Direct Supervisor > Division Head > HR/Admin
 */
export const determineApprover = async (employee) => {
  // If has direct supervisor
  if (employee.supervisorId) {
    return employee.supervisorId;
  }

  // If no supervisor, find division head
  if (employee.division.headId) {
    return employee.division.headId;
  }

  // Fallback to HR/Admin (accessLevel 1 or 2)
  const hrAdmin = await prisma.user.findFirst({
    where: {
      accessLevel: { lte: 2 },
      employeeStatus: 'Active'
    }
  });

  if (!hrAdmin) {
    throw new Error('No approver found');
  }

  return hrAdmin.id;
};

/**
 * Check if dates already exist in PENDING or APPROVED requests
 */
export const checkDuplicateDates = async (employeeId, dates) => {
  const existingEntries = await prisma.overtimeEntry.findMany({
    where: {
      date: { in: dates.map(d => new Date(d)) },
      overtimeRequest: {
        employeeId,
        status: { in: ['PENDING', 'APPROVED'] }
      }
    },
    select: { date: true }
  });

  return existingEntries.map(e => format(e.date, 'yyyy-MM-dd'));
};

/**
 * Check duplicate dates excluding a specific request
 */
export const checkDuplicateDatesExcluding = async (employeeId, dates, excludeRequestId) => {
  const existingEntries = await prisma.overtimeEntry.findMany({
    where: {
      date: { in: dates.map(d => new Date(d)) },
      overtimeRequest: {
        employeeId,
        status: { in: ['PENDING', 'APPROVED'] },
        NOT: { id: excludeRequestId }
      }
    },
    select: { date: true }
  });

  return existingEntries.map(e => format(e.date, 'yyyy-MM-dd'));
};

// ============================================
// OVERTIME REQUEST OPERATIONS
// ============================================

/**
 * Create new overtime request
 */
export const createOvertimeRequest = async (data) => {
  const { 
    employeeId, 
    entries, 
    totalHours, 
    totalAmount, 
    approverId,
    currentApproverId, 
    supervisorId       
  } = data;

  const overtimeRequest = await prisma.overtimeRequest.create({
    data: {
      employeeId,
      totalHours,
      totalAmount,
      status: 'PENDING',
      currentApproverId: currentApproverId || approverId, 
      supervisorId: supervisorId || approverId,           
      supervisorStatus: 'PENDING',
      entries: {
        create: entries.map(entry => ({
          date: new Date(entry.date),
          hours: parseFloat(entry.hours),
          description: entry.description
        }))
      }
    },
    include: {
      entries: true,
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          nip: true,
          role: true,
          division: true
        }
      },
      currentApprover: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return overtimeRequest;
};

/**
 * Get overtime requests with filters
 */
export const getOvertimeRequests = async (filters) => {
  const where = {};

  if (filters.employeeId) {
    where.employeeId = filters.employeeId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.divisionId) {
    where.employee = {
      divisionId: filters.divisionId
    };
  }

  if (filters.year || filters.month) {
    const year = filters.year || new Date().getFullYear();
    const month = filters.month || 1;
    
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    where.submittedAt = {
      gte: startDate,
      lte: endDate
    };
  }

  const requests = await prisma.overtimeRequest.findMany({
    where,
    include: {
      entries: {
        orderBy: { date: 'asc' }
      },
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          nip: true,
          role: true,
          division: true
        }
      },
      currentApprover: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      supervisor: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: { submittedAt: 'desc' }
  });

  return requests;
};

/**
 * Get single overtime request by ID
 */
export const getOvertimeRequestById = async (requestId) => {
  const request = await prisma.overtimeRequest.findUnique({
    where: { id: requestId },
    include: {
      entries: {
        orderBy: { date: 'asc' }
      },
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          nip: true,
          role: true,
          division: true,
          overtimeRate: true
        }
      },
      currentApprover: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      supervisor: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return request;
};

/**
 * Update overtime request
 */
export const updateOvertimeRequest = async (requestId, data) => {
  const { entries, totalHours, totalAmount, status } = data;

  // Delete old entries
  await prisma.overtimeEntry.deleteMany({
    where: { overtimeRequestId: requestId }
  });

  // Update request with new entries
  const updatedRequest = await prisma.overtimeRequest.update({
    where: { id: requestId },
    data: {
      totalHours,
      totalAmount,
      status,
      entries: {
        create: entries.map(entry => ({
          date: new Date(entry.date),
          hours: parseFloat(entry.hours),
          description: entry.description
        }))
      }
    },
    include: {
      entries: {
        orderBy: { date: 'asc' }
      },
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          nip: true
        }
      }
    }
  });

  return updatedRequest;
};

/**
 * Delete overtime request
 */
export const deleteOvertimeRequest = async (requestId) => {
  await prisma.overtimeRequest.delete({
    where: { id: requestId }
  });
};

// ============================================
// APPROVAL OPERATIONS
// ============================================

/**
 * Get pending approvals for approver
 */
export const getPendingApprovals = async (approverId) => {
  const requests = await prisma.overtimeRequest.findMany({
    where: {
      currentApproverId: approverId,
      status: 'PENDING'
    },
    include: {
      entries: {
        orderBy: { date: 'asc' }
      },
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          nip: true,
          role: true,
          division: true
        }
      }
    },
    orderBy: { submittedAt: 'asc' }
  });

  return requests;
};

/**
 * Approve overtime request
 */
export const approveRequest = async (requestId, data) => {
  const { approverId, comment } = data;

  const updatedRequest = await prisma.overtimeRequest.update({
    where: { id: requestId },
    data: {
      status: 'APPROVED',
      supervisorStatus: 'APPROVED',
      supervisorComment: comment,
      supervisorDate: new Date()
    },
    include: {
      entries: true,
      employee: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return updatedRequest;
};

/**
 * Reject overtime request
 */
export const rejectRequest = async (requestId, data) => {
  const { approverId, comment } = data;

  const updatedRequest = await prisma.overtimeRequest.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      supervisorStatus: 'REJECTED',
      supervisorComment: comment,
      supervisorDate: new Date()
    },
    include: {
      entries: true,
      employee: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return updatedRequest;
};

/**
 * Request revision
 */
export const requestRevision = async (requestId, data) => {
  const { approverId, comment } = data;

  const updatedRequest = await prisma.overtimeRequest.update({
    where: { id: requestId },
    data: {
      status: 'REVISION_REQUESTED',
      supervisorComment: comment,
      supervisorDate: new Date()
    },
    include: {
      entries: true,
      employee: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return updatedRequest;
};

// ============================================
// BALANCE OPERATIONS
// ============================================

/**
 * Get overtime balance
 */
export const getOvertimeBalance = async (employeeId) => {
  const balance = await prisma.overtimeBalance.findUnique({
    where: { employeeId },
    include: {
      employee: {
        select: {
          name: true,
          email: true,
          overtimeRate: true
        }
      }
    }
  });

  return balance;
};

/**
 * Create overtime balance
 */
export const createOvertimeBalance = async (employeeId) => {
  const balance = await prisma.overtimeBalance.create({
    data: {
      employeeId,
      currentBalance: 0,
      pendingHours: 0,
      totalPaid: 0
    },
    include: {
      employee: {
        select: {
          name: true,
          email: true,
          overtimeRate: true
        }
      }
    }
  });

  return balance;
};

/**
 * Update pending hours
 */
export const updatePendingHours = async (employeeId, hours, operation) => {
  const balance = await prisma.overtimeBalance.findUnique({
    where: { employeeId }
  });

  if (!balance) {
    await createOvertimeBalance(employeeId);
  }

  await prisma.overtimeBalance.update({
    where: { employeeId },
    data: {
      pendingHours: {
        [operation === 'ADD' ? 'increment' : 'decrement']: hours
      }
    }
  });
};

/**
 * Move pending hours to current balance (when approved)
 */
export const movePendingToBalance = async (employeeId, hours) => {
  await prisma.overtimeBalance.update({
    where: { employeeId },
    data: {
      pendingHours: { decrement: hours },
      currentBalance: { increment: hours }
    }
  });
};

/**
 * Reset employee balance (after payment)
 */
export const resetEmployeeBalance = async (employeeId) => {
  const balance = await prisma.overtimeBalance.findUnique({
    where: { employeeId }
  });

  if (!balance) {
    throw new Error('Balance not found');
  }

  await prisma.overtimeBalance.update({
    where: { employeeId },
    data: {
      totalPaid: { increment: balance.currentBalance },
      currentBalance: 0,
      lastResetAt: new Date()
    }
  });
};

/**
 * Process monthly balance (HR processes approved overtimes)
 */
export const processMonthlyBalance = async (params) => {
  const { month, year, employeeIds } = params;

  const startDate = startOfMonth(new Date(year, month - 1));
  const endDate = endOfMonth(new Date(year, month - 1));

  // Get all APPROVED requests in this period
  const where = {
    status: 'APPROVED',
    supervisorDate: {
      gte: startDate,
      lte: endDate
    }
  };

  if (employeeIds && employeeIds.length > 0) {
    where.employeeId = { in: employeeIds };
  }

  const approvedRequests = await prisma.overtimeRequest.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          overtimeRate: true
        }
      }
    }
  });

  // Process each employee
  const results = [];
  for (const request of approvedRequests) {
    const employeeId = request.employeeId;
    
    // Update balance
    await prisma.overtimeBalance.upsert({
      where: { employeeId },
      create: {
        employeeId,
        currentBalance: request.totalHours,
        pendingHours: 0,
        totalPaid: 0,
        lastProcessedAt: new Date()
      },
      update: {
        lastProcessedAt: new Date()
      }
    });

    results.push({
      employeeId,
      employeeName: request.employee.name,
      hours: request.totalHours,
      amount: request.totalAmount
    });
  }

  return {
    processed: results.length,
    totalHours: results.reduce((sum, r) => sum + r.hours, 0),
    totalAmount: results.reduce((sum, r) => sum + r.amount, 0),
    details: results
  };
};

// ============================================
// REVISION OPERATIONS
// ============================================

/**
 * Create revision log
 */
export const createRevision = async (data) => {
  const { overtimeRequestId, revisedBy, action, changes, comment } = data;

  await prisma.overtimeRevision.create({
    data: {
      overtimeRequestId,
      revisedBy,
      action,
      changes,
      comment
    }
  });
};

// ============================================
// STATISTICS
// ============================================

/**
 * Get overtime statistics
 */
export const getOvertimeStatistics = async (filters) => {
  const where = {};

  if (filters.year || filters.month) {
    const year = filters.year || new Date().getFullYear();
    const month = filters.month || 1;
    
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    where.submittedAt = {
      gte: startDate,
      lte: endDate
    };
  }

  if (filters.divisionId) {
    where.employee = {
      divisionId: filters.divisionId
    };
  }

  // Total requests by status
  const totalPending = await prisma.overtimeRequest.count({
    where: { ...where, status: 'PENDING' }
  });

  const totalApproved = await prisma.overtimeRequest.count({
    where: { ...where, status: 'APPROVED' }
  });

  const totalRejected = await prisma.overtimeRequest.count({
    where: { ...where, status: 'REJECTED' }
  });

  // Total hours and amount
  const aggregateApproved = await prisma.overtimeRequest.aggregate({
    where: { ...where, status: 'APPROVED' },
    _sum: {
      totalHours: true,
      totalAmount: true
    }
  });

  // Top overtime employees
  const topEmployees = await prisma.overtimeRequest.groupBy({
    by: ['employeeId'],
    where: { ...where, status: 'APPROVED' },
    _sum: {
      totalHours: true,
      totalAmount: true
    },
    _count: true,
    orderBy: {
      _sum: {
        totalHours: 'desc'
      }
    },
    take: 10
  });

  // Get employee details for top employees
  const employeeIds = topEmployees.map(e => e.employeeId);
  const employees = await prisma.user.findMany({
    where: { id: { in: employeeIds } },
    select: {
      id: true,
      name: true,
      nip: true,
      division: true
    }
  });

  const topEmployeesWithDetails = topEmployees.map(te => {
    const employee = employees.find(e => e.id === te.employeeId);
    return {
      employee: employee,
      totalHours: te._sum.totalHours,
      totalAmount: te._sum.totalAmount,
      requestCount: te._count
    };
  });

  return {
    summary: {
      totalPending,
      totalApproved,
      totalRejected,
      totalRequests: totalPending + totalApproved + totalRejected
    },
    approved: {
      totalHours: aggregateApproved._sum.totalHours || 0,
      totalAmount: aggregateApproved._sum.totalAmount || 0
    },
    topEmployees: topEmployeesWithDetails
  };
};