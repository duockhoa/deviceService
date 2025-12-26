/**
 * Department-based guard - Kiểm tra phòng ban
 * Admin role bypass tự động (không hardcode user IDs)
 */
const { normalizeRole, ROLES } = require('../utils/stateMachine');

const departmentGuard = (allowedDepartments = []) => {
    return (req, res, next) => {
        const user = req.user || {};

        // Admin role bypass (dùng RBAC thay vì hardcode IDs)
        const userRole = normalizeRole(user);
        if (userRole === ROLES.ADMIN) {
            return next();
        }

        if (!user.department) {
            return res.status(403).json({ success: false, message: 'Không xác định phòng ban của bạn.' });
        }

        if (allowedDepartments.length === 0 || allowedDepartments.includes(user.department)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập chức năng này theo phòng ban.'
        });
    };
};

module.exports = departmentGuard;
