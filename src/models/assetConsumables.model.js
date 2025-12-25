const { DataTypes } = require('sequelize');
const sequelize = require('../configs/sequelize');

const AssetConsumables = sequelize.define('AssetConsumables', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    asset_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Assets',
            key: 'id'
        },
        comment: 'ID của thiết bị'
    },
    consumable_category_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'consumable_categories',
            key: 'id'
        },
        comment: 'ID danh mục vật tư'
    },
    item_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Tên vật tư tiêu hao (deprecated - dùng từ ConsumableCategory)'
    },
    specification: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Thông số kỹ thuật / Quy cách'
    },
    unit: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Đơn vị tính (deprecated - dùng từ ConsumableCategory)'
    },
    current_quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Số lượng hiện tại trong kho'
    },
    min_stock_level: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Ngưỡng tối thiểu cảnh báo'
    },
    replacement_cycle_hours: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Chu kỳ thay thế (giờ hoạt động)'
    },
    unit_price: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Đơn giá (VNĐ)'
    },
    supplier: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Nhà cung cấp'
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Ghi chú'
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
    tableName: 'asset_consumables',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Bảng lưu vật tư tiêu hao của từng thiết bị'
});

module.exports = { AssetConsumables };
