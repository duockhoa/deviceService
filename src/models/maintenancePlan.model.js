const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const MaintenancePlan = sequelize.define('maintenance_plans', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    asset_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    maintenance_type: {
        type: DataTypes.ENUM('cleaning', 'inspection', 'maintenance', 'corrective', 'preventive'),
        allowNull: false,
        defaultValue: 'maintenance'
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium'
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    scheduled_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    estimated_duration: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 1
    },
    technician_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    location: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    safety_requirements: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    tools_required: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    measuring_tools: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    safety_tools: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    approved_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'maintenance_plans'
});

module.exports = { MaintenancePlan };
