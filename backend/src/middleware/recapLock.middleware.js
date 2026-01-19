import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const checkRecapLock = async (req, res, next) => {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'system-settings-singleton' }
    });
    
    if (settings?.isApprovalLocked) {
      return res.status(423).json({
        error: 'System sedang dalam proses recap. Approval sementara dikunci.'
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};