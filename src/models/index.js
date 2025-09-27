const { User } = require('./user.model');
const { Departments } = require('./department');

// Define associations
User.belongsTo(Departments, { foreignKey: 'department', targetKey: 'name' });
Departments.hasMany(User, { foreignKey: 'department', sourceKey: 'name' });


module.exports = {
    User,
    Departments
};