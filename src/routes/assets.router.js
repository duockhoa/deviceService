const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

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
    getAssetByDkCode,
    getAssetConsumables,        // Lấy vật tư tiêu hao
    createAssetConsumable,      // Thêm vật tư tiêu hao
    updateAssetConsumable,      // Cập nhật vật tư tiêu hao
    deleteAssetConsumable,      // Xóa vật tư tiêu hao
    getLowStockConsumables,     // Lấy vật tư dưới ngưỡng
    exportTemplate,
    exportSpecTemplate,
    exportConsumableTemplate,
    importFromExcel,
    importAssetSpecificationsFromExcel,
    importAssetConsumablesFromExcel
} = require("../controllers/assets.controllers");

// CRUD routes with permission guards
router.get('/',getAllAssets);
router.get('/search',searchAssets);
router.get('/export/template',exportTemplate);
router.get('/export/template/spec', exportSpecTemplate);
router.get('/export/template/consumable', exportConsumableTemplate);
router.post('/import/excel', upload.single('file'),importFromExcel);
router.post('/import/specifications', upload.single('file'), importAssetSpecificationsFromExcel);
router.post('/import/consumables', upload.single('file'), importAssetConsumablesFromExcel);
router.get('/by-code/:assetCode',getAssetByCode);
router.get('/by-dk/:dkCode',getAssetByDkCode);
router.get('/by-area/:areaId',getAssetsByArea);
router.get('/by-sub-category/:subCategoryId',getAssetsBySubCategory);
router.get('/by-category/:categoryId',getAssetsByCategory);
router.get('/by-department/:departmentName',getAssetsByDepartment);
router.get('/consumables/low-stock', getLowStockConsumables); // Must be before /:id
router.get('/:id/consumables',getAssetConsumables);
router.post('/:id/consumables', createAssetConsumable);
router.put('/:id/consumables/:consumableId', updateAssetConsumable);
router.delete('/:id/consumables/:consumableId', deleteAssetConsumable);
router.get('/:id',getAssetById);
router.post('/',validateRequest(createAssetSchema), createAsset);
router.put('/:id',validateRequest(updateAssetSchema), updateAsset);
router.delete('/:id',deleteAsset);

module.exports = router;
