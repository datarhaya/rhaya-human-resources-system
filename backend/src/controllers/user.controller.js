// backend/src/controllers/user.controller.js
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get all users
 * GET /api/users
 */
export const getAllUsers = async (req, res) => {
  try {
    console.log('Fetching all users...');
    
    const users = await prisma.user.findMany({
      include: {
        role: { select: { id: true, name: true } },
        division: { select: { id: true, name: true } },
        supervisor: { select: { id: true, name: true, email: true } },
        overtimeBalance: {
          select: {
            currentBalance: true,
            pendingHours: true,
            totalPaid: true
          }
        },
        leaveBalance: {
          where: { year: 2025 },
          select: {
            year: true,
            annualQuota: true,
            annualUsed: true,
            annualRemaining: true,
            sickLeaveUsed: true,
            menstrualLeaveUsed: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Handle leaveBalance format
    const usersWithFormattedBalance = users.map(user => ({
      ...user,
      leaveBalance: Array.isArray(user.leaveBalance) && user.leaveBalance.length > 0
        ? user.leaveBalance[0]
        : (typeof user.leaveBalance === 'object' ? user.leaveBalance : null)
    }));

    return res.json({
      success: true,
      data: usersWithFormattedBalance
    });
  } catch (error) {
    console.error('Get users error:', error.message);
    return res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message
    });
  }
};

/**
 * Get single user by ID (with balance data)
 * GET /api/users/:userId
 */
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          select: {
            id: true,
            name: true
          }
        },
        division: {
          select: {
            id: true,
            name: true
          }
        },
        supervisor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        overtimeBalance: {
          select: {
            currentBalance: true,
            pendingHours: true,
            totalPaid: true
          }
        },
        leaveBalance: {
          where: {
            year: new Date().getFullYear()
          },
          select: {
            year: true,
            annualQuota: true,
            annualUsed: true,
            annualRemaining: true,
            sickLeaveUsed: true,
            menstrualLeaveUsed: true
          },
          take: 1
        },
        // Optional: Get subordinates
        subordinates: {
          select: {
            id: true,
            name: true,
            email: true,
            role: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Format the response
    const formattedUser = {
      ...user,
      leaveBalance: user.leaveBalance[0] || null
    };

    return res.json({
      success: true,
      data: formattedUser
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      error: 'Failed to fetch user',
      message: error.message
    });
  }
};


/**
 * Create new user
 * POST /api/users/create
 */
export const createUser = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      name,
      nip,
      phone,
      dateOfBirth,
      placeOfBirth,
      address,
      gender,
      bpjsHealth,
      bpjsEmployment,
      overtimeRate,
      accessLevel,
      roleId,
      divisionId,
      supervisorId,
      employeeStatus,
      joinDate,
      plottingCompany,
      contractStartDate,
      contractEndDate,
      companyType
    } = req.body;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with balances in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create user
      const newUser = await tx.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          name,
          nip,
          phone,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          placeOfBirth,
          address,
          gender: gender || 'Male',                                    
          bpjsHealth,
          bpjsEmployment,
          overtimeRate: overtimeRate || 300000,
          accessLevel: accessLevel || 4,
          roleId,
          divisionId,
          supervisorId: supervisorId || null,
          employeeStatus: employeeStatus || 'PKWT',                        
          joinDate: joinDate ? new Date(joinDate) : new Date(),
          plottingCompany: plottingCompany || 'PT Rhayakan Film Indonesia', 
          contractStartDate: contractStartDate ? new Date(contractStartDate) : null,  
          contractEndDate: contractEndDate ? new Date(contractEndDate) : null,        
          companyType: companyType || 'parent'
        },
        include: {
          role: true,
          division: true,
          supervisor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      console.log(`✅ Created user: ${newUser.name}`);

      // 2. Create overtime balance
      const overtimeBalance = await tx.overtimeBalance.create({
        data: {
          employeeId: newUser.id,
          currentBalance: 0,
          pendingHours: 0,
          totalPaid: 0
        }
      });

      console.log(`✅ Created overtime balance for ${newUser.name}`);

      // 3. Create leave balance for current year
      const currentYear = new Date().getFullYear();
      const joinYear = new Date(joinDate || new Date()).getFullYear();
      
      // Calculate prorated leave if joined mid-year
      let annualQuota = 14; // Default quota
      if (joinYear === currentYear) {
        const joinMonth = new Date(joinDate || new Date()).getMonth();
        // Prorated: (12 - joinMonth) / 12 * 14
        const monthsRemaining = 12 - joinMonth;
        annualQuota = Math.round((monthsRemaining / 12) * 14);
      }

      const leaveBalance = await tx.leaveBalance.create({
        data: {
          employeeId: newUser.id,
          year: currentYear,
          annualQuota: annualQuota,
          annualUsed: 0,
          annualRemaining: annualQuota,
          sickLeaveUsed: 0,
          menstrualLeaveUsed: 0,
          unpaidLeaveUsed: 0
        }
      });

      console.log(`✅ Created leave balance for ${newUser.name} (quota: ${annualQuota} days)`);

      return {
        user: newUser,
        overtimeBalance,
        leaveBalance
      };
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: result.user
    });

  } catch (error) {
    console.error('Create user error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        error: 'Username or email already exists'
      });
    }

    return res.status(500).json({
      error: 'Failed to create user',
      message: error.message
    });
  }
};

/**
 * Update user
 * PUT /api/users/:userId
 */
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      username,
      email,
      password,
      name,
      nip,
      phone,
      dateOfBirth,
      placeOfBirth,
      address,
      gender,              
      bpjsHealth,
      bpjsEmployment,
      overtimeRate,
      accessLevel,
      roleId,
      divisionId,
      supervisorId,
      employeeStatus,
      joinDate,
      plottingCompany,     
      contractStartDate,   
      contractEndDate      
    } = req.body;
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prepare update data
    const updateData = {
      username,
      email,
      name,
      nip,
      phone,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      placeOfBirth,
      address,
      gender,                                                                  
      bpjsHealth,
      bpjsEmployment,
      overtimeRate,
      accessLevel,
      roleId,
      divisionId,
      supervisorId: supervisorId || null,
      employeeStatus,
      joinDate: joinDate ? new Date(joinDate) : undefined,
      plottingCompany,                                                          
      contractStartDate: contractStartDate ? new Date(contractStartDate) : undefined,  
      contractEndDate: contractEndDate ? new Date(contractEndDate) : undefined         
    };

    // If password provided, hash it
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    // Update user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update user
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          role: true,
          division: true,
          supervisor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // 2. Ensure overtime balance exists
      const overtimeBalance = await tx.overtimeBalance.upsert({
        where: { employeeId: userId },
        update: {},
        create: {
          employeeId: userId,
          currentBalance: 0,
          pendingHours: 0,
          totalPaid: 0
        }
      });

      // 3. Ensure leave balance exists for current year
      const currentYear = new Date().getFullYear();
      const leaveBalance = await tx.leaveBalance.upsert({
        where: {
          employeeId_year: {
            employeeId: userId,
            year: currentYear
          }
        },
        update: {},
        create: {
          employeeId: userId,
          year: currentYear,
          annualQuota: 14,
          annualUsed: 0,
          annualRemaining: 14,
          sickLeaveUsed: 0,
          menstrualLeaveUsed: 0,
          unpaidLeaveUsed: 0
        }
      });

      console.log(`✅ Updated user: ${updatedUser.name}`);
      console.log(`✅ Ensured balances exist`);

      return updatedUser;
    });

    return res.json({
      success: true,
      message: 'User updated successfully',
      data: result
    });

  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        error: 'Username or email already exists'
      });
    }

    return res.status(500).json({
      error: 'Failed to update user',
      message: error.message
    });
  }
};

/**
 * Get user profile (for logged-in user)
 * GET /api/users/profile
 */
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: { select: { id: true, name: true } },
        division: { select: { id: true, name: true } },
        supervisor: { select: { id: true, name: true, email: true } },
        overtimeBalance: true,
        leaveBalance: {
          where: { year: new Date().getFullYear() }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user;

    return res.json({
      success: true,
      data: {
        ...userWithoutPassword,
        leaveBalance: user.leaveBalance[0] || null
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      error: 'Failed to fetch profile',
      message: error.message
    });
  }
};

/**
 * Update own profile (limited fields)
 * PUT /api/users/profile
 */
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { phone, address, password, currentPassword } = req.body;

    const updateData = {};

    // Allow updating phone and address
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;

    // If updating password, verify current password
    if (password) {
      if (!currentPassword) {
        return res.status(400).json({
          error: 'Current password is required to set new password'
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(400).json({
          error: 'Current password is incorrect'
        });
      }

      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        role: { select: { id: true, name: true } },
        division: { select: { id: true, name: true } },
        supervisor: { select: { id: true, name: true } }
      }
    });

    const { password: _, ...userWithoutPassword } = updatedUser;

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: userWithoutPassword
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      error: 'Failed to update profile',
      message: error.message
    });
  }
};

/**
 * Delete user (soft delete - set isActive to false)
 * DELETE /api/users/:userId
 */
// export const deleteUser = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     console.log('Delete request for user:', userId);

//     // Check if user exists
//     const user = await prisma.user.findUnique({
//       where: { id: userId },
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         isActive: true
//       }
//     });

//     if (!user) {
//       console.log('❌ User not found:', userId);
//       return res.status(404).json({
//         error: 'User not found'
//       });
//     }

//     // Don't allow deleting yourself
//     if (req.user && req.user.id === userId) {
//       console.log('❌ Attempt to delete own account');
//       return res.status(400).json({
//         error: 'You cannot delete your own account'
//       });
//     }

//     // Check if already inactive
//     if (!user.isActive) {
//       console.log('⚠️ User already inactive:', user.name);
//       return res.status(400).json({
//         error: 'User is already deleted/inactive'
//       });
//     }

//     // Soft delete - set isActive to false
//     const deletedUser = await prisma.user.update({
//       where: { id: userId },
//       data: {
//         isActive: false,
//         updatedAt: new Date()
//       },
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         isActive: true
//       }
//     });

//     console.log(`✅ User soft-deleted: ${deletedUser.name} (${deletedUser.email})`);

//     return res.json({
//       success: true,
//       message: `User ${deletedUser.name} has been deleted successfully`,
//       data: {
//         id: deletedUser.id,
//         name: deletedUser.name,
//         isActive: deletedUser.isActive
//       }
//     });

//   } catch (error) {
//     console.error('❌ Delete user error:', error);
//     console.error('Error details:', error.message);
    
//     return res.status(500).json({
//       error: 'Failed to delete user',
//       message: error.message
//     });
//   }
// };

/**
 * Soft delete user (set employeeStatus to Inactive)
 * PUT /api/users/:userId/deactivate
 */
export const deactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('Deactivate request for user:', userId);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        employeeStatus: true
      }
    });

    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Don't allow deactivating yourself
    if (req.user && req.user.id === userId) {
      console.log('❌ Attempt to deactivate own account');
      return res.status(400).json({
        error: 'You cannot deactivate your own account'
      });
    }

    // Check if already inactive
    if (user.employeeStatus === 'Inactive') {
      console.log('⚠️ User already inactive:', user.name);
      return res.status(400).json({
        error: 'User is already inactive'
      });
    }

    // Set employeeStatus to Inactive
    const deactivatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        employeeStatus: 'Inactive',
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeStatus: true
      }
    });

    console.log(`✅ User deactivated: ${deactivatedUser.name} (${deactivatedUser.email})`);

    return res.json({
      success: true,
      message: `User ${deactivatedUser.name} has been deactivated`,
      data: {
        id: deactivatedUser.id,
        name: deactivatedUser.name,
        employeeStatus: deactivatedUser.employeeStatus
      }
    });

  } catch (error) {
    console.error('❌ Deactivate user error:', error);
    
    return res.status(500).json({
      error: 'Failed to deactivate user',
      message: error.message
    });
  }
};

/**
 * Hard delete user (permanently remove from database)
 * DELETE /api/users/:userId/permanent
 */
export const permanentDeleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { confirmUsername } = req.body;

    console.log('⚠️  PERMANENT delete request for user:', userId);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        email: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Require username confirmation for safety
    if (confirmUsername !== user.username) {
      return res.status(400).json({
        error: 'Username confirmation does not match',
        message: 'Please type the username correctly to confirm deletion'
      });
    }

    // Don't allow deleting yourself
    if (req.user && req.user.id === userId) {
      return res.status(400).json({
        error: 'You cannot delete your own account'
      });
    }

    // Delete all related records and user in transaction
    await prisma.$transaction(async (tx) => {
      console.log('Deleting related records...');

      // Delete balance adjustment logs
      await tx.balanceAdjustmentLog.deleteMany({
        where: { userId: userId }
      });

      // Delete overtime balance
      await tx.overtimeBalance.deleteMany({
        where: { employeeId: userId }
      });

      // Delete leave balance
      await tx.leaveBalance.deleteMany({
        where: { employeeId: userId }
      });

      // Delete leave requests (set employeeId to null or delete)
      await tx.leaveRequest.deleteMany({
        where: { employeeId: userId }
      });

      // Delete overtime requests
      await tx.overtimeRequest.deleteMany({
        where: { employeeId: userId }
      });

      // Update subordinates to have no supervisor
      await tx.user.updateMany({
        where: { supervisorId: userId },
        data: { supervisorId: null }
      });

      // Finally delete the user
      await tx.user.delete({
        where: { id: userId }
      });

      console.log('✅ All related records deleted');
    });

    console.log(`✅ User PERMANENTLY deleted: ${user.name} (${user.email})`);

    return res.json({
      success: true,
      message: `User ${user.name} has been permanently deleted`,
      data: {
        id: user.id,
        name: user.name,
        username: user.username
      }
    });

  } catch (error) {
    console.error('❌ Permanent delete error:', error);
    
    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'Cannot delete user due to related records',
        message: 'This user has related data that prevents deletion'
      });
    }

    return res.status(500).json({
      error: 'Failed to delete user permanently',
      message: error.message
    });
  }
};

export const adjustUserBalance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { overtime, leave } = req.body;

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        overtimeBalance: true,
        leaveBalance: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const results = {};

    // Adjust overtime balance
    if (overtime && overtime.amount !== undefined) {
      const currentBalance = user.overtimeBalance?.currentBalance || 0;
      const newBalance = currentBalance + parseFloat(overtime.amount);

      if (newBalance < 0) {
        return res.status(400).json({ 
          error: 'Cannot reduce balance below zero',
          currentBalance,
          requested: overtime.amount
        });
      }

      const overtimeBalance = await prisma.overtimeBalance.upsert({
        where: { employeeId: userId },
        update: {
          currentBalance: newBalance
        },
        create: {
          employeeId: userId,
          currentBalance: newBalance,
          totalPaid: 0
        }
      });

      // Log the adjustment
      await prisma.balanceAdjustmentLog.create({
        data: {
          userId,
          adjustedBy: req.user.id,
          type: 'OVERTIME',
          amount: overtime.amount,
          previousBalance: currentBalance,
          newBalance,
          reason: overtime.reason || 'Manual adjustment by admin'
        }
      });

      results.overtime = {
        previousBalance: currentBalance,
        adjustment: overtime.amount,
        newBalance
      };
    }

    // Adjust leave balance
    if (leave && leave.annualQuota !== undefined) {
      const year = leave.year || new Date().getFullYear();
      
      const leaveBalance = await prisma.leaveBalance.upsert({
        where: { 
          employeeId_year: {
            employeeId: userId,
            year
          }
        },
        update: {
          annualQuota: leave.annualQuota,
          annualRemaining: leave.annualQuota - (user.leaveBalance?.annualUsed || 0)
        },
        create: {
          employeeId: userId,
          year,
          annualQuota: leave.annualQuota,
          annualUsed: 0,
          annualRemaining: leave.annualQuota,
          sickLeaveUsed: 0,
          menstrualLeaveUsed: 0,
          unpaidLeaveUsed: 0
        }
      });

      // Log the adjustment
      await prisma.balanceAdjustmentLog.create({
        data: {
          userId,
          adjustedBy: req.user.id,
          type: 'LEAVE',
          amount: leave.annualQuota,
          previousBalance: user.leaveBalance?.annualQuota || 0,
          newBalance: leave.annualQuota,
          reason: leave.reason || 'Manual adjustment by admin',
          year
        }
      });

      results.leave = {
        year,
        previousQuota: user.leaveBalance?.annualQuota || 0,
        newQuota: leave.annualQuota,
        remaining: leaveBalance.annualRemaining
      };
    }

    return res.json({
      success: true,
      message: 'Balance adjusted successfully',
      data: results
    });

  } catch (error) {
    console.error('Adjust balance error:', error);
    return res.status(500).json({ 
      error: 'Failed to adjust balance',
      message: error.message 
    });
  }
};
