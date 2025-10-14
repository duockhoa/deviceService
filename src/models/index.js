const { User } = require('./user.model');
const { Departments } = require('./department');
const { AssetCategories } = require('./assetCategories');
const { Assets } = require('./assets.model');
const { Plants } = require('./plants.model');
const { Areas } = require('./areas.model');
const { AssetAttachment } = require('./assetAttachment.model');
const { AssetGeneralInfo } = require('./assetGeneralInfo.model');
const { AssetComponent } = require('./assetComponent.model');
const { AssetSubCategories } = require('./assetSubCategories.model');
const { SpecificationCategories } = require('./specificationCategories.model');
const { AssetSpecifications } = require('./assetSpecifications.model');
const { ConsumableCategories } = require('./consumableCategories.model');

// ================== EXISTING ASSOCIATIONS ==================
// Define associations
User.belongsTo(Departments, { foreignKey: 'department', targetKey: 'name' });
Departments.hasMany(User, { foreignKey: 'department', sourceKey: 'name' });



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

// Asset Categories - Sub Categories relationships
AssetCategories.hasMany(AssetSubCategories, {
    foreignKey: 'category_id',
    sourceKey: 'id',
    as: 'SubCategories',
    onDelete: 'CASCADE'
});
AssetSubCategories.belongsTo(AssetCategories, {
    foreignKey: 'category_id',
    targetKey: 'id',
    as: 'Category'
});

// Assets - Sub Categories relationships (quan hệ chính)
Assets.belongsTo(AssetSubCategories, {
    foreignKey: 'sub_category_id',
    targetKey: 'id',
    as: 'SubCategory'
});
AssetSubCategories.hasMany(Assets, {
    foreignKey: 'sub_category_id',
    sourceKey: 'id',
    as: 'Assets'
});

// ================== SPECIFICATIONS ASSOCIATIONS ==================

// 1. AssetSubCategories - SpecificationCategories (One-to-Many)
AssetSubCategories.hasMany(SpecificationCategories, {
    foreignKey: 'sub_category_id',
    sourceKey: 'id',
    as: 'SpecificationCategories',
    onDelete: 'CASCADE'
});
SpecificationCategories.belongsTo(AssetSubCategories, {
    foreignKey: 'sub_category_id',
    targetKey: 'id',
    as: 'SubCategory'
});

// 2. Assets - AssetSpecifications (One-to-Many)
Assets.hasMany(AssetSpecifications, {
    foreignKey: 'asset_id',
    sourceKey: 'id',
    as: 'Specifications',
    onDelete: 'CASCADE'
});
AssetSpecifications.belongsTo(Assets, {
    foreignKey: 'asset_id',
    targetKey: 'id',
    as: 'Asset'
});

// 3. SpecificationCategories - AssetSpecifications (One-to-Many)
SpecificationCategories.hasMany(AssetSpecifications, {
    foreignKey: 'spec_category_id',
    sourceKey: 'id',
    as: 'AssetSpecifications',
    onDelete: 'CASCADE'
});
AssetSpecifications.belongsTo(SpecificationCategories, {
    foreignKey: 'spec_category_id',
    targetKey: 'id',
    as: 'SpecCategory'
});

// 4. User - SpecificationCategories associations (created_by, updated_by)
User.hasMany(SpecificationCategories, {
    foreignKey: 'created_by',
    sourceKey: 'id',
    as: 'CreatedSpecCategories'
});
SpecificationCategories.belongsTo(User, {
    foreignKey: 'created_by',
    targetKey: 'id',
    as: 'Creator'
});

User.hasMany(SpecificationCategories, {
    foreignKey: 'updated_by',
    sourceKey: 'id',
    as: 'UpdatedSpecCategories'
});
SpecificationCategories.belongsTo(User, {
    foreignKey: 'updated_by',
    targetKey: 'id',
    as: 'Updater'
});

// 5. User - AssetSpecifications associations (created_by, updated_by, verified_by)
User.hasMany(AssetSpecifications, {
    foreignKey: 'created_by',
    sourceKey: 'id',
    as: 'CreatedSpecifications'
});
AssetSpecifications.belongsTo(User, {
    foreignKey: 'created_by',
    targetKey: 'id',
    as: 'Creator'
});

User.hasMany(AssetSpecifications, {
    foreignKey: 'updated_by',
    sourceKey: 'id',
    as: 'UpdatedSpecifications'
});
AssetSpecifications.belongsTo(User, {
    foreignKey: 'updated_by',
    targetKey: 'id',
    as: 'Updater'
});

User.hasMany(AssetSpecifications, {
    foreignKey: 'verified_by',
    sourceKey: 'id',
    as: 'VerifiedSpecifications'
});
AssetSpecifications.belongsTo(User, {
    foreignKey: 'verified_by',
    targetKey: 'id',
    as: 'Verifier'
});

// ================== CONSUMABLE CATEGORIES ASSOCIATIONS ==================

// 1. User - ConsumableCategories associations (created_by, updated_by)
User.hasMany(ConsumableCategories, {
    foreignKey: 'created_by',
    sourceKey: 'id',
    as: 'CreatedConsumableCategories'
});
ConsumableCategories.belongsTo(User, {
    foreignKey: 'created_by',
    targetKey: 'id',
    as: 'Creator'
});

User.hasMany(ConsumableCategories, {
    foreignKey: 'updated_by',
    sourceKey: 'id',
    as: 'UpdatedConsumableCategories'
});
ConsumableCategories.belongsTo(User, {
    foreignKey: 'updated_by',
    targetKey: 'id',
    as: 'Updater'
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
    AssetComponent,
    AssetSubCategories,
    SpecificationCategories,
    AssetSpecifications,
    ConsumableCategories
};