const express = require('express');
const router = express.Router();
const {
    getAllConsumableCategories,
    getConsumableCategoryById,
    createConsumableCategory,
    updateConsumableCategory,
    deleteConsumableCategory
} = require('../controllers/consumableCategories.controllers');

// GET /api/consumable-categories - Lấy tất cả danh mục
router.get('/', getAllConsumableCategories);

// GET /api/consumable-categories/:id - Lấy danh mục theo ID
router.get('/:id', getConsumableCategoryById);

// POST /api/consumable-categories - Tạo danh mục mới
router.post('/', createConsumableCategory);

// PUT /api/consumable-categories/:id - Cập nhật danh mục
router.put('/:id', updateConsumableCategory);

// DELETE /api/consumable-categories/:id - Xóa danh mục
router.delete('/:id', deleteConsumableCategory);

module.exports = router;