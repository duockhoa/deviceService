const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const MaintenanceChecklistTemplate = sequelize.define('maintenance_checklist_template', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    template_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Tên mẫu checklist'
    },
    maintenance_type: {
        type: DataTypes.ENUM('cleaning', 'inspection', 'maintenance', 'corrective', 'all'),
        allowNull: false,
        defaultValue: 'all',
        comment: 'Loại bảo trì áp dụng'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mô tả mẫu checklist'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Trạng thái kích hoạt'
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'maintenance_checklist_templates',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['maintenance_type']
        },
        {
            fields: ['is_active']
        }
    ]
});

module.exports = { MaintenanceChecklistTemplate };
