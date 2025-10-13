const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const AssetSpecifications = sequelize.define('AssetSpecifications', {
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
            model: 'Assets',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'ID của thiết bị'
    },
    spec_category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'SpecificationCategories',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'ID của danh mục thông số'
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Giá trị thông số kỹ thuật'
    },
    numeric_value: {
        type: DataTypes.DECIMAL(15, 4),
        allowNull: true,
        comment: 'Giá trị số (để tìm kiếm và so sánh)'
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Ghi chú về thông số'
    },
    verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Thời gian xác thực thông số'
    },
    verified_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        },
        comment: 'Người xác thực'
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        },
        comment: 'Người tạo'
    },
    updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        },
        comment: 'Người cập nhật cuối'
    }
}, {
    tableName: 'asset_specifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['asset_id', 'spec_category_id']
        },
        {
            fields: ['asset_id']
        },
        {
            fields: ['spec_category_id']
        },
        {
            fields: ['numeric_value']
        }
    ]
});

module.exports = {AssetSpecifications};