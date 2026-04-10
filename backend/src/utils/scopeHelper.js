// backend/src/utils/scopeHelper.js
// Helper functions for scope-based access control

/**
 * Build scope filter for queries
 * @param {Object} user - req.user from JWT
 * @param {Object} additionalWhere - Additional where conditions
 * @returns {Object} - Where clause with scope applied
 */
export const applyScopeFilter = (user, additionalWhere = {}) => {
  const { accessLevel, scopeEntityIds } = user;

  // Level 1 (MASTER) → No filter
  if (accessLevel === 1) {
    return additionalWhere;
  }

  // Level 2 (SUB_ACCESS) → Filter by scopeEntityIds
  if (accessLevel === 2) {
    if (!scopeEntityIds || scopeEntityIds.length === 0) {
      // No entities assigned → Return filter that matches nothing
      console.warn(`[SCOPE] Level 2 user ${user.id} has no scopeEntityIds`);
      return {
        ...additionalWhere,
        plottingCompanyId: { in: [] }, // Matches nothing
      };
    }

    return {
      ...additionalWhere,
      plottingCompanyId: { in: scopeEntityIds },
    };
  }

  // Level 3+ (EMPLOYEES) → No scope filter at this level
  return additionalWhere;
};

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
export const validateScopeAccess = (
  user,
  plottingCompanyId,
  action = "perform this action",
) => {
  if (!hasAccessToEntity(user, plottingCompanyId)) {
    const error = new Error(
      `Access denied: You cannot ${action} for this entity`,
    );
    error.statusCode = 403;

    console.warn(
      `[SCOPE] Access denied: User ${user.id} (Level ${user.accessLevel}) tried to ${action} for entity ${plottingCompanyId}`,
    );
    console.warn(
      `[SCOPE] User's scopeEntityIds: ${JSON.stringify(user.scopeEntityIds || [])}`,
    );

    throw error;
  }
};

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
