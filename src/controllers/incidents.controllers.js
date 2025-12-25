/**
 * Incident Controller - Action-based endpoints
 * Sử dụng IncidentService để xử lý business logic
 */

const IncidentService = require('../service/IncidentService');
const { INCIDENT_ACTIONS } = require('../utils/stateMachine');

// ==================== READ OPERATIONS ====================

/**
 * GET /api/v1/incidents
 */
const getAllIncidents = async (req, res) => {
    const result = await IncidentService.getAllIncidents(req.user, req.query);
    
    if (!result.success) {
        return res.status(result.code || 500).json({
            success: false,
            message: result.error
        });
    }

    return res.status(200).json({
        success: true,
        data: result.data
    });
};

/**
 * GET /api/v1/incidents/:id
 */
const getIncidentById = async (req, res) => {
    const result = await IncidentService.getIncidentWithActions(req.params.id, req.user);
    
    if (!result.success) {
        return res.status(result.code || 500).json({
            success: false,
            message: result.error
        });
    }

    return res.status(200).json({
        success: true,
        data: result.data
    });
};

/**
 * POST /api/v1/incidents
 */
const createIncident = async (req, res) => {
    const result = await IncidentService.createIncident(req.body, req.user);
    
    if (!result.success) {
        return res.status(result.code || 500).json({
            success: false,
            message: result.error
        });
    }

    return res.status(201).json({
        success: true,
        message: 'Incident created successfully',
        data: result.data
    });
};

// ==================== ACTION ENDPOINTS ====================

/**
 * POST /api/v1/incidents/:id/triage
 * Action: Phân loại sự cố (set severity, branch to isolate if critical)
 * Body: { severity: 'critical'|'high'|'medium'|'low', notes: string }
 */
const triageIncident = async (req, res) => {
    const result = await IncidentService.handleAction(
        req.params.id,
        INCIDENT_ACTIONS.TRIAGE,
        req.body,
        req.user,
        req.ip
    );

    if (!result.success) {
        return res.status(result.code || 500).json({
            success: false,
            message: result.error
        });
    }

    return res.status(200).json({
        success: true,
        message: 'Incident triaged successfully',
        data: result.data
    });
};

/**
 * POST /api/v1/incidents/:id/isolate
 * Action: Cô lập thiết bị (set out_of_service, asset status = down)
 * Body: { isolation_notes: string }
 */
const isolateIncident = async (req, res) => {
    const result = await IncidentService.handleAction(
        req.params.id,
        INCIDENT_ACTIONS.ISOLATE,
        req.body,
        req.user,
        req.ip
    );

    if (!result.success) {
        return res.status(result.code || 500).json({
            success: false,
            message: result.error
        });
    }

    return res.status(200).json({
        success: true,
        message: 'Incident isolated successfully',
        data: result.data
    });
};

/**
 * POST /api/v1/incidents/:id/assign
 * Action: Phân công kỹ thuật viên
 * Body: { assigned_to: userId }
 */
const assignIncident = async (req, res) => {
    const result = await IncidentService.handleAction(
        req.params.id,
        INCIDENT_ACTIONS.ASSIGN,
        req.body,
        req.user,
        req.ip
    );

    if (!result.success) {
        return res.status(result.code || 500).json({
            success: false,
            message: result.error
        });
    }

    return res.status(200).json({
        success: true,
        message: 'Incident assigned successfully',
        data: result.data
    });
};

/**
 * POST /api/v1/incidents/:id/start
 * Action: Bắt đầu xử lý
 */
const startIncident = async (req, res) => {
    const result = await IncidentService.handleAction(
        req.params.id,
        INCIDENT_ACTIONS.START,
        req.body,
        req.user,
        req.ip
    );

    if (!result.success) {
        return res.status(result.code || 500).json({
            success: false,
            message: result.error
        });
    }

    return res.status(200).json({
        success: true,
        message: 'Incident started successfully',
        data: result.data
    });
};

/**
 * POST /api/v1/incidents/:id/submit-post-fix
 * Action: Gửi kiểm tra sau sửa chữa
 * Body: { notes: string }
 */
const submitPostFix = async (req, res) => {
    const result = await IncidentService.handleAction(
        req.params.id,
        INCIDENT_ACTIONS.SUBMIT_POST_FIX,
        req.body,
        req.user,
        req.ip
    );

    if (!result.success) {
        return res.status(result.code || 500).json({
            success: false,
            message: result.error
        });
    }

    return res.status(200).json({
        success: true,
        message: 'Post-fix check submitted successfully',
        data: result.data
    });
};

/**
 * POST /api/v1/incidents/:id/post-fix-check
 * Action: Kiểm tra sau sửa chữa (pass/fail)
 * Body: { result: 'pass'|'fail', root_cause: string, solution: string, downtime_minutes: number }
 */
const postFixCheck = async (req, res) => {
    const { result, ...payload } = req.body;

    if (!result || !['pass', 'fail'].includes(result)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid post-fix result. Must be "pass" or "fail"'
        });
    }

    const action = result === 'pass' 
        ? INCIDENT_ACTIONS.POST_FIX_PASS 
        : INCIDENT_ACTIONS.POST_FIX_FAIL;

    const serviceResult = await IncidentService.handleAction(
        req.params.id,
        action,
        { ...payload, result },
        req.user,
        req.ip
    );

    if (!serviceResult.success) {
        return res.status(serviceResult.code || 500).json({
            success: false,
            message: serviceResult.error
        });
    }

    return res.status(200).json({
        success: true,
        message: `Post-fix check ${result === 'pass' ? 'passed' : 'failed'}`,
        data: serviceResult.data
    });
};

/**
 * POST /api/v1/incidents/:id/close
 * Action: Đóng sự cố
 * Body: { notes: string }
 */
const closeIncident = async (req, res) => {
    const result = await IncidentService.handleAction(
        req.params.id,
        INCIDENT_ACTIONS.CLOSE,
        req.body,
        req.user,
        req.ip
    );

    if (!result.success) {
        return res.status(result.code || 500).json({
            success: false,
            message: result.error
        });
    }

    return res.status(200).json({
        success: true,
        message: 'Incident closed successfully',
        data: result.data
    });
};

/**
 * POST /api/v1/incidents/:id/cancel
 * Action: Hủy sự cố (chỉ khi reported)
 * Body: { cancel_reason: string }
 */
const cancelIncident = async (req, res) => {
    const result = await IncidentService.handleAction(
        req.params.id,
        INCIDENT_ACTIONS.CANCEL,
        req.body,
        req.user,
        req.ip
    );

    if (!result.success) {
        return res.status(result.code || 500).json({
            success: false,
            message: result.error
        });
    }

    return res.status(200).json({
        success: true,
        message: 'Incident cancelled successfully',
        data: result.data
    });
};

// ==================== LEGACY ENDPOINTS (for backward compatibility) ====================

/**
 * PUT /api/v1/incidents/:id - Legacy update endpoint
 * Redirect to appropriate action endpoint
 */
const updateIncident = async (req, res) => {
    // Map old status to new actions
    const statusActionMap = {
        'triaged': INCIDENT_ACTIONS.TRIAGE,
        'assigned': INCIDENT_ACTIONS.ASSIGN,
        'in_progress': INCIDENT_ACTIONS.START,
        'resolved': INCIDENT_ACTIONS.POST_FIX_PASS,
        'closed': INCIDENT_ACTIONS.CLOSE
    };

    const newStatus = req.body.status;
    if (newStatus && statusActionMap[newStatus]) {
        const result = await IncidentService.handleAction(
            req.params.id,
            statusActionMap[newStatus],
            req.body,
            req.user,
            req.ip
        );

        if (!result.success) {
            return res.status(result.code || 500).json({
                success: false,
                message: result.error
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Incident updated successfully',
            data: result.data
        });
    }

    // Nếu không có status change, chỉ update fields
    return res.status(400).json({
        success: false,
        message: 'Please use specific action endpoints instead of direct status update'
    });
};

/**
 * DELETE /api/v1/incidents/:id
 */
const deleteIncident = async (req, res) => {
    try {
        const { Incidents } = require('../models');
        const incident = await Incidents.findByPk(req.params.id);
        
        if (!incident) {
            return res.status(404).json({
                success: false,
                message: 'Incident not found'
            });
        }

        await incident.destroy();

        return res.status(200).json({
            success: true,
            message: 'Incident deleted successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error deleting incident',
            error: error.message
        });
    }
};

module.exports = {
    // Read operations
    getAllIncidents,
    getIncidentById,
    createIncident,
    
    // Action endpoints
    triageIncident,
    isolateIncident,
    assignIncident,
    startIncident,
    submitPostFix,
    postFixCheck,
    closeIncident,
    cancelIncident,
    
    // Legacy
    updateIncident,
    deleteIncident
};
