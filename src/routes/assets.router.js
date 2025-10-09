const express = require('express');
const router = express.Router();
const {
    getAssetById,
    getAllAssets,
    createAsset,
    deleteAsset,
    updateAsset,
    getAssetsByArea,        // Thay đổi từ getAssetsByPosition
    getAssetsByCategory,
    getAssetsByDepartment,
    searchAssets,
    getAssetByCode
} = require("../controllers/assets.controllers");

// CRUD routes
router.get('/', getAllAssets);
router.get('/search', searchAssets); // Đặt trước /:id để tránh conflict
router.get('/by-code/:assetCode', getAssetByCode);
router.get('/by-area/:areaId', getAssetsByArea);              // Thay đổi từ by-position
router.get('/by-category/:categoryId', getAssetsByCategory);
router.get('/by-department/:departmentName', getAssetsByDepartment);
router.get('/:id', getAssetById);
router.post('/', createAsset);
router.put('/:id', updateAsset);
router.delete('/:id', deleteAsset);

module.exports = router;
