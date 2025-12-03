const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { permissionGuard } = require('../middleware/permissionGuard');
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
router.get('/', permissionGuard('location.view'), getAllPlants);
router.get('/by-code/:code', permissionGuard('location.view'), getPlantByCode); // Đặt trước /:id để tránh conflict
router.get('/:id', permissionGuard('location.view'), getPlantById);
router.get('/:id/areas', permissionGuard('location.view'), getAreasByPlant);
router.post('/', permissionGuard('location.manage'), createPlant);
router.put('/:id', permissionGuard('location.manage'), updatePlant);
router.delete('/:id', permissionGuard('location.manage'), deletePlant);

module.exports = router;