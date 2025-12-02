const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const Permission = sequelize.define('permissions', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    permission_key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Key phân quyền (assets.view, maintenance.create...)'
    },
    permission_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Tên quyền (Xem thiết bị, Tạo lịch bảo trì...)'
    },
    module: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Module (assets, maintenance, calibration...)'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'permissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['permission_key'] },
        { fields: ['module'] },
        { fields: ['is_active'] }
    ]
});

module.exports = { Permission };
