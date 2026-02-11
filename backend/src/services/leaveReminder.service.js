// backend/src/services/leaveReminder.service.js
import { PrismaClient } from '@prisma/client';
import { addDays, startOfDay, isSameDay } from 'date-fns';
import { sendLeaveReminderH7Email } from './email.service.js';

const prisma = new PrismaClient();

/**
 * Send leave reminder emails for leaves starting in 7 days
 * Called by scheduler daily or when leave is approved
 */
export async function sendLeaveRemindersH7() {
  try {
    const today = startOfDay(new Date());
    const targetDate = addDays(today, 7);

    console.log(`[Leave Reminder] Checking for leaves starting on ${targetDate.toDateString()}...`);

    // Find all approved leaves starting exactly 7 days from now
    const upcomingLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED',
        startDate: {
          gte: startOfDay(targetDate),
          lt: addDays(startOfDay(targetDate), 1)
        }
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

    console.log(`[Leave Reminder] Found ${upcomingLeaves.length} leaves starting in 7 days`);

    if (upcomingLeaves.length === 0) {
      return {
        success: true,
        message: 'No leaves starting in 7 days',
        sent: 0
      };
    }

    let totalSent = 0;

    // Process each leave
    for (const leave of upcomingLeaves) {
      try {
        const sentCount = await sendReminderForLeave(leave);
        totalSent += sentCount;
      } catch (error) {
        console.error(`[Leave Reminder] Error processing leave ${leave.id}:`, error);
      }
    }

    return {
      success: true,
      message: `Leave reminders sent successfully`,
      leavesProcessed: upcomingLeaves.length,
      emailsSent: totalSent
    };

  } catch (error) {
    console.error('[Leave Reminder] Error in sendLeaveRemindersH7:', error);
    throw error;
  }
}

/**
 * Send reminder for a specific leave request
 * Used when leave is approved less than 7 days before start date
 */
export async function sendImmediateLeaveReminder(leaveRequestId) {
  try {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        employee: {
          include: {
            division: true,
            role: true
          }
        }
      }
    });

    if (!leave) {
      throw new Error('Leave request not found');
    }

    if (leave.status !== 'APPROVED') {
      console.log(`[Leave Reminder] Leave ${leaveRequestId} not approved yet, skipping immediate reminder`);
      return { success: true, sent: 0, reason: 'Not approved' };
    }

    const today = startOfDay(new Date());
    const leaveStart = startOfDay(new Date(leave.startDate));
    const daysUntilLeave = Math.ceil((leaveStart - today) / (1000 * 60 * 60 * 24));

    // Only send immediate reminder if leave starts in less than 7 days
    if (daysUntilLeave >= 7) {
      console.log(`[Leave Reminder] Leave ${leaveRequestId} starts in ${daysUntilLeave} days, will be handled by scheduler`);
      return { success: true, sent: 0, reason: 'Will be handled by scheduler' };
    }

    console.log(`[Leave Reminder] Sending immediate reminder for leave ${leaveRequestId} (starts in ${daysUntilLeave} days)`);

    const sentCount = await sendReminderForLeave(leave);

    return {
      success: true,
      sent: sentCount,
      reason: 'Immediate reminder sent'
    };

  } catch (error) {
    console.error('[Leave Reminder] Error in sendImmediateLeaveReminder:', error);
    throw error;
  }
}

/**
 * Send reminder emails for a specific leave to division
 * Sends ONE consolidated email with all stakeholders
 * @param {Object} leave - Leave request with employee included
 * @returns {number} - Number of emails sent (should be 1)
 */
async function sendReminderForLeave(leave) {
  const employee = leave.employee;
  const divisionId = employee.divisionId;

  console.log(`[Leave Reminder] Processing leave ${leave.id} for employee ${employee.name}`);

  // Step 1: Determine TO recipient (priority order)
  let toRecipient = null;
  let toRecipientType = '';

  // Priority 1: Employee's Supervisor
  if (employee.supervisorId) {
    const supervisor = await prisma.user.findUnique({
      where: { id: employee.supervisorId },
      select: {
        id: true,
        name: true,
        email: true,
        employeeStatus: true
      }
    });

    if (supervisor && supervisor.email && supervisor.employeeStatus !== 'INACTIVE') {
      toRecipient = supervisor;
      toRecipientType = 'Supervisor';
      console.log(`[Leave Reminder] TO: Supervisor (${supervisor.email})`);
    }
  }

  // Priority 2: Division Head (if no supervisor)
  if (!toRecipient && divisionId) {
    const division = await prisma.division.findUnique({
      where: { id: divisionId },
      select: {
        id: true,
        name: true,
        headId: true
      }
    });

    if (division?.headId) {
      const divisionHead = await prisma.user.findUnique({
        where: { id: division.headId },
        select: {
          id: true,
          name: true,
          email: true,
          employeeStatus: true
        }
      });

      if (divisionHead && divisionHead.email && divisionHead.employeeStatus !== 'INACTIVE') {
        toRecipient = divisionHead;
        toRecipientType = 'Division Head';
        console.log(`[Leave Reminder] TO: Division Head (${divisionHead.email})`);
      }
    }
  }

  // Priority 3: HR (if no supervisor and no division head)
  if (!toRecipient) {
    const hrEmail = process.env.HR_EMAIL || 'hr@rhayaflicks.com';
    toRecipient = {
      id: 'hr',
      name: 'HR Department',
      email: hrEmail
    };
    toRecipientType = 'HR (fallback)';
    console.log(`[Leave Reminder] TO: HR (${hrEmail})`);
  }

  // Step 2: Build CC list
  const ccEmails = new Set(); // Use Set to automatically handle duplicates

  // CC 1: All division members (excluding the employee taking leave)
  if (divisionId) {
    const divisionMembers = await prisma.user.findMany({
      where: {
        divisionId: divisionId,
        employeeStatus: { not: 'INACTIVE' },
        id: { not: employee.id } // Exclude employee taking leave
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    divisionMembers.forEach(member => {
      if (member.email) {
        ccEmails.add(member.email);
      }
    });

    console.log(`[Leave Reminder] Added ${divisionMembers.length} division members to CC`);
  }

  // CC 2: All division heads (all divisions in company)
  const allDivisions = await prisma.division.findMany({
    where: {
      headId: { not: null }
    },
    select: {
      id: true,
      name: true,
      headId: true
    }
  });

  // Get all division head users
  const divisionHeadIds = allDivisions.map(d => d.headId).filter(Boolean);
  
  if (divisionHeadIds.length > 0) {
    const divisionHeads = await prisma.user.findMany({
      where: {
        id: { in: divisionHeadIds },
        employeeStatus: { not: 'INACTIVE' }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    divisionHeads.forEach(head => {
      if (head.email) {
        ccEmails.add(head.email);
      }
    });

    console.log(`[Leave Reminder] Added ${divisionHeads.length} division heads to CC`);
  }
  // CC 3: HR (unless HR is already the TO recipient)
  const hrEmail = process.env.HR_EMAIL || 'hr@rhayaflicks.com';
  if (toRecipient.email !== hrEmail) {
    ccEmails.add(hrEmail);
  }

  // Step 3: Remove TO recipient from CC list (critical deduplication)
  ccEmails.delete(toRecipient.email);

  // Convert Set to Array
  const ccList = Array.from(ccEmails).filter(email => email); // Remove any falsy values

  console.log(`[Leave Reminder] Final CC count: ${ccList.length}`);
  console.log(`[Leave Reminder] CC list: ${ccList.join(', ')}`);

  // Step 4: Send ONE consolidated email
  try {
    if (!toRecipient.email) {
      console.error(`[Leave Reminder] No valid TO recipient found for leave ${leave.id}`);
      return 0;
    }

    await sendLeaveReminderH7Email(toRecipient, leave, employee, ccList);
    
    console.log(`   Leave reminder sent successfully`);
    console.log(`   TO: ${toRecipient.email} (${toRecipientType})`);
    console.log(`   CC: ${ccList.length} recipients`);

    return 1; // One email sent

  } catch (error) {
    console.error(`❌ Failed to send leave reminder for leave ${leave.id}:`, error);
    return 0;
  }
}

export default {
  sendLeaveRemindersH7,
  sendImmediateLeaveReminder
};