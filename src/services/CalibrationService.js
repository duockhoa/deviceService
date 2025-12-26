const { Op } = require('sequelize');
const CalibrationOrder = require('../models/calibrationOrder.model');
const Asset = require('../models/assets.model');
const User = require('../models/user.model');
const NotificationService = require('./NotificationService');
const AuditLogService = require('./AuditLogService');
const MaintenanceService = require('../service/MaintenanceService');
const { 
    ENTITIES, 
    CALIBRATION_STATES, 
    CALIBRATION_ACTIONS, 
    CALIBRATION_TRANSITIONS 
} = require('../utils/stateMachine');

class CalibrationService {
    /**
     * Get all calibration orders with filters
     */
    static async getAllCalibrationOrders(filters = {}) {
        const where = {};
        
        if (filters.asset_id) where.asset_id = filters.asset_id;
        if (filters.status) where.status = filters.status;
        if (filters.system_status) where.system_status = filters.system_status;
        if (filters.assigned_to) where.assigned_to = filters.assigned_to;
        if (filters.calibration_type) where.calibration_type = filters.calibration_type;
        
        // Date range filter
        if (filters.from || filters.to) {
            where.scheduled_date = {};
            if (filters.from) where.scheduled_date[Op.gte] = filters.from;
            if (filters.to) where.scheduled_date[Op.lte] = filters.to;
        }
        
        const orders = await CalibrationOrder.findAll({
            where,
            include: [
                { model: Asset, as: 'asset', attributes: ['id', 'dk_code', 'name', 'operational_status'] },
                { model: User, as: 'created_by_user', attributes: ['id', 'username', 'full_name'] },
                { model: User, as: 'assigned_to_user', attributes: ['id', 'username', 'full_name'] }
            ],
            order: [['created_at', 'DESC']]
        });
        
        return orders;
    }
    
    /**
     * Get single calibration order with available actions for current user
     */
    static async getCalibrationOrderWithActions(id, userId, userRoles) {
        const order = await CalibrationOrder.findByPk(id, {
            include: [
                { model: Asset, as: 'asset' },
                { model: User, as: 'created_by_user', attributes: ['id', 'username', 'full_name'] },
                { model: User, as: 'assigned_to_user', attributes: ['id', 'username', 'full_name'] },
                { model: User, as: 'qa_reviewed_by_user', attributes: ['id', 'username', 'full_name'] }
            ]
        });
        
        if (!order) {
            throw new Error('Calibration order not found');
        }
        
        // Get available actions based on current state
        const availableActions = CALIBRATION_TRANSITIONS[order.status] || [];
        
        // Filter actions by RBAC
        const allowedActions = availableActions.filter(transition => {
            const { requiredRoles } = transition;
            if (!requiredRoles || requiredRoles.length === 0) return true;
            return requiredRoles.some(role => userRoles.includes(role));
        });
        
        return {
            ...order.toJSON(),
            availableActions: allowedActions.map(t => ({
                action: t.action,
                nextState: t.nextState,
                label: t.label || t.action,
                requiredRoles: t.requiredRoles
            }))
        };
    }
    
    /**
     * Create new calibration order
     */
    static async createCalibrationOrder(data, userId) {
        // Validate asset requires calibration
        const asset = await Asset.findByPk(data.asset_id);
        if (!asset) throw new Error('Asset not found');
        if (!asset.requires_calibration) {
            throw new Error('Asset does not require calibration');
        }
        
        // Check if asset already has pending calibration
        const pending = await CalibrationOrder.findOne({
            where: {
                asset_id: data.asset_id,
                status: {
                    [Op.in]: [
                        CALIBRATION_STATES.DRAFT,
                        CALIBRATION_STATES.SCHEDULED,
                        CALIBRATION_STATES.IN_PROGRESS,
                        CALIBRATION_STATES.AWAITING_QA_REVIEW
                    ]
                }
            }
        });
        
        if (pending) {
            throw new Error(`Asset already has pending calibration order: ${pending.order_code}`);
        }
        
        // Generate order code
        const count = await CalibrationOrder.count();
        const order_code = `CAL-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
        
        // Create order
        const order = await CalibrationOrder.create({
            order_code,
            asset_id: data.asset_id,
            calibration_type: data.calibration_type || 'periodic',
            calibration_method: data.calibration_method,
            scheduled_date: data.scheduled_date,
            assigned_to: data.assigned_to,
            description: data.description,
            status: CALIBRATION_STATES.DRAFT,
            system_status: 'CRTD',
            created_by: userId
        });
        
        // Audit log
        await AuditLogService.log({
            entity_type: ENTITIES.CALIBRATION,
            entity_id: order.id,
            action: 'CREATE',
            user_id: userId,
            changes: { order_code, asset_id: data.asset_id }
        });
        
        return order;
    }
    
    /**
     * Handle action on calibration order
     */
    static async handleAction(orderId, action, data, userId, userRoles) {
        const order = await CalibrationOrder.findByPk(orderId, {
            include: [{ model: Asset, as: 'asset' }]
        });
        
        if (!order) throw new Error('Calibration order not found');
        
        // Find valid transition
        const transitions = CALIBRATION_TRANSITIONS[order.status] || [];
        const transition = transitions.find(t => t.action === action);
        
        if (!transition) {
            throw new Error(`Action '${action}' not allowed from state '${order.status}'`);
        }
        
        // Check RBAC
        if (transition.requiredRoles && transition.requiredRoles.length > 0) {
            const hasPermission = transition.requiredRoles.some(role => userRoles.includes(role));
            if (!hasPermission) {
                throw new Error(`Insufficient permissions for action '${action}'`);
            }
        }
        
        // Validate transition rules
        if (transition.validations) {
            for (const validation of transition.validations) {
                const isValid = await this.validateRule(validation, order, data);
                if (!isValid) {
                    throw new Error(`Validation failed: ${validation}`);
                }
            }
        }
        
        // Execute side effects BEFORE state change
        if (transition.sideEffects) {
            for (const effect of transition.sideEffects) {
                await this.executeSideEffect(effect, order, data, userId);
            }
        }
        
        // Update order state
        const updates = {
            status: transition.nextState,
            ...data
        };
        
        // System status transitions
        if (action === CALIBRATION_ACTIONS.SCHEDULE && order.system_status === 'CRTD') {
            updates.system_status = 'REL'; // Released - scope locked
        }
        if (action === CALIBRATION_ACTIONS.CLOSE && order.system_status === 'REL') {
            updates.system_status = 'TECO'; // Technically complete - cost locked
        }
        
        await order.update(updates);
        
        // Audit log
        await AuditLogService.log({
            entity_type: ENTITIES.CALIBRATION,
            entity_id: order.id,
            action,
            user_id: userId,
            old_state: order.status,
            new_state: transition.nextState,
            changes: data
        });
        
        return order;
    }
    
    /**
     * Validate transition rules
     */
    static async validateRule(rule, order, data) {
        switch (rule) {
            case 'requireScheduleDate':
                return !!data.scheduled_date || !!order.scheduled_date;
                
            case 'checkAssetAvailable':
                const asset = await Asset.findByPk(order.asset_id);
                return asset && asset.operational_status !== 'down';
                
            case 'requireResults':
                return !!data.result_status && !!data.measured_values;
                
            case 'requireQANotes':
                return !!data.qa_notes && data.qa_notes.length > 10;
                
            case 'requireRejectionReason':
                return !!data.rejection_reason && data.rejection_reason.length > 10;
                
            case 'requireOOTSeverity':
                return !!data.oot_severity && ['minor', 'major', 'critical'].includes(data.oot_severity);
                
            case 'requireCorrectiveActionPlan':
                return !!data.corrective_action_notes && data.corrective_action_notes.length > 20;
                
            case 'requireCAPACompletion':
                if (data.maintenance_id) {
                    const wo = await MaintenanceService.getById(data.maintenance_id);
                    return wo && wo.status === 'closed';
                }
                return false;
                
            default:
                return true;
        }
    }
    
    /**
     * Execute side effects
     */
    static async executeSideEffect(effect, order, data, userId) {
        switch (effect) {
            case 'setAssetInCalibration':
                await this.setAssetInCalibration(order.asset_id);
                break;
                
            case 'updateAssetCalibrationValid':
                await this.updateAssetCalibrationValid(order.asset_id, data);
                break;
                
            case 'setAssetOutOfTolerance':
                await this.setAssetOutOfTolerance(order.asset_id);
                break;
                
            case 'notifyQA_Manager':
                await this.notifyQAManager(order);
                break;
                
            case 'notifyProductionManager':
                await this.notifyProductionManager(order);
                break;
                
            case 'setQAAccepted':
                await order.update({
                    qa_reviewed_by: userId,
                    qa_reviewed_at: new Date(),
                    qa_notes: data.qa_notes
                });
                break;
                
            case 'setOOTFlag':
                await order.update({
                    oot_severity: data.oot_severity,
                    oot_detected_at: new Date(),
                    oot_description: data.oot_description
                });
                break;
                
            case 'createMaintenanceWO':
                const wo = await MaintenanceService.createFromCalibration(order.id, userId);
                await order.update({ maintenance_id: wo.id });
                break;
                
            case 'linkCAPA':
                // Link to CAPA system (if implemented)
                if (data.capa_id) {
                    await order.update({ capa_id: data.capa_id });
                }
                break;
                
            case 'finalizeAssetStatus':
                await this.finalizeAssetStatus(order.asset_id, order);
                break;
                
            default:
                console.warn(`Unknown side effect: ${effect}`);
        }
    }
    
    /**
     * Side effect: Set asset in calibration
     */
    static async setAssetInCalibration(assetId) {
        await Asset.update(
            { 
                calibration_status: 'in_calibration',
                operational_status: 'limited' // Cannot use during calibration
            },
            { where: { id: assetId } }
        );
    }
    
    /**
     * Side effect: Update asset calibration valid (after QA acceptance)
     */
    static async updateAssetCalibrationValid(assetId, data) {
        const asset = await Asset.findByPk(assetId);
        
        const next_due_at = new Date();
        next_due_at.setDate(next_due_at.getDate() + asset.calibration_interval_days);
        
        await Asset.update(
            {
                calibration_status: 'valid',
                operational_status: 'available', // Ready for use
                last_calibrated_at: new Date(),
                next_due_at,
                certificate_no: data.certificate_no,
                certificate_file_url: data.certificate_file_url
            },
            { where: { id: assetId } }
        );
    }
    
    /**
     * Side effect: Set asset out of tolerance
     */
    static async setAssetOutOfTolerance(assetId) {
        await Asset.update(
            {
                calibration_status: 'out_of_tolerance',
                operational_status: 'down' // CRITICAL: Cannot use OOT equipment
            },
            { where: { id: assetId } }
        );
    }
    
    /**
     * Side effect: Finalize asset status after order closure
     */
    static async finalizeAssetStatus(assetId, order) {
        const asset = await Asset.findByPk(assetId);
        
        if (order.result_status === 'pass') {
            await this.updateAssetCalibrationValid(assetId, {
                certificate_no: order.certificate_no,
                certificate_file_url: order.certificate_file_url
            });
        } else if (order.result_status === 'fail_oot') {
            await this.setAssetOutOfTolerance(assetId);
        } else {
            // fail_reject or other
            await Asset.update(
                { 
                    calibration_status: 'overdue',
                    operational_status: 'limited'
                },
                { where: { id: assetId } }
            );
        }
    }
    
    /**
     * Notify QA Manager
     */
    static async notifyQAManager(order) {
        const qaManagers = await User.findAll({
            where: { role: 'QA' }
        });
        
        for (const qa of qaManagers) {
            await NotificationService.create({
                user_id: qa.id,
                title: 'Calibration Order Requires QA Review',
                message: `Calibration order ${order.order_code} for asset ${order.asset.dk_code} requires your review.`,
                link: `/calibration/${order.id}`,
                priority: 'high'
            });
        }
    }
    
    /**
     * Notify Production Manager (for OOT)
     */
    static async notifyProductionManager(order) {
        const managers = await User.findAll({
            where: { role: { [Op.in]: ['MANAGER', 'PRODUCTION'] } }
        });
        
        for (const manager of managers) {
            await NotificationService.create({
                user_id: manager.id,
                title: 'CRITICAL: Out of Tolerance Detected',
                message: `Asset ${order.asset.dk_code} is OUT OF TOLERANCE and has been taken offline. Immediate action required.`,
                link: `/calibration/${order.id}`,
                priority: 'critical'
            });
        }
    }
    
    /**
     * Get overdue assets
     */
    static async getOverdueAssets() {
        const assets = await Asset.findAll({
            where: {
                requires_calibration: true,
                next_due_at: { [Op.lt]: new Date() },
                calibration_status: { [Op.ne]: 'in_calibration' },
                status: { [Op.ne]: 'inactive' }
            },
            include: [
                {
                    model: CalibrationOrder,
                    as: 'calibration_orders',
                    where: {
                        status: { [Op.notIn]: [CALIBRATION_STATES.CLOSED, CALIBRATION_STATES.CANCELLED] }
                    },
                    required: false
                }
            ]
        });
        
        return assets;
    }
    
    /**
     * Get assets due soon (within 30 days)
     */
    static async getAssetsDueSoon(days = 30) {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() + days);
        
        const assets = await Asset.findAll({
            where: {
                requires_calibration: true,
                next_due_at: {
                    [Op.gte]: new Date(),
                    [Op.lte]: threshold
                },
                calibration_status: { [Op.notIn]: ['in_calibration', 'overdue'] },
                status: { [Op.ne]: 'inactive' }
            }
        });
        
        return assets;
    }
    
    /**
     * Get OOT orders
     */
    static async getOOTOrders() {
        const orders = await CalibrationOrder.findAll({
            where: {
                status: { [Op.in]: [CALIBRATION_STATES.OUT_OF_TOLERANCE, CALIBRATION_STATES.CORRECTIVE_ACTION] }
            },
            include: [{ model: Asset, as: 'asset' }],
            order: [['oot_detected_at', 'DESC']]
        });
        
        return orders;
    }
    
    /**
     * Check overdue calibrations (cron job)
     */
    static async checkOverdueCalibrations() {
        const overdue = await this.getOverdueAssets();
        
        for (const asset of overdue) {
            // Update asset status
            await asset.update({
                calibration_status: 'overdue',
                operational_status: 'limited' // GMP: Cannot use overdue equipment
            });
            
            // Notify planners and QA
            const planners = await User.findAll({ where: { role: 'PLANNER' } });
            const qa = await User.findAll({ where: { role: 'QA' } });
            
            for (const user of [...planners, ...qa]) {
                await NotificationService.create({
                    user_id: user.id,
                    title: 'OVERDUE: Calibration Required',
                    message: `Asset ${asset.dk_code} calibration is OVERDUE. Last calibrated: ${asset.last_calibrated_at}`,
                    link: `/assets/${asset.id}`,
                    priority: 'high'
                });
            }
        }
        
        return { count: overdue.length, assets: overdue };
    }
    
    /**
     * Check due soon (cron job)
     */
    static async checkDueSoon(days = 30) {
        const dueSoon = await this.getAssetsDueSoon(days);
        
        for (const asset of dueSoon) {
            // Update asset status
            await asset.update({ calibration_status: 'due_soon' });
            
            // Notify planners
            const planners = await User.findAll({ where: { role: 'PLANNER' } });
            
            for (const planner of planners) {
                await NotificationService.create({
                    user_id: planner.id,
                    title: 'Calibration Due Soon',
                    message: `Asset ${asset.dk_code} calibration due: ${asset.next_due_at}`,
                    link: `/assets/${asset.id}`,
                    priority: 'medium'
                });
            }
        }
        
        return { count: dueSoon.length, assets: dueSoon };
    }
    
    /**
     * Get compliance report
     */
    static async getComplianceReport(from, to) {
        // Total assets requiring calibration (only active)
        const totalAssets = await Asset.count({ 
            where: { 
                requires_calibration: true,
                status: { [Op.ne]: 'inactive' }
            } 
        });
        
        // Valid calibrations
        const validAssets = await Asset.count({
            where: {
                requires_calibration: true,
                calibration_status: 'valid',
                status: { [Op.ne]: 'inactive' }
            }
        });
        
        // Overdue calibrations
        const overdueAssets = await Asset.count({
            where: {
                requires_calibration: true,
                calibration_status: 'overdue',
                status: { [Op.ne]: 'inactive' }
            }
        });
        
        // Due soon
        const dueSoonAssets = await Asset.count({
            where: {
                requires_calibration: true,
                calibration_status: 'due_soon',
                status: { [Op.ne]: 'inactive' }
            }
        });
        
        // OOT count in date range
        const ootCount = await CalibrationOrder.count({
            where: {
                status: { [Op.in]: [CALIBRATION_STATES.OUT_OF_TOLERANCE, CALIBRATION_STATES.CORRECTIVE_ACTION] },
                oot_detected_at: {
                    [Op.gte]: from,
                    [Op.lte]: to
                }
            }
        });
        
        // Calibrations completed in period
        const completedCount = await CalibrationOrder.count({
            where: {
                status: CALIBRATION_STATES.CLOSED,
                completed_at: {
                    [Op.gte]: from,
                    [Op.lte]: to
                }
            }
        });
        
        const complianceRate = totalAssets > 0 ? ((validAssets / totalAssets) * 100).toFixed(2) : 0;
        
        return {
            total_assets: totalAssets,
            valid: validAssets,
            overdue: overdueAssets,
            due_soon: dueSoonAssets,
            compliance_rate: complianceRate,
            oot_count: ootCount,
            completed_count: completedCount,
            period: { from, to }
        };
    }
}

module.exports = CalibrationService;
