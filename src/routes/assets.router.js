const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const { permissionGuard } = require('../middleware/permissionGuard');
const validateRequest = require('../middleware/validateMiddleware');
const { createAssetSchema, updateAssetSchema } = require('../validators/assetValidator');

const {
    getAssetById,
    getAllAssets,
    createAsset,
    deleteAsset,
    updateAsset,
    getAssetsByArea,
    getAssetsBySubCategory,     // Thêm mới
    getAssetsByCategory,        // Cập nhật logic (thông qua sub categories)
    getAssetsByDepartment,
    searchAssets,
    getAssetByCode,
    getAssetConsumables,        // Lấy vật tư tiêu hao
    exportTemplate,
    importFromExcel
} = require("../controllers/assets.controllers");

// CRUD routes with permission guards
router.get('/', permissionGuard('assets.view'), getAllAssets);
router.get('/search', permissionGuard('assets.view'), searchAssets);
router.get('/export/template', permissionGuard('assets.view'), exportTemplate);
router.post('/import/excel', upload.single('file'), permissionGuard('assets.create'), importFromExcel);
router.get('/by-code/:assetCode', permissionGuard('assets.view'), getAssetByCode);
router.get('/by-area/:areaId', permissionGuard('assets.view'), getAssetsByArea);
router.get('/by-sub-category/:subCategoryId', permissionGuard('assets.view'), getAssetsBySubCategory);
router.get('/by-category/:categoryId', permissionGuard('assets.view'), getAssetsByCategory);
router.get('/by-department/:departmentName', permissionGuard('assets.view'), getAssetsByDepartment);
router.get('/:id/consumables', permissionGuard('assets.view'), getAssetConsumables);
router.get('/:id', permissionGuard('assets.view'), getAssetById);
router.post('/', permissionGuard('assets.create'), validateRequest(createAssetSchema), createAsset);
router.put('/:id', permissionGuard('assets.update'), validateRequest(updateAssetSchema), updateAsset);
router.delete('/:id', permissionGuard('assets.delete'), deleteAsset);

module.exports = router;
