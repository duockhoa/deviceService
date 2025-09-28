const sequelize = require('../configs/sequelize');
const { DataTypes} = require('sequelize');

const AssetCategories = sequelize.define('asset_categories', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
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
    }
});

module.exports = {
    AssetCategories
};