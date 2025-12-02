const { Role, Permission, RolePermission, User, UserRole } = require('../models');
const { Op } = require('sequelize');

// ==================== ROLES ====================

// GET /api/v1/rbac/roles - Lấy danh sách roles
const getAllRoles = async (req, res) => {
    try {
        const { is_active } = req.query;
        const where = {};
        if (is_active !== undefined) {
            where.is_active = is_active === 'true';
        }

        const roles = await Role.findAll({
            where,
            include: [
                {
                    model: Permission,
                    as: 'permissions',
                    through: { attributes: [] }
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name', 'employee_code']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: roles
        });
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách vai trò',
            error: error.message
        });
    }
};

// POST /api/v1/rbac/roles - Tạo role mới
const createRole = async (req, res) => {
    const transaction = await Role.sequelize.transaction();
    try {
        const { role_name, description, permission_ids } = req.body;

        if (!role_name) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập tên vai trò'
            });
        }

        // Check duplicate
        const existing = await Role.findOne({ where: { role_name }, transaction });
        if (existing) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Tên vai trò đã tồn tại'
            });
        }

        const role = await Role.create({
            role_name,
            description,
            is_active: true,
            created_by: req.user?.id
        }, { transaction });

        // Assign permissions
        if (permission_ids && Array.isArray(permission_ids) && permission_ids.length > 0) {
            await RolePermission.bulkCreate(
                permission_ids.map(permission_id => ({
                    role_id: role.id,
                    permission_id
                })),
                { transaction }
            );
        }

        await transaction.commit();

        const result = await Role.findByPk(role.id, {
            include: [{
                model: Permission,
                as: 'permissions',
                through: { attributes: [] }
            }]
        });

        res.status(201).json({
            success: true,
            data: result,
            message: 'Tạo vai trò thành công'
        });
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error('Error creating role:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo vai trò',
            error: error.message
        });
    }
};

// PUT /api/v1/rbac/roles/:id - Cập nhật role
const updateRole = async (req, res) => {
    const transaction = await Role.sequelize.transaction();
    try {
        const { id } = req.params;
        const { role_name, description, is_active, permission_ids } = req.body;

        const role = await Role.findByPk(id, { transaction });
        if (!role) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy vai trò'
            });
        }

        await role.update({
            role_name: role_name || role.role_name,
            description: description !== undefined ? description : role.description,
            is_active: is_active !== undefined ? is_active : role.is_active
        }, { transaction });

        // Update permissions
        if (permission_ids !== undefined) {
            await RolePermission.destroy({
                where: { role_id: id },
                transaction
            });

            if (Array.isArray(permission_ids) && permission_ids.length > 0) {
                await RolePermission.bulkCreate(
                    permission_ids.map(permission_id => ({
                        role_id: id,
                        permission_id
                    })),
                    { transaction }
                );
            }
        }

        await transaction.commit();

        const result = await Role.findByPk(id, {
            include: [{
                model: Permission,
                as: 'permissions',
                through: { attributes: [] }
            }]
        });

        res.status(200).json({
            success: true,
            data: result,
            message: 'Cập nhật vai trò thành công'
        });
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error('Error updating role:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật vai trò',
            error: error.message
        });
    }
};

// DELETE /api/v1/rbac/roles/:id - Xóa role
const deleteRole = async (req, res) => {
    const transaction = await Role.sequelize.transaction();
    try {
        const { id } = req.params;

        const role = await Role.findByPk(id, { transaction });
        if (!role) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy vai trò'
            });
        }

        // Check if role is assigned to users
        const userCount = await UserRole.count({
            where: { role_id: id },
            transaction
        });

        if (userCount > 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: `Không thể xóa vai trò này vì đang có ${userCount} người dùng được gán`
            });
        }

        await RolePermission.destroy({
            where: { role_id: id },
            transaction
        });

        await role.destroy({ transaction });
        await transaction.commit();

        res.status(200).json({
            success: true,
            message: 'Xóa vai trò thành công'
        });
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error('Error deleting role:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa vai trò',
            error: error.message
        });
    }
};

// ==================== PERMISSIONS ====================

// GET /api/v1/rbac/permissions - Lấy danh sách permissions
const getAllPermissions = async (req, res) => {
    try {
        const { module, is_active } = req.query;
        const where = {};
        
        if (module) where.module = module;
        if (is_active !== undefined) where.is_active = is_active === 'true';

        const permissions = await Permission.findAll({
            where,
            order: [['module', 'ASC'], ['permission_name', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: permissions
        });
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách quyền',
            error: error.message
        });
    }
};

// POST /api/v1/rbac/permissions - Tạo permission mới
const createPermission = async (req, res) => {
    try {
        const { permission_key, permission_name, module, description } = req.body;

        if (!permission_key || !permission_name || !module) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập đầy đủ thông tin'
            });
        }

        const existing = await Permission.findOne({ where: { permission_key } });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Key quyền đã tồn tại'
            });
        }

        const permission = await Permission.create({
            permission_key,
            permission_name,
            module,
            description,
            is_active: true
        });

        res.status(201).json({
            success: true,
            data: permission,
            message: 'Tạo quyền thành công'
        });
    } catch (error) {
        console.error('Error creating permission:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo quyền',
            error: error.message
        });
    }
};

// ==================== USER ROLES ====================

// GET /api/v1/rbac/users - Lấy danh sách tất cả users (cho việc gán role)
const getAllUsers = async (req, res) => {
    try {
        const { department, search, limit = 100, offset = 0 } = req.query;
        const where = {};
        
        if (department) {
            where.department = department;
        }
        
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { employee_code: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } }
            ];
        }

        const users = await User.findAll({
            where,
            attributes: ['id', 'employee_code', 'name', 'department', 'position', 'email'],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['name', 'ASC']]
        });

        const total = await User.count({ where });

        res.status(200).json({
            success: true,
            data: users,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách người dùng',
            error: error.message
        });
    }
};

// GET /api/v1/rbac/users/:userId/roles - Lấy roles của user
const getUserRoles = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findByPk(userId, {
            include: [{
                model: Role,
                as: 'roles',
                through: { attributes: ['created_at'] },
                include: [{
                    model: Permission,
                    as: 'permissions',
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

        res.status(200).json({
            success: true,
            data: user.roles || []
        });
    } catch (error) {
        console.error('Error fetching user roles:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy vai trò của người dùng',
            error: error.message
        });
    }
};

// POST /api/v1/rbac/users/:userId/roles - Gán roles cho user
const assignUserRoles = async (req, res) => {
    const transaction = await UserRole.sequelize.transaction();
    try {
        const { userId } = req.params;
        const { role_ids } = req.body;

        if (!Array.isArray(role_ids)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'role_ids phải là mảng'
            });
        }

        const user = await User.findByPk(userId, { transaction });
        if (!user) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        // Remove existing roles
        await UserRole.destroy({
            where: { user_id: userId },
            transaction
        });

        // Assign new roles
        if (role_ids.length > 0) {
            await UserRole.bulkCreate(
                role_ids.map(role_id => ({
                    user_id: userId,
                    role_id,
                    assigned_by: req.user?.id
                })),
                { transaction }
            );
        }

        await transaction.commit();

        // Fetch updated user with roles
        const result = await User.findByPk(userId, {
            include: [{
                model: Role,
                as: 'roles',
                through: { attributes: [] }
            }]
        });

        res.status(200).json({
            success: true,
            data: result.roles,
            message: 'Gán vai trò thành công'
        });
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error('Error assigning user roles:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi gán vai trò',
            error: error.message
        });
    }
};

// GET /api/v1/rbac/users/:userId/permissions - Lấy tất cả permissions của user (từ roles)
const getUserPermissions = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findByPk(userId, {
            include: [{
                model: Role,
                as: 'roles',
                through: { attributes: [] },
                include: [{
                    model: Permission,
                    as: 'permissions',
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

        // Flatten permissions from all roles (remove duplicates)
        const permissionMap = new Map();
        (user.roles || []).forEach(role => {
            (role.permissions || []).forEach(permission => {
                permissionMap.set(permission.id, permission);
            });
        });

        const permissions = Array.from(permissionMap.values());

        res.status(200).json({
            success: true,
            data: permissions
        });
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy quyền của người dùng',
            error: error.message
        });
    }
};

// GET /api/v1/rbac/me/permissions - Lấy permissions của user hiện tại (đang đăng nhập)
const getMyPermissions = async (req, res) => {
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
                through: { attributes: [] },
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

        // Flatten permissions và return permission_keys
        const permissionMap = new Map();
        const permissionKeys = new Set();
        
        (user.roles || []).forEach(role => {
            (role.permissions || []).forEach(permission => {
                permissionMap.set(permission.id, permission);
                permissionKeys.add(permission.permission_key);
            });
        });

        const permissions = Array.from(permissionMap.values());

        res.status(200).json({
            success: true,
            data: {
                permissions,
                permission_keys: Array.from(permissionKeys)
            }
        });
    } catch (error) {
        console.error('Error fetching my permissions:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy quyền của bạn',
            error: error.message
        });
    }
};

// POST /api/v1/rbac/seed - Seed default roles & permissions
const seedRBAC = async (req, res) => {
    const transaction = await Role.sequelize.transaction();
    try {
        // Create default permissions
        const permissions = [
            // Assets
            { permission_key: 'assets.view', permission_name: 'Xem thiết bị', module: 'assets' },
            { permission_key: 'assets.create', permission_name: 'Tạo thiết bị', module: 'assets' },
            { permission_key: 'assets.update', permission_name: 'Sửa thiết bị', module: 'assets' },
            { permission_key: 'assets.delete', permission_name: 'Xóa thiết bị', module: 'assets' },
            
            // Maintenance
            { permission_key: 'maintenance.view', permission_name: 'Xem bảo trì', module: 'maintenance' },
            { permission_key: 'maintenance.create', permission_name: 'Tạo lịch bảo trì', module: 'maintenance' },
            { permission_key: 'maintenance.update', permission_name: 'Cập nhật bảo trì', module: 'maintenance' },
            { permission_key: 'maintenance.approve', permission_name: 'Phê duyệt bảo trì', module: 'maintenance' },
            { permission_key: 'maintenance.report', permission_name: 'Xem báo cáo bảo trì', module: 'maintenance' },
            
            // Calibration
            { permission_key: 'calibration.view', permission_name: 'Xem hiệu chuẩn', module: 'calibration' },
            { permission_key: 'calibration.create', permission_name: 'Tạo lịch hiệu chuẩn', module: 'calibration' },
            { permission_key: 'calibration.update', permission_name: 'Cập nhật hiệu chuẩn', module: 'calibration' },
            
            // Handover
            { permission_key: 'handover.view', permission_name: 'Xem bàn giao', module: 'handover' },
            { permission_key: 'handover.create', permission_name: 'Tạo bàn giao', module: 'handover' },
            { permission_key: 'handover.approve', permission_name: 'Phê duyệt bàn giao', module: 'handover' },
            
            // Checklist
            { permission_key: 'checklist.view', permission_name: 'Xem checklist', module: 'checklist' },
            { permission_key: 'checklist.manage', permission_name: 'Quản lý checklist', module: 'checklist' },
            
            // Work Requests
            { permission_key: 'work_requests.view', permission_name: 'Xem yêu cầu xử lý', module: 'work_requests' },
            { permission_key: 'work_requests.create', permission_name: 'Tạo yêu cầu xử lý', module: 'work_requests' },
            { permission_key: 'work_requests.update', permission_name: 'Cập nhật yêu cầu', module: 'work_requests' },
            { permission_key: 'work_requests.approve', permission_name: 'Phê duyệt yêu cầu', module: 'work_requests' },
            { permission_key: 'work_requests.assign', permission_name: 'Gán người xử lý', module: 'work_requests' },
            
            // Incidents
            { permission_key: 'incidents.view', permission_name: 'Xem sự cố', module: 'incidents' },
            { permission_key: 'incidents.create', permission_name: 'Báo cáo sự cố', module: 'incidents' },
            { permission_key: 'incidents.update', permission_name: 'Cập nhật sự cố', module: 'incidents' },
            { permission_key: 'incidents.resolve', permission_name: 'Xử lý sự cố', module: 'incidents' },
            
            // Dashboard
            { permission_key: 'dashboard.view', permission_name: 'Xem dashboard', module: 'dashboard' },
            
            // Reports
            { permission_key: 'reports.view', permission_name: 'Xem báo cáo', module: 'reports' },
            { permission_key: 'reports.export', permission_name: 'Xuất báo cáo', module: 'reports' },
            
            // RBAC
            { permission_key: 'rbac.manage', permission_name: 'Quản lý phân quyền', module: 'rbac' },
        ];

        const createdPermissions = await Permission.bulkCreate(permissions, { 
            transaction,
            ignoreDuplicates: true 
        });

        // Create default roles
        const adminRole = await Role.create({
            role_name: 'Admin',
            description: 'Quản trị viên - Full quyền',
            is_active: true,
            created_by: req.user?.id
        }, { transaction });

        const managerRole = await Role.create({
            role_name: 'Manager',
            description: 'Quản lý - Xem và phê duyệt',
            is_active: true,
            created_by: req.user?.id
        }, { transaction });

        const technicianRole = await Role.create({
            role_name: 'Technician',
            description: 'Kỹ thuật viên - Thực hiện bảo trì',
            is_active: true,
            created_by: req.user?.id
        }, { transaction });

        // Assign all permissions to Admin
        const allPermissions = await Permission.findAll({ transaction });
        await RolePermission.bulkCreate(
            allPermissions.map(p => ({
                role_id: adminRole.id,
                permission_id: p.id
            })),
            { transaction }
        );

        // Assign view + approve permissions to Manager
        const managerPermissions = allPermissions.filter(p => 
            p.permission_key.includes('.view') || 
            p.permission_key.includes('.approve') ||
            p.permission_key.includes('.report') ||
            p.permission_key.includes('.export') ||
            p.permission_key.includes('.assign') ||
            p.permission_key.includes('.resolve')
        );
        await RolePermission.bulkCreate(
            managerPermissions.map(p => ({
                role_id: managerRole.id,
                permission_id: p.id
            })),
            { transaction }
        );

        // Assign basic permissions to Technician
        const techPermissions = allPermissions.filter(p => 
            p.permission_key.includes('.view') || 
            p.permission_key.includes('maintenance.update') ||
            p.permission_key.includes('calibration.update') ||
            p.permission_key.includes('work_requests.create') ||
            p.permission_key.includes('work_requests.update') ||
            p.permission_key.includes('incidents.create') ||
            p.permission_key.includes('incidents.update')
        );
        await RolePermission.bulkCreate(
            techPermissions.map(p => ({
                role_id: technicianRole.id,
                permission_id: p.id
            })),
            { transaction }
        );

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Đã tạo roles và permissions mặc định thành công',
            data: {
                roles_created: 3,
                permissions_created: allPermissions.length
            }
        });
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error('Error seeding RBAC:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo dữ liệu RBAC',
            error: error.message
        });
    }
};

module.exports = {
    getAllRoles,
    createRole,
    updateRole,
    deleteRole,
    getAllPermissions,
    createPermission,
    getAllUsers,
    getUserRoles,
    assignUserRoles,
    getUserPermissions,
    getMyPermissions,
    seedRBAC
};
