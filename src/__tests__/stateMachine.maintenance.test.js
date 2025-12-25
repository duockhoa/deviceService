/**
 * Unit Tests for State Machine - Maintenance Transitions
 */

const { StateMachine, MAINTENANCE_STATES, MAINTENANCE_ACTIONS } = require('../utils/stateMachine');

const createMockMaintenance = (status, plan_id = null) => {
    const maintenance = {
        id: 1,
        maintenance_code: 'MT-2025-001',
        title: 'Test Maintenance',
        status,
        plan_id,
        asset_id: 100,
        rejection_count: 0
    };
    
    maintenance.save = jest.fn().mockImplementation(async function() {
        return Promise.resolve(this);
    });
    
    return maintenance;
};

describe('StateMachine - Maintenance Workflows', () => {
    let stateMachine;

    beforeEach(() => {
        stateMachine = new StateMachine('maintenance');
    });

    describe('Valid Transitions', () => {
        test('should transition from draft to pending (TECHNICIAN)', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.DRAFT);
            const context = { role: 'TECHNICIAN', user_id: 5, ip_address: '127.0.0.1' };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.SUBMIT, context);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(MAINTENANCE_STATES.PENDING);
        });

        test('should approve maintenance (MANAGER)', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.PENDING);
            const context = { role: 'MANAGER', user_id: 1, ip_address: '127.0.0.1' };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.APPROVE, context);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(MAINTENANCE_STATES.APPROVED);
        });

        test('should schedule maintenance (PLANNER)', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.APPROVED);
            const context = {
                role: 'PLANNER',
                user_id: 2,
                ip_address: '127.0.0.1',
                scheduled_date: '2025-12-31',
                shift: 'A',
                technician_id: 5
            };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.SCHEDULE, context);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(MAINTENANCE_STATES.SCHEDULED);
            expect(result.data.shift).toBe('A');
        });

        test('should start maintenance (TECHNICIAN)', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.SCHEDULED);
            const context = { role: 'TECHNICIAN', user_id: 5, ip_address: '127.0.0.1' };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.START, context);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(MAINTENANCE_STATES.IN_PROGRESS);
        });

        test('should submit for acceptance (TECHNICIAN)', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.IN_PROGRESS);
            const context = {
                role: 'TECHNICIAN',
                user_id: 5,
                ip_address: '127.0.0.1',
                notes: 'Work completed',
                actual_duration: 120
            };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.SUBMIT_ACCEPTANCE, context);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(MAINTENANCE_STATES.AWAITING_ACCEPTANCE);
        });

        test('should accept maintenance (QA)', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.AWAITING_ACCEPTANCE);
            const context = {
                role: 'QA',
                user_id: 3,
                ip_address: '127.0.0.1',
                acceptance_notes: 'Approved'
            };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.ACCEPT, context);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(MAINTENANCE_STATES.ACCEPTED);
        });

        test('should reject acceptance and return to in_progress (ENGINEERING)', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.AWAITING_ACCEPTANCE);
            const context = {
                role: 'ENGINEERING',
                user_id: 4,
                ip_address: '127.0.0.1',
                rejection_notes: 'Needs rework'
            };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.REJECT_ACCEPTANCE, context);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(MAINTENANCE_STATES.IN_PROGRESS);
            expect(result.data.rejection_count).toBe(1);
        });

        test('should close maintenance (MANAGER)', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.ACCEPTED);
            const context = { role: 'MANAGER', user_id: 1, ip_address: '127.0.0.1' };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.CLOSE, context);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(MAINTENANCE_STATES.CLOSED);
        });

        test('should cancel from pending (MANAGER)', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.PENDING);
            const context = {
                role: 'MANAGER',
                user_id: 1,
                ip_address: '127.0.0.1',
                cancel_reason: 'Resource unavailable'
            };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.CANCEL, context);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(MAINTENANCE_STATES.CANCELLED);
        });
    });

    describe('Invalid Transitions', () => {
        test('should reject submit from pending', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.PENDING);
            const context = { role: 'TECHNICIAN', user_id: 5 };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.SUBMIT, context);

            expect(result.success).toBe(false);
        });

        test('should reject approve from scheduled', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.SCHEDULED);
            const context = { role: 'MANAGER', user_id: 1 };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.APPROVE, context);

            expect(result.success).toBe(false);
        });

        test('should reject cancel from in_progress', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.IN_PROGRESS);
            const context = { role: 'MANAGER', user_id: 1, cancel_reason: 'Cancel' };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.CANCEL, context);

            expect(result.success).toBe(false);
        });

        test('should reject close from pending', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.PENDING);
            const context = { role: 'MANAGER', user_id: 1 };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.CLOSE, context);

            expect(result.success).toBe(false);
        });
    });

    describe('RBAC Enforcement', () => {
        test('should reject REQUESTER trying to approve', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.PENDING);
            const context = { role: 'REQUESTER', user_id: 10 };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.APPROVE, context);

            expect(result.success).toBe(false);
            expect(result.message).toContain('not allowed');
        });

        test('should reject TECHNICIAN trying to schedule', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.APPROVED);
            const context = {
                role: 'TECHNICIAN',
                user_id: 5,
                scheduled_date: '2025-12-31'
            };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.SCHEDULE, context);

            expect(result.success).toBe(false);
            expect(result.message).toContain('not allowed');
        });

        test('should reject PLANNER trying to accept', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.AWAITING_ACCEPTANCE);
            const context = { role: 'PLANNER', user_id: 2, acceptance_notes: 'OK' };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.ACCEPT, context);

            expect(result.success).toBe(false);
            expect(result.message).toContain('not allowed');
        });

        test('should allow ADMIN for all actions', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.PENDING);
            const context = { role: 'ADMIN', user_id: 1 };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.APPROVE, context);

            expect(result.success).toBe(true);
        });
    });

    describe('Validation Rules', () => {
        test('should reject schedule without scheduled_date', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.APPROVED);
            const context = { role: 'PLANNER', user_id: 2 };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.SCHEDULE, context);

            expect(result.success).toBe(false);
            expect(result.message).toContain('scheduled_date');
        });

        test('should reject schedule without shift', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.APPROVED);
            const context = {
                role: 'PLANNER',
                user_id: 2,
                scheduled_date: '2025-12-31'
            };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.SCHEDULE, context);

            expect(result.success).toBe(false);
            expect(result.message).toContain('shift');
        });

        test('should reject cancel without cancel_reason', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.PENDING);
            const context = { role: 'MANAGER', user_id: 1 };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.CANCEL, context);

            expect(result.success).toBe(false);
            expect(result.message).toContain('cancel_reason');
        });

        test('should reject reject_acceptance without rejection_notes', async () => {
            const maintenance = createMockMaintenance(MAINTENANCE_STATES.AWAITING_ACCEPTANCE);
            const context = { role: 'QA', user_id: 3 };

            const result = await stateMachine.transition(maintenance, MAINTENANCE_ACTIONS.REJECT_ACCEPTANCE, context);

            expect(result.success).toBe(false);
            expect(result.message).toContain('rejection_notes');
        });
    });

    describe('Next Actions', () => {
        test('should return submit for TECHNICIAN at draft', () => {
            const actions = stateMachine.getNextActions(MAINTENANCE_STATES.DRAFT, 'TECHNICIAN');

            expect(actions).toContain(MAINTENANCE_ACTIONS.SUBMIT);
        });

        test('should return approve for MANAGER at pending', () => {
            const actions = stateMachine.getNextActions(MAINTENANCE_STATES.PENDING, 'MANAGER');

            expect(actions).toContain(MAINTENANCE_ACTIONS.APPROVE);
        });

        test('should return schedule for PLANNER at approved', () => {
            const actions = stateMachine.getNextActions(MAINTENANCE_STATES.APPROVED, 'PLANNER');

            expect(actions).toContain(MAINTENANCE_ACTIONS.SCHEDULE);
        });

        test('should return accept/reject for QA at awaiting_acceptance', () => {
            const actions = stateMachine.getNextActions(MAINTENANCE_STATES.AWAITING_ACCEPTANCE, 'QA');

            expect(actions).toContain(MAINTENANCE_ACTIONS.ACCEPT);
            expect(actions).toContain(MAINTENANCE_ACTIONS.REJECT_ACCEPTANCE);
        });

        test('should return empty for closed', () => {
            const actions = stateMachine.getNextActions(MAINTENANCE_STATES.CLOSED, 'MANAGER');

            expect(actions).toHaveLength(0);
        });
    });

    describe('Can Transition', () => {
        test('should return true for valid MANAGER approve', () => {
            const can = stateMachine.canTransition(
                MAINTENANCE_STATES.PENDING,
                MAINTENANCE_ACTIONS.APPROVE,
                'MANAGER'
            );

            expect(can).toBe(true);
        });

        test('should return false for TECHNICIAN approve', () => {
            const can = stateMachine.canTransition(
                MAINTENANCE_STATES.PENDING,
                MAINTENANCE_ACTIONS.APPROVE,
                'TECHNICIAN'
            );

            expect(can).toBe(false);
        });

        test('should return false for invalid state', () => {
            const can = stateMachine.canTransition(
                MAINTENANCE_STATES.CLOSED,
                MAINTENANCE_ACTIONS.APPROVE,
                'MANAGER'
            );

            expect(can).toBe(false);
        });
    });
});
