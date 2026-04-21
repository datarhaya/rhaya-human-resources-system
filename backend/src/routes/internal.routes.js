import { Router } from "express";
import { hmacAuth } from "../middleware/hmacAuth.js";
import prisma from "../config/database.js"; // HR system's Prisma client

const router = Router();

/**
 * GET /internal/entities
 * Returns the full list of PlottingCompany records with employee counts.
 * Legal CRM caches this and syncs on a schedule.
 */
router.get("/entities", hmacAuth, async (req, res, next) => {
  try {
    // Fetch groups
    const groups = await prisma.entityGroup.findMany({
      select: { id: true, name: true, description: true, isActive: true },
    });

    // Fetch companies (existing logic unchanged, just add groupId)
    const companies = await prisma.plottingCompany.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        groupId: true,
        _count: {
          select: {
            users: {
              where: {
                employeeStatus: {
                  notIn: ["Inactive", "Resigned", "Terminated"],
                },
              },
            },
          },
        },
      },
    });

    const entities = companies.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code ?? null,
      isActive: c.isActive,
      employeeCount: c._count.users,
      groupId: c.groupId ?? null,
    }));

    res.json({ groups, entities });
  } catch (error) {
    next(error);
  }
});

export default router;
