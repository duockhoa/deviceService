/**
 * Action-based Permission Middleware
 * Validates user role against allowed actions before controller execution
 */

const { StateMachine } = require('../utils/stateMachine');

/**
 * Middleware factory to check if user can perform specific action
 * @param {string} entityType - 'incident' or 'maintenance'
 * @param {string} action - Action constant (e.g., 'triage', 'approve')
 */
const checkActionPermission = (entityType, action) => {
    return async (req, res, next) => {
        try {
            const userRole = req.user?.role;
            const userId = req.user?.id;

            if (!userRole || !userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Admin bypass
            if (userRole === 'ADMIN') {
                return next();
            }

            // Check if role can perform this action (state-agnostic check)
            const stateMachine = new StateMachine(entityType);
            const allTransitions = entityType === 'incident' 
                ? stateMachine.incidentTransitions 
                : stateMachine.maintenanceTransitions;

            // Find if any transition with this action allows the role
            let roleAllowed = false;
            for (const [fromState, actions] of Object.entries(allTransitions)) {
                if (actions[action] && actions[action].allowedRoles.includes(userRole)) {
                    roleAllowed = true;
                    break;
                }
            }

            if (!roleAllowed) {
                return res.status(403).json({
                    success: false,
                    message: `Role ${userRole} is not allowed to perform action: ${action}`
                });
            }

            // Role is allowed for this action (specific state validation happens in controller)
            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking permissions',
                error: error.message
            });
        }
    };
};

/**
 * Check if user has specific role(s)
 * @param {string|string[]} allowedRoles - Single role or array of roles
 */
const requireRole = (allowedRoles) => {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    return (req, res, next) => {
        const userRole = req.user?.role;

        if (!userRole) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (userRole === 'ADMIN' || roles.includes(userRole)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: `Access denied. Required roles: ${roles.join(', ')}`
        });
    };
};

/**
 * Check if user can view entity (any authenticated user can view)
 */
const canViewEntity = (req, res, next) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required to view this resource'
        });
    }
    next();
};

/**
 * Check if user is owner or has elevated role
 * @param {string} entityType - 'incident' or 'maintenance'
 */
const canModifyEntity = (entityType) => {
    return async (req, res, next) => {
        try {
            const userRole = req.user?.role;
            const userId = req.user?.id;

            if (!userRole || !userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Admin and MANAGER can always modify
            if (userRole === 'ADMIN' || userRole === 'MANAGER') {
                return next();
            }

            // For others, check ownership (implemented in controller with actual entity)
            req.ownership_check_required = true;
            next();
        } catch (error) {
            console.error('Modify check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking modification permissions',
                error: error.message
            });
        }
    };
};

module.exports = {
    checkActionPermission,
    requireRole,
    canViewEntity,
    canModifyEntity
};
