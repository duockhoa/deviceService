/**
 * Maintenance Routes - Action-based endpoints
 * Tất cả endpoints yêu cầu authentication
 */

const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenance.controllers');
const { checkActionPermission, canViewEntity } = require('../middleware/actionPermission.middleware');
const { MAINTENANCE_ACTIONS } = require('../utils/stateMachine');

// ==================== READ OPERATIONS ====================

// Lấy danh sách maintenance
router.get('/', canViewEntity, maintenanceController.getAllMaintenance);

// Lấy công việc của tôi (technician)
router.get('/my-work', maintenanceController.getMyWork);

// Lấy kết quả bảo trì (completed)
router.get('/results', maintenanceController.getMaintenanceResults);

// Báo cáo bảo trì
router.get('/reports/summary', maintenanceController.getMaintenanceReportSummary);
router.get('/reports/monthly', maintenanceController.getMonthlyReport);

// Lấy chi tiết maintenance
router.get('/:id', canViewEntity, maintenanceController.getMaintenanceById);

// Tạo maintenance mới
router.post('/', maintenanceController.createMaintenance);

// ==================== ACTION ENDPOINTS ====================

// Gửi phê duyệt (draft → pending)
router.post('/:id/submit', checkActionPermission('maintenance', MAINTENANCE_ACTIONS.SUBMIT), maintenanceController.submitMaintenance);

// Phê duyệt (pending → approved)
router.post('/:id/approve', checkActionPermission('maintenance', MAINTENANCE_ACTIONS.APPROVE), maintenanceController.approveMaintenance);

// Lập lịch (approved → scheduled)
router.post('/:id/schedule', checkActionPermission('maintenance', MAINTENANCE_ACTIONS.SCHEDULE), maintenanceController.scheduleMaintenance);

// Bắt đầu thực hiện (scheduled → in_progress)
router.post('/:id/start', checkActionPermission('maintenance', MAINTENANCE_ACTIONS.START), maintenanceController.startMaintenance);

// Gửi nghiệm thu (in_progress → awaiting_acceptance)
router.post('/:id/submit-acceptance', checkActionPermission('maintenance', MAINTENANCE_ACTIONS.SUBMIT_ACCEPTANCE), maintenanceController.submitAcceptance);

// Nghiệm thu đạt (awaiting_acceptance → accepted)
router.post('/:id/accept', checkActionPermission('maintenance', MAINTENANCE_ACTIONS.ACCEPT), maintenanceController.acceptMaintenance);

// Nghiệm thu không đạt (awaiting_acceptance → in_progress)
router.post('/:id/reject-acceptance', checkActionPermission('maintenance', MAINTENANCE_ACTIONS.REJECT_ACCEPTANCE), maintenanceController.rejectAcceptance);

// Đóng lệnh bảo trì (accepted → closed)
router.post('/:id/close', checkActionPermission('maintenance', MAINTENANCE_ACTIONS.CLOSE), maintenanceController.closeMaintenance);

// Hủy lệnh bảo trì
router.post('/:id/cancel', checkActionPermission('maintenance', MAINTENANCE_ACTIONS.CANCEL), maintenanceController.cancelMaintenance);

// ==================== LEGACY ENDPOINTS ====================

// Update maintenance
router.put('/:id', maintenanceController.updateMaintenance);

// Delete maintenance (soft delete)
router.delete('/:id', maintenanceController.deleteMaintenance);

module.exports = router;
