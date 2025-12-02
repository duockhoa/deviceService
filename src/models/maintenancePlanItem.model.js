const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const MaintenancePlanItem = sequelize.define('maintenance_plan_items', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    batch_id: { type: DataTypes.INTEGER, allowNull: false },
    asset_id: { type: DataTypes.INTEGER, allowNull: false },
    maintenance_type: { type: DataTypes.ENUM('cleaning', 'inspection', 'maintenance', 'corrective', 'preventive'), allowNull: false, defaultValue: 'maintenance' },
    priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), allowNull: false, defaultValue: 'medium' },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    scheduled_date: { type: DataTypes.DATE, allowNull: false },
    estimated_duration: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 1 },
    technician_id: { type: DataTypes.INTEGER, allowNull: true },
    location: { type: DataTypes.STRING(255), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    checklist_template_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'ID mẫu checklist (tùy chọn)' },
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending' },
    reject_reason: { type: DataTypes.STRING(255), allowNull: true }
}, {
    tableName: 'maintenance_plan_items'
});

module.exports = { MaintenancePlanItem };
