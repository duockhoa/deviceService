const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    getAllTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    seedDefaultTemplates
} = require('../controllers/maintenanceChecklistTemplate.controllers');

// Tất cả routes đều cần authentication
router.use(authMiddleware);

// GET /api/v1/checklist-templates - Lấy danh sách mẫu
router.get('/',getAllTemplates);

// POST /api/v1/checklist-templates/seed - Tạo 4 mẫu mặc định (đặt trước /:id)
router.post('/seed',seedDefaultTemplates);

// GET /api/v1/checklist-templates/:id - Lấy chi tiết
router.get('/:id',getTemplateById);

// POST /api/v1/checklist-templates - Tạo mới
router.post('/',createTemplate);

// PUT /api/v1/checklist-templates/:id - Cập nhật
router.put('/:id',updateTemplate);

// DELETE /api/v1/checklist-templates/:id - Xóa
router.delete('/:id',deleteTemplate);

module.exports = router;
