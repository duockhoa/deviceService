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
const { MaintenanceConsumables } = require('./maintenanceConsumables.model');
const { AssetConsumables } = require('./assetConsumables.model');

// Import Maintenance after Assets
const { Maintenance } = require('./maintenance.model');
const { MaintenanceChecklist } = require('./maintenanceChecklist.model');
const { MaintenanceWorkTask } = require('./maintenanceWorkTask.model');
const { MaintenanceProgress } = require('./maintenanceProgress.model');
const { MaintenanceImages } = require('./maintenanceImages.model');
const MaintenanceAttachments = require('./maintenanceAttachments.model');
const { MaintenancePlan } = require('./maintenancePlan.model');
const { MaintenancePlanBatch } = require('./maintenancePlanBatch.model');
const { MaintenancePlanItem } = require('./maintenancePlanItem.model');
const { WorkRequest } = require('./workRequest.model');
const { WorkRequestProgress } = require('./workRequestProgress.model');

// Import Calibration
const { Calibration } = require('./calibration.model');
const { AuditLog } = require('./auditLog.model');

// Import Handover models
const Handover = require('./handover.model');
const HandoverFollowUp = require('./handoverFollowUp.model');
const Incidents = require('./incidents.model');

// Import Notification
const { Notification } = require('./notification.model');

// Import Checklist Template models
const { MaintenanceChecklistTemplate } = require('./maintenanceChecklistTemplate.model');
const { MaintenanceChecklistTemplateItem } = require('./maintenanceChecklistTemplateItem.model');

// Import RBAC models
const { Role } = require('./role.model');
const { Permission } = require('./permission.model');
const { RolePermission } = require('./rolePermission.model');
const { UserRole } = require('./userRole.model');

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

// MaintenancePlan associations
MaintenancePlan.belongsTo(Assets, { foreignKey: 'asset_id', as: 'asset' });
Assets.hasMany(MaintenancePlan, { foreignKey: 'asset_id', as: 'maintenancePlans' });
MaintenancePlan.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(MaintenancePlan, { foreignKey: 'created_by', as: 'createdMaintenancePlans' });
MaintenancePlan.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });
User.hasMany(MaintenancePlan, { foreignKey: 'approved_by', as: 'approvedMaintenancePlans' });

// Plan batch & items associations
MaintenancePlanBatch.belongsTo(User, { foreignKey: 'created_by', as: 'batchCreator' });
MaintenancePlanBatch.belongsTo(User, { foreignKey: 'approved_by', as: 'batchApprover' });
MaintenancePlanBatch.hasMany(MaintenancePlanItem, { foreignKey: 'batch_id', as: 'items' });
MaintenancePlanItem.belongsTo(MaintenancePlanBatch, { foreignKey: 'batch_id', as: 'batch' });
MaintenancePlanItem.belongsTo(Assets, { foreignKey: 'asset_id', as: 'asset' });
Assets.hasMany(MaintenancePlanItem, { foreignKey: 'asset_id', as: 'planItems' });

// Work requests associations
WorkRequest.belongsTo(Assets, { foreignKey: 'asset_id', as: 'asset' });
Assets.hasMany(WorkRequest, { foreignKey: 'asset_id', as: 'workRequests' });
WorkRequest.belongsTo(User, { foreignKey: 'requester_id', as: 'requester' });
WorkRequest.belongsTo(User, { foreignKey: 'technician_id', as: 'technician' });
WorkRequest.hasMany(WorkRequestProgress, { foreignKey: 'work_request_id', as: 'progress' });
WorkRequestProgress.belongsTo(WorkRequest, { foreignKey: 'work_request_id', as: 'workRequest' });
WorkRequestProgress.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

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

// ================== MAINTENANCE ASSOCIATIONS ==================
// TEMPORARILY DISABLED - Associations causing server startup issues
// Will re-enable after fixing dependency issues
/*
Maintenance.belongsTo(Assets, {
    foreignKey: 'asset_id',
    targetKey: 'id',
    as: 'asset'
});
Assets.hasMany(Maintenance, {
    foreignKey: 'asset_id',
    sourceKey: 'id',
    as: 'maintenance_records'
});

// Maintenance - User associations (technician)
Maintenance.belongsTo(User, {
    foreignKey: 'technician_id',
    targetKey: 'id',
    as: 'technician'
});
User.hasMany(Maintenance, {
    foreignKey: 'technician_id',
    sourceKey: 'id',
    as: 'maintenance_tasks'
});

// Maintenance - User associations (created_by)
Maintenance.belongsTo(User, {
    foreignKey: 'created_by',
    targetKey: 'id',
    as: 'creator'
});
User.hasMany(Maintenance, {
    foreignKey: 'created_by',
    sourceKey: 'id',
    as: 'created_maintenance'
});
*/

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

// Assets - AssetConsumables (One-to-Many)
Assets.hasMany(AssetConsumables, {
    foreignKey: 'asset_id',
    sourceKey: 'id',
    as: 'Consumables',
    onDelete: 'CASCADE'
});
AssetConsumables.belongsTo(Assets, {
    foreignKey: 'asset_id',
    targetKey: 'id',
    as: 'Asset'
});

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

// ================== SINGLE MODULE.EXPORTS ==================
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
    ConsumableCategories,
    MaintenanceConsumables,
    AssetConsumables,
    Maintenance,
    MaintenanceChecklist,
    MaintenanceWorkTask,
    MaintenanceProgress,
    MaintenanceImages,
    MaintenanceAttachments,
    MaintenancePlan,
    MaintenancePlanBatch,
    MaintenancePlanItem,
    WorkRequest,
    WorkRequestProgress,
    Calibration,
    AuditLog,
    Incidents,
    Notification,
    Handover,
    HandoverFollowUp,
    MaintenanceChecklistTemplate,
    MaintenanceChecklistTemplateItem,
    Role,
    Permission,
    RolePermission,
    UserRole
};

// ================== MAINTENANCE ASSOCIATIONS ==================
// Define associations after all models are loaded to avoid circular dependencies
Maintenance.belongsTo(Assets, {
    foreignKey: 'asset_id',
    targetKey: 'id',
    as: 'asset'
});
Assets.hasMany(Maintenance, {
    foreignKey: 'asset_id',
    sourceKey: 'id',
    as: 'maintenance_records'
});

// Maintenance - User associations (technician)
Maintenance.belongsTo(User, {
    foreignKey: 'technician_id',
    targetKey: 'id',
    as: 'technician'
});
User.hasMany(Maintenance, {
    foreignKey: 'technician_id',
    sourceKey: 'id',
    as: 'maintenance_tasks'
});

// Maintenance - User associations (created_by)
Maintenance.belongsTo(User, {
    foreignKey: 'created_by',
    targetKey: 'id',
    as: 'creator'
});
User.hasMany(Maintenance, {
    foreignKey: 'created_by',
    sourceKey: 'id',
    as: 'created_maintenance'
});

// Maintenance - MaintenanceChecklist associations
Maintenance.hasMany(MaintenanceChecklist, {
    foreignKey: 'maintenance_id',
    sourceKey: 'id',
    as: 'checklists',
    onDelete: 'CASCADE'
});
MaintenanceChecklist.belongsTo(Maintenance, {
    foreignKey: 'maintenance_id',
    targetKey: 'id',
    as: 'maintenance'
});

// Maintenance - MaintenanceWorkTask associations
Maintenance.hasMany(MaintenanceWorkTask, {
    foreignKey: 'maintenance_id',
    sourceKey: 'id',
    as: 'workTasks',
    onDelete: 'CASCADE'
});
MaintenanceWorkTask.belongsTo(Maintenance, {
    foreignKey: 'maintenance_id',
    targetKey: 'id',
    as: 'maintenance'
});

// Maintenance - MaintenanceProgress associations
Maintenance.hasMany(MaintenanceProgress, {
    foreignKey: 'maintenance_id',
    sourceKey: 'id',
    as: 'progress_updates',
    onDelete: 'CASCADE'
});
MaintenanceProgress.belongsTo(Maintenance, {
    foreignKey: 'maintenance_id',
    targetKey: 'id',
    as: 'maintenance'
});

// Maintenance - MaintenanceImages associations
Maintenance.hasMany(MaintenanceImages, {
    foreignKey: 'maintenance_id',
    sourceKey: 'id',
    as: 'images',
    onDelete: 'CASCADE'
});
MaintenanceImages.belongsTo(Maintenance, {
    foreignKey: 'maintenance_id',
    targetKey: 'id',
    as: 'maintenance'
});

// User - MaintenanceProgress associations
User.hasMany(MaintenanceProgress, {
    foreignKey: 'updated_by',
    sourceKey: 'id',
    as: 'progress_updates'
});
MaintenanceProgress.belongsTo(User, {
    foreignKey: 'updated_by',
    targetKey: 'id',
    as: 'updater'
});

// User - MaintenanceImages associations
User.hasMany(MaintenanceImages, {
    foreignKey: 'uploaded_by',
    sourceKey: 'id',
    as: 'uploaded_images'
});
MaintenanceImages.belongsTo(User, {
    foreignKey: 'uploaded_by',
    targetKey: 'id',
    as: 'uploader'
});

// User - MaintenanceChecklist associations
User.hasMany(MaintenanceChecklist, {
    foreignKey: 'completed_by',
    sourceKey: 'id',
    as: 'completed_tasks'
});
MaintenanceChecklist.belongsTo(User, {
    foreignKey: 'completed_by',
    targetKey: 'id',
    as: 'completer'
});

// ================== CALIBRATION ASSOCIATIONS ==================
// Define associations after all models are loaded to avoid circular dependencies
Calibration.belongsTo(Assets, {
    foreignKey: 'asset_id',
    targetKey: 'id',
    as: 'asset'
});
Assets.hasMany(Calibration, {
    foreignKey: 'asset_id',
    sourceKey: 'id',
    as: 'calibration_records'
});

// Calibration - User associations (technician)
Calibration.belongsTo(User, {
    foreignKey: 'technician_id',
    targetKey: 'id',
    as: 'technician'
});
User.hasMany(Calibration, {
    foreignKey: 'technician_id',
    sourceKey: 'id',
    as: 'calibration_tasks'
});

// Calibration - User associations (created_by)
Calibration.belongsTo(User, {
    foreignKey: 'created_by',
    targetKey: 'id',
    as: 'creator'
});
User.hasMany(Calibration, {
    foreignKey: 'created_by',
    sourceKey: 'id',
    as: 'created_calibrations'
});

// ================== MAINTENANCE CONSUMABLES ASSOCIATIONS ==================
// MaintenanceConsumables - Maintenance associations
MaintenanceConsumables.belongsTo(Maintenance, {
    foreignKey: 'maintenance_id',
    targetKey: 'id',
    as: 'maintenance'
});
Maintenance.hasMany(MaintenanceConsumables, {
    foreignKey: 'maintenance_id',
    sourceKey: 'id',
    as: 'maintenanceConsumables'
});

// MaintenanceConsumables - ConsumableCategories associations
MaintenanceConsumables.belongsTo(ConsumableCategories, {
    foreignKey: 'consumable_category_id',
    targetKey: 'id',
    as: 'consumableCategory'
});
ConsumableCategories.hasMany(MaintenanceConsumables, {
    foreignKey: 'consumable_category_id',
    sourceKey: 'id',
    as: 'maintenance_usage'
});

// MaintenanceConsumables - AssetConsumables associations
MaintenanceConsumables.belongsTo(AssetConsumables, {
    foreignKey: 'asset_consumable_id',
    targetKey: 'id',
    as: 'assetConsumable'
});
AssetConsumables.hasMany(MaintenanceConsumables, {
    foreignKey: 'asset_consumable_id',
    sourceKey: 'id',
    as: 'maintenanceUsage'
});

// ================== INCIDENTS ASSOCIATIONS ==================
Incidents.belongsTo(Assets, {
    foreignKey: 'asset_id',
    targetKey: 'id',
    as: 'asset'
});
Assets.hasMany(Incidents, {
    foreignKey: 'asset_id',
    sourceKey: 'id',
    as: 'incidents'
});

Incidents.belongsTo(User, {
    foreignKey: 'reported_by',
    targetKey: 'id',
    as: 'reporter'
});
User.hasMany(Incidents, {
    foreignKey: 'reported_by',
    sourceKey: 'id',
    as: 'reported_incidents'
});

Incidents.belongsTo(User, {
    foreignKey: 'assigned_to',
    targetKey: 'id',
    as: 'assignee'
});
User.hasMany(Incidents, {
    foreignKey: 'assigned_to',
    sourceKey: 'id',
    as: 'assigned_incidents'
});

// ================== MAINTENANCE ATTACHMENTS ASSOCIATIONS ==================
// MaintenanceAttachments - Maintenance associations
MaintenanceAttachments.belongsTo(Maintenance, {
    foreignKey: 'maintenance_id',
    targetKey: 'id',
    as: 'maintenance'
});
Maintenance.hasMany(MaintenanceAttachments, {
    foreignKey: 'maintenance_id',
    sourceKey: 'id',
    as: 'attachments'
});

// MaintenanceAttachments - User associations (uploaded_by)
MaintenanceAttachments.belongsTo(User, {
    foreignKey: 'uploaded_by',
    targetKey: 'id',
    as: 'uploader'
});
User.hasMany(MaintenanceAttachments, {
    foreignKey: 'uploaded_by',
    sourceKey: 'id',
    as: 'uploaded_attachments'
});

// ================== NOTIFICATION ASSOCIATIONS ==================
// Notification - User associations (sender)
Notification.belongsTo(User, {
    foreignKey: 'sender_id',
    targetKey: 'id',
    as: 'sender'
});
User.hasMany(Notification, {
    foreignKey: 'sender_id',
    sourceKey: 'id',
    as: 'sent_notifications'
});

// ================== HANDOVER ASSOCIATIONS ==================
// Handover - Asset
Handover.belongsTo(Assets, {
    foreignKey: 'asset_id',
    targetKey: 'id',
    as: 'asset'
});

// Handover - User (creator)
Handover.belongsTo(User, {
    foreignKey: 'created_by',
    targetKey: 'id',
    as: 'creator'
});

// Handover - User (accepted_by)
Handover.belongsTo(User, {
    foreignKey: 'accepted_by',
    targetKey: 'id',
    as: 'acceptedBy'
});

// Handover - HandoverFollowUp
Handover.hasMany(HandoverFollowUp, {
    foreignKey: 'handover_id',
    sourceKey: 'id',
    as: 'followUps'
});
HandoverFollowUp.belongsTo(Handover, {
    foreignKey: 'handover_id',
    targetKey: 'id',
    as: 'handover'
});

// HandoverFollowUp - User (creator)
HandoverFollowUp.belongsTo(User, {
    foreignKey: 'created_by',
    targetKey: 'id',
    as: 'creator'
});

// ================== MAINTENANCE CHECKLIST TEMPLATE ASSOCIATIONS ==================
// MaintenanceChecklistTemplate - User (creator)
MaintenanceChecklistTemplate.belongsTo(User, {
    foreignKey: 'created_by',
    targetKey: 'id',
    as: 'creator'
});
User.hasMany(MaintenanceChecklistTemplate, {
    foreignKey: 'created_by',
    sourceKey: 'id',
    as: 'created_checklist_templates'
});

// MaintenanceChecklistTemplate - MaintenanceChecklistTemplateItem
MaintenanceChecklistTemplate.hasMany(MaintenanceChecklistTemplateItem, {
    foreignKey: 'template_id',
    sourceKey: 'id',
    as: 'items',
    onDelete: 'CASCADE'
});
MaintenanceChecklistTemplateItem.belongsTo(MaintenanceChecklistTemplate, {
    foreignKey: 'template_id',
    targetKey: 'id',
    as: 'template'
});

// ================== RBAC ASSOCIATIONS ==================
// Role - User (creator)
Role.belongsTo(User, {
    foreignKey: 'created_by',
    targetKey: 'id',
    as: 'creator'
});
User.hasMany(Role, {
    foreignKey: 'created_by',
    sourceKey: 'id',
    as: 'created_roles'
});

// Role - Permission (Many-to-Many through RolePermission)
Role.belongsToMany(Permission, {
    through: RolePermission,
    foreignKey: 'role_id',
    otherKey: 'permission_id',
    as: 'permissions'
});
Permission.belongsToMany(Role, {
    through: RolePermission,
    foreignKey: 'permission_id',
    otherKey: 'role_id',
    as: 'roles'
});

// User - Role (Many-to-Many through UserRole)
User.belongsToMany(Role, {
    through: UserRole,
    foreignKey: 'user_id',
    otherKey: 'role_id',
    as: 'roles'
});
Role.belongsToMany(User, {
    through: UserRole,
    foreignKey: 'role_id',
    otherKey: 'user_id',
    as: 'users'
});

// UserRole - User (assigned_by)
UserRole.belongsTo(User, {
    foreignKey: 'assigned_by',
    targetKey: 'id',
    as: 'assigner'
});
