const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const Role = sequelize.define('roles', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    role_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Tên vai trò (Admin, Manager, Technician, Viewer...)'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mô tả vai trò'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Trạng thái kích hoạt'
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'roles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['role_name'] },
        { fields: ['is_active'] }
    ]
});

module.exports = { Role };
