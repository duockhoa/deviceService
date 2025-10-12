const express = require('express');
const router = express.Router();
const {
    getAllAssetSubCategories,
    getAssetSubCategoryById,
    createAssetSubCategory,
    updateAssetSubCategory,
    deleteAssetSubCategory,
    getSubCategoriesByCategory
} = require("../controllers/assetSubCategories.controllers");

// CRUD routes
router.get('/', getAllAssetSubCategories);                          // GET /api/asset-sub-categories
router.get('/by-category/:categoryId', getSubCategoriesByCategory); // GET /api/asset-sub-categories/by-category/:categoryId
router.get('/:id', getAssetSubCategoryById);                        // GET /api/asset-sub-categories/:id
router.post('/', createAssetSubCategory);                           // POST /api/asset-sub-categories
router.put('/:id', updateAssetSubCategory);                         // PUT /api/asset-sub-categories/:id
router.delete('/:id', deleteAssetSubCategory);                      // DELETE /api/asset-sub-categories/:id

module.exports = router;