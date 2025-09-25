const sequelize = require('../configs/sequelize');
const {DataTypes, Sequelize} = require('sequelize');

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
    team_leader: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
}, {
    timestamps: false
});

module.exports = {
    Departments
};
// This code defines a Sequelize model for the Departments table with a team_leader foreign key referencing the users table