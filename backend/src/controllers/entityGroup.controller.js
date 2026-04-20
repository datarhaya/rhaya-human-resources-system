import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Get all entity groups
 * GET /api/entity-groups
 */
export const getAllEntityGroups = async (req, res) => {
  try {
    const { accessLevel, scopeGroupIds } = req.user;

    let where = { isActive: true };

    // Level 2: Only see groups in their scope
    if (accessLevel === 2) {
      if (!scopeGroupIds || scopeGroupIds.length === 0) {
        return res.json({
          success: true,
          count: 0,
          data: [],
          message: "No groups assigned to your scope",
        });
      }
      where.id = { in: scopeGroupIds };
    }

    const groups = await prisma.entityGroup.findMany({
      where,
      include: {
        _count: {
          select: { companies: true },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return res.json({
      success: true,
      count: groups.length,
      data: groups,
    });
  } catch (error) {
    console.error("Get entity groups error:", error);
    return res.status(500).json({
      error: "Failed to fetch entity groups",
      message: error.message,
    });
  }
};

/**
 * Get single entity group with entities
 * GET /api/entity-groups/:id
 */
export const getEntityGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const { accessLevel, scopeGroupIds } = req.user;

    // Scope check for Level 2
    if (accessLevel === 2) {
      if (!scopeGroupIds?.includes(id)) {
        return res.status(403).json({
          error: "Access denied",
          message: "You do not have permission to view this group",
        });
      }
    }

    const group = await prisma.entityGroup.findUnique({
      where: { id },
      include: {
        companies: {
          where: { isActive: true },
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            _count: {
              select: { users: true },
            },
          },
          orderBy: { code: "asc" },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: { companies: true },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Entity group not found" });
    }

    return res.json({
      success: true,
      data: group,
    });
  } catch (error) {
    console.error("Get entity group error:", error);
    return res.status(500).json({
      error: "Failed to fetch entity group",
      message: error.message,
    });
  }
};

/**
 * Create new entity group
 * POST /api/entity-groups
 */
export const createEntityGroup = async (req, res) => {
  try {
    const { name, code, description, color, managerId } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Check duplicate
    const existing = await prisma.entityGroup.findFirst({
      where: {
        OR: [{ name }, code ? { code: code.toUpperCase() } : {}].filter(
          (obj) => Object.keys(obj).length > 0,
        ),
      },
    });

    if (existing) {
      if (existing.name === name) {
        return res.status(400).json({ error: "Group name already exists" });
      }
      if (existing.code === code?.toUpperCase()) {
        return res.status(400).json({ error: "Group code already exists" });
      }
    }

    // Create group
    const group = await prisma.entityGroup.create({
      data: {
        name,
        code: code ? code.toUpperCase() : null,
        description: description || null,
        color: color || "#3B82F6",
        managerId: managerId || null,
      },
    });

    // Audit log
    await prisma.entityGroupAudit.create({
      data: {
        action: "group_created",
        groupId: group.id,
        changes: { name, code, description, color, managerId },
        performedBy: userId,
      },
    });

    console.log(`Created entity group: ${group.name}`);

    return res.status(201).json({
      success: true,
      message: "Entity group created successfully",
      data: group,
    });
  } catch (error) {
    console.error("Create entity group error:", error);
    return res.status(500).json({
      error: "Failed to create entity group",
      message: error.message,
    });
  }
};

/**
 * Update entity group
 * PUT /api/entity-groups/:id
 */
export const updateEntityGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, color, managerId } = req.body;
    const userId = req.user.id;

    const existing = await prisma.entityGroup.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Entity group not found" });
    }

    // Check duplicates
    if (name || code) {
      const duplicate = await prisma.entityGroup.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                name ? { name } : {},
                code ? { code: code.toUpperCase() } : {},
              ].filter((obj) => Object.keys(obj).length > 0),
            },
          ],
        },
      });

      if (duplicate) {
        if (duplicate.name === name) {
          return res.status(400).json({ error: "Group name already exists" });
        }
        if (duplicate.code === code?.toUpperCase()) {
          return res.status(400).json({ error: "Group code already exists" });
        }
      }
    }

    const updated = await prisma.entityGroup.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code !== undefined && { code: code ? code.toUpperCase() : null }),
        ...(description !== undefined && { description: description || null }),
        ...(color && { color }),
        ...(managerId !== undefined && { managerId: managerId || null }),
      },
    });

    // Audit log
    await prisma.entityGroupAudit.create({
      data: {
        action: "group_updated",
        groupId: id,
        changes: {
          old: existing,
          new: updated,
        },
        performedBy: userId,
      },
    });

    console.log(`Updated entity group: ${updated.name}`);

    return res.json({
      success: true,
      message: "Entity group updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update entity group error:", error);
    return res.status(500).json({
      error: "Failed to update entity group",
      message: error.message,
    });
  }
};

/**
 * Delete entity group (soft delete)
 * DELETE /api/entity-groups/:id
 */
export const deleteEntityGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const group = await prisma.entityGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: { companies: true },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Entity group not found" });
    }

    // Check if group has entities
    if (group._count.companies > 0) {
      return res.status(400).json({
        error: "Cannot delete group with assigned entities",
        message: `This group has ${group._count.companies} entity(ies). Please reassign them first.`,
      });
    }

    // Soft delete
    await prisma.entityGroup.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await prisma.entityGroupAudit.create({
      data: {
        action: "group_deleted",
        groupId: id,
        changes: { name: group.name },
        performedBy: userId,
      },
    });

    console.log(`Deleted entity group: ${group.name}`);

    return res.json({
      success: true,
      message: "Entity group deleted successfully",
    });
  } catch (error) {
    console.error("Delete entity group error:", error);
    return res.status(500).json({
      error: "Failed to delete entity group",
      message: error.message,
    });
  }
};

/**
 * Assign entities to group
 * POST /api/entity-groups/:id/assign-entities
 */
export const assignEntitiesToGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { entityIds } = req.body;
    const userId = req.user.id;

    if (!entityIds || !Array.isArray(entityIds) || entityIds.length === 0) {
      return res.status(400).json({ error: "Entity IDs array required" });
    }

    const group = await prisma.entityGroup.findUnique({
      where: { id },
    });

    if (!group) {
      return res.status(404).json({ error: "Entity group not found" });
    }

    // Update entities
    const updated = await prisma.plottingCompany.updateMany({
      where: {
        id: { in: entityIds },
      },
      data: {
        groupId: id,
      },
    });

    // Audit log for each entity
    for (const entityId of entityIds) {
      await prisma.entityGroupAudit.create({
        data: {
          action: "entity_added",
          entityId,
          groupId: id,
          newGroupId: id,
          performedBy: userId,
        },
      });
    }

    console.log(`Assigned ${updated.count} entities to group: ${group.name}`);

    return res.json({
      success: true,
      message: `${updated.count} entities assigned to group`,
      data: {
        groupId: id,
        groupName: group.name,
        entitiesUpdated: updated.count,
      },
    });
  } catch (error) {
    console.error("Assign entities error:", error);
    return res.status(500).json({
      error: "Failed to assign entities",
      message: error.message,
    });
  }
};

/**
 * Get audit log for group
 * GET /api/entity-groups/:id/audit
 */
export const getGroupAuditLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const logs = await prisma.entityGroupAudit.findMany({
      where: {
        OR: [{ groupId: id }, { oldGroupId: id }, { newGroupId: id }],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        entity: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
    });

    return res.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    console.error("Get audit log error:", error);
    return res.status(500).json({
      error: "Failed to fetch audit log",
      message: error.message,
    });
  }
};
