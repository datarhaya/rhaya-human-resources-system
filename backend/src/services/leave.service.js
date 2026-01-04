// backend/src/services/leave.service.js
import prisma from '../config/database.js';

/**
 * Calculate working days between two dates (excluding weekends)
 */
export const calculateWorkingDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;
  
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
};

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
 * Uses upsert to handle race conditions and schema constraints
 */
export const getOrCreateLeaveBalance = async (employeeId, joinDate) => {
  const currentYear = new Date().getFullYear();
  const annualQuota = calculateAnnualLeaveQuota(joinDate);
  
  try {
    // Use upsert to handle both creation and retrieval atomically
    const balance = await prisma.leaveBalance.upsert({
      where: {
        employeeId_year: {
          employeeId,
          year: currentYear
        }
      },
      update: {
        // Update quota in case tenure changed
        annualQuota,
        annualRemaining: {
          increment: 0 // Don't change remaining, just ensure quota is current
        }
      },
      create: {
        employeeId,
        year: currentYear,
        annualQuota,
        annualRemaining: annualQuota,
        annualUsed: 0,
        sickLeaveUsed: 0,
        menstrualLeaveUsed: 0,
        unpaidLeaveUsed: 0,
        toilBalance: 0,
        toilUsed: 0,
        toilExpired: 0
      }
    });
    
    return balance;
  } catch (error) {
    console.error('Error in getOrCreateLeaveBalance:', error);
    throw error;
  }
};

/**
 * Calculate leave usage for a specific month
 * @param {string} leaveType - Optional: filter by specific leave type (e.g., 'ANNUAL_LEAVE')
 */
export const getMonthlyLeaveUsage = async (employeeId, year, month, leaveType = null) => {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  
  const whereClause = {
    employeeId,
    status: { in: ['PENDING', 'APPROVED'] },
    OR: [
      {
        AND: [
          { startDate: { lte: endOfMonth } },
          { endDate: { gte: startOfMonth } }
        ]
      }
    ]
  };
  
  // Add leave type filter if specified
  if (leaveType) {
    whereClause.leaveType = leaveType;
  }
  
  const requests = await prisma.leaveRequest.findMany({
    where: whereClause
  });
  
  let totalDays = 0;
  
  for (const request of requests) {
    const requestStart = new Date(request.startDate);
    const requestEnd = new Date(request.endDate);
    
    // Calculate overlap with the month
    const overlapStart = requestStart < startOfMonth ? startOfMonth : requestStart;
    const overlapEnd = requestEnd > endOfMonth ? endOfMonth : requestEnd;
    
    const daysInMonth = calculateWorkingDays(overlapStart, overlapEnd);
    totalDays += daysInMonth;
  }
  
  return totalDays;
};

/**
 * Validate leave request
 */
export const validateLeaveRequest = async (employeeId, leaveType, startDate, endDate, totalDays) => {
  const errors = [];
  
  // Get employee data
  const employee = await prisma.user.findUnique({
    where: { id: employeeId },
    select: { gender: true, joinDate: true }
  });
  
  if (!employee) {
    errors.push('Employee not found');
    return errors;
  }
  
  // Check if dates are valid
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) {
    errors.push('Start date must be before end date');
  }
  
  // Gender-based validation
  if (employee.gender === 'Male') {
    if (leaveType === 'MATERNITY_LEAVE') {
      errors.push('Maternity leave is only available for female employees');
    }
    if (leaveType === 'MENSTRUAL_LEAVE') {
      errors.push('Menstrual leave is only available for female employees');
    }
  }
  
  // Check if dates are in the past (except menstrual leave)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (leaveType !== 'MENSTRUAL_LEAVE' && start < today) {
    errors.push('Cannot request leave for past dates');
  }
  
  // For menstrual leave, allow today + up to 2 days forward
  if (leaveType === 'MENSTRUAL_LEAVE') {
    const twoDaysForward = new Date(today);
    twoDaysForward.setDate(twoDaysForward.getDate() + 2);
    
    if (start > twoDaysForward) {
      errors.push('Menstrual leave can only be requested for today or up to 2 days forward');
    }
  }
  
  // Calculate working days
  const workingDays = calculateWorkingDays(start, end);
  
  // Validate working days match totalDays
  if (Math.abs(workingDays - totalDays) > 0.1) {
    errors.push(`Calculated working days (${workingDays}) doesn't match requested days (${totalDays})`);
  }
  
  // Maximum 5 working days per request (except maternity leave)
  if (leaveType !== 'MATERNITY_LEAVE' && workingDays > 5) {
    errors.push('Maximum 5 working days per leave request (weekends excluded)');
  }
  
  // Check monthly limit (5 working days per month - ONLY for ANNUAL_LEAVE)
  if (leaveType === 'ANNUAL_LEAVE') {
    const requestMonth = start.getMonth() + 1;
    const requestYear = start.getFullYear();
    
    try {
      // Get only ANNUAL_LEAVE usage for this month
      const currentMonthUsage = await getMonthlyLeaveUsage(employeeId, requestYear, requestMonth, 'ANNUAL_LEAVE');
      
      if ((currentMonthUsage + workingDays) > 5) {
        const remaining = 5 - currentMonthUsage;
        errors.push(`Monthly annual leave limit exceeded. You have ${remaining} working days remaining for this month`);
      }
    } catch (monthError) {
      console.error('Error checking monthly usage:', monthError);
      // Continue validation even if monthly check fails
    }
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
    try {
      const balance = await getOrCreateLeaveBalance(employeeId, employee.joinDate);
      
      if (balance.annualRemaining < workingDays) {
        errors.push(`Insufficient annual leave balance. You have ${balance.annualRemaining} days remaining`);
      }
    } catch (balanceError) {
      console.error('Error checking annual leave balance:', balanceError);
      errors.push('Unable to verify annual leave balance. Please try again.');
    }
  }
  
  // Validate unpaid leave limits (max 14 days per year, max 10 consecutive working days)
  if (leaveType === 'UNPAID_LEAVE') {
    try {
      const currentYear = new Date().getFullYear();
      const balance = await getOrCreateLeaveBalance(employeeId, employee.joinDate);
      
      const unpaidUsed = balance?.unpaidLeaveUsed || 0;
      
      if (unpaidUsed + workingDays > 14) {
        errors.push(`Unpaid leave exceeds annual limit. You have used ${unpaidUsed} of 14 working days`);
      }
      
      if (workingDays > 10) {
        errors.push('Unpaid leave cannot exceed 10 consecutive working days');
      }
    } catch (unpaidError) {
      console.error('Error checking unpaid leave:', unpaidError);
      // Continue validation
    }
  }
  
  // Maternity leave validation (must be exactly 90 calendar days)
  if (leaveType === 'MATERNITY_LEAVE') {
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (diffDays !== 90) {
      errors.push('Maternity leave must be exactly 3 months (90 calendar days)');
    }
  }
  
  // Menstrual leave validation (only 1 day)
  if (leaveType === 'MENSTRUAL_LEAVE') {
    if (workingDays !== 1) {
      errors.push('Menstrual leave can only be 1 day');
    }
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
  if (employee.division?.headId) {
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
  
  try {
    const balance = await prisma.leaveBalance.findFirst({
      where: {
        employeeId,
        year: currentYear
      }
    });
    
    if (!balance) {
      console.warn(`No balance found for employee ${employeeId} year ${currentYear}`);
      return;
    }
    
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
  } catch (error) {
    console.error('Error updating leave balance:', error);
    throw error;
  }
};

export default {
  calculateWorkingDays,
  calculateAnnualLeaveQuota,
  getOrCreateLeaveBalance,
  getMonthlyLeaveUsage,
  validateLeaveRequest,
  determineLeaveApprover,
  createLeaveRequest,
  updateLeaveBalance
};