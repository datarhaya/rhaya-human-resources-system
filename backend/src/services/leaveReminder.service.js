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
 * @param {Object} leave - Leave request with employee included
 * @returns {number} - Number of emails sent
 */
async function sendReminderForLeave(leave) {
  const employee = leave.employee;
  const divisionId = employee.divisionId;

  if (!divisionId) {
    console.log(`[Leave Reminder] Employee ${employee.id} has no division, skipping`);
    return 0;
  }

  // Get division with head
  const division = await prisma.division.findUnique({
    where: { id: divisionId },
    include: {
      users: {
        where: {
          employeeStatus: { not: 'Inactive' },
          id: { not: employee.id } // Exclude the employee taking leave
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          division: true
        }
      }
    }
  });

  if (!division) {
    console.log(`[Leave Reminder] Division ${divisionId} not found`);
    return 0;
  }

  const recipients = [];

  // Add division head if exists and not the employee taking leave
  if (division.headId && division.headId !== employee.id) {
    const divisionHead = await prisma.user.findUnique({
      where: { id: division.headId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        division: true,
        employeeStatus: true
      }
    });

    if (divisionHead && divisionHead.employeeStatus !== 'Inactive') {
      recipients.push(divisionHead);
    }
  }

  // Add all active division members (already filtered in query above)
  recipients.push(...division.users);

  // Remove duplicates by email
  const uniqueRecipients = recipients.filter((recipient, index, self) =>
    index === self.findIndex((r) => r.email === recipient.email)
  );

  console.log(`[Leave Reminder] Sending to ${uniqueRecipients.length} recipients for leave ${leave.id}`);

  let sentCount = 0;

  // Send email to each recipient
  for (const recipient of uniqueRecipients) {
    try {
      if (!recipient.email) {
        console.log(`[Leave Reminder] Recipient ${recipient.id} has no email, skipping`);
        continue;
      }

      await sendLeaveReminderH7Email(recipient, leave, employee);
      sentCount++;
      console.log(`✅ Leave reminder sent to: ${recipient.email}`);

    } catch (error) {
      console.error(`❌ Failed to send reminder to ${recipient.email}:`, error);
    }
  }

  return sentCount;
}

export default {
  sendLeaveRemindersH7,
  sendImmediateLeaveReminder
};
