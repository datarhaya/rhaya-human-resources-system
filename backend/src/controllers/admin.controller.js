// backend/src/controllers/admin.controller.js

/**
 * Assign scope to Level 2 admin
 * PUT /api/admin/users/:userId/scope
 * Level 1 only
 */
export const assignScopeToAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { scopeEntityIds } = req.body;

    // Only Level 1 can assign scope
    if (req.user.accessLevel !== 1) {
      return res
        .status(403)
        .json({ error: "Only master admin can assign scope" });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.accessLevel !== 2) {
      return res.status(400).json({
        error: "Can only assign scope to Level 2 users",
      });
    }

    // Validate all entity IDs exist
    const entities = await prisma.plottingCompany.findMany({
      where: { id: { in: scopeEntityIds } },
    });

    if (entities.length !== scopeEntityIds.length) {
      return res.status(400).json({
        error: "Some entity IDs are invalid",
      });
    }

    // Update user
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { scopeEntityIds },
    });

    console.log(`[SCOPE] Assigned entities to ${user.email}:`, scopeEntityIds);

    return res.json({
      success: true,
      message: "Scope assigned successfully",
      data: {
        userId: updated.id,
        email: updated.email,
        scopeEntityIds: updated.scopeEntityIds,
      },
    });
  } catch (error) {
    console.error("Assign scope error:", error);
    return res.status(500).json({ error: "Failed to assign scope" });
  }
};
