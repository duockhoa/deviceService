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

            console.log('[DEBUG getIncidentWithActions]', {
                incidentId,
                status: incident.status,
                userId: user?.id,
                userName: user?.name,
                userRolesArray: user?.roles,
                normalizedRole: role,
                nextActions
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

            // Validate category-specific required fields
            const category = data.incident_category || 'EQUIPMENT';
            
            if (category === 'EQUIPMENT' && !data.asset_id) {
                throw new Error('Thiết bị là bắt buộc đối với sự cố thiết bị');
            }
            
            if (category === 'FACILITY' && !data.facility_type) {
                throw new Error('Loại cơ sở là bắt buộc đối với sự cố nhà xưởng');
            }
            
            if (category === 'SYSTEM' && !data.system_type) {
                throw new Error('Loại hệ thống là bắt buộc đối với sự cố hệ thống');
            }
            
            if (category === 'OPERATION' && !data.operation_type) {
                throw new Error('Loại yêu cầu là bắt buộc đối với sự cố vận hành');
            }

            const incident = await Incidents.create({
                incident_code: incidentCode,
                incident_category: category,
                notification_type: data.notification_type || null,
                asset_id: category === 'EQUIPMENT' ? data.asset_id : null,
                facility_type: category === 'FACILITY' ? data.facility_type : null,
                system_type: category === 'SYSTEM' ? data.system_type : null,
                operation_type: category === 'OPERATION' ? data.operation_type : null,
                building: data.building || null,
                floor: data.floor || null,
                room: data.room || null,
                title: data.title,
                description: data.description || null,
                severity: data.severity || 'medium',
                status: 'reported',
                reported_by: user.id,
                reported_date: new Date(),
                impact: data.impact || null,
                images: data.images ? JSON.stringify(data.images) : null
            });

            // Auto-notify bộ phận liên quan dựa theo category
            await this.notifyRelevantDepartment(incident, category);

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
     * Auto-notify bộ phận liên quan dựa theo category
     */
    static async notifyRelevantDepartment(incident, category) {
        try {
            const NotificationService = require('./NotificationService');
            
            const recipientMap = {
                'EQUIPMENT': ['maintenance', 'engineering'],  // Bảo trì thiết bị
                'FACILITY': ['facility', 'engineering'],      // Cơ sở hạ tầng
                'SYSTEM': ['it', 'engineering'],              // Hệ thống IT/điện
                'OPERATION': ['production', 'planning']       // Vận hành
            };

            const recipients = recipientMap[category] || ['manager'];

            await NotificationService.sendNotification({
                type: 'new_incident',
                entityType: 'incident',
                entityId: incident.id,
                title: `🚨 Sự cố mới: ${incident.incident_code}`,
                message: `[${category}] ${incident.title} - Mức độ: ${incident.severity}`,
                recipients
            });

            console.log(`✅ Notified ${recipients.join(', ')} about incident ${incident.incident_code}`);
        } catch (error) {
            console.error('Error notifying relevant department:', error);
            // Don't throw - incident should still be created
        }
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
            
            // Filter: myReports=true -> only show incidents reported by current user
            if (filters.myReports === 'true' || filters.myReports === true) {
                where.reported_by = user.id;
            }

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

    /**
     * Chuyển sự cố thiết bị thành lệnh bảo trì
     * Chỉ áp dụng cho incident_category = EQUIPMENT
     */
    static async convertToMaintenance(incidentId, data, user) {
        try {
            const Maintenance = require('../models/maintenance.model');
            
            // Get incident
            const incident = await Incidents.findByPk(incidentId, {
                include: [{ model: Assets, as: 'asset' }]
            });

            if (!incident) {
                return { success: false, error: 'Incident not found', code: 404 };
            }

            // Validate: chỉ EQUIPMENT mới convert được
            if (incident.incident_category !== 'EQUIPMENT') {
                return { 
                    success: false, 
                    error: 'Chỉ sự cố thiết bị (EQUIPMENT) mới có thể chuyển sang bảo trì', 
                    code: 400 
                };
            }

            // Validate: phải ở trạng thái triaged
            if (incident.status !== 'triaged') {
                return { 
                    success: false, 
                    error: 'Sự cố phải ở trạng thái "Đã phân loại" (triaged) mới có thể chuyển sang bảo trì', 
                    code: 400 
                };
            }

            // Generate maintenance code
            const timestamp = Date.now().toString().slice(-6);
            const maintenance_code = `MT-${timestamp}`;

            // Map severity to priority
            const priorityMap = {
                'critical': 'critical',
                'high': 'high',
                'medium': 'medium',
                'low': 'low'
            };

            // Create maintenance order
            const maintenance = await Maintenance.create({
                maintenance_code,
                asset_id: incident.asset_id,
                maintenance_type: 'corrective', // Sửa chữa
                priority: priorityMap[incident.severity] || 'medium',
                status: 'pending',
                title: data.maintenance_title || incident.title,
                description: data.maintenance_description || incident.description,
                scheduled_date: new Date(),
                estimated_duration: data.estimated_hours || 4,
                technician_id: null,
                incident_id: incidentId, // Link to incident
                notes: `Chuyển từ sự cố: ${incident.incident_code}. ${data.required_parts ? 'Vật tư: ' + data.required_parts : ''}`,
                safety_requirements: data.safety_notes || null
            });

            // Update incident status
            await incident.update({
                status: 'converted_to_maintenance',
                converted_maintenance_id: maintenance.id,
                converted_at: new Date()
            });

            return {
                success: true,
                data: {
                    maintenance_code: maintenance.maintenance_code,
                    maintenance_id: maintenance.id,
                    incident
                }
            };
        } catch (error) {
            console.error('Error converting to maintenance:', error);
            return { success: false, error: error.message, code: 500 };
        }
    }
}

module.exports = IncidentService;
