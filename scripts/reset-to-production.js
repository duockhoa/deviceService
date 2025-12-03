const { User, Role, UserRole, RolePermission } = require('../src/models');

(async () => {
    try {
        console.log('🚀 CHUẨN BỊ ĐƯA LÊN PRODUCTION\n');

        // 1. Tìm roles
        const adminRole = await Role.findOne({ where: { role_name: 'Admin' } });
        const viewerRole = await Role.findOne({ where: { role_name: 'Viewer' } });
        const hrRole = await Role.findOne({ where: { role_name: 'HR Manager' } });

        if (!adminRole || !viewerRole) {
            console.error('❌ Không tìm thấy Admin hoặc Viewer role');
            process.exit(1);
        }

        console.log('✅ Admin role ID:', adminRole.id);
        console.log('✅ Viewer role ID:', viewerRole.id);

        // 2. Xóa HR Manager role (test role)
        if (hrRole) {
            await RolePermission.destroy({ where: { role_id: hrRole.id } });
            await UserRole.destroy({ where: { role_id: hrRole.id } });
            await hrRole.destroy();
            console.log('✅ Đã xóa HR Manager role (test)\n');
        }

        // 3. Xóa tất cả role assignments
        await UserRole.destroy({ where: {}, truncate: true });
        console.log('🗑️  Đã xóa tất cả role assignments cũ\n');

        // 4. Lấy tất cả users
        const allUsers = await User.findAll({
            attributes: ['id', 'name', 'employee_code']
        });

        console.log('📊 Tìm thấy', allUsers.length, 'users\n');
        console.log('⚙️  Đang gán roles...\n');

        let adminCount = 0;
        let viewerCount = 0;

        // 5. Gán roles
        for (const user of allUsers) {
            if (user.id === 947) {
                // User 947 → Admin
                await UserRole.create({
                    user_id: user.id,
                    role_id: adminRole.id
                });
                console.log(`👑 ADMIN: User ${user.id} - ${user.name} (${user.employee_code})`);
                adminCount++;
            } else {
                // Tất cả users khác → Viewer
                await UserRole.create({
                    user_id: user.id,
                    role_id: viewerRole.id
                });
                viewerCount++;
            }
        }

        console.log('\n✅ HOÀN THÀNH!\n');
        console.log('📊 PHÂN BỔ ROLES PRODUCTION:');
        console.log(`   👑 Admin: ${adminCount} user (User ID 947 - 0947)`);
        console.log(`   👀 Viewer: ${viewerCount} users`);
        console.log(`   📈 Tổng: ${allUsers.length} users`);
        
        console.log('\n🔐 QUYỀN TRUY CẬP:');
        console.log('   ✅ User 947: CÓ THỂ xem menu Phân quyền và quản lý');
        console.log('   ❌ 181 users khác: KHÔNG THỂ xem menu Phân quyền');

        console.log('\n💡 LƯU Ý:');
        console.log('   - Tất cả users cần F5/refresh để load lại permissions');
        console.log('   - Bạn có thể vào /rbac để cấp quyền cho users khác nếu cần');

        console.log('\n🎯 SẴN SÀNG ĐƯA LÊN PRODUCTION!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        console.error(error);
        process.exit(1);
    }
})();
