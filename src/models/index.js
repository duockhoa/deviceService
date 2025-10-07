const { User } = require('./user.model');
const { Departments } = require('./department');
const { AssetCategories } = require('./assetCategories');
const { Assets } = require('./assets.model');
const { Plants } = require('./plants.model');
const { Areas } = require('./areas.model');
const { Positions } = require('./positions.model');

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

// Asset - Position association
Assets.belongsTo(Positions, {
    foreignKey: 'position_id',
    targetKey: 'id',
    as: 'Position'
});
Positions.hasMany(Assets, {
    foreignKey: 'position_id',
    sourceKey: 'id',
    as: 'Assets'
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

// Plants - Areas associations
Areas.belongsTo(Plants, {
    foreignKey: 'plant_id',
    targetKey: 'id',
    as: 'Plant'
});
Plants.hasMany(Areas, {
    foreignKey: 'plant_id',
    sourceKey: 'id',
    as: 'Areas'
});

// Areas - Positions associations
Positions.belongsTo(Areas, {
    foreignKey: 'area_id',
    targetKey: 'id',
    as: 'Area'
});
Areas.hasMany(Positions, {
    foreignKey: 'area_id',
    sourceKey: 'id',
    as: 'Positions'
});

module.exports = {
    User,
    Departments,
    AssetCategories,
    Assets,
    Plants,
    Areas,
    Positions
};