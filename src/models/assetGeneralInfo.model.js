const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const AssetGeneralInfo = sequelize.define('asset_general_info', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    asset_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'assets',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    manufacture_year: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1900,
            max: new Date().getFullYear() + 10
        },
        comment: 'Năm sản xuất thiết bị'
    },
    manufacturer: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Nhà sản xuất thiết bị'
    },
    country_of_origin: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Nước sản xuất/xuất xứ'
    },
    model: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Model/phiên bản thiết bị'
    },
    serial_number: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Số serial của thiết bị'
    },
    warranty_period_months: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1,
            max: 120 // Tối đa 10 năm (120 tháng)
        },
        comment: 'Thời gian bảo hành (tính theo tháng)'
    },
    warranty_expiry_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Ngày hết hạn bảo hành'
    },
    supplier: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Nhà cung cấp thiết bị'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mô tả chi tiết về thông số kỹ thuật, tính năng, đặc điểm của thiết bị'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    }
}, {
    tableName: 'asset_general_info',
    timestamps: false,
    hooks: {
        beforeUpdate: (instance) => {
            instance.updated_at = new Date();
        }
    },
    indexes: [
        {
            fields: ['asset_id']
        },
        {
            fields: ['serial_number']
        },
        {
            fields: ['manufacturer']
        },
        {
            fields: ['warranty_expiry_date']
        },
        {
            fields: ['warranty_period_months']  // Thêm index mới
        }
    ]
});

module.exports = {
    AssetGeneralInfo
};