const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const Positions = sequelize.define('positions', {
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
    area_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'areas',
            key: 'id'
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'positions',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['code']
        },
        {
            fields: ['area_id']
        },
        {
            fields: ['name']
        }
    ]
});

module.exports = {
    Positions
};