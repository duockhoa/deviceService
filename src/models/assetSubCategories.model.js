const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const AssetSubCategories = sequelize.define('asset_sub_categories', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'asset_categories',
            key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'Liên kết đến loại thiết bị cha'
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Mã loại thiết bị con (ví dụ: TBSX001, TBSX002, TBIT001)'
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Tên loại thiết bị con'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mô tả chi tiết loại thiết bị con'
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
    tableName: 'asset_sub_categories',
    timestamps: false,
    hooks: {
        beforeUpdate: (instance) => {
            instance.updated_at = new Date();
        }
    },
    indexes: [
        {
            unique: true,
            fields: ['code']
        },
        {
            fields: ['category_id']
        },
        {
            fields: ['name']
        }
    ]
});

module.exports = {
    AssetSubCategories
};