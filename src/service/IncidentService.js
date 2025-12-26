/**
 * Incident Service - Xử lý business logic cho Incident workflow
 * Sử dụng State Machine để quản lý transitions
 */

const { Incidents, Assets, User } = require('../models');
const { createStateMachine, ENTITIES, INCIDENT_ACTIONS, normalizeRole } = require('../utils/stateMachine');
const AuditLogService = require('./AuditLogService');
const SideEffectsService = require('./SideEffectsService');
const { Op } = require('sequelize');

class IncidentService {
    /**
     * Xử lý action cho incident
     */
    static async handleAction(incidentId, action, payload, user, ipAddress = null) {
        const transaction = await Incidents.sequelize.transaction();

        try {
            // Load incident
            const incident = await Incidents.findByPk(incidentId, {
                include: [
                    { model: Assets, as: 'asset', attributes: ['id', 'name', 'asset_code'] },
                    { model: User, as: 'reporter', attributes: ['id', 'name', 'email'] },
                    { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }
                ],
                transaction
            });

            if (!incident) {
                await transaction.rollback();
                return { success: false, error: 'Incident not found', code: 404 };
            }

            // Get user role
            const role = normalizeRole(user);

            // Create state machine
            const sm = createStateMachine(ENTITIES.INCIDENT);

            // Prepare context
            const context = { user: { ...user, role }, payload };

            // Execute transition (chỉ update status trong memory, chưa save)
            const transitionResult = await sm.transition(incident, action, context);

            // Check if transition failed
            if (!transitionResult.success) {
                await transaction.rollback();
                return {
                    success: false,
                    error: transitionResult.message || 'Transition failed',
                    code: 400
                };
            }

            // Update incident với fields từ payload
            if (payload.severity) incident.severity = payload.severity;
            if (payload.assigned_to) incident.assigned_to = payload.assigned_to;
            if (payload.root_cause) incident.root_cause = payload.root_cause;
            if (payload.solution) incident.solution = payload.solution;
            if (payload.prevention_measures) incident.prevention_measures = payload.prevention_measures;
            if (payload.downtime_minutes) incident.downtime_minutes = payload.downtime_minutes;
            if (payload.cost) incident.cost = payload.cost;
            if (payload.notes) incident.notes = payload.notes;

            // Execute side effects
            await SideEffectsService.executeSideEffects(
                transitionResult.sideEffects,
                incident,
                context
            );

            // Save incident với transaction (status đã được set bởi stateMachine)
            await incident.save({ transaction });

            // Log audit
            await AuditLogService.logTransition({
                entityType: 'incident',
                entityId: incident.id,
                action: transitionResult.action,
                fromState: transitionResult.fromState,
                toState: transitionResult.newState,
                userId: user.id,
                userRole: role,
                payload,
                ipAddress
            });

            await transaction.commit();

            // Reload với associations
            await incident.reload({
                include: [
                    { model: Assets, as: 'asset', attributes: ['id', 'name', 'asset_code'] },
                    { model: User, as: 'reporter', attributes: ['id', 'name', 'email'] },
                    { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }
                ]
            });

            // Get next actions
            const nextActions = sm.getNextActions(incident.status, role);

            return {
                success: true,
                data: {
                    ...incident.toJSON(),
                    nextActions,
                    allowedRoles: role
                }
            };
        } catch (error) {
            await transaction.rollback();
            console.error('Error handling incident action:', error);

            if (error.message.includes('not allowed')) {
                return { success: false, error: error.message, code: 403 };
            }

            return { success: false, error: error.message, code: 500 };
        }
    }

    /**
     * Lấy incident với nextActions
     */
    static async getIncidentWithActions(incidentId, user) {
        try {
            const incident = await Incidents.findByPk(incidentId, {
                include: [
                    { model: Assets, as: 'asset', attributes: ['id', 'name', 'asset_code', 'location'] },
                    { model: User, as: 'reporter', attributes: ['id', 'name', 'email'] },
                    { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }
                ]
            });

            if (!incident) {
                return { success: false, error: 'Incident not found', code: 404 };
            }

            const role = normalizeRole(user);
            const sm = createStateMachine(ENTITIES.INCIDENT);
            const nextActions = sm.getNextActions(incident.status, role);

            return {
                success: true,
                data: {
                    ...incident.toJSON(),
                    nextActions,
                    allowedRoles: role
                }
            };
        } catch (error) {
            console.error('Error getting incident:', error);
            return { success: false, error: error.message, code: 500 };
        }
    }

    /**
     * Tạo incident mới
     */
    static async createIncident(data, user) {
        try {
            const incidentCode = await this.buildIncidentCode();

            const incident = await Incidents.create({
                incident_code: incidentCode,
                asset_id: data.asset_id || null,
                title: data.title,
                description: data.description || null,
                severity: data.severity || 'medium',
                status: 'reported',
                reported_by: user.id,
                reported_date: new Date(),
                impact: data.impact || null,
                images: data.images ? JSON.stringify(data.images) : null
            });

            const role = normalizeRole(user);
            const sm = createStateMachine(ENTITIES.INCIDENT);
            const nextActions = sm.getNextActions('reported', role);

            // Reload với associations
            await incident.reload({
                include: [
                    { model: Assets, as: 'asset' },
                    { model: User, as: 'reporter' }
                ]
            });

            return {
                success: true,
                data: {
                    ...incident.toJSON(),
                    nextActions,
                    allowedRoles: role
                }
            };
        } catch (error) {
            console.error('Error creating incident:', error);
            return { success: false, error: error.message, code: 500 };
        }
    }

    /**
     * Build incident code
     */
    static async buildIncidentCode() {
        const year = new Date().getFullYear();
        const last = await Incidents.findOne({
            where: { incident_code: { [Op.like]: `INC-${year}-%` } },
            order: [['incident_code', 'DESC']]
        });
        const next = last ? parseInt(last.incident_code.split('-')[2]) + 1 : 1;
        return `INC-${year}-${String(next).padStart(4, '0')}`;
    }

    /**
     * Lấy danh sách incidents với nextActions
     */
    static async getAllIncidents(user, filters = {}) {
        try {
            const where = {};
            if (filters.status) where.status = filters.status;
            if (filters.severity) where.severity = filters.severity;
            if (filters.assigned_to) where.assigned_to = filters.assigned_to;

            const incidents = await Incidents.findAll({
                where,
                include: [
                    { model: Assets, as: 'asset', attributes: ['id', 'name', 'asset_code'] },
                    { model: User, as: 'reporter', attributes: ['id', 'name'] },
                    { model: User, as: 'assignee', attributes: ['id', 'name'] }
                ],
                order: [['reported_date', 'DESC']]
            });

            const role = normalizeRole(user);
            const sm = createStateMachine(ENTITIES.INCIDENT);

            const data = incidents.map(incident => {
                const nextActions = sm.getNextActions(incident.status, role);
                return {
                    ...incident.toJSON(),
                    nextActions
                };
            });

            return { success: true, data };
        } catch (error) {
            console.error('Error getting incidents:', error);
            return { success: false, error: error.message, code: 500 };
        }
    }
}

module.exports = IncidentService;
