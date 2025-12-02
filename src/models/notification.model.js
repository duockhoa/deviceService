const { DataTypes } = require('sequelize');
const sequelize = require('../configs/sequelize');

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM(
            'maintenance_created',
            'maintenance_assigned',
            'maintenance_started',
            'maintenance_completed',
            'maintenance_approved',
            'maintenance_rejected',
            'maintenance_due_soon',
            'maintenance_overdue',
            'calibration_created',
            'calibration_completed',
            'calibration_due_soon',
            'work_request_created',
            'work_request_assigned',
            'work_request_updated',
            'work_request_completed',
            'incident_created',
            'incident_assigned',
            'incident_updated',
            'incident_resolved',
            'asset_status_changed',
            'asset_warranty_expiring',
            'plan_created',
            'plan_approved',
            'plan_rejected',
            'plan_due_soon'
        ),
        allowNull: false
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    reference_type: {
        type: DataTypes.ENUM('maintenance', 'calibration', 'work_request', 'incident', 'asset', 'plan'),
        allowNull: false
    },
    reference_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    recipient_type: {
        type: DataTypes.ENUM('user', 'department'),
        allowNull: false
    },
    recipient_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'user_id hoặc department_name'
    },
    sender_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    sender_type: {
        type: DataTypes.ENUM('system', 'user'),
        defaultValue: 'system'
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    read_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'JSON data: {asset_code, maintenance_code, etc.}'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Thông báo có thể tự động hết hạn'
    }
}, {
    tableName: 'notifications',
    timestamps: false,
    indexes: [
        {
            name: 'idx_recipient',
            fields: ['recipient_type', 'recipient_id']
        },
        {
            name: 'idx_reference',
            fields: ['reference_type', 'reference_id']
        },
        {
            name: 'idx_created_at',
            fields: ['created_at']
        },
        {
            name: 'idx_is_read',
            fields: ['is_read']
        }
    ]
});

module.exports = { Notification };
