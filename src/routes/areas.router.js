const express = require('express');
const router = express.Router();
const {
    getAllAreas,
    getAreaById,
    createArea,
    updateArea,
    deleteArea,
    getAreasByPlant,
    getAssetsByArea        // Thay đổi từ getPositionsByArea
} = require("../controllers/areas.controllers");

// CRUD routes
router.get('/', getAllAreas);
router.get('/by-plant/:plantId', getAreasByPlant); // Đặt trước /:id để tránh conflict
router.get('/:id', getAreaById);
router.get('/:id/assets', getAssetsByArea);        // Thay đổi từ /positions sang /assets
router.post('/', createArea);
router.put('/:id', updateArea);
router.delete('/:id', deleteArea);

module.exports = router;