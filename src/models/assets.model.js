const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const Assets = sequelize.define('assets', {
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
        }
    },
    asset_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    serial_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
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
    tableName: 'assets',
    timestamps: false, // Sử dụng created_at và updated_at tự định nghĩa
    hooks: {
        beforeUpdate: (instance) => {
            instance.updated_at = new Date();
        }
    },
    indexes: [
        {
            unique: true,
            fields: ['asset_code']
        },
        {
            unique: true,
            fields: ['serial_number']
        },
        {
            fields: ['category_id']
        },
        {
            fields: ['created_by']
        }
    ]
});

module.exports = {
    Assets
};