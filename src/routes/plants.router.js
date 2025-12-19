const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
    getAllPlants,
    getPlantById,
    createPlant,
    updatePlant,
    deletePlant,
    getAreasByPlant,
    getPlantByCode
} = require("../controllers/plant.controllers");

router.use(authMiddleware);

// CRUD routes
router.get('/',getAllPlants);
router.get('/by-code/:code',getPlantByCode); // Đặt trước /:id để tránh conflict
router.get('/:id',getPlantById);
router.get('/:id/areas',getAreasByPlant);
router.post('/',createPlant);
router.put('/:id',updatePlant);
router.delete('/:id',deletePlant);

module.exports = router;