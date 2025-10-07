const express = require('express');
const router = express.Router();
const { 
    getAllAreas,
    getAreaById,
    createArea,
    updateArea,
    deleteArea,
    getAreasByPlant,
    getPositionsByArea
} = require("../controllers/areas.controllers");

// CRUD routes
router.get('/', getAllAreas);
router.get('/by-plant/:plantId', getAreasByPlant); // Đặt trước /:id để tránh conflict
router.get('/:id', getAreaById);
router.get('/:id/positions', getPositionsByArea);
router.post('/', createArea);
router.put('/:id', updateArea);
router.delete('/:id', deleteArea);

module.exports = router;