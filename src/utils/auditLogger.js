const { AuditLog } = require('../models');

const logAudit = async ({
    entityType,
    entityId,
    action,
    before,
    after,
    reason,
    user,
    req
}) => {
    try {
        await AuditLog.create({
            entity_type: entityType,
            entity_id: entityId,
            action,
            before_json: before || null,
            after_json: after || null,
            reason: reason || null,
            user_id: user?.id || null,
            ip: req?.ip || null,
            user_agent: req?.get ? req.get('User-Agent') : null,
            correlation_id: req?.headers?.['x-correlation-id'] || null
        });
    } catch (error) {
        console.error('Failed to write audit log:', error);
    }
};

module.exports = {
    logAudit
};
