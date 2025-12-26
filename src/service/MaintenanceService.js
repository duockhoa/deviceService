/**
 * Maintenance Service - Xử lý business logic cho Maintenance workflow
 * Sử dụng State Machine để quản lý transitions
 */

const { Maintenance, Assets, User, MaintenancePlan } = require('../models');
const { createStateMachine, ENTITIES, MAINTENANCE_ACTIONS, normalizeRole } = require('../utils/stateMachine');
const AuditLogService = require('./AuditLogService');
const SideEffectsService = require('./SideEffectsService');
const { Op } = require('sequelize');

class MaintenanceService {
    /**
     * Xử lý action cho maintenance
     */
    static async handleAction(maintenanceId, action, payload, user, ipAddress = null) {
        const transaction = await Maintenance.sequelize.transaction();

        try {
            // Load maintenance
            const maintenance = await Maintenance.findByPk(maintenanceId, {
                include: [
                    { model: Assets, as: 'asset', attributes: ['id', 'name', 'asset_code'] },
                    { model: User, as: 'technician', attributes: ['id', 'name', 'email'] },
                    { model: User, as: 'creator', attributes: ['id', 'name', 'email'] }
                ],
                transaction
            });

            if (!maintenance) {
                await transaction.rollback();
                return { success: false, error: 'Maintenance not found', code: 404 };
            }

            if (maintenance.is_deleted) {
                await transaction.rollback();
                return { success: false, error: 'Maintenance has been deleted', code: 400 };
            }

            // Get user role
            const role = normalizeRole(user);

            // Create state machine
            const sm = createStateMachine(ENTITIES.MAINTENANCE);

            // Prepare context
            const context = { user: { ...user, role }, payload };

            // Execute transition
            const transitionResult = sm.transition(maintenance, action, context);

            // Update maintenance với fields từ payload
            if (payload.technician_id) maintenance.technician_id = payload.technician_id;
            if (payload.scheduled_date) maintenance.scheduled_date = new Date(payload.scheduled_date);
            if (payload.shift) maintenance.shift = payload.shift;
            if (payload.notes) maintenance.notes = payload.notes;
            if (payload.actual_duration) maintenance.actual_duration = payload.actual_duration;
            if (payload.cost) maintenance.cost = payload.cost;

            // Execute side effects TRƯỚC KHI lưu
            await SideEffectsService.executeSideEffects(
                transitionResult.sideEffects,
                maintenance,
                context
            );

            // Update status
            maintenance.status = transitionResult.newState;

            // Save maintenance
            await maintenance.save({ transaction });

            // Log audit
            await AuditLogService.logTransition({
                entityType: 'maintenance',
                entityId: maintenance.id,
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
            await maintenance.reload({
                include: [
                    { model: Assets, as: 'asset', attributes: ['id', 'name', 'asset_code'] },
                    { model: User, as: 'technician', attributes: ['id', 'name', 'email'] },
                    { model: User, as: 'creator', attributes: ['id', 'name', 'email'] }
                ]
            });

            // Get next actions
            const nextActions = sm.getNextActions(maintenance.status, role);

            return {
                success: true,
                data: {
                    ...maintenance.toJSON(),
                    nextActions,
                    allowedRoles: role
                }
            };
        } catch (error) {
            await transaction.rollback();
            console.error('Error handling maintenance action:', error);

            if (error.message.includes('not allowed')) {
                return { success: false, error: error.message, code: 403 };
            }

            return { success: false, error: error.message, code: 500 };
        }
    }

    /**
     * Lấy maintenance với nextActions
     */
    static async getMaintenanceWithActions(maintenanceId, user) {
        try {
            const maintenance = await Maintenance.findByPk(maintenanceId, {
                include: [
                    { model: Assets, as: 'asset' },
                    { model: User, as: 'technician', attributes: ['id', 'name', 'email'] },
                    { model: User, as: 'creator', attributes: ['id', 'name'] },
                    { 
                        model: require('../models').MaintenanceWorkTask, 
                        as: 'workTasks' 
                    },
                    { 
                        model: require('../models').MaintenanceChecklist, 
                        as: 'checklists' 
                    },
                    { 
                        model: require('../models').MaintenanceConsumables, 
                        as: 'maintenanceConsumables',
                        include: [
                            {
                                model: require('../models').AssetConsumables,
                                as: 'assetConsumable'
                            }
                        ]
                    }
                ]
            });

            if (!maintenance) {
                return { success: false, error: 'Maintenance not found', code: 404 };
            }

            const role = normalizeRole(user);
            const sm = createStateMachine(ENTITIES.MAINTENANCE);
            const nextActions = sm.getNextActions(maintenance.status, role);

            return {
                success: true,
                data: {
                    ...maintenance.toJSON(),
                    nextActions,
                    allowedRoles: role
                }
            };
        } catch (error) {
            console.error('Error getting maintenance:', error);
            return { success: false, error: error.message, code: 500 };
        }
    }

    /**
     * Tạo maintenance mới
     */
    static async createMaintenance(data, user) {
        try {
            // Kiểm tra maintenance plan đã approved nếu có plan_id
            if (data.plan_id) {
                const plan = await MaintenancePlan.findByPk(data.plan_id);
                if (!plan || plan.status !== 'approved') {
                    return {
                        success: false,
                        error: 'Maintenance plan must be approved before creating work order',
                        code: 400
                    };
                }
            }

            const maintenanceCode = await this.buildMaintenanceCode();

            const maintenance = await Maintenance.create({
                maintenance_code: maintenanceCode,
                asset_id: data.asset_id,
                maintenance_type: data.maintenance_type || 'maintenance',
                priority: data.priority || 'medium',
                status: data.status || 'pending',
                title: data.title,
                description: data.description || null,
                scheduled_date: data.scheduled_date || new Date(),
                estimated_duration: data.estimated_duration || 1,
                technician_id: data.technician_id || null,
                created_by: user.id,
                shift: data.shift || null,
                location: data.location || null,
                notes: data.notes || null
            });

            const role = normalizeRole(user);
            const sm = createStateMachine(ENTITIES.MAINTENANCE);
            const nextActions = sm.getNextActions(maintenance.status, role);

            // Reload với associations
            await maintenance.reload({
                include: [
                    { model: Assets, as: 'asset' },
                    { model: User, as: 'technician' },
                    { model: User, as: 'creator' }
                ]
            });

            return {
                success: true,
                data: {
                    ...maintenance.toJSON(),
                    nextActions,
                    allowedRoles: role
                }
            };
        } catch (error) {
            console.error('Error creating maintenance:', error);
            return { success: false, error: error.message, code: 500 };
        }
    }

    /**
     * Build maintenance code
     */
    static async buildMaintenanceCode() {
        const year = new Date().getFullYear();
        const last = await Maintenance.findOne({
            where: { maintenance_code: { [Op.like]: `MT-${year}-%` } },
            order: [['maintenance_code', 'DESC']]
        });
        const next = last ? parseInt(last.maintenance_code.split('-')[2]) + 1 : 1;
        return `MT-${year}-${String(next).padStart(4, '0')}`;
    }

    /**
     * Lấy danh sách maintenance với nextActions
     */
    static async getAllMaintenance(user, filters = {}) {
        try {
            const where = { is_deleted: false };
            if (filters.status) where.status = filters.status;
            if (filters.priority) where.priority = filters.priority;
            if (filters.technician_id) where.technician_id = filters.technician_id;
            if (filters.asset_id) where.asset_id = filters.asset_id;

            const maintenance = await Maintenance.findAll({
                where,
                include: [
                    { model: Assets, as: 'asset', attributes: ['id', 'name', 'asset_code'] },
                    { model: User, as: 'technician', attributes: ['id', 'name'] },
                    { model: User, as: 'creator', attributes: ['id', 'name'] }
                ],
                order: [['scheduled_date', 'DESC']]
            });

            const role = normalizeRole(user);
            const sm = createStateMachine(ENTITIES.MAINTENANCE);

            const data = maintenance.map(m => {
                const nextActions = sm.getNextActions(m.status, role);
                return {
                    ...m.toJSON(),
                    nextActions
                };
            });

            return { success: true, data };
        } catch (error) {
            console.error('Error getting maintenance:', error);
            return { success: false, error: error.message, code: 500 };
        }
    }
}

module.exports = MaintenanceService;
