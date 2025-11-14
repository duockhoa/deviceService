const express = require('express');
const router = express.Router();
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

// CRUD routes
router.get('/', getAllCalibrations);
router.get('/by-asset/:assetId', getCalibrationsByAsset);
router.get('/by-status/:status', getCalibrationsByStatus);
router.get('/by-technician/:technicianId', getCalibrationsByTechnician);
router.get('/:id', getCalibrationById);
router.post('/', createCalibration);
router.put('/:id', updateCalibration);
router.delete('/:id', deleteCalibration);

module.exports = router;