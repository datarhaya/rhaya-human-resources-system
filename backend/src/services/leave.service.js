// backend/src/services/leave.service.js
import prisma from '../config/database.js';

/**
 * Calculate annual leave quota based on tenure
 */
export const calculateAnnualLeaveQuota = (joinDate) => {
  const now = new Date();
  const join = new Date(joinDate);
  const monthsWorked = (now.getFullYear() - join.getFullYear()) * 12 + 
                       (now.getMonth() - join.getMonth());
  
  // More than 12 months = 14 days, less than 12 months = 10 days
  return monthsWorked >= 12 ? 14 : 10;
};

/**
 * Get or create leave balance for current year
 */
export const getOrCreateLeaveBalance = async (employeeId, joinDate) => {
  const currentYear = new Date().getFullYear();
  
  let balance = await prisma.leaveBalance.findFirst({
    where: {
      employeeId,
      year: currentYear
    }
  });
  
  if (!balance) {
    const annualQuota = calculateAnnualLeaveQuota(joinDate);
    balance = await prisma.leaveBalance.create({
      data: {
        employeeId,
        year: currentYear,
        annualQuota,
        annualRemaining: annualQuota
      }
    });
  }
  
  return balance;
};

/**
 * Validate leave request
 */
export const validateLeaveRequest = async (employeeId, leaveType, startDate, endDate, totalDays) => {
  const errors = [];
  
  // Check if dates are valid
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) {
    errors.push('Start date must be before end date');
  }
  
  // Check if dates are in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start < today) {
    errors.push('Cannot request leave for past dates');
  }
  
  // Check for overlapping leave requests
  const overlapping = await prisma.leaveRequest.findFirst({
    where: {
      employeeId,
      status: { in: ['PENDING', 'APPROVED'] },
      OR: [
        {
          AND: [
            { startDate: { lte: end } },
            { endDate: { gte: start } }
          ]
        }
      ]
    }
  });
  
  if (overlapping) {
    errors.push('You already have a leave request for these dates');
  }
  
  // Validate annual leave quota
  if (leaveType === 'ANNUAL_LEAVE') {
    const employee = await prisma.user.findUnique({
      where: { id: employeeId }
    });
    
    const balance = await getOrCreateLeaveBalance(employeeId, employee.joinDate);
    
    if (balance.annualRemaining < totalDays) {
      errors.push(`Insufficient annual leave balance. You have ${balance.annualRemaining} days remaining`);
    }
  }
  
  // Validate unpaid leave limits (max 14 days per year, max 10 consecutive days)
  if (leaveType === 'UNPAID_LEAVE') {
    const currentYear = new Date().getFullYear();
    const balance = await prisma.leaveBalance.findFirst({
      where: {
        employeeId,
        year: currentYear
      }
    });
    
    const unpaidUsed = balance?.unpaidLeaveUsed || 0;
    
    if (unpaidUsed + totalDays > 14) {
      errors.push(`Unpaid leave exceeds annual limit. You have used ${unpaidUsed} of 14 days`);
    }
    
    if (totalDays > 10) {
      errors.push('Unpaid leave cannot exceed 10 consecutive days');
    }
  }
  
  // Maternity leave validation
  if (leaveType === 'MATERNITY_LEAVE' && totalDays !== 90) {
    errors.push('Maternity leave must be exactly 3 months (90 days)');
  }
  
  return errors;
};

/**
 * Determine approver for leave request
 */
export const determineLeaveApprover = async (employee) => {
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
      isActive: true
    }
  });

  if (!hrAdmin) {
    throw new Error('No approver found');
  }

  return hrAdmin.id;
};

/**
 * Create leave request
 */
export const createLeaveRequest = async (data) => {
  const {
    employeeId,
    leaveType,
    startDate,
    endDate,
    totalDays,
    reason,
    attachment,
    approverId,
    supervisorId
  } = data;
  
  // Determine if paid leave
  const paidLeaveTypes = [
    'ANNUAL_LEAVE',
    'SICK_LEAVE',
    'MATERNITY_LEAVE',
    'MENSTRUAL_LEAVE',
    'MARRIAGE_LEAVE'
  ];
  const isPaid = paidLeaveTypes.includes(leaveType);
  
  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      employeeId,
      leaveType,
      isPaid,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      totalDays,
      reason,
      attachment: attachment || null,
      status: 'PENDING',
      currentApproverId: approverId,
      supervisorId: supervisorId || null
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
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
  
  return leaveRequest;
};

/**
 * Update leave balance after approval
 */
export const updateLeaveBalance = async (leaveRequest) => {
  const { employeeId, leaveType, totalDays } = leaveRequest;
  const currentYear = new Date().getFullYear();
  
  const balance = await prisma.leaveBalance.findFirst({
    where: {
      employeeId,
      year: currentYear
    }
  });
  
  if (!balance) return;
  
  const updateData = {};
  
  switch (leaveType) {
    case 'ANNUAL_LEAVE':
      updateData.annualUsed = balance.annualUsed + totalDays;
      updateData.annualRemaining = balance.annualRemaining - totalDays;
      break;
    case 'SICK_LEAVE':
      updateData.sickLeaveUsed = balance.sickLeaveUsed + totalDays;
      break;
    case 'MENSTRUAL_LEAVE':
      updateData.menstrualLeaveUsed = balance.menstrualLeaveUsed + totalDays;
      break;
    case 'UNPAID_LEAVE':
      updateData.unpaidLeaveUsed = balance.unpaidLeaveUsed + totalDays;
      break;
  }
  
  if (Object.keys(updateData).length > 0) {
    await prisma.leaveBalance.update({
      where: { id: balance.id },
      data: updateData
    });
  }
};

export default {
  calculateAnnualLeaveQuota,
  getOrCreateLeaveBalance,
  validateLeaveRequest,
  determineLeaveApprover,
  createLeaveRequest,
  updateLeaveBalance
};