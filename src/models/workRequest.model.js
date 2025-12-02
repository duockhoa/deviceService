const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const WorkRequest = sequelize.define('work_requests', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    request_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    asset_id: { type: DataTypes.INTEGER, allowNull: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    type: { type: DataTypes.ENUM('support', 'inspection', 'cleaning', 'repair_request', 'other'), allowNull: false, defaultValue: 'support' },
    priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), allowNull: false, defaultValue: 'medium' },
    status: { type: DataTypes.ENUM('new', 'pending', 'assigned', 'in_progress', 'awaiting_confirm', 'closed', 'cancelled'), allowNull: false, defaultValue: 'pending' },
    requester_id: { type: DataTypes.INTEGER, allowNull: false },
    technician_id: { type: DataTypes.INTEGER, allowNull: true },
    due_date: { type: DataTypes.DATE, allowNull: true },
    location: { type: DataTypes.STRING(255), allowNull: true },
    images: { type: DataTypes.JSON, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    incident_id: { type: DataTypes.INTEGER, allowNull: true },
    maintenance_id: { type: DataTypes.INTEGER, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: false }
}, {
    tableName: 'work_requests'
});

module.exports = { WorkRequest };
