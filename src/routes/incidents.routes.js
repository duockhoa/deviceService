/**
 * Incident Routes - Action-based endpoints
 * Tất cả endpoints yêu cầu authentication
 */

const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidents.controllers');
const { checkActionPermission, canViewEntity } = require('../middleware/actionPermission.middleware');
const { INCIDENT_ACTIONS } = require('../utils/stateMachine');

// ==================== READ OPERATIONS ====================

// Lấy danh sách incidents
router.get('/', canViewEntity, incidentController.getAllIncidents);

// Báo cáo thống kê sự cố - PHẢI ĐỨNG TRƯỚC :id
router.get('/reports', incidentController.getIncidentReports);

// Xuất báo cáo Excel
router.get('/reports/export', incidentController.exportIncidentReports);

// Lấy chi tiết incident
router.get('/:id', canViewEntity, incidentController.getIncidentById);

// Tạo incident mới
router.post('/', incidentController.createIncident);

// ==================== ACTION ENDPOINTS ====================

// Phân loại sự cố (reported → triaged)
router.post('/:id/triage', checkActionPermission('incident', INCIDENT_ACTIONS.TRIAGE), incidentController.triageIncident);

// Cô lập thiết bị (triaged → out_of_service)
router.post('/:id/isolate', checkActionPermission('incident', INCIDENT_ACTIONS.ISOLATE), incidentController.isolateIncident);

// Phân công kỹ thuật viên (triaged|out_of_service → assigned)
router.post('/:id/assign', checkActionPermission('incident', INCIDENT_ACTIONS.ASSIGN), incidentController.assignIncident);

// Bắt đầu xử lý (assigned → in_progress)
router.post('/:id/start', checkActionPermission('incident', INCIDENT_ACTIONS.START), incidentController.startIncident);

// Gửi kiểm tra sau sửa chữa (in_progress → post_fix_check)
router.post('/:id/submit-post-fix', checkActionPermission('incident', INCIDENT_ACTIONS.SUBMIT_POST_FIX), incidentController.submitPostFix);

// Kiểm tra sau sửa chữa (post_fix_check → resolved|in_progress)
router.post('/:id/post-fix-check', checkActionPermission('incident', INCIDENT_ACTIONS.POST_FIX_CHECK), incidentController.postFixCheck);

// Đóng sự cố (resolved → closed)
router.post('/:id/close', checkActionPermission('incident', INCIDENT_ACTIONS.CLOSE), incidentController.closeIncident);

// Hủy sự cố (reported → cancelled)
router.post('/:id/cancel', checkActionPermission('incident', INCIDENT_ACTIONS.CANCEL), incidentController.cancelIncident);

// ==================== LEGACY ENDPOINTS (backward compatibility) ====================

// Update incident (deprecated - sử dụng action endpoints thay thế)
router.put('/:id', incidentController.updateIncident);

// Delete incident (soft delete)
router.delete('/:id', incidentController.deleteIncident);

module.exports = router;
