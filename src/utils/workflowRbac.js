/**
 * DEPRECATED - Chuyển sang sử dụng stateMachine.js
 * File này giữ lại để tương thích ngược
 */
const { 
    createStateMachine, 
    ENTITIES: SM_ENTITIES,
    normalizeRole: smNormalizeRole,
    ROLES: SM_ROLES
} = require('./stateMachine');

const ENTITIES = {
    incident: 'incident',
    workRequest: 'workRequest',
    maintenance: 'maintenance' // Thêm maintenance (thay workOrder)
};

const ROLES = ['REQUESTER', 'TECHNICIAN', 'MANAGER', 'QA', 'ENGINEERING', 'PLANNER', 'ADMIN'];

// Legacy RBAC - giữ để tương thích
const WORKFLOW_RBAC = {
    incident: {
        reported: {
            triaged: ['MANAGER', 'QA', 'ADMIN'],
            cancelled: ['MANAGER', 'ADMIN']
        },
        triaged: {
            out_of_service: ['MANAGER', 'QA', 'ADMIN'],
            assigned: ['MANAGER', 'ADMIN']
        },
        out_of_service: {
            assigned: ['MANAGER', 'ADMIN']
        },
        assigned: {
            in_progress: ['TECHNICIAN', 'ADMIN']
        },
        in_progress: {
            post_fix_check: ['TECHNICIAN', 'ADMIN']
        },
        post_fix_check: {
            resolved: ['QA', 'MANAGER', 'ADMIN'],
            in_progress: ['QA', 'MANAGER', 'ADMIN']
        },
        resolved: {
            closed: ['QA', 'MANAGER', 'ADMIN']
        },
        closed: {},
        cancelled: {}
    },
    workRequest: {
        draft: {
            pending: ['REQUESTER', 'PLANNER', 'ADMIN']
        },
        pending: {
            assigned: ['MANAGER', 'ADMIN']
        },
        assigned: {
            in_progress: ['TECHNICIAN', 'ADMIN']
        },
        in_progress: {
            awaiting_confirm: ['TECHNICIAN', 'MANAGER', 'ADMIN'],
            closed: ['MANAGER', 'QA', 'ADMIN']
        },
        awaiting_confirm: {
            closed: ['MANAGER', 'QA', 'ADMIN']
        },
        closed: {},
        cancelled: {}
    },
    maintenance: {
        draft: {
            pending: ['PLANNER', 'MANAGER', 'ADMIN'],
            cancelled: ['MANAGER', 'PLANNER', 'ADMIN']
        },
        pending: {
            approved: ['MANAGER', 'QA', 'ADMIN'],
            cancelled: ['MANAGER', 'ADMIN']
        },
        approved: {
            scheduled: ['PLANNER', 'MANAGER', 'ADMIN'],
            cancelled: ['MANAGER', 'ADMIN']
        },
        scheduled: {
            in_progress: ['TECHNICIAN', 'ADMIN'],
            cancelled: ['MANAGER', 'ADMIN']
        },
        in_progress: {
            awaiting_acceptance: ['TECHNICIAN', 'ADMIN']
        },
        awaiting_acceptance: {
            accepted: ['QA', 'ENGINEERING', 'ADMIN'],
            in_progress: ['QA', 'ENGINEERING', 'ADMIN']
        },
        accepted: {
            closed: ['MANAGER', 'ADMIN']
        },
        closed: {},
        cancelled: {}
    }
};

const normalize = (val) => (typeof val === 'string' ? val.toUpperCase() : null);

/**
 * Lấy role của user - sử dụng normalizeRole từ stateMachine
 */
const getUserRole = (user = {}) => {
    return smNormalizeRole(user);
};

/**
 * DEPRECATED - Sử dụng stateMachine.transition() thay thế
 * Giữ lại để tương thích code cũ
 */
const assertRBAC = (entity, from, to, role) => {
    const rules = WORKFLOW_RBAC[entity] || {};
    const transitions = rules[from] || {};
    const allowedRoles = transitions[to];
    if (!allowedRoles || !allowedRoles.includes(role)) {
        const err = new Error(`Transition not allowed: ${entity} ${from} -> ${to} for role ${role}`);
        err.statusCode = 403;
        throw err;
    }
};

/**
 * DEPRECATED - Sử dụng stateMachine.getNextActions() thay thế
 * Trả về danh sách trạng thái tiếp theo (legacy)
 */
const nextActions = (entity, from, role) => {
    const rules = WORKFLOW_RBAC[entity] || {};
    const transitions = rules[from] || {};
    return Object.entries(transitions)
        .filter(([, roles]) => Array.isArray(roles) && roles.includes(role))
        .map(([to]) => to);
};

/**
 * Hàm mới - lấy danh sách ACTIONS có thể thực hiện (không phải next states)
 * Sử dụng state machine
 */
const getNextActions = (entity, currentState, role) => {
    // Map entity name
    const entityMap = {
        'incident': SM_ENTITIES.INCIDENT,
        'maintenance': SM_ENTITIES.MAINTENANCE
    };
    
    const mappedEntity = entityMap[entity];
    if (!mappedEntity) {
        // Fallback to legacy for workRequest
        return nextActions(entity, currentState, role);
    }

    const sm = createStateMachine(mappedEntity);
    return sm.getNextActions(currentState, role);
};

module.exports = {
    ENTITIES,
    ROLES,
    WORKFLOW_RBAC,
    getUserRole,
    assertRBAC,
    nextActions,
    getNextActions, // Hàm mới
    createStateMachine, // Export để controller sử dụng
    SM_ENTITIES
};
