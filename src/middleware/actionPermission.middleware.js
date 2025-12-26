/**
 * DEPRECATED: Middleware này không còn sử dụng.
 * Phân quyền được xử lý thống nhất trong stateMachine.js qua normalizeRole() và transition validation.
 * 
 * Giữ lại file để tương thích ngược, tất cả middleware trả về next() (no-op).
 */

const checkActionPermission = () => (req, res, next) => next();
const requireRole = () => (req, res, next) => next();
const canViewEntity = (req, res, next) => next();
const canModifyEntity = () => (req, res, next) => next();

module.exports = {
    checkActionPermission,
    requireRole,
    canViewEntity,
    canModifyEntity
};
