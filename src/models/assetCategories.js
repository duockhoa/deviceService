const sequelize = require('../configs/sequelize');
const { DataTypes} = require('sequelize');

const AssetCategories = sequelize.define('asset_categories', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Mã loại thiết bị (ví dụ: TBSX, TBCNTT, TBKN, TBVP, PTGT)'
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
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
    tableName: 'asset_categories',
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
            unique: true,
            fields: ['name']
        }
    ]
});

module.exports = {
    AssetCategories
};