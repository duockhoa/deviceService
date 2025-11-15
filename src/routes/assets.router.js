const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

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

// CRUD routes
router.get('/', getAllAssets);
router.get('/search', searchAssets); // Đặt trước /:id để tránh conflict
router.get('/export/template', exportTemplate); // Export Excel template
router.post('/import/excel', upload.single('file'), importFromExcel); // Import from Excel
router.get('/by-code/:assetCode', getAssetByCode);
router.get('/by-area/:areaId', getAssetsByArea);
router.get('/by-sub-category/:subCategoryId', getAssetsBySubCategory);  // Route mới
router.get('/by-category/:categoryId', getAssetsByCategory);             // Logic mới
router.get('/by-department/:departmentName', getAssetsByDepartment);
router.get('/:id/consumables', getAssetConsumables);  // Lấy vật tư tiêu hao - PHẢI đặt trước /:id
router.get('/:id', getAssetById);
router.post('/', createAsset);
router.put('/:id', updateAsset);
router.delete('/:id', deleteAsset);

module.exports = router;
