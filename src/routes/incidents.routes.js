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

// ==================== ACTION ENDPOINTS (SIMPLIFIED) ====================

// Tiếp nhận và xử lý sự cố (reported → in_progress)
router.post('/:id/acknowledge', checkActionPermission('incident', INCIDENT_ACTIONS.ACKNOWLEDGE), incidentController.acknowledgeIncident);

// Đánh dấu đã giải quyết (in_progress → resolved)
router.post('/:id/resolve', checkActionPermission('incident', INCIDENT_ACTIONS.RESOLVE), incidentController.resolveIncident);

// Đóng sự cố (resolved → closed)
router.post('/:id/close', checkActionPermission('incident', INCIDENT_ACTIONS.CLOSE), incidentController.closeIncident);

// Hủy sự cố (reported → cancelled)
router.post('/:id/cancel', checkActionPermission('incident', INCIDENT_ACTIONS.CANCEL), incidentController.cancelIncident);

// Chuyển sang bảo trì sửa chữa (tạo maintenance từ incident)
// Chỉ áp dụng cho incident_category = EQUIPMENT
router.post('/:id/convert-to-maintenance', incidentController.convertToMaintenance);

// ==================== LEGACY ENDPOINTS (backward compatibility) ====================

// Update incident (deprecated - sử dụng action endpoints thay thế)
router.put('/:id', incidentController.updateIncident);

// Delete incident (soft delete)
router.delete('/:id', incidentController.deleteIncident);

module.exports = router;
