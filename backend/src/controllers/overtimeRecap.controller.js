// backend/src/controllers/overtimeRecap.controller.js
// Overtime Recap V2 - Complete Controller
// Created: January 2026

import { PrismaClient } from '@prisma/client';
import { addMonths } from 'date-fns';
import { sendEmail, sendOvertimeReminderEmail } from '../services/email.service.js';

const prisma = new PrismaClient();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format date for Indonesian locale
 */
function formatDate(date, locale = 'id-ID') {
  return new Date(date).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Get previous month's recap for carryover calculation
 */
async function getPreviousMonthRecap(employeeId, year, month) {
  let prevYear = year;
  let prevMonth = month - 1;
  
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = year - 1;
  }
  
  return await prisma.overtimeRecap.findUnique({
    where: {
      employeeId_year_month: {
        employeeId,
        year: prevYear,
        month: prevMonth
      }
    }
  });
}

/**
 * Create TOIL entries from recap
 */
async function createToilEntries({ employeeId, days, hoursSource, month, year, recapId }) {
  const earnedDate = new Date(year, month - 1, 1);
  const expiryDate = addMonths(earnedDate, 3);
  
  return await prisma.timeOffInLieu.create({
    data: {
      employeeId,
      days,
      hoursSource,
      earnedMonth: month,
      earnedYear: year,
      expiryMonth: expiryDate.getMonth() + 1,
      expiryYear: expiryDate.getFullYear(),
      status: 'available',
      recapId
    }
  });
}

/**
 * Check if previous months have any failed recaps
 */
async function checkPreviousFailuresSync(targetYear, targetMonth) {
  const failures = await prisma.overtimeRecap.findMany({
    where: {
      recapStatus: 'failed',
      OR: [
        { year: { lt: targetYear } },
        { 
          year: targetYear,
          month: { lt: targetMonth }
        }
      ]
    },
    include: {
      employee: {
        select: { 
          id: true, 
          name: true, 
          nip: true,
          division: { select: { name: true } }
        }
      }
    },
    orderBy: [
      { year: 'desc' },
      { month: 'desc' }
    ]
  });
  
  // Group by month/year
  const grouped = {};
  failures.forEach(failure => {
    const key = `${failure.year}-${failure.month}`;
    if (!grouped[key]) {
      grouped[key] = {
        year: failure.year,
        month: failure.month,
        count: 0,
        employees: []
      };
    }
    grouped[key].count++;
    grouped[key].employees.push({
      id: failure.employee.id,
      name: failure.employee.name,
      nip: failure.employee.nip,
      division: failure.employee.division?.name,
      failureReason: failure.failureReason
    });
  });
  
  return Object.values(grouped);
}

/**
 * Process single employee recap
 */
async function processEmployeeRecap({ 
  employee, 
  fromDate, 
  toDate, 
  month, 
  year, 
  userId 
}) {
  try {
    // 1. Check for pending overtimes in date range
    const pendingOvertimes = await prisma.overtimeRequest.findMany({
      where: {
        employeeId: employee.id,
        status: { in: ['PENDING', 'REVISION_REQUESTED'] },
        entries: {
          some: {
            date: {
              gte: new Date(fromDate),
              lte: new Date(toDate)
            }
          }
        }
      }
    });
    
    if (pendingOvertimes.length > 0) {
      // Create/update failed recap
      const recap = await prisma.overtimeRecap.upsert({
        where: {
          employeeId_year_month: {
            employeeId: employee.id,
            year: year,
            month: month
          }
        },
        update: {
          fromDate: new Date(fromDate),
          toDate: new Date(toDate),
          recapStatus: 'failed',
          failureReason: `Has ${pendingOvertimes.length} pending overtime request(s)`,
          recappedById: userId,
          recappedAt: new Date()
        },
        create: {
          employeeId: employee.id,
          month: month,
          year: year,
          fromDate: new Date(fromDate),
          toDate: new Date(toDate),
          totalHours: 0,
          paidHours: 0,
          excessHours: 0,
          carryoverHours: 0,
          totalToilHours: 0,
          toilDaysCreated: 0,
          remainingHours: 0,
          recapStatus: 'failed',
          failureReason: `Has ${pendingOvertimes.length} pending overtime request(s)`,
          recappedById: userId
        }
      });
      
      return {
        status: 'failed',
        employeeId: employee.id,
        employeeName: employee.name,
        nip: employee.nip,
        reason: `Has ${pendingOvertimes.length} pending overtime request(s)`,
        recapId: recap.id
      };
    }
    
    // 2. Get approved overtimes in date range that haven't been recapped
    const approvedOvertimes = await prisma.overtimeRequest.findMany({
      where: {
        employeeId: employee.id,
        status: 'APPROVED',
        isRecapped: false,
        entries: {
          some: {
            date: {
              gte: new Date(fromDate),
              lte: new Date(toDate)
            }
          }
        }
      },
      include: {
        entries: {
          where: {
            date: {
              gte: new Date(fromDate),
              lte: new Date(toDate)
            }
          },
          orderBy: { date: 'asc' }
        }
      }
    });
    
    // 3. Calculate total hours from entries
    const totalHours = approvedOvertimes.reduce((sum, ot) => 
      sum + ot.entries.reduce((s, e) => s + e.hours, 0), 0
    );
    
    // 4. Calculate payment (cap at 72 hours per recap period)
    const paidHours = Math.min(totalHours, 72);
    const excessHours = Math.max(totalHours - 72, 0);
    
    // 5. Get carryover from previous month
    const previousRecap = await getPreviousMonthRecap(employee.id, year, month);
    const carryoverHours = previousRecap?.remainingHours || 0;
    
    // 6. Calculate TOIL
    const totalToilHours = excessHours + carryoverHours;
    const toilDaysCreated = Math.floor(totalToilHours / 8);
    const remainingHours = totalToilHours % 8;
    
    // 7. Create/update recap record
    const recap = await prisma.overtimeRecap.upsert({
      where: {
        employeeId_year_month: {
          employeeId: employee.id,
          year: year,
          month: month
        }
      },
      update: {
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        totalHours,
        paidHours,
        excessHours,
        carryoverHours,
        totalToilHours,
        toilDaysCreated,
        remainingHours,
        recapStatus: 'success',
        failureReason: null,
        recappedById: userId,
        recappedAt: new Date(),
        notes: totalHours === 0 ? 'No overtime in this period' : null
      },
      create: {
        employeeId: employee.id,
        month: month,
        year: year,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        totalHours,
        paidHours,
        excessHours,
        carryoverHours,
        totalToilHours,
        toilDaysCreated,
        remainingHours,
        recapStatus: 'success',
        recappedById: userId,
        notes: totalHours === 0 ? 'No overtime in this period' : null
      }
    });
    
    // 8. Mark overtimes as recapped
    if (approvedOvertimes.length > 0) {
      await prisma.overtimeRequest.updateMany({
        where: {
          id: { in: approvedOvertimes.map(ot => ot.id) }
        },
        data: {
          isRecapped: true,
          recappedDate: new Date(),
          recapId: recap.id
        }
      });
    }
    
    // 9. Update overtime balance (reset to 0)
    await prisma.overtimeBalance.upsert({
      where: { employeeId: employee.id },
      update: {
        currentBalance: 0,
        lastProcessedAt: new Date()
      },
      create: {
        employeeId: employee.id,
        currentBalance: 0,
        pendingHours: 0,
        totalPaid: 0,
        lastProcessedAt: new Date()
      }
    });
    
    // 10. Create TOIL entries if needed
    if (toilDaysCreated > 0) {
      await createToilEntries({
        employeeId: employee.id,
        days: toilDaysCreated,
        hoursSource: totalToilHours,
        month,
        year,
        recapId: recap.id
      });
      
      // 11. Update leave balance with TOIL
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_year: {
            employeeId: employee.id,
            year: year
          }
        },
        update: {
          toilBalance: {
            increment: toilDaysCreated
          }
        },
        create: {
          employeeId: employee.id,
          year: year,
          annualQuota: 12,
          annualUsed: 0,
          annualRemaining: 12,
          toilBalance: toilDaysCreated,
          toilUsed: 0,
          toilExpired: 0
        }
      });
    }
    
    return {
      status: 'success',
      employeeId: employee.id,
      employeeName: employee.name,
      nip: employee.nip,
      totalHours,
      paidHours,
      toilDaysCreated,
      recapId: recap.id
    };
    
  } catch (error) {
    console.error(`Error processing employee ${employee.name}:`, error);
    return {
      status: 'failed',
      employeeId: employee.id,
      employeeName: employee.name,
      nip: employee.nip,
      reason: error.message
    };
  }
}

// ============================================
// API ENDPOINTS
// ============================================

/**
 * Check for previous month failures before starting new recap
 * GET /api/overtime-recap/check-previous-failures?year=2026&month=2
 */
export const checkPreviousFailures = async (req, res) => {
  try {
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ 
        error: 'Year and month required' 
      });
    }
    
    const failures = await checkPreviousFailuresSync(
      parseInt(year), 
      parseInt(month)
    );
    
    return res.json({
      canProceed: failures.length === 0,
      failures: failures,
      message: failures.length > 0 
        ? `Found ${failures.length} period(s) with failed recaps` 
        : 'No previous failures, can proceed'
    });
    
  } catch (error) {
    console.error('Check previous failures error:', error);
    return res.status(500).json({ 
      error: 'Failed to check previous failures',
      details: error.message 
    });
  }
};

/**
 * Send email reminder to all employees
 * POST /api/overtime-recap/send-reminder
 */
// Send email reminder to all employees
export const sendReminderEmail = async (req, res) => {
  try {
    const { recapDate, fromDate, toDate, periodLabel } = req.body;
    
    if (!recapDate || !fromDate || !toDate || !periodLabel) {
      return res.status(400).json({ 
        error: 'All fields required: recapDate, fromDate, toDate, periodLabel' 
      });
    }
    
    // Get all active employees (exclude RESIGNED, INACTIVE, ADMIN, FREELANCE)
    const employees = await prisma.user.findMany({
      where: {
        employeeStatus: { notIn: ['RESIGNED', 'INACTIVE', 'ADMIN', 'FREELANCE'] }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    
    if (employees.length === 0) {
      return res.json({
        success: true,
        emailsSent: 0,
        failed: 0,
        message: 'No active employees found'
      });
    }
    
    const results = {
      sent: [],
      failed: []
    };
    
    // Send email to each employee
    for (const employee of employees) {
      try {
        if (!employee.email) {
          results.failed.push({
            employeeId: employee.id,
            employeeName: employee.name,
            reason: 'No email address'
          });
          continue;
        }
        
        await sendOvertimeReminderEmail({
          employeeName: employee.name,
          employeeEmail: employee.email,
          recapDate: formatDate(recapDate),
          fromDate: formatDate(fromDate),
          toDate: formatDate(toDate),
          periodLabel,
          systemUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
        });
        
        results.sent.push({
          employeeId: employee.id,
          employeeName: employee.name,
          email: employee.email
        });
        
      } catch (error) {
        console.error(`Failed to send email to ${employee.email}:`, error);
        results.failed.push({
          employeeId: employee.id,
          employeeName: employee.name,
          email: employee.email,
          reason: error.message
        });
      }
    }
    
    return res.json({
      success: true,
      emailsSent: results.sent.length,
      failed: results.failed.length,
      totalEmployees: employees.length,
      details: {
        sent: results.sent,
        failed: results.failed
      }
    });
    
  } catch (error) {
    console.error('Send reminder email error:', error);
    return res.status(500).json({ 
      error: 'Failed to send reminder emails',
      details: error.message 
    });
  }
};

/**
 * Bulk process all employees for a date range
 * POST /api/overtime-recap/bulk-recap
 */
export const bulkRecap = async (req, res) => {
  try {
    const { fromDate, toDate, month, year } = req.body;
    const userId = req.user.id;
    
    // Validate inputs
    if (!fromDate || !toDate || !month || !year) {
      return res.status(400).json({ 
        error: 'All fields required: fromDate, toDate, month, year' 
      });
    }
    
    // Check for previous failures (HARD BLOCK)
    const previousFailures = await checkPreviousFailuresSync(year, month);
    if (previousFailures.length > 0) {
      return res.status(400).json({
        error: 'Cannot start recap with previous month failures',
        message: 'Please resolve failed recaps from previous months first',
        failures: previousFailures,
        canProceed: false
      });
    }
    
    // Lock the system
    await prisma.systemSettings.update({
      where: { id: 'system-settings-singleton' },
      data: {
        isRecapInProgress: true,
        isApprovalLocked: true
      }
    });
    
    try {
      // Get all employees (including those with no overtime)
      const employees = await prisma.user.findMany({
        where: {
          employeeStatus: { notIn: ['RESIGNED', 'INACTIVE', 'ADMIN', 'FREELANCE'] }  // Only active employees
        },
        select: {
          id: true,
          name: true,
          nip: true,
          email: true,
          division: {
            select: { name: true }
          }
        },
        orderBy: { name: 'asc' }
      });
      
      if (employees.length === 0) {
        throw new Error('No active employees found');
      }
      
      const results = {
        success: [],
        failed: []
      };
      
      // Process each employee
      for (const employee of employees) {
        const result = await processEmployeeRecap({
          employee,
          fromDate,
          toDate,
          month,
          year,
          userId
        });
        
        if (result.status === 'success') {
          results.success.push(result);
        } else {
          results.failed.push(result);
        }
      }
      
      // Update system settings
      await prisma.systemSettings.update({
        where: { id: 'system-settings-singleton' },
        data: {
          lastRecapDate: new Date(toDate),
          lastRecapMonth: month,
          lastRecapYear: year,
          lastRecapCompletedAt: new Date(),
          lastRecapBy: userId,
          isRecapInProgress: false,
          isApprovalLocked: false
        }
      });
      
      return res.json({
        success: true,
        message: 'Bulk recap completed',
        summary: {
          total: employees.length,
          succeeded: results.success.length,
          failed: results.failed.length
        },
        data: results
      });
      
    } catch (error) {
      // Unlock on error
      await prisma.systemSettings.update({
        where: { id: 'system-settings-singleton' },
        data: {
          isRecapInProgress: false,
          isApprovalLocked: false
        }
      });
      throw error;
    }
    
  } catch (error) {
    console.error('Bulk recap error:', error);
    return res.status(500).json({ 
      error: 'Failed to process bulk recap',
      details: error.message 
    });
  }
};

/**
 * Retry only failed employees from a specific period
 * POST /api/overtime-recap/retry-failed
 */
export const retryFailed = async (req, res) => {
  try {
    const { month, year } = req.body;
    const userId = req.user.id;
    
    if (!month || !year) {
      return res.status(400).json({ 
        error: 'Month and year required' 
      });
    }
    
    // Get failed recaps for this period
    const failedRecaps = await prisma.overtimeRecap.findMany({
      where: {
        year: parseInt(year),
        month: parseInt(month),
        recapStatus: 'failed'
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            nip: true,
            email: true,
            division: {
              select: { name: true }
            }
          }
        }
      }
    });
    
    if (failedRecaps.length === 0) {
      return res.json({
        success: true,
        message: 'No failed recaps to retry',
        processed: 0,
        nowSuccess: 0,
        stillFailed: 0
      });
    }
    
    const results = {
      nowSuccess: [],
      stillFailed: []
    };
    
    // Retry each failed employee
    for (const recap of failedRecaps) {
      const result = await processEmployeeRecap({
        employee: recap.employee,
        fromDate: recap.fromDate,
        toDate: recap.toDate,
        month: recap.month,
        year: recap.year,
        userId
      });
      
      if (result.status === 'success') {
        results.nowSuccess.push(result);
      } else {
        results.stillFailed.push(result);
      }
    }
    
    return res.json({
      success: true,
      message: 'Retry completed',
      processed: failedRecaps.length,
      nowSuccess: results.nowSuccess.length,
      stillFailed: results.stillFailed.length,
      details: results
    });
    
  } catch (error) {
    console.error('Retry failed error:', error);
    return res.status(500).json({ 
      error: 'Failed to retry failed recaps',
      details: error.message 
    });
  }
};

/**
 * Get failed recaps
 * GET /api/overtime-recap/failed?month=1&year=2026
 */
export const getFailedRecaps = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    const where = {
      recapStatus: 'failed'
    };
    
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    
    const failedRecaps = await prisma.overtimeRecap.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            nip: true,
            email: true,
            division: {
              select: { name: true }
            }
          }
        },
        recappedBy: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { employee: { name: 'asc' } }
      ]
    });
    
    return res.json({
      success: true,
      count: failedRecaps.length,
      data: failedRecaps
    });
    
  } catch (error) {
    console.error('Get failed recaps error:', error);
    return res.status(500).json({ 
      error: 'Failed to get failed recaps',
      details: error.message 
    });
  }
};

/**
 * Manual adjustment of recap cutoff date
 * PATCH /api/overtime-recap/adjust-date
 */
export const adjustRecapDate = async (req, res) => {
  try {
    const { newDate, reason } = req.body;
    const userId = req.user.id;
    const userLevel = req.user.accessLevel;
    
    // Only Admin/HR can adjust (Level 1-2)
    if (userLevel > 2) {
      return res.status(403).json({ 
        error: 'Unauthorized. Only Admin/HR can adjust recap date' 
      });
    }
    
    if (!newDate || !reason) {
      return res.status(400).json({ 
        error: 'New date and reason required' 
      });
    }
    
    // Get current settings
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'system-settings-singleton' }
    });
    
    const oldDate = settings?.lastRecapDate;
    
    // Update system settings
    await prisma.systemSettings.update({
      where: { id: 'system-settings-singleton' },
      data: {
        lastRecapDate: new Date(newDate)
      }
    });
    
    // Log adjustment for audit trail
    await prisma.recapDateAdjustment.create({
      data: {
        oldDate: oldDate || new Date(),
        newDate: new Date(newDate),
        reason,
        adjustedBy: userId
      }
    });
    
    return res.json({
      success: true,
      message: 'Recap date adjusted successfully',
      oldDate: oldDate,
      newDate: newDate,
      adjustedBy: req.user.name
    });
    
  } catch (error) {
    console.error('Adjust recap date error:', error);
    return res.status(500).json({ 
      error: 'Failed to adjust recap date',
      details: error.message 
    });
  }
};

/**
 * Get date adjustment history
 * GET /api/overtime-recap/date-adjustments
 */
export const getDateAdjustments = async (req, res) => {
  try {
    const adjustments = await prisma.recapDateAdjustment.findMany({
      include: {
        adjuster: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });
    
    return res.json({
      success: true,
      count: adjustments.length,
      data: adjustments
    });
    
  } catch (error) {
    console.error('Get date adjustments error:', error);
    return res.status(500).json({ 
      error: 'Failed to get date adjustments',
      details: error.message 
    });
  }
};

/**
 * Get system settings
 * GET /api/overtime-recap/system-settings
 */
export const getSystemSettings = async (req, res) => {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'system-settings-singleton' },
      include: {
        lastRecapByUser: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!settings) {
      return res.json({
        success: true,
        data: null,
        message: 'No settings found'
      });
    }
    
    return res.json({
      success: true,
      data: settings
    });
    
  } catch (error) {
    console.error('Get system settings error:', error);
    return res.status(500).json({ 
      error: 'Failed to get system settings',
      details: error.message 
    });
  }
};

/**
 * Get all recaps with filters (ENHANCED)
 * GET /api/overtime-recap/recap
 */
export const getAllRecaps = async (req, res) => {
  try {
    const { year, month, employeeId, status } = req.query;
    
    const where = {};
    
    if (year) where.year = parseInt(year);
    if (month) where.month = parseInt(month);
    if (employeeId) where.employeeId = employeeId;
    if (status) where.recapStatus = status;
    
    const recaps = await prisma.overtimeRecap.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            nip: true,
            email: true,
            overtimeRate: true,
            accessLevel: true,
            division: {
              select: {
                name: true
              }
            }
          }
        },
        overtimeRequests: {
          select: {
            id: true,
            submittedAt: true,
            totalHours: true,
            entries: {
              select: {
                id: true,
                date: true,
                hours: true,
                description: true
              },
              orderBy: {
                date: 'asc'
              }
            }
          },
          orderBy: {
            submittedAt: 'asc'
          }
        },
        recappedBy: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { employee: { name: 'asc' } }
      ]
    });
    
    return res.json({
      success: true,
      count: recaps.length,
      data: recaps
    });
    
  } catch (error) {
    console.error('Get all recaps error:', error);
    return res.status(500).json({ 
      error: 'Failed to get recaps',
      details: error.message 
    });
  }
};

/**
 * Get single recap detail
 * GET /api/overtime-recap/recap/:recapId
 */
export const getRecapDetail = async (req, res) => {
  try {
    const { recapId } = req.params;
    
    const recap = await prisma.overtimeRecap.findUnique({
      where: { id: recapId },
      include: {
        employee: {
          include: {
            division: true
          }
        },
        overtimeRequests: {
          include: {
            entries: {
              orderBy: { date: 'asc' }
            }
          }
        },
        recappedBy: {
          select: {
            name: true,
            email: true
          }
        },
        toilEntries: true
      }
    });
    
    if (!recap) {
      return res.status(404).json({ 
        error: 'Recap not found' 
      });
    }
    
    return res.json({
      success: true,
      data: recap
    });
    
  } catch (error) {
    console.error('Get recap detail error:', error);
    return res.status(500).json({ 
      error: 'Failed to get recap detail',
      details: error.message 
    });
  }
};

/**
 * Create individual recap
 * POST /api/overtime-recap/recap
 */
export const createIndividualRecap = async (req, res) => {
  try {
    const { employeeId, year, month } = req.body;
    const userId = req.user.id;
    
    if (!employeeId || !year || !month) {
      return res.status(400).json({ 
        error: 'Employee ID, year, and month required' 
      });
    }
    
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        name: true,
        nip: true,
        division: { select: { name: true } }
      }
    });
    
    if (!employee) {
      return res.status(404).json({ 
        error: 'Employee not found' 
      });
    }
    
    const fromDate = new Date(year, month - 1, 1);
    const toDate = new Date(year, month, 0);
    
    const result = await processEmployeeRecap({
      employee,
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: toDate.toISOString().split('T')[0],
      month,
      year,
      userId
    });
    
    if (result.status === 'failed') {
      return res.status(400).json({
        error: 'Failed to create recap',
        reason: result.reason,
        data: result
      });
    }
    
    return res.json({
      success: true,
      message: 'Recap created successfully',
      data: result
    });
    
  } catch (error) {
    console.error('Create individual recap error:', error);
    return res.status(500).json({ 
      error: 'Failed to create recap',
      details: error.message 
    });
  }
};