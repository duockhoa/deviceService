/**
 * Incident Routes - Action-based endpoints
 * Tất cả endpoints yêu cầu authentication
 */

const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidents.controllers.new');

// ==================== READ OPERATIONS ====================

// Lấy danh sách incidents
router.get('/', incidentController.getAllIncidents);

// Lấy chi tiết incident
router.get('/:id', incidentController.getIncidentById);

// Tạo incident mới
router.post('/', incidentController.createIncident);

// ==================== ACTION ENDPOINTS ====================

// Phân loại sự cố (reported → triaged)
router.post('/:id/triage', incidentController.triageIncident);

// Cô lập thiết bị (triaged → out_of_service)
router.post('/:id/isolate', incidentController.isolateIncident);

// Phân công kỹ thuật viên (triaged|out_of_service → assigned)
router.post('/:id/assign', incidentController.assignIncident);

// Bắt đầu xử lý (assigned → in_progress)
router.post('/:id/start', incidentController.startIncident);

// Gửi kiểm tra sau sửa chữa (in_progress → post_fix_check)
router.post('/:id/submit-post-fix', incidentController.submitPostFix);

// Kiểm tra sau sửa chữa (post_fix_check → resolved|in_progress)
// Body: { result: 'pass'|'fail', root_cause, solution, downtime_minutes }
router.post('/:id/post-fix-check', incidentController.postFixCheck);

// Đóng sự cố (resolved → closed)
router.post('/:id/close', incidentController.closeIncident);

// Hủy sự cố (reported → cancelled)
router.post('/:id/cancel', incidentController.cancelIncident);

// ==================== LEGACY ENDPOINTS (backward compatibility) ====================

// Update incident (deprecated - sử dụng action endpoints thay thế)
router.put('/:id', incidentController.updateIncident);

// Delete incident
router.delete('/:id', incidentController.deleteIncident);

module.exports = router;
