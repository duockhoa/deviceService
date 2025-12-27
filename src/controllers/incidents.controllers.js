/**
 * Incident Controller - Action-based endpoints
 * Sử dụng IncidentService để xử lý business logic
 */

const IncidentService = require('../service/IncidentService');
const { INCIDENT_ACTIONS } = require('../utils/stateMachine');
const { Op } = require('sequelize');
const Incidents = require('../models/incidents.model');
const User = require('../models/user.model');
const Assets = require('../models/assets.model');

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
 * POST /api/v1/incidents/:id/acknowledge
 * Action: Tiếp nhận và bắt đầu xử lý sự cố (thay cho triage + assign)
 * Body: { notes: string, assigned_to: userId (optional) }
 */
const acknowledgeIncident = async (req, res) => {
    const result = await IncidentService.handleAction(
        req.params.id,
        INCIDENT_ACTIONS.ACKNOWLEDGE,
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
        message: 'Incident acknowledged and in progress',
        data: result.data
    });
};

/**
 * POST /api/v1/incidents/:id/resolve
 * Action: Đánh dấu sự cố đã được giải quyết
 * Body: { solution: string, root_cause: string, downtime_minutes: number }
 */
const resolveIncident = async (req, res) => {
    const result = await IncidentService.handleAction(
        req.params.id,
        INCIDENT_ACTIONS.RESOLVE,
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
        message: 'Incident resolved successfully',
        data: result.data
    });
};

/**
 * POST /api/v1/incidents/:id/convert-to-maintenance
 * Chuyển sự cố thiết bị thành lệnh bảo trì
 * Tạo maintenance order mới, link incident_id, chuyển status
 * Chỉ cho incident_category = EQUIPMENT
 */
const convertToMaintenance = async (req, res) => {
    try {
        const result = await IncidentService.convertToMaintenance(
            req.params.id,
            req.body,
            req.user
        );

        if (!result.success) {
            return res.status(result.code || 500).json({
                success: false,
                message: result.error
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Đã chuyển sang lệnh bảo trì thành công',
            data: result.data
        });
    } catch (error) {
        console.error('Error converting to maintenance:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Không thể chuyển sang bảo trì'
        });
    }
};

/**
 * POST /api/v1/incidents/:id/start
 * Action: Bắt đầu xử lý
 */
// ==================== DEPRECATED ACTION ENDPOINTS ====================
// These are kept for backward compatibility but should not be used in new code
// Use acknowledgeIncident and resolveIncident instead

/*
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
*/

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

/**
 * GET /api/v1/incidents/reports
 * Báo cáo thống kê sự cố
 */
const getIncidentReports = async (req, res) => {
    try {
        const { startDate, endDate, technician } = req.query;
        
        const whereClause = {
            reported_date: {
                [Op.between]: [
                    new Date(startDate || new Date().setDate(new Date().getDate() - 30)),
                    new Date(endDate || new Date())
                ]
            }
        };

        if (technician && technician !== 'all') {
            whereClause.assigned_to = technician;
        }

        const incidents = await Incidents.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'assigned_technician', attributes: ['id', 'name'] },
                { model: User, as: 'reporter', attributes: ['id', 'name'] },
                { model: Assets, as: 'asset', attributes: ['id', 'name', 'asset_code'] }
            ]
        });

        // Calculate metrics
        const responseTimes = [];
        const resolutionTimes = [];
        const technicianStats = {};

        incidents.forEach(incident => {
            // Response time: reported_date → triaged_at
            if (incident.triaged_at) {
                const responseHours = (new Date(incident.triaged_at) - new Date(incident.reported_date)) / (1000 * 60 * 60);
                responseTimes.push(responseHours);
            }

            // Resolution time: reported_date → resolved_date
            if (incident.resolved_date) {
                const resolutionHours = (new Date(incident.resolved_date) - new Date(incident.reported_date)) / (1000 * 60 * 60);
                resolutionTimes.push(resolutionHours);
            }

            // Technician stats
            const techId = incident.assigned_to;
            if (techId) {
                if (!technicianStats[techId]) {
                    technicianStats[techId] = {
                        id: techId,
                        name: incident.assigned_technician?.name || 'N/A',
                        total: 0,
                        resolved: 0,
                        totalTime: 0,
                        passCount: 0,
                        failCount: 0
                    };
                }
                
                technicianStats[techId].total++;
                
                if (incident.status === 'resolved' || incident.status === 'closed') {
                    technicianStats[techId].resolved++;
                    if (incident.resolved_date) {
                        const hours = (new Date(incident.resolved_date) - new Date(incident.reported_date)) / (1000 * 60 * 60);
                        technicianStats[techId].totalTime += hours;
                    }
                }

                if (incident.post_fix_status === 'pass') {
                    technicianStats[techId].passCount++;
                } else if (incident.post_fix_status === 'fail') {
                    technicianStats[techId].failCount++;
                }
            }
        });

        // Calculate averages
        const avgResponseTime = responseTimes.length > 0
            ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1)
            : 0;

        const avgResolutionTime = resolutionTimes.length > 0
            ? (resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length).toFixed(1)
            : 0;

        const totalIncidents = incidents.length;
        const resolvedIncidents = incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length;
        const resolvedRate = totalIncidents > 0 ? ((resolvedIncidents / totalIncidents) * 100).toFixed(0) : 0;

        // Format technician stats
        const technicianStatsArray = Object.values(technicianStats).map(tech => ({
            name: tech.name,
            total: tech.total,
            resolved: tech.resolved,
            avgTime: tech.resolved > 0 ? (tech.totalTime / tech.resolved).toFixed(1) + 'h' : 'N/A',
            passRate: (tech.passCount + tech.failCount) > 0 
                ? ((tech.passCount / (tech.passCount + tech.failCount)) * 100).toFixed(0) + '%'
                : 'N/A',
            rating: tech.total > 0 ? Math.min(5, 3 + (tech.passCount / tech.total) * 2).toFixed(1) : 'N/A'
        }));

        // Get unique technicians
        const uniqueTechIds = [...new Set(incidents.map(i => i.assigned_to).filter(Boolean))];
        const technicians = await User.findAll({
            attributes: ['id', 'name'],
            where: { id: { [Op.in]: uniqueTechIds } }
        });

        res.json({
            success: true,
            data: {
                avgResponseTime: avgResponseTime + 'h',
                avgResolutionTime: avgResolutionTime + 'h',
                totalIncidents,
                resolvedIncidents,
                resolvedRate: resolvedRate + '%',
                technicianStats: technicianStatsArray,
                technicians: technicians.map(t => ({ id: t.id, name: t.name }))
            }
        });

    } catch (error) {
        console.error('Error generating incident reports:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể tạo báo cáo',
            error: error.message
        });
    }
};

/**
 * GET /api/v1/incidents/reports/export
 * Xuất báo cáo Excel
 */
const exportIncidentReports = async (req, res) => {
    try {
        res.status(501).json({
            success: false,
            message: 'Tính năng xuất Excel đang được phát triển'
        });
    } catch (error) {
        console.error('Error exporting report:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể xuất báo cáo'
        });
    }
};

module.exports = {
    // Read operations
    getAllIncidents,
    getIncidentById,
    createIncident,
    
    // Reports
    getIncidentReports,
    exportIncidentReports,
    
    // Action endpoints (Simplified)
    acknowledgeIncident,    // NEW: Tiếp nhận xử lý (thay cho triage + assign)
    resolveIncident,         // NEW: Đánh dấu đã giải quyết
    closeIncident,
    cancelIncident,
    convertToMaintenance,    // Tạo maintenance từ incident
    
    // Legacy (deprecated - keep for backward compatibility)
    updateIncident,
    deleteIncident
};
