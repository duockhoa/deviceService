const express = require('express');
const router = express.Router();
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

// CRUD routes
router.get('/', getAllMaintenance);
router.get('/reports/summary', getMaintenanceReportSummary);    // Báo cáo tổng hợp
router.get('/reports/monthly', getMonthlyMaintenanceReport);    // Báo cáo theo tháng
router.get('/my-work', getMyMaintenanceWork);                  // Công việc của user hiện tại
router.get('/results', getMaintenanceResults);                 // Kết quả bảo trì (quản lý)
router.get('/by-asset/:assetId', getMaintenanceByAsset);        // Đặt trước /:id để tránh conflict
router.get('/by-status/:status', getMaintenanceByStatus);       // Đặt trước /:id để tránh conflict
router.get('/by-technician/:technicianId', getMaintenanceByTechnician); // Đặt trước /:id để tránh conflict
router.get('/:id', getMaintenanceById);
router.post('/', createMaintenance);
router.put('/:id', updateMaintenance);
router.delete('/:id', deleteMaintenance);

// Approval routes - Phải đặt sau các route by-* và trước /:id
router.post('/:id/approve', approveMaintenance);
router.post('/:id/reject', rejectMaintenance);
router.post('/:id/start', startMaintenance);
router.put('/:id/save-progress', saveMaintenanceProgress);

// Work task routes
router.post('/:maintenanceId/work-tasks/:taskId/start', startWorkTask);
router.post('/:maintenanceId/work-tasks/:taskId/complete', completeWorkTask);
router.put('/:maintenanceId/work-tasks/:taskId', updateWorkTaskReport);

module.exports = router;