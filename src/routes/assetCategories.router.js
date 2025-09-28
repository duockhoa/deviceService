const express = require('express');
const router = express.Router();
const {getAllAssetCategories , getAssetCategoryById , getAssetsByCategory , createAssetCategory , deleteAssetCategory , updateAssetCategory} = require("../controllers/assetCategories.controllers");

router.get('/', getAllAssetCategories);
router.get('/:id', getAssetCategoryById);
router.get('/:id/assets', getAssetsByCategory);
router.post('/', createAssetCategory);
router.delete('/:id', deleteAssetCategory);
router.put('/:id', updateAssetCategory);

module.exports = router;


