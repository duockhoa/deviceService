'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('maintenance_work_tasks', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            maintenance_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'maintenance',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            task_name: {
                type: Sequelize.STRING(255),
                allowNull: false,
                comment: 'Tên công việc'
            },
            task_type: {
                type: Sequelize.ENUM('cleaning', 'inspection', 'maintenance', 'custom'),
                defaultValue: 'custom',
                comment: 'Loại công việc: vệ sinh, kiểm tra, bảo trì, tùy chỉnh'
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Mô tả chi tiết công việc'
            },
            assigned_to: {
                type: Sequelize.JSON,
                allowNull: true,
                comment: 'Danh sách ID nhân viên được giao (array of user IDs)'
            },
            estimated_hours: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
                comment: 'Số giờ ước tính'
            },
            actual_hours: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
                comment: 'Số giờ thực tế'
            },
            status: {
                type: Sequelize.ENUM('pending', 'in_progress', 'completed'),
                defaultValue: 'pending',
                comment: 'Trạng thái công việc'
            },
            priority: {
                type: Sequelize.ENUM('low', 'medium', 'high'),
                defaultValue: 'medium',
                comment: 'Độ ưu tiên'
            },
            // Thông tin báo cáo từ nhân viên
            work_report: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Báo cáo công việc từ nhân viên'
            },
            issues_found: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Vấn đề phát hiện trong quá trình thực hiện'
            },
            materials_used: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Vật tư đã sử dụng'
            },
            completed_at: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Thời gian hoàn thành'
            },
            completed_by: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'Người hoàn thành'
            },
            order_index: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
                comment: 'Thứ tự hiển thị'
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
            }
        });

        // Add indexes
        await queryInterface.addIndex('maintenance_work_tasks', ['maintenance_id']);
        await queryInterface.addIndex('maintenance_work_tasks', ['status']);
        await queryInterface.addIndex('maintenance_work_tasks', ['task_type']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('maintenance_work_tasks');
    }
};
