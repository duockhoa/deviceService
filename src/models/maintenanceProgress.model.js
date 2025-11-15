const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const MaintenanceProgress = sequelize.define('maintenance_progress', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    maintenance_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'maintenance',
            key: 'id'
        },
        comment: 'ID của lịch bảo trì'
    },
    updated_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'ID người cập nhật'
    },
    progress_percentage: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0,
            max: 100
        },
        comment: 'Phần trăm hoàn thành (0-100)'
    },
    work_description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mô tả công việc đã thực hiện'
    },
    time_spent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Thời gian đã dùng (giờ)'
    },
    materials_used: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Danh sách vật tư đã sử dụng'
    },
    issues_found: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Các vấn đề phát hiện'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Ghi chú khác'
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    tableName: 'maintenance_progress',
    indexes: [
        {
            fields: ['maintenance_id']
        },
        {
            fields: ['updated_by']
        },
        {
            fields: ['created_at']
        }
    ]
});

module.exports = { MaintenanceProgress };
