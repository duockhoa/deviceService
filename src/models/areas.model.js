const sequelize = require('../configs/sequelize');
const { DataTypes } = require('sequelize');

const Areas = sequelize.define('areas', {
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
    plant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'plants',
            key: 'id'
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'areas',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['code']
        },
        {
            fields: ['plant_id']
        },
        {
            fields: ['name']
        }
    ]
});

module.exports = {
    Areas
};