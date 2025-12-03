const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { permissionGuard } = require('../middleware/permissionGuard');
const {
    getAllAssetCategories,
    getAssetCategoryById,
    createAssetCategory,
    updateAssetCategory,
    deleteAssetCategory,
    getSubCategoriesByCategory  // Thêm mới thay vì getAssetsByCategory
} = require("../controllers/assetCategories.controllers");

router.use(authMiddleware);

// CRUD routes
router.get('/', permissionGuard('categories.view'), getAllAssetCategories);
router.get('/:id', permissionGuard('categories.view'), getAssetCategoryById);
router.get('/:id/sub-categories', permissionGuard('categories.view'), getSubCategoriesByCategory);  // Thay đổi từ /assets
router.post('/', permissionGuard('categories.manage'), createAssetCategory);
router.put('/:id', permissionGuard('categories.manage'), updateAssetCategory);
router.delete('/:id', permissionGuard('categories.manage'), deleteAssetCategory);

module.exports = router;


