const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateMiddleware');
const { createMaintenanceSchema, updateMaintenanceSchema } = require('../validators/maintenanceValidator');
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
    completeMaintenance,
    closeMaintenance,
    cancelMaintenance,
    saveMaintenanceProgress,
    getMaintenanceReportSummary,
    getMonthlyMaintenanceReport
} = require('../controllers/maintenance.controllers');

router.use(authMiddleware);

// Public routes
router.get('/reports/summary',getMaintenanceReportSummary);
router.get('/reports/monthly',getMonthlyMaintenanceReport);
router.get('/my-work',getMyMaintenanceWork);
router.get('/results',getMaintenanceResults);
router.get('/by-asset/:assetId',getMaintenanceByAsset);
router.get('/by-status/:status',getMaintenanceByStatus);
router.get('/by-technician/:technicianId',getMaintenanceByTechnician);
router.get('/:id',getMaintenanceById);
router.get('/',getAllMaintenance);

// CRUD routes
router.post('/',validateRequest(createMaintenanceSchema), createMaintenance);
router.put('/:id',validateRequest(updateMaintenanceSchema), updateMaintenance);
router.delete('/:id',deleteMaintenance);

// Approval routes
router.post('/:id/approve',approveMaintenance);
router.post('/:id/reject',rejectMaintenance);
router.post('/:id/start',startMaintenance);
router.post('/:id/complete',completeMaintenance);
router.post('/:id/close',closeMaintenance);
router.post('/:id/cancel',cancelMaintenance);
router.put('/:id/save-progress',saveMaintenanceProgress);

// Work task routes
router.post('/:maintenanceId/work-tasks/:taskId/start',startWorkTask);
router.post('/:maintenanceId/work-tasks/:taskId/complete',completeWorkTask);
router.put('/:maintenanceId/work-tasks/:taskId',updateWorkTaskReport);

module.exports = router;
