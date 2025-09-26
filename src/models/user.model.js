const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../configs/sequelize'); // Assuming you have a sequelize instance configured
const User = sequelize.define('users', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    employee_code: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true // Chỉ một unique constraint
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    department: { // Đổi tên trường này
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'teams', // Assuming you have a 'teams' table
            key: 'name'
        }
    },
    position: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true // Chỉ một unique constraint
    },
    avatar: {
        type: DataTypes.STRING,
        allowNull: true},

    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    sex: {
        type: DataTypes.STRING,
        allowNull: true
    } ,
    createAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updateAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
} , {
        tableName: 'users',
        timestamps: false,
        indexes: [
            {
                unique: true,
                fields: ['email']
            },
            {
                unique: true,
                fields: ['employee_code']
            }
        ]
    }
    )

module.exports = {
    User
};
