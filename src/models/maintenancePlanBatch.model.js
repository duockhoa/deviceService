const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const MaintenancePlanBatch = sequelize.define('maintenance_plan_batches', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('pending', 'approved', 'partial', 'rejected'), allowNull: false, defaultValue: 'pending' },
    created_by: { type: DataTypes.INTEGER, allowNull: false },
    approved_by: { type: DataTypes.INTEGER, allowNull: true },
    approved_at: { type: DataTypes.DATE, allowNull: true }
}, {
    tableName: 'maintenance_plan_batches'
});

module.exports = { MaintenancePlanBatch };
