/**
 * State Machine trung tâm cho Incident, Maintenance Work Order, và Calibration Order
 * Đảm bảo mọi thay đổi trạng thái đều đi qua state machine này
 * Không được set status trực tiếp trong controller
 * 
 * SAP PM-lite Core Extensions:
 * - Asset operational_status: AVLB/MNTC/DOWN/DCOM
 * - Incident notification_type: M1/M2/M3/M4
 * - Maintenance system_status: CRTD/REL/TECO (with gates)
 */

const ENTITIES = {
    INCIDENT: 'incident',
    MAINTENANCE: 'maintenance',
    CALIBRATION: 'calibration'
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
// SAP PM-LITE CORE CONSTANTS
// ========================

/**
 * SAP PM Notification Types
 * - M1: Breakdown (counts toward MTBF/MTTR)
 * - M2: Malfunction (no production stop)
 * - M3: Request (maintenance request)
 * - M4: Activity (general activity report)
 */
const NOTIFICATION_TYPE = {
    M1_BREAKDOWN: 'M1',
    M2_MALFUNCTION: 'M2',
    M3_REQUEST: 'M3',
    M4_ACTIVITY: 'M4'
};

/**
 * SAP PM System Status (for Work Orders)
 * - CRTD: Created (planning phase)
 * - REL: Released (scope locked, execution phase)
 * - TECO: Technically Complete (cost locked, closing phase)
 */
const SYSTEM_STATUS = {
    CREATED: 'CRTD',
    RELEASED: 'REL',
    TECHNICALLY_COMPLETE: 'TECO'
};

/**
 * SAP PM Equipment Operational Status
 * - AVLB: Available (ready for production)
 * - MNTC: Maintenance (under maintenance)
 * - DOWN: Breakdown (production stopped)
 * - DCOM: Decommissioned (permanently removed)
 */
const OPERATIONAL_STATUS = {
    AVAILABLE: 'AVLB',
    MAINTENANCE: 'MNTC',
    DOWN: 'DOWN',
    DECOMMISSIONED: 'DCOM'
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
    POST_FIX_CHECK: 'post_fix_check',  // Unified action with 'result' parameter
    CLOSE: 'close',
    CANCEL: 'cancel'
};

const INCIDENT_TRANSITIONS = {
    [INCIDENT_STATES.REPORTED]: {
        [INCIDENT_ACTIONS.TRIAGE]: {
            to: INCIDENT_STATES.TRIAGED,
            allowedRoles: [ROLES.MANAGER, ROLES.QA, ROLES.ADMIN],
            validate: null,
            sideEffects: ['setSeverity', 'checkCriticalIsolation'],
            systemStatus: null,
            operationalStatus: null
        },
        [INCIDENT_ACTIONS.CANCEL]: {
            to: INCIDENT_STATES.CANCELLED,
            allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
            validate: 'requireCancelReason',
            sideEffects: ['auditLog'],
            systemStatus: null,
            operationalStatus: null
        }
    },
    [INCIDENT_STATES.TRIAGED]: {
        [INCIDENT_ACTIONS.ISOLATE]: {
            to: INCIDENT_STATES.OUT_OF_SERVICE,
            allowedRoles: [ROLES.MANAGER, ROLES.QA, ROLES.ADMIN],
            validate: 'requireM1NotificationType',  // SAP PM: Only M1 can be isolated
            sideEffects: ['setAssetDOWN', 'notifyProduction', 'setIsolated'],  // SAP PM: Asset → DOWN
            systemStatus: null,
            operationalStatus: OPERATIONAL_STATUS.DOWN
        },
        [INCIDENT_ACTIONS.ASSIGN]: {
            to: INCIDENT_STATES.ASSIGNED,
            allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
            validate: 'requireAssignedTo',
            sideEffects: ['notifyTechnician'],
            systemStatus: null,
            operationalStatus: null
        }
    },
    [INCIDENT_STATES.OUT_OF_SERVICE]: {
        [INCIDENT_ACTIONS.ASSIGN]: {
            to: INCIDENT_STATES.ASSIGNED,
            allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
            validate: 'requireAssignedTo',
            sideEffects: ['notifyTechnician'],
            systemStatus: null,
            operationalStatus: null
        }
    },
    [INCIDENT_STATES.ASSIGNED]: {
        [INCIDENT_ACTIONS.START]: {
            to: INCIDENT_STATES.IN_PROGRESS,
            allowedRoles: [ROLES.TECHNICIAN, ROLES.ADMIN],
            validate: null,
            sideEffects: ['setStartedDate'],
            systemStatus: null,
            operationalStatus: null
        }
    },
    [INCIDENT_STATES.IN_PROGRESS]: {
        [INCIDENT_ACTIONS.SUBMIT_POST_FIX]: {
            to: INCIDENT_STATES.POST_FIX_CHECK,
            allowedRoles: [ROLES.TECHNICIAN, ROLES.ADMIN],
            validate: null,
            sideEffects: ['notifyQA'],
            systemStatus: null,
            operationalStatus: null
        }
    },
    [INCIDENT_STATES.POST_FIX_CHECK]: {
        [INCIDENT_ACTIONS.POST_FIX_CHECK]: {
            to: (context) => {
                // Dynamic transition based on post_fix_result
                return context.post_fix_result === 'pass' 
                    ? INCIDENT_STATES.RESOLVED 
                    : INCIDENT_STATES.IN_PROGRESS;
            },
            allowedRoles: [ROLES.QA, ROLES.ENGINEERING, ROLES.ADMIN],
            validate: 'requirePostFixResult',
            sideEffects: (context) => {
                const effects = ['setPostFixResult'];
                if (context.post_fix_result === 'pass') {
                    effects.push('setResolvedDate');
                    effects.push('setAssetAVLB');  // SAP PM: Asset → AVLB (if no blocking work)
                } else {
                    effects.push('notifyTechnician');
                }
                return effects;
            },
            systemStatus: null,
            operationalStatus: null
        }
    },
    [INCIDENT_STATES.RESOLVED]: {
        [INCIDENT_ACTIONS.CLOSE]: {
            to: INCIDENT_STATES.CLOSED,
            allowedRoles: [ROLES.QA, ROLES.MANAGER, ROLES.ADMIN],
            validate: 'requireDowntimeForM1',  // SAP PM: M1 must have downtime_minutes
            sideEffects: ['setClosedDate', 'notifyAll', 'checkCAPA', 'setAssetAVLB'],  // SAP PM: Asset → AVLB
            systemStatus: null,
            operationalStatus: null
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
            sideEffects: ['notifyManager'],
            systemStatus: SYSTEM_STATUS.CREATED,  // SAP PM: CRTD
            operationalStatus: null
        },
        [MAINTENANCE_ACTIONS.CANCEL]: {
            to: MAINTENANCE_STATES.CANCELLED,
            allowedRoles: [ROLES.MANAGER, ROLES.PLANNER, ROLES.ADMIN],
            validate: 'requireCancelReason',
            sideEffects: ['setCancelledDetails'],
            systemStatus: null,
            operationalStatus: null
        }
    },
    [MAINTENANCE_STATES.PENDING]: {
        [MAINTENANCE_ACTIONS.APPROVE]: {
            to: MAINTENANCE_STATES.APPROVED,
            allowedRoles: [ROLES.MANAGER, ROLES.QA, ROLES.ADMIN, ROLES.TECHNICIAN],  // Thêm TECHNICIAN để cho phép approve
            validate: null,
            sideEffects: ['setApprovedDetails', 'notifyPlanner'],
            systemStatus: SYSTEM_STATUS.CREATED,  // SAP PM: Still CRTD
            operationalStatus: null
        },
        [MAINTENANCE_ACTIONS.CANCEL]: {
            to: MAINTENANCE_STATES.CANCELLED,
            allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
            validate: 'requireCancelReason',
            sideEffects: ['setCancelledDetails'],
            systemStatus: null,
            operationalStatus: null
        }
    },
    [MAINTENANCE_STATES.APPROVED]: {
        [MAINTENANCE_ACTIONS.SCHEDULE]: {
            to: MAINTENANCE_STATES.SCHEDULED,
            allowedRoles: [ROLES.PLANNER, ROLES.MANAGER, ROLES.ADMIN],
            validate: 'requireScheduleData',
            sideEffects: ['notifyTechnician', 'notifyProduction', 'notifyWarehouse'],
            systemStatus: SYSTEM_STATUS.RELEASED,  // SAP PM: REL (scope locked)
            operationalStatus: null
        },
        [MAINTENANCE_ACTIONS.CANCEL]: {
            to: MAINTENANCE_STATES.CANCELLED,
            allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
            validate: 'requireCancelReason',
            sideEffects: ['setCancelledDetails'],
            systemStatus: null,
            operationalStatus: null
        }
    },
    [MAINTENANCE_STATES.SCHEDULED]: {
        [MAINTENANCE_ACTIONS.START]: {
            to: MAINTENANCE_STATES.IN_PROGRESS,
            allowedRoles: [ROLES.TECHNICIAN, ROLES.ADMIN],
            validate: 'checkSystemStatusGates',  // SAP PM: Cannot modify scope if REL
            sideEffects: ['setActualStartDate', 'setAssetMNTC'],  // SAP PM: Asset → MNTC
            systemStatus: SYSTEM_STATUS.RELEASED,  // SAP PM: Stays REL
            operationalStatus: OPERATIONAL_STATUS.MAINTENANCE
        },
        [MAINTENANCE_ACTIONS.CANCEL]: {
            to: MAINTENANCE_STATES.CANCELLED,
            allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
            validate: 'requireCancelReason',
            sideEffects: ['setCancelledDetails'],
            systemStatus: null,
            operationalStatus: null
        }
    },
    [MAINTENANCE_STATES.IN_PROGRESS]: {
        [MAINTENANCE_ACTIONS.SUBMIT_ACCEPTANCE]: {
            to: MAINTENANCE_STATES.AWAITING_ACCEPTANCE,
            allowedRoles: [ROLES.TECHNICIAN, ROLES.ADMIN],
            validate: 'checkSystemStatusGates',  // SAP PM: Cannot modify scope if REL
            sideEffects: ['notifyQA', 'notifyEngineering'],
            systemStatus: SYSTEM_STATUS.RELEASED,  // SAP PM: Stays REL
            operationalStatus: null
        }
    },
    [MAINTENANCE_STATES.AWAITING_ACCEPTANCE]: {
        [MAINTENANCE_ACTIONS.ACCEPT]: {
            to: MAINTENANCE_STATES.ACCEPTED,
            allowedRoles: [ROLES.QA, ROLES.ENGINEERING, ROLES.ADMIN],
            validate: null,
            sideEffects: ['setAcceptedDetails', 'closeLinkedIncident', 'notifyManager'],
            systemStatus: SYSTEM_STATUS.TECHNICALLY_COMPLETE,  // SAP PM: TECO (cost locked)
            operationalStatus: null
        },
        [MAINTENANCE_ACTIONS.REJECT_ACCEPTANCE]: {
            to: MAINTENANCE_STATES.IN_PROGRESS,
            allowedRoles: [ROLES.QA, ROLES.ENGINEERING, ROLES.ADMIN],
            validate: 'requireRejectionNotes',
            sideEffects: ['setRejectionNotes', 'notifyTechnician'],
            systemStatus: SYSTEM_STATUS.RELEASED,  // SAP PM: Back to REL
            operationalStatus: null
        }
    },
    [MAINTENANCE_STATES.ACCEPTED]: {
        [MAINTENANCE_ACTIONS.CLOSE]: {
            to: MAINTENANCE_STATES.CLOSED,
            allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
            validate: 'checkSystemStatusGates',  // SAP PM: Cannot modify cost if TECO
            sideEffects: ['setAssetAVLB', 'setClosedDate', 'closeLinkedIncident', 'notifyProduction'],  // SAP PM: Asset → AVLB
            systemStatus: SYSTEM_STATUS.TECHNICALLY_COMPLETE,  // SAP PM: Stays TECO
            operationalStatus: OPERATIONAL_STATUS.AVAILABLE
        }
    },
    [MAINTENANCE_STATES.CLOSED]: {},
    [MAINTENANCE_STATES.CANCELLED]: {}
};

// ========================
// CALIBRATION STATE MACHINE (GMP Compliance)
// ========================

const CALIBRATION_STATES = {
    DRAFT: 'draft',
    SCHEDULED: 'scheduled',
    IN_PROGRESS: 'in_progress',
    AWAITING_QA_REVIEW: 'awaiting_qa_review',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    OUT_OF_TOLERANCE: 'out_of_tolerance',
    CORRECTIVE_ACTION: 'corrective_action',
    CLOSED: 'closed',
    CANCELLED: 'cancelled'
};

const CALIBRATION_ACTIONS = {
    SUBMIT: 'submit',
    SCHEDULE: 'schedule',
    START: 'start',
    SUBMIT_RESULTS: 'submit_results',
    QA_ACCEPT: 'qa_accept',
    QA_REJECT: 'qa_reject',
    MARK_OOT: 'mark_oot',
    START_CAPA: 'start_capa',
    COMPLETE_CAPA: 'complete_capa',
    CLOSE: 'close',
    CANCEL: 'cancel'
};

const CALIBRATION_TRANSITIONS = {
    [CALIBRATION_STATES.DRAFT]: {
        [CALIBRATION_ACTIONS.SUBMIT]: {
            to: CALIBRATION_STATES.SCHEDULED,
            allowedRoles: [ROLES.TECHNICIAN, ROLES.PLANNER, ROLES.ADMIN],
            validate: null,
            sideEffects: ['notifyPlanner']
        },
        [CALIBRATION_ACTIONS.SCHEDULE]: {
            to: CALIBRATION_STATES.SCHEDULED,
            allowedRoles: [ROLES.PLANNER, ROLES.QA, ROLES.ADMIN],
            validate: 'requireScheduleDate',
            sideEffects: ['setSystemStatus_REL', 'notifyCalibrator']
        },
        [CALIBRATION_ACTIONS.CANCEL]: {
            to: CALIBRATION_STATES.CANCELLED,
            allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
            validate: 'requireCancelReason',
            sideEffects: ['auditLog']
        }
    },
    [CALIBRATION_STATES.SCHEDULED]: {
        [CALIBRATION_ACTIONS.START]: {
            to: CALIBRATION_STATES.IN_PROGRESS,
            allowedRoles: [ROLES.TECHNICIAN, ROLES.ADMIN],
            validate: 'checkAssetAvailable',
            sideEffects: ['setStartedDate', 'setAssetInCalibration']
        },
        [CALIBRATION_ACTIONS.CANCEL]: {
            to: CALIBRATION_STATES.CANCELLED,
            allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
            validate: 'requireCancelReason',
            sideEffects: ['auditLog']
        }
    },
    [CALIBRATION_STATES.IN_PROGRESS]: {
        [CALIBRATION_ACTIONS.SUBMIT_RESULTS]: {
            to: CALIBRATION_STATES.AWAITING_QA_REVIEW,
            allowedRoles: [ROLES.TECHNICIAN, ROLES.ADMIN],
            validate: 'requireResults',
            sideEffects: ['setCompletedDate', 'notifyQA']
        }
    },
    [CALIBRATION_STATES.AWAITING_QA_REVIEW]: {
        [CALIBRATION_ACTIONS.QA_ACCEPT]: {
            to: CALIBRATION_STATES.ACCEPTED,
            allowedRoles: [ROLES.QA, ROLES.ADMIN],
            validate: 'requireQANotes',
            sideEffects: ['setQAAccepted', 'updateAssetCalibrationValid', 'setSystemStatus_TECO']
        },
        [CALIBRATION_ACTIONS.QA_REJECT]: {
            to: CALIBRATION_STATES.REJECTED,
            allowedRoles: [ROLES.QA, ROLES.ADMIN],
            validate: 'requireRejectionReason',
            sideEffects: ['setQARejected', 'notifyTechnician']
        },
        [CALIBRATION_ACTIONS.MARK_OOT]: {
            to: CALIBRATION_STATES.OUT_OF_TOLERANCE,
            allowedRoles: [ROLES.QA, ROLES.ADMIN],
            validate: 'requireOOTSeverity',
            sideEffects: ['setOOTFlag', 'setAssetOutOfTolerance', 'notifyQA_Manager', 'checkCAPA_Required']
        }
    },
    [CALIBRATION_STATES.REJECTED]: {
        [CALIBRATION_ACTIONS.START]: {
            to: CALIBRATION_STATES.IN_PROGRESS,
            allowedRoles: [ROLES.TECHNICIAN, ROLES.ADMIN],
            validate: null,
            sideEffects: ['clearRejection', 'incrementRejectionCount']
        }
    },
    [CALIBRATION_STATES.OUT_OF_TOLERANCE]: {
        [CALIBRATION_ACTIONS.START_CAPA]: {
            to: CALIBRATION_STATES.CORRECTIVE_ACTION,
            allowedRoles: [ROLES.MANAGER, ROLES.QA, ROLES.ADMIN],
            validate: 'requireCorrectiveActionPlan',
            sideEffects: ['createMaintenanceWO', 'linkCAPA']
        }
    },
    [CALIBRATION_STATES.CORRECTIVE_ACTION]: {
        [CALIBRATION_ACTIONS.COMPLETE_CAPA]: {
            to: CALIBRATION_STATES.IN_PROGRESS,
            allowedRoles: [ROLES.TECHNICIAN, ROLES.MANAGER, ROLES.ADMIN],
            validate: 'requireCAPACompletion',
            sideEffects: ['notifyQA_Retest']
        }
    },
    [CALIBRATION_STATES.ACCEPTED]: {
        [CALIBRATION_ACTIONS.CLOSE]: {
            to: CALIBRATION_STATES.CLOSED,
            allowedRoles: [ROLES.QA, ROLES.MANAGER, ROLES.ADMIN],
            validate: null,
            sideEffects: ['setClosedDate', 'finalizeAssetStatus']
        }
    },
    [CALIBRATION_STATES.CLOSED]: {},
    [CALIBRATION_STATES.CANCELLED]: {}
};

// ========================
// VALIDATION RULES (Extended for Calibration)
// ========================

const VALIDATIONS = {
    requireAssignedTo: (context) => {
        if (!context.assigned_to) {
            throw new Error('assigned_to is required');
        }
    },
    requireCancelReason: (context) => {
        if (!context.cancel_reason) {
            throw new Error('cancel_reason is required');
        }
    },
    requirePostFixResult: (context) => {
        if (!context.post_fix_result || !['pass', 'fail'].includes(context.post_fix_result)) {
            throw new Error('post_fix_result is required and must be "pass" or "fail"');
        }
    },
    requireScheduleData: (context) => {
        if (!context.scheduled_date) {
            throw new Error('scheduled_date is required');
        }
        if (!context.shift) {
            throw new Error('shift is required');
        }
    },
    requireRejectionNotes: (context) => {
        if (!context.rejection_notes) {
            throw new Error('rejection_notes is required');
        }
    },
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
     * @param {Object} context - { user, payload } hoặc { role, user_id, ... }
     * @returns {Object} - { newState, sideEffects }
     */
    async transition(record, action, context) {
        try {
            const currentState = record.status;
            
            // Support both patterns: context.user.role và context.role (for testing)
            const role = context.role || context.user?.role || context.user?.position || 'REQUESTER';

            // Kiểm tra transition có tồn tại
            const stateTransitions = this.transitions[currentState];
            if (!stateTransitions) {
                return {
                    success: false,
                    message: `No transitions available from state: ${currentState}`
                };
            }

            const transition = stateTransitions[action];
            if (!transition) {
                return {
                    success: false,
                    message: `Cannot perform action "${action}" from state "${currentState}"`
                };
            }

            // Kiểm tra RBAC
            if (!transition.allowedRoles.includes(role) && role !== 'ADMIN') {
                return {
                    success: false,
                    message: `Role "${role}" is not allowed to perform action "${action}"`
                };
            }

            // Validate BEFORE changing state
            if (transition.validate) {
                const validator = VALIDATIONS[transition.validate];
                if (validator) {
                    try {
                        validator(context);
                    } catch (validationError) {
                        return {
                            success: false,
                            message: validationError.message
                        };
                    }
                }
            }

            // Determine next state (может быть function для dynamic transitions)
            const nextState = typeof transition.to === 'function' 
                ? transition.to(context) 
                : transition.to;

            // Determine side effects (может быть function)
            const sideEffects = typeof transition.sideEffects === 'function'
                ? transition.sideEffects(context)
                : (transition.sideEffects || []);

            // Apply state change (chỉ update trong memory, không save)
            record.status = nextState;
            
            // Apply other context fields to record AFTER validation passes
            const metaFields = ['role', 'user_id', 'ip_address', 'user'];
            Object.keys(context).forEach(key => {
                if (!metaFields.includes(key)) {
                    record[key] = context[key];
                }
            });
            
            // KHÔNG save ở đây - để caller save với transaction
            // await record.save();

            return {
                success: true,
                data: record,
                newState: nextState,
                sideEffects,
                action,
                fromState: currentState
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error: error
            };
        }
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
 * Priority: user.roles array > user.role > position > department
 */
const normalizeRole = (user) => {
    if (!user) return ROLES.REQUESTER;
    
    // Priority 1: Check roles array from user_roles table
    if (Array.isArray(user.roles) && user.roles.length > 0) {
        const roleMap = {
            'ADMIN': ROLES.ADMIN,
            'MANAGER': ROLES.MANAGER,
            'TECHNICIAN': ROLES.TECHNICIAN,
            'QA': ROLES.QA,
            'ENGINEERING': ROLES.ENGINEERING,
            'PLANNER': ROLES.PLANNER
        };
        
        // Return highest priority role
        for (const roleName of user.roles) {
            const normalized = roleMap[roleName.toUpperCase()];
            if (normalized) return normalized;
        }
    }
    
    // Priority 2: Check explicit role field
    if (user.role) {
        const roleMap = {
            'MANAGER': ROLES.MANAGER,
            'TECHNICIAN': ROLES.TECHNICIAN,
            'QA': ROLES.QA,
            'ENGINEERING': ROLES.ENGINEERING,
            'PLANNER': ROLES.PLANNER,
            'ADMIN': ROLES.ADMIN,
            'REQUESTER': ROLES.REQUESTER
        };
        const normalized = roleMap[(user.role || '').toUpperCase()];
        if (normalized) return normalized;
    }
    
    // Priority 3: Check position
    const position = (user.position || '').toUpperCase();
    if (position.includes('MANAGER') || position.includes('TRƯỞNG')) return ROLES.MANAGER;
    if (position === 'ADMIN') return ROLES.ADMIN;
    
    // Priority 4: Check department
    const dept = (user.department || '').toUpperCase();
    if (dept.includes('KỸ THUẬT') || dept.includes('TECHNICAL')) return ROLES.TECHNICIAN;
    if (dept === 'QA' || dept === 'QC' || dept.includes('CHẤT LƯỢNG')) return ROLES.QA;
    if (dept.includes('KẾ HOẠCH') || dept.includes('PLANNING')) return ROLES.PLANNER;
    
    return ROLES.REQUESTER;
};

/**
 * Tạo instance state machine
 */
const createStateMachine = (entity) => {
    return new StateMachine(entity);
};

module.exports = {
    // SAP PM-lite Core Constants
    NOTIFICATION_TYPE,
    SYSTEM_STATUS,
    OPERATIONAL_STATUS,
    
    // State Machine Configs for TransitionService (V2)
    INCIDENT_STATE_MACHINE: {
        states: INCIDENT_STATES,
        actions: INCIDENT_ACTIONS,
        transitions: (() => {
            // Convert INCIDENT_TRANSITIONS to flat action map for TransitionService
            const actionMap = {};
            Object.entries(INCIDENT_TRANSITIONS).forEach(([fromStatus, actions]) => {
                Object.entries(actions).forEach(([action, def]) => {
                    if (!actionMap[action]) {
                        actionMap[action] = {
                            fromStatuses: [],
                            toStatus: def.to,
                            requiredRole: def.allowedRoles[0],
                            validate: def.validate,
                            sideEffects: def.sideEffects,
                            systemStatus: def.systemStatus,
                            operationalStatus: def.operationalStatus
                        };
                    }
                    actionMap[action].fromStatuses.push(fromStatus);
                });
            });
            return actionMap;
        })()
    },
    
    MAINTENANCE_STATE_MACHINE: {
        states: MAINTENANCE_STATES,
        actions: MAINTENANCE_ACTIONS,
        transitions: (() => {
            // Convert MAINTENANCE_TRANSITIONS to flat action map for TransitionService
            const actionMap = {};
            Object.entries(MAINTENANCE_TRANSITIONS).forEach(([fromStatus, actions]) => {
                Object.entries(actions).forEach(([action, def]) => {
                    if (!actionMap[action]) {
                        actionMap[action] = {
                            fromStatuses: [],
                            toStatus: def.to,
                            requiredRole: def.allowedRoles[0],
                            validate: def.validate,
                            sideEffects: def.sideEffects,
                            systemStatus: def.systemStatus,
                            operationalStatus: def.operationalStatus
                        };
                    }
                    actionMap[action].fromStatuses.push(fromStatus);
                });
            });
            return actionMap;
        })()
    },
    
    // Legacy exports (backward compatibility)
    ENTITIES,
    ROLES,
    INCIDENT_STATES,
    INCIDENT_ACTIONS,
    INCIDENT_TRANSITIONS,
    MAINTENANCE_STATES,
    MAINTENANCE_ACTIONS,
    MAINTENANCE_TRANSITIONS,
    CALIBRATION_STATES,
    CALIBRATION_ACTIONS,
    CALIBRATION_TRANSITIONS,
    StateMachine,
    createStateMachine,
    normalizeRole
};

