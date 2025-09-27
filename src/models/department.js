const sequelize = require('../configs/sequelize');
const { DataTypes, Sequelize } = require('sequelize');

const Departments = sequelize.define('teams', {
    name: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },

    team_leader: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
            model: 'users',
            key: 'username'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    }
}, {
    timestamps: false
});

module.exports = {
    Departments
};