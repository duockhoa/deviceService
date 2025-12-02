const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const WorkRequestProgress = sequelize.define('work_request_progress', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    work_request_id: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.ENUM('new', 'pending', 'assigned', 'in_progress', 'awaiting_confirm', 'closed', 'cancelled'), allowNull: false, defaultValue: 'pending' },
    note: { type: DataTypes.TEXT, allowNull: true },
    images: { type: DataTypes.JSON, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: { allowNull: false, type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
    tableName: 'work_request_progress',
    updatedAt: false
});

module.exports = { WorkRequestProgress };
