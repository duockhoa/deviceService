const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { permissionGuard } = require('../middleware/permissionGuard');
const {
    getAllConsumableCategories,
    getConsumableCategoryById,
    createConsumableCategory,
    updateConsumableCategory,
    deleteConsumableCategory
} = require('../controllers/consumableCategories.controllers');

router.use(authMiddleware);

// GET /api/consumable-categories - Lấy tất cả danh mục
router.get('/', permissionGuard('categories.view'), getAllConsumableCategories);

// GET /api/consumable-categories/:id - Lấy danh mục theo ID
router.get('/:id', permissionGuard('categories.view'), getConsumableCategoryById);

// POST /api/consumable-categories - Tạo danh mục mới
router.post('/', permissionGuard('categories.manage'), createConsumableCategory);

// PUT /api/consumable-categories/:id - Cập nhật danh mục
router.put('/:id', permissionGuard('categories.manage'), updateConsumableCategory);

// DELETE /api/consumable-categories/:id - Xóa danh mục
router.delete('/:id', permissionGuard('categories.manage'), deleteConsumableCategory);

module.exports = router;