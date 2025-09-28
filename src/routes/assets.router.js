const express = require('express');
const router = express.Router();
const { getAssetById, getAllAssets, createAsset, deleteAsset, updateAsset } = require("../controllers/assets.controllers");

router.get('/', getAllAssets);
router.get('/:id', getAssetById);
router.post('/', createAsset);
router.delete('/:id', deleteAsset);
router.put('/:id', updateAsset);

module.exports = router;
