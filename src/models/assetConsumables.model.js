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
    item_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Tên vật tư tiêu hao'
    },
    specification: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Thông số kỹ thuật'
    },
    unit: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Đơn vị tính (lít, ml, kg, g, cái, bộ...)'
    },
    replacement_cycle: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Chu kỳ thay thế (số giờ hoạt động)'
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
