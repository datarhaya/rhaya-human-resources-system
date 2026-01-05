// backend/scripts/migrate-2026-balances.js
// ONE-TIME MIGRATION: Create 2026 LeaveBalance for all existing users

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate2026Balances() {
  console.log('Starting 2026 Leave Balance Migration...\n');

  try {
    // Get all users who don't have a 2026 balance yet
    const users = await prisma.user.findMany({
      where: {
        leaveBalances: {
          none: {
            year: 2026
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeStatus: true,
        joinDate: true,
        createdAt: true
      }
    });

    console.log(`📊 Found ${users.length} users without 2026 balance\n`);

    if (users.length === 0) {
      console.log('✅ All users already have 2026 balances!');
      return;
    }

    let created = 0;
    let skipped = 0;

    // Create 2026 balance for each user
    for (const user of users) {
      try {
        // Skip inactive users
        if (user.employeeStatus === 'Inactive') {
          console.log(`⏭️  Skipping inactive user: ${user.name}`);
          skipped++;
          continue;
        }

        // Calculate annual quota based on employee status
        let annualQuota = 0;
        
        if (user.employeeStatus === 'PKWTT') {
          // PKWTT gets 14 days automatically
          annualQuota = 14;
        } else if (user.employeeStatus === 'PKWT') {
          // Calculate months since joining
          const joinDate = user.joinDate || user.createdAt;
          const now = new Date();
          const monthsSinceJoining = (now.getFullYear() - joinDate.getFullYear()) * 12 + 
                                    (now.getMonth() - joinDate.getMonth());
          
          if (monthsSinceJoining >= 12) {
            // PKWT with 12+ months gets 14 days
            annualQuota = 14;
          } else {
            // PKWT with less than 12 months gets 10 days
            annualQuota = 10;
          }
        }
        // Other statuses (Intern, Contract, etc.) get 0 days

        // Create the 2026 balance
        await prisma.leaveBalance.create({
          data: {
            employeeId: user.id,
            year: 2026,
            annualQuota: annualQuota,
            annualUsed: 0,
            annualRemaining: annualQuota,
            sickLeaveUsed: 0,
            menstrualLeaveUsed: 0,
            unpaidLeaveUsed: 0,
            toilBalance: 0,
            toilUsed: 0,
            toilExpired: 0
          }
        });

        created++;
        console.log(`✅ ${user.name} (${user.employeeStatus}) → ${annualQuota} days`);

      } catch (error) {
        console.error(`❌ Error creating balance for ${user.name}:`, error.message);
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📊 Total: ${users.length}`);
    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrate2026Balances()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });