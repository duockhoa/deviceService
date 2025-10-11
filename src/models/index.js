const { User } = require('./user.model');
const { Departments } = require('./department');
const { AssetCategories } = require('./assetCategories');
const { Assets } = require('./assets.model');
const { Plants } = require('./plants.model');
const { Areas } = require('./areas.model');
const { AssetAttachment } = require('./assetAttachment.model');
const { AssetGeneralInfo } = require('./assetGeneralInfo.model');
const { AssetComponent } = require('./assetComponent.model'); // Thêm import

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

// Asset - Area association
Assets.belongsTo(Areas, {
    foreignKey: 'area_id',
    targetKey: 'id',
    as: 'Area'
});
Areas.hasMany(Assets, {
    foreignKey: 'area_id',
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

// Asset - AssetGeneralInfo associations (One-to-One relationship)
Assets.hasOne(AssetGeneralInfo, {
    foreignKey: 'asset_id',
    sourceKey: 'id',
    as: 'GeneralInfo',
    onDelete: 'CASCADE'
});
AssetGeneralInfo.belongsTo(Assets, {
    foreignKey: 'asset_id',
    targetKey: 'id',
    as: 'Asset'
});

// Asset - AssetComponent associations (One-to-Many relationship)
Assets.hasMany(AssetComponent, {
    foreignKey: 'asset_id',
    sourceKey: 'id',
    as: 'Components',
    onDelete: 'CASCADE'
});
AssetComponent.belongsTo(Assets, {
    foreignKey: 'asset_id',
    targetKey: 'id',
    as: 'Asset'
});

// Asset - AssetAttachment associations
Assets.hasMany(AssetAttachment, {
    foreignKey: 'asset_id',
    sourceKey: 'id',
    as: 'Attachments',
    onDelete: 'CASCADE'
});
AssetAttachment.belongsTo(Assets, {
    foreignKey: 'asset_id',
    targetKey: 'id',
    as: 'Asset'
});

// AssetAttachment - User association (uploaded_by)
AssetAttachment.belongsTo(User, {
    foreignKey: 'uploaded_by',
    targetKey: 'id',
    as: 'Uploader'
});
User.hasMany(AssetAttachment, {
    foreignKey: 'uploaded_by',
    sourceKey: 'id',
    as: 'UploadedAttachments'
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

module.exports = {
    User,
    Departments,
    AssetCategories,
    Assets,
    Plants,
    Areas,
    AssetAttachment,
    AssetGeneralInfo,
    AssetComponent // Thêm export
};