const { User, Role, Permission } = require('../models');

/**
 * Permission Guard Middleware
 * Kiểm tra user có quyền cần thiết không
 * 
 * Usage: router.get('/path', authMiddleware, permissionGuard('assets.view'), controller)
 */
const permissionGuard = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Người dùng chưa đăng nhập'
                });
            }

            // Lấy user với roles và permissions
            const user = await User.findByPk(userId, {
                include: [{
                    model: Role,
                    as: 'roles',
                    where: { is_active: true },
                    required: false,
                    include: [{
                        model: Permission,
                        as: 'permissions',
                        where: { is_active: true },
                        required: false,
                        through: { attributes: [] }
                    }]
                }]
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng'
                });
            }

            // Lấy tất cả permissions của user từ các roles
            const userPermissions = new Set();
            (user.roles || []).forEach(role => {
                (role.permissions || []).forEach(permission => {
                    userPermissions.add(permission.permission_key);
                });
            });

            // Kiểm tra permission
            if (!userPermissions.has(requiredPermission)) {
                return res.status(403).json({
                    success: false,
                    message: `Bạn không có quyền: ${requiredPermission}`,
                    required_permission: requiredPermission
                });
            }

            // User có quyền, cho phép tiếp tục
            req.userPermissions = Array.from(userPermissions);
            next();
        } catch (error) {
            console.error('Permission guard error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi kiểm tra quyền',
                error: error.message
            });
        }
    };
};

/**
 * Check multiple permissions (OR logic)
 * User chỉ cần có 1 trong các quyền
 */
const permissionGuardAny = (requiredPermissions = []) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Người dùng chưa đăng nhập'
                });
            }

            const user = await User.findByPk(userId, {
                include: [{
                    model: Role,
                    as: 'roles',
                    where: { is_active: true },
                    required: false,
                    include: [{
                        model: Permission,
                        as: 'permissions',
                        where: { is_active: true },
                        required: false,
                        through: { attributes: [] }
                    }]
                }]
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng'
                });
            }

            const userPermissions = new Set();
            (user.roles || []).forEach(role => {
                (role.permissions || []).forEach(permission => {
                    userPermissions.add(permission.permission_key);
                });
            });

            // Kiểm tra user có ít nhất 1 quyền trong danh sách
            const hasPermission = requiredPermissions.some(perm => userPermissions.has(perm));

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: `Bạn không có quyền thực hiện thao tác này`,
                    required_permissions: requiredPermissions
                });
            }

            req.userPermissions = Array.from(userPermissions);
            next();
        } catch (error) {
            console.error('Permission guard error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi kiểm tra quyền',
                error: error.message
            });
        }
    };
};

module.exports = {
    permissionGuard,
    permissionGuardAny
};
