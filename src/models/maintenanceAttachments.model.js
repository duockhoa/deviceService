const { DataTypes } = require('sequelize');
const sequelize = require('../configs/sequelize');

const MaintenanceAttachments = sequelize.define('MaintenanceAttachments', {
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
        }
    },
    file_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    file_path: {
        type: DataTypes.STRING(2048),
        allowNull: false
    },
    file_type: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    file_size: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    uploaded_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    uploaded_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'maintenance_attachments',
    timestamps: false
});

module.exports = MaintenanceAttachments;
