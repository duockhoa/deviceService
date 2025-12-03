const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { permissionGuard } = require('../middleware/permissionGuard');
const {
    getAllAssetSubCategories,
    getAssetSubCategoryById,
    createAssetSubCategory,
    updateAssetSubCategory,
    deleteAssetSubCategory,
    getSubCategoriesByCategory
} = require("../controllers/assetSubCategories.controllers");

router.use(authMiddleware);

// CRUD routes
router.get('/', permissionGuard('categories.view'), getAllAssetSubCategories);                          // GET /api/asset-sub-categories
router.get('/by-category/:categoryId', permissionGuard('categories.view'), getSubCategoriesByCategory); // GET /api/asset-sub-categories/by-category/:categoryId
router.get('/:id', permissionGuard('categories.view'), getAssetSubCategoryById);                        // GET /api/asset-sub-categories/:id
router.post('/', permissionGuard('categories.manage'), createAssetSubCategory);                           // POST /api/asset-sub-categories
router.put('/:id', permissionGuard('categories.manage'), updateAssetSubCategory);                         // PUT /api/asset-sub-categories/:id
router.delete('/:id', permissionGuard('categories.manage'), deleteAssetSubCategory);                      // DELETE /api/asset-sub-categories/:id

module.exports = router;