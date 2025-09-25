require('dotenv').config(); 
const {Sequelize , DataTypes} = require('sequelize');
const database = 'dkdatabase';
const username = 'root';

// Tạo kết nối không chỉ định database để tạo database
const sequelizeWithoutDB = new Sequelize('', username, process.env.DATABASE_PASSWORD, {
    host: 'localhost',
    dialect: 'mysql',
    logging: false,
});

// Tạo database nếu chưa tồn tại
sequelizeWithoutDB.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`)
    .then(() => {
        console.log(`Database ${database} created or already exists`);
    })
    .catch(err => {
        console.error('Error creating database:', err);
    });

const sequelize = new Sequelize(database, username, process.env.DATABASE_PASSWORD, {
    host: 'localhost',
    dialect: 'mysql',
    logging: false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

sequelize.authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

module.exports = sequelize;