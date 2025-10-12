const express = require('express');
const router = express.Router();
const {
    getAllAssetCategories,
    getAssetCategoryById,
    createAssetCategory,
    updateAssetCategory,
    deleteAssetCategory,
    getSubCategoriesByCategory  // Thêm mới thay vì getAssetsByCategory
} = require("../controllers/assetCategories.controllers");

// CRUD routes
router.get('/', getAllAssetCategories);
router.get('/:id', getAssetCategoryById);
router.get('/:id/sub-categories', getSubCategoriesByCategory);  // Thay đổi từ /assets
router.post('/', createAssetCategory);
router.put('/:id', updateAssetCategory);
router.delete('/:id', deleteAssetCategory);

module.exports = router;


