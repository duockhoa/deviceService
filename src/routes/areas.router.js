const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { permissionGuard } = require('../middleware/permissionGuard');
const {
    getAllAreas,
    getAreaById,
    createArea,
    updateArea,
    deleteArea,
    getAreasByPlant,
    getAssetsByArea        // Thay đổi từ getPositionsByArea
} = require("../controllers/areas.controllers");

router.use(authMiddleware);

// CRUD routes
router.get('/', permissionGuard('location.view'), getAllAreas);
router.get('/by-plant/:plantId', permissionGuard('location.view'), getAreasByPlant); // Đặt trước /:id để tránh conflict
router.get('/:id', permissionGuard('location.view'), getAreaById);
router.get('/:id/assets', permissionGuard('location.view'), getAssetsByArea);        // Thay đổi từ /positions sang /assets
router.post('/', permissionGuard('location.manage'), createArea);
router.put('/:id', permissionGuard('location.manage'), updateArea);
router.delete('/:id', permissionGuard('location.manage'), deleteArea);

module.exports = router;