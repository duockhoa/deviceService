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

    // Legacy field update (no status change) to keep existing UI working
    try {
        const { Maintenance } = require('../models');
        
        // LOG INCOMING PAYLOAD
        console.log('=== UPDATE MAINTENANCE DEBUG ===');
        console.log('Maintenance ID:', req.params.id);
        console.log('User:', req.user?.id, req.user?.username);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        
        const maintenance = await Maintenance.findByPk(req.params.id);

        if (!maintenance) {
            console.log('[ERROR] Maintenance not found:', req.params.id);
            return res.status(404).json({
                success: false,
                message: 'Maintenance record not found'
            });
        }

        if (maintenance.is_deleted) {
            console.log('[ERROR] Maintenance is deleted:', req.params.id);
            return res.status(400).json({
                success: false,
                message: 'Không thể cập nhật bản ghi đã xóa'
            });
        }

        const updatePayload = { ...req.body };
        delete updatePayload.status;
        
        console.log('Update Payload (after removing status):', JSON.stringify(updatePayload, null, 2));

        // Sanitize numeric fields - convert empty strings to null
        const sanitizeNumeric = (value) => {
            if (value === null || value === undefined || value === '') return null;
            const num = parseFloat(value);
            return isNaN(num) ? null : num;
        };

        // Apply sanitization to numeric fields
        if ('cost' in updatePayload) {
            updatePayload.cost = sanitizeNumeric(updatePayload.cost);
        }
        if ('estimated_duration' in updatePayload) {
            updatePayload.estimated_duration = sanitizeNumeric(updatePayload.estimated_duration);
        }
        if ('asset_id' in updatePayload && updatePayload.asset_id !== '') {
            updatePayload.asset_id = parseInt(updatePayload.asset_id);
        }
        if ('technician_id' in updatePayload) {
            updatePayload.technician_id = updatePayload.technician_id === '' || updatePayload.technician_id === null ? null : parseInt(updatePayload.technician_id);
        }

        console.log('Update Payload (after sanitization):', JSON.stringify(updatePayload, null, 2));

        await maintenance.update(updatePayload);
        
        console.log('[SUCCESS] Update successful');
        console.log('================================');

        return res.status(200).json({
            success: true,
            message: 'Maintenance updated successfully',
            data: maintenance
        });
    } catch (error) {
        // ENHANCED ERROR LOGGING
        console.error('=== UPDATE MAINTENANCE ERROR ===');
        console.error('Maintenance ID:', req.params.id);
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
        console.error('Error Stack:', error.stack);
        
        // Sequelize validation errors
        if (error.name === 'SequelizeValidationError') {
            console.error('Validation Errors:', JSON.stringify(error.errors, null, 2));
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.message,
                details: error.errors.map(e => ({
                    field: e.path,
                    message: e.message,
                    value: e.value
                }))
            });
        }
        
        // Foreign key constraint errors
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            console.error('Foreign Key Error:', error.fields);
            return res.status(400).json({
                success: false,
                message: 'Foreign key constraint error',
                error: error.message,
                field: error.fields
            });
        }
        
        console.error('================================');
        
        return res.status(400).json({
            success: false,
            message: 'Error updating maintenance',
            error: error.message
        });
    }
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

/**
 * GET /api/maintenance/my-work
 * Lấy công việc của technician
 */
const getMyWork = async (req, res) => {
    try {
        const { Maintenance, Assets, User } = require('../models');
        
        const maintenance = await Maintenance.findAll({
            where: {
                technician_id: req.user.id,
                is_deleted: false,
                status: ['pending', 'approved', 'scheduled', 'in_progress', 'awaiting_acceptance']
            },
            include: [
                { model: Assets, as: 'asset', attributes: ['id', 'name', 'asset_code'] },
                { model: User, as: 'creator', attributes: ['id', 'name'] }
            ],
            order: [['scheduled_date', 'ASC']]
        });

        return res.status(200).json({
            success: true,
            data: maintenance
        });
    } catch (error) {
        console.error('Error fetching my work:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch work orders'
        });
    }
};

/**
 * GET /api/maintenance/results
 * Lấy kết quả bảo trì (completed/closed)
 */
const getMaintenanceResults = async (req, res) => {
    try {
        const { Maintenance, Assets, User } = require('../models');
        
        const maintenance = await Maintenance.findAll({
            where: {
                is_deleted: false,
                status: ['accepted', 'closed']
            },
            include: [
                { model: Assets, as: 'asset', attributes: ['id', 'name', 'asset_code'] },
                { model: User, as: 'technician', attributes: ['id', 'name'] },
                { model: User, as: 'creator', attributes: ['id', 'name'] }
            ],
            order: [['updated_at', 'DESC']],
            limit: 100
        });

        return res.status(200).json({
            success: true,
            data: maintenance
        });
    } catch (error) {
        console.error('Error fetching maintenance results:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch maintenance results'
        });
    }
};

/**
 * GET /api/maintenance/reports/summary
 * Báo cáo tổng hợp bảo trì
 */
const getMaintenanceReportSummary = async (req, res) => {
    try {
        const { period = 'month', month, year } = req.query;
        const { Maintenance } = require('../models');
        const { Op } = require('sequelize');

        const now = new Date();
        const currentYear = parseInt(year) || now.getFullYear();
        const currentMonth = parseInt(month) || now.getMonth() + 1;

        let startDate, endDate;
        
        if (period === 'month') {
            startDate = new Date(currentYear, currentMonth - 1, 1);
            endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);
        } else if (period === 'year') {
            startDate = new Date(currentYear, 0, 1);
            endDate = new Date(currentYear, 11, 31, 23, 59, 59);
        } else {
            // Default to last 30 days
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            endDate = now;
        }

        const maintenance = await Maintenance.findAll({
            where: {
                is_deleted: false,
                scheduled_date: {
                    [Op.between]: [startDate, endDate]
                }
            }
        });

        const summary = {
            total: maintenance.length,
            by_status: {},
            by_type: {},
            completed_count: 0,
            on_time_count: 0,
            avg_duration: 0
        };

        maintenance.forEach(m => {
            // Count by status
            summary.by_status[m.status] = (summary.by_status[m.status] || 0) + 1;
            
            // Count by type
            summary.by_type[m.maintenance_type] = (summary.by_type[m.maintenance_type] || 0) + 1;
            
            // Completed count
            if (['accepted', 'closed'].includes(m.status)) {
                summary.completed_count++;
                
                // On-time count (completed before scheduled_date)
                if (m.actual_end_date && m.scheduled_date && 
                    new Date(m.actual_end_date) <= new Date(m.scheduled_date)) {
                    summary.on_time_count++;
                }
            }
        });

        // Calculate average duration for completed
        const completedWithDuration = maintenance.filter(m => 
            ['accepted', 'closed'].includes(m.status) && m.actual_duration
        );
        
        if (completedWithDuration.length > 0) {
            const totalDuration = completedWithDuration.reduce((sum, m) => sum + (m.actual_duration || 0), 0);
            summary.avg_duration = (totalDuration / completedWithDuration.length).toFixed(2);
        }

        summary.completion_rate = summary.total > 0 
            ? ((summary.completed_count / summary.total) * 100).toFixed(2) 
            : 0;
        
        summary.on_time_rate = summary.completed_count > 0 
            ? ((summary.on_time_count / summary.completed_count) * 100).toFixed(2) 
            : 0;

        // Format response to match frontend structure
        const response = {
            current: {
                total: summary.total,
                completed: summary.completed_count,
                completionRate: parseFloat(summary.completion_rate),
                onTimeRate: parseFloat(summary.on_time_rate),
                avgDuration: parseFloat(summary.avg_duration),
                cleaning: summary.by_type.cleaning || 0,
                inspection: summary.by_type.inspection || 0,
                maintenance: summary.by_type.maintenance || 0,
                corrective: summary.by_type.corrective || 0,
                preventive: summary.by_type.preventive || 0,
                pending: summary.by_status.pending || 0,
                approved: summary.by_status.approved || 0,
                scheduled: summary.by_status.scheduled || 0,
                in_progress: summary.by_status.in_progress || 0,
                awaiting_acceptance: summary.by_status.awaiting_acceptance || 0,
                awaiting_approval: summary.by_status.awaiting_approval || 0,
                totalCost: completedWithDuration.reduce((sum, m) => sum + (m.cost || 0), 0)
            },
            changes: {
                total: 0,
                completed: 0,
                completionRate: 0,
                cost: 0
            }
        };

        return res.status(200).json({
            success: true,
            data: response,
            period: {
                type: period,
                start: startDate,
                end: endDate
            }
        });
    } catch (error) {
        console.error('Error fetching maintenance report:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate maintenance report'
        });
    }
};

/**
 * GET /api/maintenance/reports/monthly
 * Báo cáo theo tháng (12 tháng)
 */
const getMonthlyReport = async (req, res) => {
    try {
        const { year } = req.query;
        const { Maintenance } = require('../models');
        const { Op } = require('sequelize');

        const currentYear = parseInt(year) || new Date().getFullYear();
        const monthlyData = [];

        for (let month = 1; month <= 12; month++) {
            const startDate = new Date(currentYear, month - 1, 1);
            const endDate = new Date(currentYear, month, 0, 23, 59, 59);

            const maintenance = await Maintenance.findAll({
                where: {
                    is_deleted: false,
                    scheduled_date: {
                        [Op.between]: [startDate, endDate]
                    }
                }
            });

            const monthData = {
                month: `T${month}`,
                total: maintenance.length,
                cleaning: 0,
                inspection: 0,
                maintenance: 0,
                corrective: 0,
                completed: 0
            };

            maintenance.forEach(m => {
                if (m.maintenance_type === 'cleaning') monthData.cleaning++;
                if (m.maintenance_type === 'inspection') monthData.inspection++;
                if (m.maintenance_type === 'maintenance') monthData.maintenance++;
                if (m.maintenance_type === 'corrective') monthData.corrective++;
                if (['accepted', 'closed'].includes(m.status)) monthData.completed++;
            });

            monthlyData.push(monthData);
        }

        return res.status(200).json({
            success: true,
            data: monthlyData
        });
    } catch (error) {
        console.error('Error fetching monthly report:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate monthly report'
        });
    }
};

module.exports = {
    // Read operations
    getAllMaintenance,
    getMaintenanceById,
    createMaintenance,
    getMyWork,
    getMaintenanceResults,
    getMaintenanceReportSummary,
    getMonthlyReport,
    
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
