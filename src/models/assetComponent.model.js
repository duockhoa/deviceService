const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const AssetComponent = sequelize.define('asset_components', {
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
    component_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Tên thành phần/bộ phận của thiết bị'
    },
    component_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Mã thành phần (nếu có)'
    },
    specification: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Thông số kỹ thuật của thành phần'
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
            min: 0
        },
        comment: 'Số lượng thành phần'
    },
    unit: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Đơn vị tính (cái, bộ, m, kg, ...)'
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Ghi chú thêm về thành phần'
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
    tableName: 'asset_components',
    timestamps: false, // Vì chúng ta tự định nghĩa created_at và updated_at
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
            fields: ['component_code'] // Index cho component code để tìm kiếm nhanh
        },
        {
            fields: ['component_name'] // Index cho component name
        },
        {
            fields: ['asset_id', 'component_code'], // Composite index
            unique: true,
            name: 'idx_asset_component_unique'
        }
    ]
});

module.exports = {
    AssetComponent
};