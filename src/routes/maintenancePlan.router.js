const express = require('express');
const multer = require('multer');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const authMiddleware = require('../middleware/authMiddleware');
const { permissionGuard } = require('../middleware/permissionGuard');

const {
    generateTemplate,
    importPreview,
    saveBatch,
    listBatches,
    getBatchDetail,
    approveBatchItems,
    rejectBatchItems,
    deleteBatch
} = require('../controllers/maintenancePlan.controllers');

// Tải file Excel mẫu (PUBLIC - không cần auth)
router.get('/template', generateTemplate);

// Các route sau cần authentication
router.use(authMiddleware);

// Import và xem trước danh sách kế hoạch
router.post('/import', upload.single('file'), permissionGuard('maintenance_plan.create'), importPreview);

// Lưu kế hoạch (batch) pending
router.post('/save', permissionGuard('maintenance_plan.create'), saveBatch);

// Danh sách kế hoạch tổng
router.get('/', permissionGuard('maintenance_plan.view'), listBatches);

// Chi tiết batch
router.get('/:id', permissionGuard('maintenance_plan.view'), getBatchDetail);

// Phê duyệt item trong batch
router.post('/:batchId/approve', permissionGuard('maintenance_plan.approve'), approveBatchItems);
// Từ chối item trong batch
router.post('/:batchId/reject', permissionGuard('maintenance_plan.approve'), rejectBatchItems);
// Xóa batch
router.delete('/:id', permissionGuard('maintenance_plan.delete'), deleteBatch);

module.exports = router;
