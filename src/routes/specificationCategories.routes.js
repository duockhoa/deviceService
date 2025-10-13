const express = require('express');
const router = express.Router();
const {
    getAllSpecificationCategories,
    getSpecificationCategoryById,
    createSpecificationCategory,
    updateSpecificationCategory,
    deleteSpecificationCategory,
    getSpecificationCategoriesBySubCategory,
    getSpecificationCategoryByCode,
    reorderSpecificationCategories
} = require('../controllers/specificationCategories.controllers');

// GET /api/specification-categories - Lấy tất cả specification categories
router.get('/', getAllSpecificationCategories);

// GET /api/specification-categories/:id - Lấy specification category theo ID
router.get('/:id', getSpecificationCategoryById);

// POST /api/specification-categories - Tạo specification category mới
router.post('/', createSpecificationCategory);

// PUT /api/specification-categories/:id - Cập nhật specification category
router.put('/:id', updateSpecificationCategory);

// DELETE /api/specification-categories/:id - Xóa specification category
router.delete('/:id', deleteSpecificationCategory);

// GET /api/specification-categories/by-sub-category/:subCategoryId - Lấy theo sub category
router.get('/by-sub-category/:subCategoryId', getSpecificationCategoriesBySubCategory);

// GET /api/specification-categories/by-code/:specCode - Lấy theo spec code
router.get('/by-code/:specCode', getSpecificationCategoryByCode);

// PUT /api/specification-categories/reorder/:subCategoryId - Sắp xếp lại thứ tự
router.put('/reorder/:subCategoryId', reorderSpecificationCategories);

module.exports = router;