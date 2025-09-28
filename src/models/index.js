const { User } = require('./user.model');
const { Departments } = require('./department');
const { AssetCategories } = require('./assetCategories');
const { Assets } = require('./assets.model');

// Define associations
User.belongsTo(Departments, { foreignKey: 'department', targetKey: 'name' });
Departments.hasMany(User, { foreignKey: 'department', sourceKey: 'name' });

// Asset associations
Assets.belongsTo(AssetCategories, { 
    foreignKey: 'category_id', 
    targetKey: 'id',
    as: 'Category'
});
AssetCategories.hasMany(Assets, { 
    foreignKey: 'category_id', 
    sourceKey: 'id',
    as: 'Assets'
});

// Asset - Team association
Assets.belongsTo(Departments, { 
    foreignKey: 'team_id', 
    targetKey: 'name',
    as: 'Department'
});
Departments.hasMany(Assets, { 
    foreignKey: 'team_id', 
    sourceKey: 'name',
    as: 'DepartmentAssets'
});

Assets.belongsTo(User, { 
    foreignKey: 'created_by', 
    targetKey: 'id',
    as: 'Creator'
});
User.hasMany(Assets, { 
    foreignKey: 'created_by', 
    sourceKey: 'id',
    as: 'CreatedAssets'
});

module.exports = {
    User,
    Departments,
    AssetCategories,
    Assets
};