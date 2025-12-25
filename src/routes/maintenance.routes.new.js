/**
 * Maintenance Routes - Action-based endpoints
 * Tất cả endpoints yêu cầu authentication
 */

const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenance.controllers.new');

// ==================== READ OPERATIONS ====================

// Lấy danh sách maintenance
router.get('/', maintenanceController.getAllMaintenance);

// Lấy chi tiết maintenance
router.get('/:id', maintenanceController.getMaintenanceById);

// Tạo maintenance mới
router.post('/', maintenanceController.createMaintenance);

// ==================== ACTION ENDPOINTS ====================

// Gửi phê duyệt (draft → pending)
router.post('/:id/submit', maintenanceController.submitMaintenance);

// Phê duyệt (pending → approved)
router.post('/:id/approve', maintenanceController.approveMaintenance);

// Lập lịch (approved → scheduled)
// Body: { scheduled_date, shift, technician_id }
router.post('/:id/schedule', maintenanceController.scheduleMaintenance);

// Bắt đầu thực hiện (scheduled → in_progress)
router.post('/:id/start', maintenanceController.startMaintenance);

// Gửi nghiệm thu (in_progress → awaiting_acceptance)
// Body: { notes, actual_duration, cost }
router.post('/:id/submit-acceptance', maintenanceController.submitAcceptance);

// Nghiệm thu đạt (awaiting_acceptance → accepted)
// Body: { acceptance_notes }
router.post('/:id/accept', maintenanceController.acceptMaintenance);

// Nghiệm thu không đạt (awaiting_acceptance → in_progress)
// Body: { rejection_notes }
router.post('/:id/reject-acceptance', maintenanceController.rejectAcceptance);

// Đóng lệnh bảo trì (accepted → closed)
router.post('/:id/close', maintenanceController.closeMaintenance);

// Hủy lệnh bảo trì (trước in_progress)
// Body: { cancel_reason }
router.post('/:id/cancel', maintenanceController.cancelMaintenance);

// ==================== LEGACY ENDPOINTS (backward compatibility) ====================

// Update maintenance (deprecated - sử dụng action endpoints thay thế)
router.put('/:id', maintenanceController.updateMaintenance);

// Delete maintenance (soft delete)
router.delete('/:id', maintenanceController.deleteMaintenance);

module.exports = router;
