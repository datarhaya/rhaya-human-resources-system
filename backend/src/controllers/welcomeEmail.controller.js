// backend/src/controllers/welcomeEmail.controller.js
// Controller for sending welcome emails to employees

import { sendWelcomeEmailsToAll } from '../services/welcomeEmail.service.js';

/**
 * Send test welcome email to specific email
 * POST /api/auth/send-welcome-test
 * Body: { email: "test@example.com" }
 */
export const sendTestWelcomeEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required for test' 
      });
    }

    console.log(`🧪 TEST MODE: Sending welcome email to ${email}`);

    const result = await sendWelcomeEmailsToAll(true, email);

    return res.json({
      success: true,
      message: `Test email sent to ${email}`,
      data: result
    });

  } catch (error) {
    console.error('❌ Send test welcome email error:', error);
    return res.status(500).json({ 
      error: 'Failed to send test email',
      details: error.message 
    });
  }
};

/**
 * Send welcome emails to ALL active employees
 * POST /api/auth/send-welcome-all
 * Requires Admin/HR access (accessLevel 1-2)
 */
export const sendWelcomeEmailsToAllEmployees = async (req, res) => {
  try {
    // Only Admin/HR can trigger this
    if (req.user.accessLevel > 2) {
      return res.status(403).json({ 
        error: 'Only Admin or HR can send welcome emails to all employees' 
      });
    }

    console.log(`🚀 PRODUCTION MODE: Sending welcome emails to all active employees`);
    console.log(`Triggered by: ${req.user.name} (${req.user.email})`);

    const result = await sendWelcomeEmailsToAll(false, null);

    return res.json({
      success: true,
      message: `Welcome emails sent to ${result.sent} employees`,
      data: result
    });

  } catch (error) {
    console.error('❌ Send welcome emails error:', error);
    return res.status(500).json({ 
      error: 'Failed to send welcome emails',
      details: error.message 
    });
  }
};

/**
 * Get statistics about welcome email readiness
 * GET /api/auth/welcome-stats
 */
export const getWelcomeEmailStats = async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const stats = await prisma.user.groupBy({
      by: ['employeeStatus'],
      _count: true,
      where: {
        employeeStatus: { not: 'Inactive' }
      }
    });

    const activeCount = await prisma.user.count({
      where: {
        employeeStatus: { not: 'Inactive' }
      }
    });

    const withEmail = await prisma.user.count({
      where: {
        employeeStatus: { not: 'Inactive' },
        email: { not: null }
      }
    });

    const withNip = await prisma.user.count({
      where: {
        employeeStatus: { not: 'Inactive' },
        nip: { not: null }
      }
    });

    const ready = await prisma.user.count({
      where: {
        employeeStatus: { not: 'Inactive' },
        email: { not: null },
        nip: { not: null }
      }
    });

    await prisma.$disconnect();

    return res.json({
      success: true,
      data: {
        total: activeCount,
        withEmail,
        withNip,
        ready,
        notReady: activeCount - ready,
        readyPercentage: Math.round((ready / activeCount) * 100),
        breakdown: stats
      }
    });

  } catch (error) {
    console.error('❌ Get welcome stats error:', error);
    return res.status(500).json({ 
      error: 'Failed to get statistics',
      details: error.message 
    });
  }
};

export default {
  sendTestWelcomeEmail,
  sendWelcomeEmailsToAllEmployees,
  getWelcomeEmailStats
};
