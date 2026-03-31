/**
 * ADD TO HR BACKEND
 * File: src/routes/internal.routes.js
 *
 * Internal endpoint consumed only by the Legal CRM backend.
 * NOT exposed to the public — protect at the network level on Railway too.
 *
 * SETUP STEPS:
 * 1. Copy hmacAuth.middleware.js to src/middleware/hmacAuth.js
 * 2. Add HR_LEGAL_SECRET to HR backend .env (must match Legal CRM's HR_LEGAL_SECRET)
 * 3. Register this router in src/index.js:
 *      import internalRoutes from './routes/internal.routes.js';
 *      app.use('/internal', internalRoutes);
 * 4. Deploy HR backend
 */
import { Router } from 'express';
import { hmacAuth } from '../middleware/hmacAuth.js';
import prisma from '../config/database.js';  // HR system's Prisma client

const router = Router();

/**
 * GET /internal/entities
 * Returns the full list of PlottingCompany records with employee counts.
 * Legal CRM caches this and syncs on a schedule.
 */
router.get('/entities', hmacAuth, async (req, res, next) => {
  try {
    // Pull PlottingCompany list with employee counts in one query
    const companies = await prisma.plottingCompany.findMany({
      orderBy: { name: 'asc' },
      select: {
        id:          true,
        name:        true,
        code:        true,
        isActive:    true,
        // Count active employees (status not RESIGNED / TERMINATED — adjust to your HR schema)
        _count: {
          select: {
            users: {
              where: {
                employeeStatus: { notIn: ['RESIGNED', 'TERMINATED'] },
              },
            },
          },
        },
      },
    });

    const response = companies.map((c) => ({
      id:             c.id,
      name:           c.name,
      code:           c.code ?? null,
      isActive:       c.isActive,
      employeeCount:  c._count.users,
      // activeContractCount not tracked yet — extend later if needed
      activeContractCount: 0,
    }));

    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
