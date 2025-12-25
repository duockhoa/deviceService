/**
 * Maintenance Controller - Action-based endpoints
 * Sử dụng MaintenanceService để xử lý business logic
 */

const MaintenanceService = require('../service/MaintenanceService');
const { MAINTENANCE_ACTIONS } = require('../utils/stateMachine');

// ==================== READ OPERATIONS ====================

/**
 * GET /api/maintenance
 */
const getAllMaintenance = async (req, res) => {
    const result = await MaintenanceService.getAllMaintenance(req.user, req.query);
    
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
 * GET /api/maintenance/:id
 */
const getMaintenanceById = async (req, res) => {
    const result = await MaintenanceService.getMaintenanceWithActions(req.params.id, req.user);
    
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
 * POST /api/maintenance
 */
const createMaintenance = async (req, res) => {
    const result = await MaintenanceService.createMaintenance(req.body, req.user);
    
    if (!result.success) {
        return res.status(result.code || 500).json({
            success: false,
            message: result.error
        });
    }

    return res.status(201).json({
        success: true,
        message: 'Maintenance created successfully',
        data: result.data
    });
};

// ==================== ACTION ENDPOINTS ====================

/**
 * POST /api/maintenance/:id/submit
 * Action: Gửi phê duyệt (draft → pending)
 */
const submitMaintenance = async (req, res) => {
    const result = await MaintenanceService.handleAction(
        req.params.id,
        MAINTENANCE_ACTIONS.SUBMIT,
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
        message: 'Maintenance submitted for approval',
        data: result.data
    });
};

/**
 * POST /api/maintenance/:id/approve
 * Action: Phê duyệt (pending → approved)
 * Body: { approval_comment: string }
 */
const approveMaintenance = async (req, res) => {
    const result = await MaintenanceService.handleAction(
        req.params.id,
        MAINTENANCE_ACTIONS.APPROVE,
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
        message: 'Maintenance approved successfully',
        data: result.data
    });
};

/**
 * POST /api/maintenance/:id/schedule
 * Action: Lập lịch (approved → scheduled)
 * Body: { scheduled_date: date, shift: 'A'|'B'|'C', technician_id: number }
 */
const scheduleMaintenance = async (req, res) => {
    const result = await MaintenanceService.handleAction(
        req.params.id,
        MAINTENANCE_ACTIONS.SCHEDULE,
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
        message: 'Maintenance scheduled successfully',
        data: result.data
    });
};

/**
 * POST /api/maintenance/:id/start
 * Action: Bắt đầu thực hiện (scheduled → in_progress)
 */
const startMaintenance = async (req, res) => {
    const result = await MaintenanceService.handleAction(
        req.params.id,
        MAINTENANCE_ACTIONS.START,
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
        message: 'Maintenance started successfully',
        data: result.data
    });
};

/**
 * POST /api/maintenance/:id/submit-acceptance
 * Action: Gửi nghiệm thu (in_progress → awaiting_acceptance)
 * Body: { notes: string, actual_duration: number, cost: number }
 */
const submitAcceptance = async (req, res) => {
    const result = await MaintenanceService.handleAction(
        req.params.id,
        MAINTENANCE_ACTIONS.SUBMIT_ACCEPTANCE,
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
        message: 'Maintenance submitted for acceptance',
        data: result.data
    });
};

/**
 * POST /api/maintenance/:id/accept
 * Action: Nghiệm thu đạt (awaiting_acceptance → accepted)
 * Body: { acceptance_notes: string }
 */
const acceptMaintenance = async (req, res) => {
    const result = await MaintenanceService.handleAction(
        req.params.id,
        MAINTENANCE_ACTIONS.ACCEPT,
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
        message: 'Maintenance accepted successfully',
        data: result.data
    });
};

/**
 * POST /api/maintenance/:id/reject-acceptance
 * Action: Nghiệm thu không đạt (awaiting_acceptance → in_progress)
 * Body: { rejection_notes: string }
 */
const rejectAcceptance = async (req, res) => {
    const result = await MaintenanceService.handleAction(
        req.params.id,
        MAINTENANCE_ACTIONS.REJECT_ACCEPTANCE,
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
        message: 'Maintenance acceptance rejected',
        data: result.data
    });
};

/**
 * POST /api/maintenance/:id/close
 * Action: Đóng lệnh bảo trì (accepted → closed)
 * Body: { notes: string }
 */
const closeMaintenance = async (req, res) => {
    const result = await MaintenanceService.handleAction(
        req.params.id,
        MAINTENANCE_ACTIONS.CLOSE,
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
        message: 'Maintenance closed successfully',
        data: result.data
    });
};

/**
 * POST /api/maintenance/:id/cancel
 * Action: Hủy lệnh bảo trì (trước in_progress)
 * Body: { cancel_reason: string }
 */
const cancelMaintenance = async (req, res) => {
    const result = await MaintenanceService.handleAction(
        req.params.id,
        MAINTENANCE_ACTIONS.CANCEL,
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
        message: 'Maintenance cancelled successfully',
        data: result.data
    });
};

// ==================== LEGACY ENDPOINTS ====================

/**
 * PUT /api/maintenance/:id - Legacy update
 */
const updateMaintenance = async (req, res) => {
    // Map old status to new actions
    const statusActionMap = {
        'approved': MAINTENANCE_ACTIONS.APPROVE,
        'scheduled': MAINTENANCE_ACTIONS.SCHEDULE,
        'in_progress': MAINTENANCE_ACTIONS.START,
        'awaiting_acceptance': MAINTENANCE_ACTIONS.SUBMIT_ACCEPTANCE,
        'accepted': MAINTENANCE_ACTIONS.ACCEPT,
        'closed': MAINTENANCE_ACTIONS.CLOSE
    };

    const newStatus = req.body.status;
    if (newStatus && statusActionMap[newStatus]) {
        const result = await MaintenanceService.handleAction(
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
            message: 'Maintenance updated successfully',
            data: result.data
        });
    }

    return res.status(400).json({
        success: false,
        message: 'Please use specific action endpoints instead of direct status update'
    });
};

/**
 * DELETE /api/maintenance/:id - Soft delete
 */
const deleteMaintenance = async (req, res) => {
    try {
        const { Maintenance } = require('../models');
        const maintenance = await Maintenance.findByPk(req.params.id);
        
        if (!maintenance) {
            return res.status(404).json({
                success: false,
                message: 'Maintenance not found'
            });
        }

        await maintenance.update({
            is_deleted: true,
            deleted_at: new Date(),
            deleted_by: req.user.id
        });

        return res.status(200).json({
            success: true,
            message: 'Maintenance deleted successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error deleting maintenance',
            error: error.message
        });
    }
};

module.exports = {
    // Read operations
    getAllMaintenance,
    getMaintenanceById,
    createMaintenance,
    
    // Action endpoints
    submitMaintenance,
    approveMaintenance,
    scheduleMaintenance,
    startMaintenance,
    submitAcceptance,
    acceptMaintenance,
    rejectAcceptance,
    closeMaintenance,
    cancelMaintenance,
    
    // Legacy
    updateMaintenance,
    deleteMaintenance
};
