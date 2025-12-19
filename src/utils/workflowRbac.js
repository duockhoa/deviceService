const ENTITIES = {
    incident: 'incident',
    workRequest: 'workRequest',
    workOrder: 'workOrder'
};

const ROLES = ['REQUESTER', 'TECHNICIAN', 'MANAGER', 'QA', 'ADMIN'];

const WORKFLOW_RBAC = {
    incident: {
        reported: {
            investigating: ['MANAGER', 'QA', 'ADMIN']
        },
        investigating: {
            in_progress: ['MANAGER', 'ADMIN']
        },
        in_progress: {
            resolved: ['TECHNICIAN', 'MANAGER', 'ADMIN']
        },
        resolved: {
            closed: ['QA', 'MANAGER', 'ADMIN']
        },
        closed: {}
    },
    workRequest: {
        pending: {
            assigned: ['MANAGER', 'ADMIN']
        },
        assigned: {
            in_progress: ['TECHNICIAN', 'ADMIN']
        },
        in_progress: {
            closed: ['MANAGER', 'QA', 'ADMIN']
        },
        closed: {}
    },
    workOrder: {
        pending: {
            in_progress: ['TECHNICIAN', 'ADMIN']
        },
        in_progress: {
            awaiting_approval: ['TECHNICIAN', 'ADMIN']
        },
        awaiting_approval: {
            completed: ['MANAGER', 'ADMIN'],
            in_progress: ['MANAGER', 'ADMIN']
        },
        completed: {
            closed: ['QA', 'MANAGER', 'ADMIN']
        },
        closed: {}
    }
};

const normalize = (val) => (typeof val === 'string' ? val.toUpperCase() : null);

const getUserRole = (user = {}) => {
    const candidates = [user.role, user.position, user.title];
    if (Array.isArray(user.roles) && user.roles.length) {
        candidates.push(user.roles[0], user.roles[0]?.name, user.roles[0]?.code);
    }
    const found = candidates.map(normalize).find((r) => ROLES.includes(r));
    return found || 'REQUESTER';
};

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

const nextActions = (entity, from, role) => {
    const rules = WORKFLOW_RBAC[entity] || {};
    const transitions = rules[from] || {};
    return Object.entries(transitions)
        .filter(([, roles]) => Array.isArray(roles) && roles.includes(role))
        .map(([to]) => to);
};

module.exports = {
    ENTITIES,
    ROLES,
    WORKFLOW_RBAC,
    getUserRole,
    assertRBAC,
    nextActions
};
