const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Import routers
const plantsRouter = require('./plants.router');
const areasRouter = require('./areas.router');
const assetsRouter = require('./assets.router');
const assetCategoriesRouter = require('./assetCategories.router');
const departmentsRouter = require('./departments.router');
const assetSubCategoriesRouter = require('./assetSubCategories.router');
const specificationCategoriesRouter = require('./specificationCategories.routes');
const consumableCategoriesRouter = require('./consumableCategories.routes');
const maintenanceRouter = require('./maintenance.router');
const maintenanceWorkRouter = require('./maintenanceWork.router');
const calibrationRouter = require('./calibration.router');
const incidentsRouter = require('./incidents.router');
const workRequestsRouter = require('./workRequests.router');
const maintenancePlanRouter = require('./maintenancePlan.router');
const notificationRouter = require('./notification.router');
const schedulerRouter = require('./scheduler.router');
const handoversRouter = require('./handovers.router');
const checklistTemplateRouter = require('./maintenanceChecklistTemplate.router');
const rbacRouter = require('./rbac.router');
const { seedRBAC } = require('../controllers/rbac.controllers');

// ==================== PUBLIC ROUTES (NO AUTH) ====================
// Đặt TRƯỚC authMiddleware

// RBAC Seed - Tạo roles và permissions ban đầu
router.post('/rbac/seed', seedRBAC);

// Public routes (không cần auth) - PHẢI ĐẶT TRƯỚC authMiddleware
router.use('/maintenance-plan', maintenancePlanRouter);  // Kế hoạch bảo trì/import Excel (có route /template public)

// ==================== PROTECTED ROUTES (REQUIRE AUTH) ====================
// Use asset sub-categories router
router.use(authMiddleware);
router.use('/consumable-categories', consumableCategoriesRouter);
router.use('/specification-categories', specificationCategoriesRouter);
router.use('/asset-sub-categories', assetSubCategoriesRouter);
router.use('/departments', departmentsRouter);
router.use('/plants', plantsRouter);
router.use('/areas', areasRouter);
router.use('/asset-categories', assetCategoriesRouter);
router.use('/incidents', incidentsRouter);  // Quản lý sự cố
router.use('/maintenance', maintenanceRouter);  // ✅ Bảo vệ bằng authMiddleware
router.use('/maintenance-work', maintenanceWorkRouter);  // ✅ Work orders cho kỹ thuật viên
router.use('/calibration', calibrationRouter);  // ✅ Bảo vệ bằng authMiddleware
router.use('/work-requests', workRequestsRouter); // Yêu cầu xử lý
router.use('/notifications', notificationRouter); // Hệ thống thông báo
router.use('/handovers', handoversRouter); // Bàn giao thiết bị
router.use('/checklist-templates', checklistTemplateRouter); // Mẫu checklist
router.use('/rbac', rbacRouter); // Phân quyền
router.use('/scheduler', schedulerRouter); // Scheduled jobs testing & status
router.use('/assets', assetsRouter);


module.exports = router;
