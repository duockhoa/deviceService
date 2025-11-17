const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const MaintenanceConsumables = sequelize.define('MaintenanceConsumables', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    maintenance_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'maintenance',
            key: 'id'
        },
        comment: 'ID lịch bảo trì'
    },
    consumable_category_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'consumable_categories',
            key: 'id'
        },
        comment: 'ID danh mục vật tư tiêu hao (optional nếu dùng asset_consumable_id)'
    },
    asset_consumable_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'asset_consumables',
            key: 'id'
        },
        comment: 'ID vật tư của thiết bị (nếu chọn từ asset_consumables)'
    },
    item_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Tên vật tư (copy từ asset_consumables hoặc nhập tay)'
    },
    specification: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Quy cách vật tư (copy từ asset_consumables hoặc nhập tay)'
    },
    quantity_required: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 1,
        comment: 'Số lượng cần thiết'
    },
    quantity_used: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        comment: 'Số lượng thực tế đã sử dụng'
    },
    unit_cost: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        comment: 'Đơn giá vật tư'
    },
    total_cost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Tổng chi phí = quantity_used * unit_cost'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Ghi chú về vật tư'
    },
    status: {
        type: DataTypes.ENUM('planned', 'ordered', 'received', 'used'),
        allowNull: false,
        defaultValue: 'planned',
        comment: 'Trạng thái vật tư: planned, ordered, received, used'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'maintenance_consumables',
    timestamps: false,
    hooks: {
        beforeUpdate: (instance) => {
            instance.updated_at = new Date();
        },
        beforeCreate: (instance) => {
            // Auto calculate total_cost if unit_cost and quantity_used are provided
            if (instance.unit_cost && instance.quantity_used) {
                instance.total_cost = instance.unit_cost * instance.quantity_used;
            }
        },
        beforeUpdate: (instance) => {
            // Auto calculate total_cost if unit_cost and quantity_used are provided
            if (instance.unit_cost && instance.quantity_used) {
                instance.total_cost = instance.unit_cost * instance.quantity_used;
            }
            instance.updated_at = new Date();
        }
    },
    indexes: [
        {
            fields: ['maintenance_id']
        },
        {
            fields: ['consumable_category_id']
        },
        {
            fields: ['asset_consumable_id']
        },
        {
            fields: ['status']
        }
    ]
});

module.exports = {
    MaintenanceConsumables
};