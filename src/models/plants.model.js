const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const Plants = sequelize.define('plants', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'plants',
    timestamps: false, // Sử dụng created_at tự định nghĩa
    indexes: [
        {
            unique: true,
            fields: ['code']
        },
        {
            fields: ['name']
        }
    ]
});

module.exports = {
    Plants
};