/**
 * State Machine trung tâm cho Incident và Maintenance Work Order
 * Đảm bảo mọi thay đổi trạng thái đều đi qua state machine này
 * Không được set status trực tiếp trong controller
 */

const ENTITIES = {
    INCIDENT: 'incident',
    MAINTENANCE: 'maintenance'
};

const ROLES = {
    REQUESTER: 'REQUESTER',
    TECHNICIAN: 'TECHNICIAN',
    MANAGER: 'MANAGER',
    QA: 'QA',
    ENGINEERING: 'ENGINEERING',
    PLANNER: 'PLANNER',
    ADMIN: 'ADMIN'
};

// ========================
// INCIDENT STATE MACHINE
// ========================

const INCIDENT_STATES = {
    REPORTED: 'reported',
    TRIAGED: 'triaged',
    OUT_OF_SERVICE: 'out_of_service',
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'in_progress',
    POST_FIX_CHECK: 'post_fix_check',
    RESOLVED: 'resolved',
    CLOSED: 'closed',
    CANCELLED: 'cancelled'
};

const INCIDENT_ACTIONS = {
    TRIAGE: 'triage',
    ISOLATE: 'isolate',
    ASSIGN: 'assign',
    START: 'start',
    SUBMIT_POST_FIX: 'submit_post_fix',
    POST_FIX_PASS: 'post_fix_pass',
    POST_FIX_FAIL: 'post_fix_fail',
    CLOSE: 'close',
    CANCEL: 'cancel'
};

const INCIDENT_TRANSITIONS = {
    [INCIDENT_STATES.REPORTED]: {
        [INCIDENT_ACTIONS.TRIAGE]: {
            to: INCIDENT_STATES.TRIAGED,
            allowedRoles: [ROLES.MANAGER, ROLES.QA, ROLES.ADMIN],
            validate: null,
            sideEffects: ['setSeverity', 'checkCriticalIsolation']
        },
        [INCIDENT_ACTIONS.CANCEL]: {
            to: INCIDENT_STATES.CANCELLED,
            allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
            validate: null,
            sideEffects: ['auditLog']
        }
    },
    [INCIDENT_STATES.TRIAGED]: {
        [INCIDENT_ACTIONS.ISOLATE]: {
            to: INCIDENT_STATES.OUT_OF_SERVICE,
            allowedRoles: [ROLES.MANAGER, ROLES.QA, ROLES.ADMIN],
            validate: null,
            sideEffects: ['setAssetDown', 'notifyProduction', 'setIsolated']
        },
        [INCIDENT_ACTIONS.ASSIGN]: {
            to: INCIDENT_STATES.ASSIGNED,
            allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
            validate: 'requireNonCriticalOrIsolated',
            sideEffects: ['notifyTechnician']
        }
    },
    [INCIDENT_STATES.OUT_OF_SERVICE]: {
        [INCIDENT_ACTIONS.ASSIGN]: {
            to: INCIDENT_STATES.ASSIGNED,
            allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
            validate: null,
            sideEffects: ['notifyTechnician']
        }
    },
    [INCIDENT_STATES.ASSIGNED]: {
        [INCIDENT_ACTIONS.START]: {
            to: INCIDENT_STATES.IN_PROGRESS,
            allowedRoles: [ROLES.TECHNICIAN, ROLES.ADMIN],
            validate: null,
            sideEffects: ['setStartedDate']
        }
    },
    [INCIDENT_STATES.IN_PROGRESS]: {
        [INCIDENT_ACTIONS.SUBMIT_POST_FIX]: {
            to: INCIDENT_STATES.POST_FIX_CHECK,
            allowedRoles: [ROLES.TECHNICIAN, ROLES.ADMIN],
            validate: null,
            sideEffects: ['notifyQA']
        }
    },
    [INCIDENT_STATES.POST_FIX_CHECK]: {
        [INCIDENT_ACTIONS.POST_FIX_PASS]: {
            to: INCIDENT_STATES.RESOLVED,
            allowedRoles: [ROLES.QA, ROLES.MANAGER, ROLES.ADMIN],
            validate: null,
            sideEffects: ['setPostFixResult', 'setResolvedDate']
        },
        [INCIDENT_ACTIONS.POST_FIX_FAIL]: {
            to: INCIDENT_STATES.IN_PROGRESS,
            allowedRoles: [ROLES.QA, ROLES.MANAGER, ROLES.ADMIN],
            validate: null,
            sideEffects: ['setPostFixResult', 'notifyTechnician']
        }
    },
    [INCIDENT_STATES.RESOLVED]: {
        [INCIDENT_ACTIONS.CLOSE]: {
            to: INCIDENT_STATES.CLOSED,
            allowedRoles: [ROLES.QA, ROLES.MANAGER, ROLES.ADMIN],
            validate: null,
            sideEffects: ['setClosedDate', 'notifyAll', 'checkCAPA']
        }
    },
    [INCIDENT_STATES.CLOSED]: {},
    [INCIDENT_STATES.CANCELLED]: {}
};

// ========================
// MAINTENANCE STATE MACHINE
// ========================

const MAINTENANCE_STATES = {
    DRAFT: 'draft',
    PENDING: 'pending',
    APPROVED: 'approved',
    SCHEDULED: 'scheduled',
    IN_PROGRESS: 'in_progress',
    AWAITING_ACCEPTANCE: 'awaiting_acceptance',
    ACCEPTED: 'accepted',
    CLOSED: 'closed',
    CANCELLED: 'cancelled'
};

const MAINTENANCE_ACTIONS = {
    SUBMIT: 'submit',
    APPROVE: 'approve',
    SCHEDULE: 'schedule',
    START: 'start',
    SUBMIT_ACCEPTANCE: 'submit_acceptance',
    ACCEPT: 'accept',
    REJECT_ACCEPTANCE: 'reject_acceptance',
    CLOSE: 'close',
    CANCEL: 'cancel'
};

const MAINTENANCE_TRANSITIONS = {
    [MAINTENANCE_STATES.DRAFT]: {
        [MAINTENANCE_ACTIONS.SUBMIT]: {
            to: MAINTENANCE_STATES.PENDING,
            allowedRoles: [ROLES.PLANNER, ROLES.MANAGER, ROLES.ADMIN],
            validate: null,
            sideEffects: ['notifyManager']
        },
        [MAINTENANCE_ACTIONS.CANCEL]: {
            to: MAINTENANCE_STATES.CANCELLED,
            allowedRoles: [ROLES.MANAGER, ROLES.PLANNER, ROLES.ADMIN],
            validate: null,
            sideEffects: ['setCancelledDetails']
        }
    },
    [MAINTENANCE_STATES.PENDING]: {
        [MAINTENANCE_ACTIONS.APPROVE]: {
            to: MAINTENANCE_STATES.APPROVED,
            allowedRoles: [ROLES.MANAGER, ROLES.QA, ROLES.ADMIN],
            validate: null,
            sideEffects: ['setApprovedDetails', 'notifyPlanner']
        },
        [MAINTENANCE_ACTIONS.CANCEL]: {
            to: MAINTENANCE_STATES.CANCELLED,
            allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
            validate: null,
            sideEffects: ['setCancelledDetails']
        }
    },
    [MAINTENANCE_STATES.APPROVED]: {
        [MAINTENANCE_ACTIONS.SCHEDULE]: {
            to: MAINTENANCE_STATES.SCHEDULED,
            allowedRoles: [ROLES.PLANNER, ROLES.MANAGER, ROLES.ADMIN],
            validate: null,
            sideEffects: ['notifyTechnician', 'notifyProduction', 'notifyWarehouse']
        },
        [MAINTENANCE_ACTIONS.CANCEL]: {
            to: MAINTENANCE_STATES.CANCELLED,
            allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
            validate: null,
            sideEffects: ['setCancelledDetails']
        }
    },
    [MAINTENANCE_STATES.SCHEDULED]: {
        [MAINTENANCE_ACTIONS.START]: {
            to: MAINTENANCE_STATES.IN_PROGRESS,
            allowedRoles: [ROLES.TECHNICIAN, ROLES.ADMIN],
            validate: null,
            sideEffects: ['setActualStartDate']
        },
        [MAINTENANCE_ACTIONS.CANCEL]: {
            to: MAINTENANCE_STATES.CANCELLED,
            allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
            validate: null,
            sideEffects: ['setCancelledDetails']
        }
    },
    [MAINTENANCE_STATES.IN_PROGRESS]: {
        [MAINTENANCE_ACTIONS.SUBMIT_ACCEPTANCE]: {
            to: MAINTENANCE_STATES.AWAITING_ACCEPTANCE,
            allowedRoles: [ROLES.TECHNICIAN, ROLES.ADMIN],
            validate: null,
            sideEffects: ['notifyQA', 'notifyEngineering']
        }
    },
    [MAINTENANCE_STATES.AWAITING_ACCEPTANCE]: {
        [MAINTENANCE_ACTIONS.ACCEPT]: {
            to: MAINTENANCE_STATES.ACCEPTED,
            allowedRoles: [ROLES.QA, ROLES.ENGINEERING, ROLES.ADMIN],
            validate: null,
            sideEffects: ['setAcceptedDetails', 'notifyManager']
        },
        [MAINTENANCE_ACTIONS.REJECT_ACCEPTANCE]: {
            to: MAINTENANCE_STATES.IN_PROGRESS,
            allowedRoles: [ROLES.QA, ROLES.ENGINEERING, ROLES.ADMIN],
            validate: null,
            sideEffects: ['setRejectionNotes', 'notifyTechnician']
        }
    },
    [MAINTENANCE_STATES.ACCEPTED]: {
        [MAINTENANCE_ACTIONS.CLOSE]: {
            to: MAINTENANCE_STATES.CLOSED,
            allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
            validate: null,
            sideEffects: ['setAssetActive', 'setClosedDate', 'notifyProduction']
        }
    },
    [MAINTENANCE_STATES.CLOSED]: {},
    [MAINTENANCE_STATES.CANCELLED]: {}
};

// ========================
// VALIDATION RULES
// ========================

const VALIDATIONS = {
    requireNonCriticalOrIsolated: (record) => {
        if (record.severity === 'critical' && !record.is_isolated) {
            throw new Error('Critical incident must be isolated before assignment');
        }
        return true;
    },
    requireMaintenancePlanApproved: (record) => {
        if (record.plan_status && record.plan_status !== 'approved') {
            throw new Error('Maintenance plan must be approved before creating work order');
        }
        return true;
    }
};

// ========================
// STATE MACHINE ENGINE
// ========================

class StateMachine {
    constructor(entity) {
        this.entity = entity;
        this.transitions = entity === ENTITIES.INCIDENT 
            ? INCIDENT_TRANSITIONS 
            : MAINTENANCE_TRANSITIONS;
    }

    /**
     * Kiểm tra xem transition có hợp lệ không
     */
    canTransition(fromState, action, role) {
        const stateTransitions = this.transitions[fromState];
        if (!stateTransitions) return false;

        const transition = stateTransitions[action];
        if (!transition) return false;

        return transition.allowedRoles.includes(role);
    }

    /**
     * Thực hiện transition
     * @param {Object} record - Record hiện tại (incident hoặc maintenance)
     * @param {string} action - Action muốn thực hiện
     * @param {Object} context - { user, payload }
     * @returns {Object} - { newState, sideEffects }
     */
    transition(record, action, context) {
        const currentState = record.status;
        const role = context.user.role || context.user.position || 'REQUESTER';

        // Kiểm tra transition có tồn tại
        const stateTransitions = this.transitions[currentState];
        if (!stateTransitions) {
            throw new Error(`No transitions available from state: ${currentState}`);
        }

        const transition = stateTransitions[action];
        if (!transition) {
            throw new Error(`Action "${action}" not allowed from state: ${currentState}`);
        }

        // Kiểm tra RBAC
        if (!transition.allowedRoles.includes(role) && role !== 'ADMIN') {
            throw new Error(`Role "${role}" not allowed to perform action "${action}" from state "${currentState}"`);
        }

        // Validate
        if (transition.validate) {
            const validator = VALIDATIONS[transition.validate];
            if (validator) {
                validator(record);
            }
        }

        return {
            newState: transition.to,
            sideEffects: transition.sideEffects || [],
            action,
            fromState: currentState
        };
    }

    /**
     * Lấy danh sách actions có thể thực hiện tiếp theo
     */
    getNextActions(currentState, role) {
        const stateTransitions = this.transitions[currentState];
        if (!stateTransitions) return [];

        return Object.entries(stateTransitions)
            .filter(([action, transition]) => {
                return transition.allowedRoles.includes(role) || role === 'ADMIN';
            })
            .map(([action]) => action);
    }

    /**
     * Lấy thông tin transition
     */
    getTransitionInfo(fromState, action) {
        const stateTransitions = this.transitions[fromState];
        if (!stateTransitions) return null;
        return stateTransitions[action] || null;
    }
}

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Normalize role từ user object
 */
const normalizeRole = (user) => {
    if (!user) return ROLES.REQUESTER;
    
    const roleStr = (user.role || user.position || user.title || '').toUpperCase();
    
    // Map các tên role từ DB sang chuẩn
    const roleMap = {
        'MANAGER': ROLES.MANAGER,
        'TECHNICIAN': ROLES.TECHNICIAN,
        'QA': ROLES.QA,
        'ENGINEERING': ROLES.ENGINEERING,
        'PLANNER': ROLES.PLANNER,
        'ADMIN': ROLES.ADMIN,
        'REQUESTER': ROLES.REQUESTER
    };

    return roleMap[roleStr] || ROLES.REQUESTER;
};

/**
 * Tạo instance state machine
 */
const createStateMachine = (entity) => {
    return new StateMachine(entity);
};

module.exports = {
    ENTITIES,
    ROLES,
    INCIDENT_STATES,
    INCIDENT_ACTIONS,
    INCIDENT_TRANSITIONS,
    MAINTENANCE_STATES,
    MAINTENANCE_ACTIONS,
    MAINTENANCE_TRANSITIONS,
    StateMachine,
    createStateMachine,
    normalizeRole
};
