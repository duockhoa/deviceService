const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const RolePermission = sequelize.define('role_permissions', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'roles',
            key: 'id'
        }
    },
    permission_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'permissions',
            key: 'id'
        }
    }
}, {
    tableName: 'role_permissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { 
            unique: true, 
            fields: ['role_id', 'permission_id'] 
        },
        { fields: ['role_id'] },
        { fields: ['permission_id'] }
    ]
});

module.exports = { RolePermission };
