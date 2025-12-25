/**
 * Audit Log Service
 * Ghi lại mọi thay đổi trạng thái của Incident và Maintenance
 */

const { AuditLog } = require('../models');

class AuditLogService {
    /**
     * Ghi audit log cho transition
     * @param {Object} params
     * @param {string} params.entityType - 'incident' hoặc 'maintenance'
     * @param {number} params.entityId - ID của record
     * @param {string} params.action - Action được thực hiện
     * @param {string} params.fromState - Trạng thái cũ
     * @param {string} params.toState - Trạng thái mới
     * @param {number} params.userId - ID người thực hiện
     * @param {string} params.userRole - Role của người thực hiện
     * @param {Object} params.payload - Dữ liệu bổ sung
     * @param {string} params.ipAddress - IP address
     */
    static async logTransition({
        entityType,
        entityId,
        action,
        fromState,
        toState,
        userId,
        userRole,
        payload = {},
        ipAddress = null
    }) {
        try {
            const auditLog = await AuditLog.create({
                entity_type: entityType,
                entity_id: entityId,
                action,
                before_json: { status: fromState },
                after_json: { status: toState },
                reason: `${action}: ${fromState} → ${toState}`,
                user_id: userId,
                ip: ipAddress,
                correlation_id: `${entityType}-${entityId}-${Date.now()}`,
                created_at: new Date()
            });

            return auditLog;
        } catch (error) {
            console.error('Error creating audit log:', error);
            // Không throw để không làm gián đoạn business logic
            return null;
        }
    }

    /**
     * Lấy lịch sử audit log của một entity
     */
    static async getEntityHistory(entityType, entityId) {
        try {
            const logs = await AuditLog.findAll({
                where: {
                    entity_type: entityType,
                    entity_id: entityId
                },
                include: [
                    {
                        model: require('../models').User,
                        as: 'user',
                        attributes: ['id', 'name', 'employee_code']
                    }
                ],
                order: [['created_at', 'DESC']]
            });

            return logs;
        } catch (error) {
            console.error('Error fetching audit history:', error);
            return [];
        }
    }

    /**
     * Lấy audit logs theo filter
     */
    static async getAuditLogs({
        entityType = null,
        entityId = null,
        userId = null,
        action = null,
        fromDate = null,
        toDate = null,
        limit = 100,
        offset = 0
    }) {
        try {
            const where = {};

            if (entityType) where.entity_type = entityType;
            if (entityId) where.entity_id = entityId;
            if (userId) where.user_id = userId;
            if (action) where.action = action;

            if (fromDate || toDate) {
                where.created_at = {};
                if (fromDate) where.created_at[require('sequelize').Op.gte] = new Date(fromDate);
                if (toDate) where.created_at[require('sequelize').Op.lte] = new Date(toDate);
            }

            const { count, rows } = await AuditLog.findAndCountAll({
                where,
                include: [
                    {
                        model: require('../models').User,
                        as: 'user',
                        attributes: ['id', 'name', 'employee_code']
                    }
                ],
                order: [['created_at', 'DESC']],
                limit,
                offset
            });

            return { total: count, logs: rows };
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            return { total: 0, logs: [] };
        }
    }

    /**
     * Thống kê audit logs theo user hoặc action
     */
    static async getAuditStatistics({ entityType = null, fromDate = null, toDate = null }) {
        try {
            const where = {};
            if (entityType) where.entity_type = entityType;

            if (fromDate || toDate) {
                where.created_at = {};
                if (fromDate) where.created_at[require('sequelize').Op.gte] = new Date(fromDate);
                if (toDate) where.created_at[require('sequelize').Op.lte] = new Date(toDate);
            }

            const byUser = await AuditLog.findAll({
                where,
                attributes: [
                    'user_id',
                    [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
                ],
                group: ['user_id'],
                include: [
                    {
                        model: require('../models').User,
                        as: 'user',
                        attributes: ['name', 'employee_code']
                    }
                ],
                order: [[require('sequelize').literal('count'), 'DESC']]
            });

            const byAction = await AuditLog.findAll({
                where,
                attributes: [
                    'action',
                    [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
                ],
                group: ['action'],
                order: [[require('sequelize').literal('count'), 'DESC']]
            });

            return { byUser, byAction };
        } catch (error) {
            console.error('Error fetching audit statistics:', error);
            return { byUser: [], byAction: [] };
        }
    }
}

module.exports = AuditLogService;
