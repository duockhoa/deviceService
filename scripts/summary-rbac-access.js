const { User, Role, Permission, UserRole } = require('../src/models');

(async () => {
    try {
        console.log('📊 KIỂM TRA TỔNG QUAN PHÂN QUYỀN\n');

        // 1. Tổng số users
        const totalUsers = await User.count();
        console.log('👥 Tổng số users:', totalUsers);

        // 2. Phân bổ roles
        console.log('\n🎭 PHÂN BỔ ROLES:');
        const roles = await Role.findAll({
            include: [{
                model: User,
                as: 'users',
                through: { attributes: [] }
            }]
        });

        for (const role of roles) {
            console.log(`   ${role.role_name}: ${role.users.length} users`);
        }

        // 3. Users có quyền rbac.manage
        console.log('\n🔐 USERS CÓ QUYỀN PHÂN QUYỀN (rbac.manage):');
        
        // Lấy tất cả users kèm roles và permissions
        const allUsersWithRoles = await User.findAll({
            include: [{
                model: Role,
                as: 'roles',
                include: [{
                    model: Permission,
                    as: 'permissions',
                    through: { attributes: [] }
                }]
            }]
        });

        // Filter users có ít nhất 1 role có permission rbac.manage
        const usersWithRBAC = allUsersWithRoles.filter(user => {
            return user.roles.some(role => {
                return role.permissions.some(perm => perm.permission_key === 'rbac.manage');
            });
        });

        console.log(`   Tổng: ${usersWithRBAC.length} users`);
        usersWithRBAC.forEach(user => {
            const roleNames = user.roles.map(r => r.role_name).join(', ');
            console.log(`   - User ${user.id} (${user.employee_code}): ${user.name} - Role: ${roleNames}`);
        });

        console.log('\n✅ TỔNG KẾT:');
        console.log(`   - ${usersWithRBAC.length} người CÓ THỂ xem và quản lý Phân quyền`);
        console.log(`   - ${totalUsers - usersWithRBAC.length} người KHÔNG THỂ xem menu Phân quyền`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    }
})();
