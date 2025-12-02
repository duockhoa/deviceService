const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const UserRole = sequelize.define('user_roles', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'roles',
            key: 'id'
        }
    },
    assigned_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'Người gán quyền'
    }
}, {
    tableName: 'user_roles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { 
            unique: true, 
            fields: ['user_id', 'role_id'] 
        },
        { fields: ['user_id'] },
        { fields: ['role_id'] }
    ]
});

module.exports = { UserRole };
