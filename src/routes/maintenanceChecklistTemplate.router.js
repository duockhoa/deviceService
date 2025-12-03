const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { permissionGuard } = require('../middleware/permissionGuard');
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
router.get('/', permissionGuard('checklist.view'), getAllTemplates);

// POST /api/v1/checklist-templates/seed - Tạo 4 mẫu mặc định (đặt trước /:id)
router.post('/seed', permissionGuard('checklist.manage'), seedDefaultTemplates);

// GET /api/v1/checklist-templates/:id - Lấy chi tiết
router.get('/:id', permissionGuard('checklist.view'), getTemplateById);

// POST /api/v1/checklist-templates - Tạo mới
router.post('/', permissionGuard('checklist.manage'), createTemplate);

// PUT /api/v1/checklist-templates/:id - Cập nhật
router.put('/:id', permissionGuard('checklist.manage'), updateTemplate);

// DELETE /api/v1/checklist-templates/:id - Xóa
router.delete('/:id', permissionGuard('checklist.manage'), deleteTemplate);

module.exports = router;
