const express = require('express');
const multer = require('multer');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const authMiddleware = require('../middleware/authMiddleware');

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
router.post('/import', upload.single('file'),importPreview);

// Lưu kế hoạch (batch) pending
router.post('/save',saveBatch);

// Danh sách kế hoạch tổng
router.get('/',listBatches);

// Chi tiết batch
router.get('/:id',getBatchDetail);

// Phê duyệt item trong batch
router.post('/:batchId/approve',approveBatchItems);
// Từ chối item trong batch
router.post('/:batchId/reject',rejectBatchItems);
// Xóa batch
router.delete('/:id',deleteBatch);

module.exports = router;
