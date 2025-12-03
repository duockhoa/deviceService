const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { permissionGuard } = require('../middleware/permissionGuard');
const {
    getAllMaintenance,
    getMaintenanceById,
    getMaintenanceByAsset,
    getMaintenanceByStatus,
    getMaintenanceByTechnician,
    getMyMaintenanceWork,
    getMaintenanceResults,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
    approveMaintenance,
    rejectMaintenance,
    updateWorkTaskReport,
    startWorkTask,
    completeWorkTask,
    startMaintenance,
    saveMaintenanceProgress,
    getMaintenanceReportSummary,
    getMonthlyMaintenanceReport
} = require('../controllers/maintenance.controllers');

router.use(authMiddleware);

// Public routes
router.get('/reports/summary', permissionGuard('maintenance.report'), getMaintenanceReportSummary);
router.get('/reports/monthly', permissionGuard('maintenance.report'), getMonthlyMaintenanceReport);
router.get('/my-work', permissionGuard('maintenance.view'), getMyMaintenanceWork);
router.get('/results', permissionGuard('maintenance.report'), getMaintenanceResults);
router.get('/by-asset/:assetId', permissionGuard('maintenance.view'), getMaintenanceByAsset);
router.get('/by-status/:status', permissionGuard('maintenance.view'), getMaintenanceByStatus);
router.get('/by-technician/:technicianId', permissionGuard('maintenance.view'), getMaintenanceByTechnician);
router.get('/:id', permissionGuard('maintenance.view'), getMaintenanceById);
router.get('/', permissionGuard('maintenance.view'), getAllMaintenance);

// CRUD routes
router.post('/', permissionGuard('maintenance.create'), createMaintenance);
router.put('/:id', permissionGuard('maintenance.update'), updateMaintenance);
router.delete('/:id', permissionGuard('maintenance.update'), deleteMaintenance);

// Approval routes
router.post('/:id/approve', permissionGuard('maintenance.approve'), approveMaintenance);
router.post('/:id/reject', permissionGuard('maintenance.approve'), rejectMaintenance);
router.post('/:id/start', permissionGuard('maintenance.update'), startMaintenance);
router.put('/:id/save-progress', permissionGuard('maintenance.update'), saveMaintenanceProgress);

// Work task routes
router.post('/:maintenanceId/work-tasks/:taskId/start', permissionGuard('maintenance.update'), startWorkTask);
router.post('/:maintenanceId/work-tasks/:taskId/complete', permissionGuard('maintenance.update'), completeWorkTask);
router.put('/:maintenanceId/work-tasks/:taskId', permissionGuard('maintenance.update'), updateWorkTaskReport);

module.exports = router;
