// backend/src/utils/scopeHelper.js
// Helper functions for scope-based access control

/**
 * Build scope filter for queries
 * @param {Object} user - req.user from JWT
 * @param {Object} additionalWhere - Additional where conditions
 * @returns {Object} - Where clause with scope applied
 */
/**
 * Apply scope filter for Level 2 admins
 * Supports BOTH individual entities AND groups
 */
export function applyScopeFilter(where, user) {
  const { accessLevel, scopeEntityIds, scopeGroupIds } = user;

  if (accessLevel !== 2) {
    return where; // Level 1 sees all, Level 3+ sees own
  }

  const hasEntityScope = scopeEntityIds && scopeEntityIds.length > 0;
  const hasGroupScope = scopeGroupIds && scopeGroupIds.length > 0;

  if (!hasEntityScope && !hasGroupScope) {
    // No scope = no access
    where.id = "impossible-id"; // Returns nothing
    return where;
  }

  // Build OR condition for entities OR groups
  const scopeConditions = [];

  if (hasEntityScope) {
    scopeConditions.push({
      plottingCompanyId: { in: scopeEntityIds },
    });
  }

  if (hasGroupScope) {
    scopeConditions.push({
      plottingCompany: {
        groupId: { in: scopeGroupIds },
      },
    });
  }

  // Combine with OR
  if (scopeConditions.length > 1) {
    where.OR = scopeConditions;
  } else {
    Object.assign(where, scopeConditions[0]);
  }

  return where;
}

/**
 * Build scope filter for queries on related models (via join)
 * Use this for models that don't have plottingCompanyId directly
 * @param {Object} user - req.user from JWT
 * @param {Object} additionalWhere - Additional where conditions
 * @param {String} relationName - Name of the relation (e.g., 'employee')
 * @returns {Object} - Where clause with scope applied via relation
 */
export const applyScopeFilterViaRelation = (
  user,
  additionalWhere = {},
  relationName = "employee",
) => {
  const { accessLevel, scopeEntityIds } = user;

  // Level 1 (MASTER) → No filter
  if (accessLevel === 1) {
    return additionalWhere;
  }

  // Level 2 (SUB_ACCESS) → Filter via employee relation
  if (accessLevel === 2) {
    if (!scopeEntityIds || scopeEntityIds.length === 0) {
      console.warn(`[SCOPE] Level 2 user ${user.id} has no scopeEntityIds`);
      return {
        ...additionalWhere,
        [relationName]: {
          plottingCompanyId: { in: [] }, // Matches nothing
        },
      };
    }

    return {
      ...additionalWhere,
      [relationName]: {
        plottingCompanyId: { in: scopeEntityIds },
      },
    };
  }

  // Level 3+ (EMPLOYEES) → No scope filter
  return additionalWhere;
};

/**
 * Check if user has access to a specific entity
 * @param {Object} user - req.user from JWT
 * @param {String} plottingCompanyId - Entity to check access for
 * @returns {Boolean} - True if user has access
 */
export const hasAccessToEntity = (user, plottingCompanyId) => {
  const { accessLevel, scopeEntityIds } = user;

  // Level 1 → Access to everything
  if (accessLevel === 1) {
    return true;
  }

  // Level 2 → Check scopeEntityIds
  if (accessLevel === 2) {
    if (!scopeEntityIds || scopeEntityIds.length === 0) {
      return false;
    }
    return scopeEntityIds.includes(plottingCompanyId);
  }

  // Level 3+ → Not applicable for scope checks
  return false;
};

/**
 * Validate scope access and throw error if not authorized
 * @param {Object} user - req.user from JWT
 * @param {String} plottingCompanyId - Entity being accessed
 * @param {String} action - Action being performed (for error message)
 * @throws {Error} - If user doesn't have access
 */
/**
 * Check if user has access to specific entity
 * Checks BOTH direct entity access AND group access
 */
export async function validateScopeAccess(entityId, user) {
  const { accessLevel, scopeEntityIds, scopeGroupIds } = user;

  if (accessLevel === 1) {
    return true; // Level 1 has full access
  }

  if (accessLevel !== 2) {
    return false; // Level 3+ should not use this function
  }

  // Check direct entity access
  if (scopeEntityIds?.includes(entityId)) {
    return true;
  }

  // Check group access
  if (scopeGroupIds && scopeGroupIds.length > 0) {
    const entity = await prisma.plottingCompany.findUnique({
      where: { id: entityId },
      select: { groupId: true },
    });

    if (entity?.groupId && scopeGroupIds.includes(entity.groupId)) {
      return true;
    }
  }

  return false;
}

/**
 * Get user's accessible entity IDs
 * @param {Object} user - req.user from JWT
 * @returns {String[]|null} - Array of entity IDs or null (for Level 1)
 */
export const getAccessibleEntityIds = (user) => {
  const { accessLevel, scopeEntityIds } = user;

  // Level 1 → All entities (return null to indicate no filter needed)
  if (accessLevel === 1) {
    return null;
  }

  // Level 2 → Return scopeEntityIds
  if (accessLevel === 2) {
    return scopeEntityIds || [];
  }

  // Level 3+ → Not applicable
  return [];
};

/**
 * Validate if admin can access a user based on scope
 */
export const validateUserAccess = (
  admin,
  targetUser,
  res,
  action = "access",
) => {
  const { accessLevel, scopeEntityIds } = admin;

  // Level 1: Full access
  if (accessLevel === 1) return true;

  // Level 2: Check scope
  if (accessLevel === 2) {
    // Cannot access admin users (no plottingCompanyId)
    if (!targetUser.plottingCompanyId) {
      res.status(403).json({
        error: "Access denied",
        message: "You cannot access admin users",
      });
      return false;
    }

    // Cannot access users outside scope
    if (!scopeEntityIds?.includes(targetUser.plottingCompanyId)) {
      res.status(403).json({
        error: "Access denied",
        message: `You cannot ${action} this user`,
      });
      return false;
    }
  }

  return true;
};

/**
 * Log scope-related action (console only for now)
 * @param {String} action - Action being performed
 * @param {Object} user - User performing action
 * @param {String} targetEntity - Entity being affected
 * @param {Object} metadata - Additional context
 */
export const logScopeAction = (
  action,
  user,
  targetEntity = null,
  metadata = {},
) => {
  const logData = {
    timestamp: new Date().toISOString(),
    action,
    userId: user.id,
    userEmail: user.email,
    accessLevel: user.accessLevel,
    scopeEntityIds: user.scopeEntityIds || [],
    targetEntity,
    ...metadata,
  };

  console.log(`[SCOPE_ACTION] ${action}:`, JSON.stringify(logData));
};

export default {
  applyScopeFilter,
  applyScopeFilterViaRelation,
  hasAccessToEntity,
  validateScopeAccess,
  getAccessibleEntityIds,
  logScopeAction,
  validateUserAccess,
};
