const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { permissionGuard } = require('../middleware/permissionGuard');
const {
    getAllCalibrations,
    getCalibrationById,
    getCalibrationsByAsset,
    getCalibrationsByStatus,
    getCalibrationsByTechnician,
    createCalibration,
    updateCalibration,
    deleteCalibration
} = require('../controllers/calibration.controllers');

router.use(authMiddleware);

// CRUD routes
router.get('/', permissionGuard('calibration.view'), getAllCalibrations);
router.get('/by-asset/:assetId', permissionGuard('calibration.view'), getCalibrationsByAsset);
router.get('/by-status/:status', permissionGuard('calibration.view'), getCalibrationsByStatus);
router.get('/by-technician/:technicianId', permissionGuard('calibration.view'), getCalibrationsByTechnician);
router.get('/:id', permissionGuard('calibration.view'), getCalibrationById);
router.post('/', permissionGuard('calibration.create'), createCalibration);
router.put('/:id', permissionGuard('calibration.update'), updateCalibration);
router.delete('/:id', permissionGuard('calibration.update'), deleteCalibration);

module.exports = router;
