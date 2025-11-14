const express = require('express');
const router = express.Router();
const {
    getAllMaintenance,
    getMaintenanceById,
    getMaintenanceByAsset,
    getMaintenanceByStatus,
    getMaintenanceByTechnician,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance
} = require('../controllers/maintenance.controllers');

// CRUD routes
router.get('/', getAllMaintenance);
router.get('/by-asset/:assetId', getMaintenanceByAsset);        // Đặt trước /:id để tránh conflict
router.get('/by-status/:status', getMaintenanceByStatus);       // Đặt trước /:id để tránh conflict
router.get('/by-technician/:technicianId', getMaintenanceByTechnician); // Đặt trước /:id để tránh conflict
router.get('/:id', getMaintenanceById);
router.post('/', createMaintenance);
router.put('/:id', updateMaintenance);
router.delete('/:id', deleteMaintenance);

module.exports = router;