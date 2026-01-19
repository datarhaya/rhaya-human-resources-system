// backend/src/services/scheduler.service.js
import cron from 'node-cron';
import leaveReminderService from './leaveReminder.service.js';

let scheduledJobs = [];

/**
 * Initialize all scheduled jobs
 */
export function initializeScheduler() {
  console.log('[Scheduler] Initializing scheduled jobs...');

  // Schedule leave reminder H-7 check
  // Runs every day at 8:00 AM
  const leaveReminderJob = cron.schedule('0 8 * * *', async () => {
    console.log('[Scheduler] Running daily leave reminder H-7 check...');
    try {
      const result = await leaveReminderService.sendLeaveRemindersH7();
      console.log('[Scheduler] Leave reminder completed:', result);
    } catch (error) {
      console.error('[Scheduler] Leave reminder failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Jakarta' // Adjust to your timezone
  });

  scheduledJobs.push({
    name: 'leave-reminder-h7',
    job: leaveReminderJob,
    schedule: '0 8 * * *',
    description: 'Send leave reminders 7 days before leave starts'
  });

  console.log('[Scheduler] ✅ Leave reminder H-7 scheduled (8:00 AM daily)');
  console.log(`[Scheduler] Active jobs: ${scheduledJobs.length}`);
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduler() {
  console.log('[Scheduler] Stopping all scheduled jobs...');
  scheduledJobs.forEach(({ name, job }) => {
    job.stop();
    console.log(`[Scheduler] Stopped: ${name}`);
  });
  scheduledJobs = [];
}

/**
 * Get status of all scheduled jobs
 */
export function getSchedulerStatus() {
  return scheduledJobs.map(({ name, schedule, description }) => ({
    name,
    schedule,
    description,
    status: 'active'
  }));
}

/**
 * Manually trigger leave reminder check (for testing)
 */
export async function manualTriggerLeaveReminder() {
  console.log('[Scheduler] Manual trigger: leave reminder H-7');
  try {
    const result = await leaveReminderService.sendLeaveRemindersH7();
    console.log('[Scheduler] Manual leave reminder completed:', result);
    return result;
  } catch (error) {
    console.error('[Scheduler] Manual leave reminder failed:', error);
    throw error;
  }
}

export default {
  initializeScheduler,
  stopScheduler,
  getSchedulerStatus,
  manualTriggerLeaveReminder
};
