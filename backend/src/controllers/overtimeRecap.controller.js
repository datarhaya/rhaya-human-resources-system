// backend/src/controllers/overtimeRecap.controller.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Calculate expiry date (3 months after earned month)
 */
function calculateExpiryDate(earnedYear, earnedMonth) {
  let expiryMonth = earnedMonth + 3;
  let expiryYear = earnedYear;
  
  if (expiryMonth > 12) {
    expiryMonth -= 12;
    expiryYear += 1;
  }
  
  return { expiryMonth, expiryYear };
}

/**
 * Get carryover hours from previous month
 */
async function getCarryoverHours(employeeId, year, month) {
  let prevMonth = month - 1;
  let prevYear = year;
  
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  
  const prevRecap = await prisma.overtimeRecap.findUnique({
    where: {
      employeeId_year_month: {
        employeeId,
        year: prevYear,
        month: prevMonth
      }
    }
  });
  
  return prevRecap?.remainingHours || 0;
}

/**
 * Process recap for a single employee
 */
async function processEmployeeRecap(employeeId, year, month, recappedById) {
  console.log(`Processing recap for employee ${employeeId}, ${year}-${month}`);

  // Check if recap already exists
  const existing = await prisma.overtimeRecap.findUnique({
    where: {
      employeeId_year_month: {
        employeeId,
        year: parseInt(year),
        month: parseInt(month)
      }
    }
  });

  if (existing) {
    return { 
      success: false, 
      error: 'Recap already exists for this period',
      employeeId 
    };
  }

  // Get period dates
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  console.log('Date range:', { startDate, endDate });

  // Get all approved overtime requests for this period
  const overtimeRequests = await prisma.overtimeRequest.findMany({
    where: {
      employeeId,
      status: 'APPROVED',
      recapId: null,
      entries: {
        some: {
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      }
    },
    include: {
      entries: {
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      }
    }
  });

  console.log(`Found ${overtimeRequests.length} approved requests`);

  if (overtimeRequests.length === 0) {
    return {
      success: false,
      error: 'No approved overtime requests found for this period',
      employeeId
    };
  }

  // Calculate total hours from entries in this period
  const totalHours = overtimeRequests.reduce((sum, req) => {
    const periodHours = req.entries.reduce((entrySum, entry) => {
      return entrySum + parseFloat(entry.hours || 0);
    }, 0);
    return sum + periodHours;
  }, 0);

  console.log('Total hours:', totalHours);

  if (totalHours === 0) {
    return {
      success: false,
      error: 'No overtime hours found in this period',
      employeeId
    };
  }

  // Get carryover from previous month
  const carryoverHours = await getCarryoverHours(employeeId, parseInt(year), parseInt(month));

  // Calculate paid hours (max 72)
  const paidHours = Math.min(totalHours, 72);

  // Calculate excess hours (beyond 72)
  const excessHours = Math.max(totalHours - 72, 0);

  // Calculate TOIL
  const totalToilHours = excessHours + carryoverHours;
  const toilDaysCreated = Math.floor(totalToilHours / 8);
  const remainingHours = totalToilHours % 8;

  console.log('Recap calculation:', {
    totalHours,
    paidHours,
    excessHours,
    carryoverHours,
    totalToilHours,
    toilDaysCreated,
    remainingHours
  });

  // Create recap in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create recap
    const recap = await tx.overtimeRecap.create({
      data: {
        employeeId,
        year: parseInt(year),
        month: parseInt(month),
        totalHours,
        paidHours,
        excessHours,
        carryoverHours,
        totalToilHours,
        toilDaysCreated,
        remainingHours,
        recappedById
      }
    });

    // Link overtime requests to recap
    await tx.overtimeRequest.updateMany({
      where: {
        id: {
          in: overtimeRequests.map(r => r.id)
        }
      },
      data: {
        recapId: recap.id
      }
    });

    // Create TOIL entries if days were earned
    if (toilDaysCreated > 0) {
      const { expiryMonth, expiryYear } = calculateExpiryDate(parseInt(year), parseInt(month));

      await tx.timeOffInLieu.create({
        data: {
          employeeId,
          days: toilDaysCreated,
          hoursSource: totalToilHours,
          earnedMonth: parseInt(month),
          earnedYear: parseInt(year),
          expiryMonth,
          expiryYear,
          recapId: recap.id
        }
      });

      // Update leave balance TOIL count
      await tx.leaveBalance.upsert({
        where: {
          employeeId_year: {
            employeeId,
            year: parseInt(year)
          }
        },
        update: {
          toilBalance: {
            increment: toilDaysCreated
          }
        },
        create: {
          employeeId,
          year: parseInt(year),
          annualQuota: 14,
          toilBalance: toilDaysCreated
        }
      });
    }

    // Reset employee's current overtime balance
    const balanceExists = await tx.overtimeBalance.findUnique({
      where: { employeeId }
    });

    if (balanceExists) {
      await tx.overtimeBalance.update({
        where: { employeeId },
        data: {
          currentBalance: 0,
          lastResetAt: new Date()
        }
      });
    }

    return recap;
  });

  console.log('✅ Recap created:', result.id);

  return {
    success: true,
    recap: result,
    toilDaysCreated,
    employeeId
  };
}

/**
 * Create monthly overtime recap for single employee
 * POST /api/overtime-recap/recap
 */
export const createOvertimeRecap = async (req, res) => {
  try {
    const { employeeId, year, month } = req.body;

    console.log('Creating recap:', { employeeId, year, month });

    // Validate input
    if (!employeeId || !year || !month) {
      return res.status(400).json({
        error: 'Employee ID, year, and month are required'
      });
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({
        error: 'Month must be between 1 and 12'
      });
    }

    const result = await processEmployeeRecap(employeeId, year, month, req.user.id);

    if (!result.success) {
      return res.status(400).json({
        error: result.error
      });
    }

    // Fetch full recap with relations
    const fullRecap = await prisma.overtimeRecap.findUnique({
      where: { id: result.recap.id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            nip: true,
            accessLevel: true,
            overtimeRate: true
          }
        },
        overtimeRequests: {
          select: {
            id: true,
            submittedAt: true,
            totalHours: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: `Recap created successfully. ${result.toilDaysCreated} TOIL days earned.`,
      data: fullRecap
    });

  } catch (error) {
    console.error('❌ Create recap error:', error);
    res.status(500).json({
      error: 'Failed to create recap',
      message: error.message
    });
  }
};

/**
 * Bulk process - Create recap for ALL employees
 * POST /api/overtime-recap/bulk-recap
 */
export const bulkCreateRecap = async (req, res) => {
  try {
    const { year, month } = req.body;

    console.log('Bulk recap for:', { year, month });

    if (!year || !month) {
      return res.status(400).json({
        error: 'Year and month are required'
      });
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({
        error: 'Month must be between 1 and 12'
      });
    }

    // Get period dates
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Find all employees with approved overtime in this period
    const employeesWithOT = await prisma.overtimeRequest.findMany({
      where: {
        status: 'APPROVED',
        recapId: null,
        entries: {
          some: {
            date: {
              gte: startDate,
              lte: endDate
            }
          }
        }
      },
      select: {
        employeeId: true
      },
      distinct: ['employeeId']
    });

    console.log(`Found ${employeesWithOT.length} employees with overtime`);

    if (employeesWithOT.length === 0) {
      return res.status(400).json({
        error: 'No approved overtime found for any employee in this period'
      });
    }

    // Process each employee
    const results = {
      success: [],
      failed: []
    };

    for (const { employeeId } of employeesWithOT) {
      try {
        const result = await processEmployeeRecap(employeeId, year, month, req.user.id);
        
        if (result.success) {
          results.success.push({
            employeeId,
            recapId: result.recap.id,
            toilDays: result.toilDaysCreated
          });
        } else {
          results.failed.push({
            employeeId,
            error: result.error
          });
        }
      } catch (error) {
        console.error(`Failed to process ${employeeId}:`, error);
        results.failed.push({
          employeeId,
          error: error.message
        });
      }
    }

    console.log('Bulk recap completed:', results);

    res.json({
      success: true,
      message: `Processed ${results.success.length} employees successfully, ${results.failed.length} failed`,
      data: results
    });

  } catch (error) {
    console.error('❌ Bulk recap error:', error);
    res.status(500).json({
      error: 'Failed to create bulk recap',
      message: error.message
    });
  }
};

/**
 * Get all recaps (Admin/HR view) - WITH DETAILED ENTRIES
 * GET /api/overtime-recap/recap
 */
export const getAllRecaps = async (req, res) => {
  try {
    const { year, month, employeeId } = req.query;

    const where = {};
    if (year) where.year = parseInt(year);
    if (month) where.month = parseInt(month);
    if (employeeId) where.employeeId = employeeId;

    const recaps = await prisma.overtimeRecap.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            nip: true,
            accessLevel: true,
            overtimeRate: true,
            division: {
              select: { id: true, name: true }
            }
          }
        },
        // ⭐ IMPROVED: Include full overtime requests with entries
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
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { employee: { name: 'asc' } }
      ]
    });

    res.json({
      success: true,
      data: recaps
    });

  } catch (error) {
    console.error('Get recaps error:', error);
    res.status(500).json({
      error: 'Failed to fetch recaps',
      message: error.message
    });
  }
};

/**
 * Get single recap detail with all entries
 * GET /api/overtime-recap/recap/:recapId
 */
export const getRecapDetail = async (req, res) => {
  try {
    const { recapId } = req.params;

    const recap = await prisma.overtimeRecap.findUnique({
      where: { id: recapId },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            nip: true,
            accessLevel: true,
            overtimeRate: true,
            division: {
              select: { id: true, name: true }
            },
            role: {
              select: { id: true, name: true }
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
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!recap) {
      return res.status(404).json({
        error: 'Recap not found'
      });
    }

    res.json({
      success: true,
      data: recap
    });

  } catch (error) {
    console.error('Get recap detail error:', error);
    res.status(500).json({
      error: 'Failed to fetch recap detail',
      message: error.message
    });
  }
};

/**
 * Get my recaps (Employee view)
 * GET /api/overtime-recap/my-recaps
 */
export const getMyRecaps = async (req, res) => {
  try {
    const employeeId = req.user.id;

    const recaps = await prisma.overtimeRecap.findMany({
      where: { employeeId },
      include: {
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
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });

    res.json({
      success: true,
      data: recaps
    });

  } catch (error) {
    console.error('Get my recaps error:', error);
    res.status(500).json({
      error: 'Failed to fetch recaps',
      message: error.message
    });
  }
};

/**
 * Expire old TOIL entries (Cron job)
 * POST /api/overtime-recap/toil/expire
 */
export const expireOldToil = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    console.log('Checking for expired TOIL:', { currentYear, currentMonth });

    const expiredEntries = await prisma.timeOffInLieu.findMany({
      where: {
        status: 'available',
        OR: [
          { expiryYear: { lt: currentYear } },
          {
            expiryYear: currentYear,
            expiryMonth: { lt: currentMonth }
          }
        ]
      }
    });

    if (expiredEntries.length === 0) {
      return res.json({
        success: true,
        message: 'No expired TOIL entries found'
      });
    }

    console.log(`Found ${expiredEntries.length} expired TOIL entries`);

    const result = await prisma.$transaction(async (tx) => {
      await tx.timeOffInLieu.updateMany({
        where: {
          id: {
            in: expiredEntries.map(e => e.id)
          }
        },
        data: {
          status: 'expired',
          expiredDate: new Date()
        }
      });

      for (const entry of expiredEntries) {
        await tx.leaveBalance.updateMany({
          where: {
            employeeId: entry.employeeId,
            year: currentYear
          },
          data: {
            toilBalance: {
              decrement: entry.days
            },
            toilExpired: {
              increment: entry.days
            }
          }
        });
      }

      return expiredEntries;
    });

    console.log(`✅ Expired ${result.length} TOIL entries`);

    res.json({
      success: true,
      message: `${result.length} TOIL entries expired`,
      data: result
    });

  } catch (error) {
    console.error('Expire TOIL error:', error);
    res.status(500).json({
      error: 'Failed to expire TOIL',
      message: error.message
    });
  }
};

/**
 * Get TOIL balance for employee
 * GET /api/overtime-recap/toil/balance/:employeeId
 */
export const getToilBalance = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const toilEntries = await prisma.timeOffInLieu.findMany({
      where: {
        employeeId,
        status: 'available'
      },
      orderBy: [
        { earnedYear: 'asc' },
        { earnedMonth: 'asc' }
      ]
    });

    const totalDays = toilEntries.reduce((sum, entry) => sum + entry.days, 0);

    res.json({
      success: true,
      data: {
        totalDays,
        entries: toilEntries
      }
    });

  } catch (error) {
    console.error('Get TOIL balance error:', error);
    res.status(500).json({
      error: 'Failed to fetch TOIL balance',
      message: error.message
    });
  }
};

export default {
  createOvertimeRecap,
  bulkCreateRecap,
  getAllRecaps,
  getRecapDetail,
  getMyRecaps,
  expireOldToil,
  getToilBalance
};