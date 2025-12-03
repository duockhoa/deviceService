const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { permissionGuard } = require('../middleware/permissionGuard');
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

router.use(authMiddleware);

// GET /api/specification-categories - Lấy tất cả specification categories
router.get('/', permissionGuard('categories.view'), getAllSpecificationCategories);

// GET /api/specification-categories/:id - Lấy specification category theo ID
router.get('/:id', permissionGuard('categories.view'), getSpecificationCategoryById);

// POST /api/specification-categories - Tạo specification category mới
router.post('/', permissionGuard('categories.manage'), createSpecificationCategory);

// PUT /api/specification-categories/:id - Cập nhật specification category
router.put('/:id', permissionGuard('categories.manage'), updateSpecificationCategory);

// DELETE /api/specification-categories/:id - Xóa specification category
router.delete('/:id', permissionGuard('categories.manage'), deleteSpecificationCategory);

// GET /api/specification-categories/by-sub-category/:subCategoryId - Lấy theo sub category
router.get('/by-sub-category/:subCategoryId', permissionGuard('categories.view'), getSpecificationCategoriesBySubCategory);

// GET /api/specification-categories/by-code/:specCode - Lấy theo spec code
router.get('/by-code/:specCode', permissionGuard('categories.view'), getSpecificationCategoryByCode);

// PUT /api/specification-categories/reorder/:subCategoryId - Sắp xếp lại thứ tự
router.put('/reorder/:subCategoryId', permissionGuard('categories.manage'), reorderSpecificationCategories);

module.exports = router;