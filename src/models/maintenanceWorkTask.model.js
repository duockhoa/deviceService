const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const MaintenanceWorkTask = sequelize.define('maintenance_work_task', {
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
    task_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    task_type: {
            type: DataTypes.ENUM('cleaning', 'inspection', 'maintenance', 'custom'),
            defaultValue: 'custom'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        assigned_to: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        },
        estimated_hours: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        actual_hours: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
            defaultValue: 'pending'
        },
        priority: {
            type: DataTypes.ENUM('low', 'medium', 'high'),
            defaultValue: 'medium'
        },
        work_report: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        issues_found: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        materials_used: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        completed_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        completed_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        started_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        image_before: {
            type: DataTypes.STRING(500),
            allowNull: true
        },
        image_after: {
            type: DataTypes.STRING(500),
            allowNull: true
        },
    order_index: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: 'maintenance_work_tasks',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = { MaintenanceWorkTask };
