/**
 * Unit Tests for State Machine - Incident Transitions
 */

const { StateMachine, INCIDENT_STATES, INCIDENT_ACTIONS } = require('../utils/stateMachine');

// Mock incidents object for testing
const createMockIncident = (status, severity = 'medium') => {
    const incident = {
        id: 1,
        incident_code: 'INC-2025-001',
        title: 'Test Incident',
        status,
        severity,
        asset_id: 100
    };
    
    // Mock save function that allows setting fields
    incident.save = jest.fn().mockImplementation(async function() {
        return Promise.resolve(this);
    });
    
    return incident;
};

describe('StateMachine - Incident Workflows', () => {
    let stateMachine;

    beforeEach(() => {
        stateMachine = new StateMachine('incident');
    });

    describe('Valid Transitions', () => {
        test('should transition from reported to triaged (MANAGER)', async () => {
            const incident = createMockIncident(INCIDENT_STATES.REPORTED);
            const context = { role: 'MANAGER', user_id: 1, ip_address: '127.0.0.1' };

            const result = await stateMachine.transition(incident, INCIDENT_ACTIONS.TRIAGE, context);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(INCIDENT_STATES.TRIAGED);
            expect(incident.save).toHaveBeenCalled();
        });

        test('should isolate critical incident (MANAGER)', async () => {
            const incident = createMockIncident(INCIDENT_STATES.TRIAGED, 'critical');
            const context = { role: 'MANAGER', user_id: 1, ip_address: '127.0.0.1' };

            const result = await stateMachine.transition(incident, INCIDENT_ACTIONS.ISOLATE, context);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(INCIDENT_STATES.OUT_OF_SERVICE);
            expect(result.data.is_isolated).toBe(true);
        });

        test('should assign incident (MANAGER)', async () => {
            const incident = createMockIncident(INCIDENT_STATES.TRIAGED);
            const context = {
                role: 'MANAGER',
                user_id: 1,
                ip_address: '127.0.0.1',
                assigned_to: 5
            };

            const result = await stateMachine.transition(incident, INCIDENT_ACTIONS.ASSIGN, context);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(INCIDENT_STATES.ASSIGNED);
            expect(result.data.assigned_to).toBe(5);
        });

        test('should start incident (TECHNICIAN)', async () => {
            const incident = createMockIncident(INCIDENT_STATES.ASSIGNED);
            const context = { role: 'TECHNICIAN', user_id: 5, ip_address: '127.0.0.1' };

            const result = await stateMachine.transition(incident, INCIDENT_ACTIONS.START, context);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(INCIDENT_STATES.IN_PROGRESS);
        });

        test('should submit for post-fix check (TECHNICIAN)', async () => {
            const incident = createMockIncident(INCIDENT_STATES.IN_PROGRESS);
            const context = {
                role: 'TECHNICIAN',
                user_id: 5,
                ip_address: '127.0.0.1',
                actions_taken: 'Replaced component'
            };

            const result = await stateMachine.transition(incident, INCIDENT_ACTIONS.SUBMIT_POST_FIX, context);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(INCIDENT_STATES.POST_FIX_CHECK);
            expect(result.data.actions_taken).toBe('Replaced component');
        });

        test('should pass post-fix check (QA)', async () => {
            const incident = createMockIncident(INCIDENT_STATES.POST_FIX_CHECK);
            const context = {
                role: 'QA',
                user_id: 3,
                ip_address: '127.0.0.1',
                post_fix_result: 'pass'
            };

            const result = await stateMachine.transition(incident, INCIDENT_ACTIONS.POST_FIX_CHECK, context);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(INCIDENT_STATES.RESOLVED);
            expect(result.data.post_fix_result).toBe('pass');
        });

        test('should fail post-fix check and return to in_progress (QA)', async () => {
            const incident = createMockIncident(INCIDENT_STATES.POST_FIX_CHECK);
            const context = {
                role: 'QA',
                user_id: 3,
                ip_address: '127.0.0.1',
                post_fix_result: 'fail',
                post_fix_notes: 'Still not working'
            };

            const result = await stateMachine.transition(incident, INCIDENT_ACTIONS.POST_FIX_CHECK, context);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(INCIDENT_STATES.IN_PROGRESS);
            expect(result.data.post_fix_result).toBe('fail');
        });

        test('should close incident (MANAGER)', async () => {
            const incident = createMockIncident(INCIDENT_STATES.RESOLVED);
            const context = { role: 'MANAGER', user_id: 1, ip_address: '127.0.0.1' };

            const result = await stateMachine.transition(incident, INCIDENT_ACTIONS.CLOSE, context);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(INCIDENT_STATES.CLOSED);
        });

        test('should cancel incident from reported (MANAGER)', async () => {
            const incident = createMockIncident(INCIDENT_STATES.REPORTED);
            const context = {
                role: 'MANAGER',
                user_id: 1,
                ip_address: '127.0.0.1',
                cancel_reason: 'Duplicate'
            };

            const result = await stateMachine.transition(incident, INCIDENT_ACTIONS.CANCEL, context);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(INCIDENT_STATES.CANCELLED);
            expect(result.data.cancel_reason).toBe('Duplicate');
        });
    });

    describe('Invalid Transitions', () => {
        test('should reject transition with invalid action', async () => {
            const incident = createMockIncident(INCIDENT_STATES.REPORTED);
            const context = { role: 'MANAGER', user_id: 1 };

            const result = await stateMachine.transition(incident, 'INVALID_ACTION', context);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Invalid action');
        });

        test('should reject transition from wrong state', async () => {
            const incident = createMockIncident(INCIDENT_STATES.CLOSED);
            const context = { role: 'MANAGER', user_id: 1 };

            const result = await stateMachine.transition(incident, INCIDENT_ACTIONS.TRIAGE, context);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Cannot perform action');
        });

        test('should reject cancel from in_progress', async () => {
            const incident = createMockIncident(INCIDENT_STATES.IN_PROGRESS);
            const context = { role: 'MANAGER', user_id: 1, cancel_reason: 'Duplicate' };

            const result = await stateMachine.transition(incident, INCIDENT_ACTIONS.CANCEL, context);

            expect(result.success).toBe(false);
        });
    });

    describe('RBAC Enforcement', () => {
        test('should reject TECHNICIAN trying to triage', async () => {
            const incident = createMockIncident(INCIDENT_STATES.REPORTED);
            const context = { role: 'TECHNICIAN', user_id: 5 };

            const result = await stateMachine.transition(incident, INCIDENT_ACTIONS.TRIAGE, context);

            expect(result.success).toBe(false);
            expect(result.message).toContain('not allowed');
        });

        test('should reject REQUESTER trying to assign', async () => {
            const incident = createMockIncident(INCIDENT_STATES.TRIAGED);
            const context = { role: 'REQUESTER', user_id: 10, assigned_to: 5 };

            const result = await stateMachine.transition(incident, INCIDENT_ACTIONS.ASSIGN, context);

            expect(result.success).toBe(false);
            expect(result.message).toContain('not allowed');
        });

        test('should reject TECHNICIAN trying to post-fix check', async () => {
            const incident = createMockIncident(INCIDENT_STATES.POST_FIX_CHECK);
            const context = { role: 'TECHNICIAN', user_id: 5, post_fix_result: 'pass' };

            const result = await stateMachine.transition(incident, INCIDENT_ACTIONS.POST_FIX_CHECK, context);

            expect(result.success).toBe(false);
            expect(result.message).toContain('not allowed');
        });

        test('should allow ADMIN for all actions', async () => {
            const incident = createMockIncident(INCIDENT_STATES.REPORTED);
            const context = { role: 'ADMIN', user_id: 1 };

            const result = await stateMachine.transition(incident, INCIDENT_ACTIONS.TRIAGE, context);

            expect(result.success).toBe(true);
        });
    });

    describe('Validation Rules', () => {
        test('should reject assign without assigned_to', async () => {
            const incident = createMockIncident(INCIDENT_STATES.TRIAGED);
            const context = { role: 'MANAGER', user_id: 1 };

            const result = await stateMachine.transition(incident, INCIDENT_ACTIONS.ASSIGN, context);

            expect(result.success).toBe(false);
            expect(result.message).toContain('assigned_to');
        });

        test('should reject cancel without cancel_reason', async () => {
            const incident = createMockIncident(INCIDENT_STATES.REPORTED);
            const context = { role: 'MANAGER', user_id: 1 };

            const result = await stateMachine.transition(incident, INCIDENT_ACTIONS.CANCEL, context);

            expect(result.success).toBe(false);
            expect(result.message).toContain('cancel_reason');
        });

        test('should reject post_fix_check without post_fix_result', async () => {
            const incident = createMockIncident(INCIDENT_STATES.POST_FIX_CHECK);
            const context = { role: 'QA', user_id: 3 };

            const result = await stateMachine.transition(incident, INCIDENT_ACTIONS.POST_FIX_CHECK, context);

            expect(result.success).toBe(false);
            expect(result.message).toContain('post_fix_result');
        });
    });

    describe('Next Actions', () => {
        test('should return correct next actions for MANAGER at triaged', () => {
            const actions = stateMachine.getNextActions(INCIDENT_STATES.TRIAGED, 'MANAGER');

            expect(actions).toContain(INCIDENT_ACTIONS.ISOLATE);
            expect(actions).toContain(INCIDENT_ACTIONS.ASSIGN);
        });

        test('should return only start for TECHNICIAN at assigned', () => {
            const actions = stateMachine.getNextActions(INCIDENT_STATES.ASSIGNED, 'TECHNICIAN');

            expect(actions).toContain(INCIDENT_ACTIONS.START);
        });

        test('should return empty array for closed state', () => {
            const actions = stateMachine.getNextActions(INCIDENT_STATES.CLOSED, 'MANAGER');

            expect(actions).toHaveLength(0);
        });

        test('should return all possible actions for ADMIN', () => {
            const actions = stateMachine.getNextActions(INCIDENT_STATES.TRIAGED, 'ADMIN');

            expect(actions.length).toBeGreaterThan(0);
        });
    });

    describe('Can Transition', () => {
        test('should return true for valid transition and role', () => {
            const canTransition = stateMachine.canTransition(
                INCIDENT_STATES.REPORTED,
                INCIDENT_ACTIONS.TRIAGE,
                'MANAGER'
            );

            expect(canTransition).toBe(true);
        });

        test('should return false for invalid role', () => {
            const canTransition = stateMachine.canTransition(
                INCIDENT_STATES.REPORTED,
                INCIDENT_ACTIONS.TRIAGE,
                'TECHNICIAN'
            );

            expect(canTransition).toBe(false);
        });

        test('should return false for invalid state', () => {
            const canTransition = stateMachine.canTransition(
                INCIDENT_STATES.CLOSED,
                INCIDENT_ACTIONS.TRIAGE,
                'MANAGER'
            );

            expect(canTransition).toBe(false);
        });
    });
});
