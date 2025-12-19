const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateMiddleware');
const { createCalibrationSchema, updateCalibrationSchema } = require('../validators/calibrationValidator');
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
router.get('/',getAllCalibrations);
router.get('/by-asset/:assetId',getCalibrationsByAsset);
router.get('/by-status/:status',getCalibrationsByStatus);
router.get('/by-technician/:technicianId',getCalibrationsByTechnician);
router.get('/:id',getCalibrationById);
router.post('/',validateRequest(createCalibrationSchema), createCalibration);
router.put('/:id',validateRequest(updateCalibrationSchema), updateCalibration);
router.delete('/:id',deleteCalibration);

module.exports = router;
