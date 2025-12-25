/**
 * Calibration Reports Controller - GMP Compliance Reports
 */

const CalibrationService = require('../services/CalibrationService');
const { Op } = require('sequelize');
const Asset = require('../models/assets.model');
const CalibrationOrder = require('../models/calibrationOrder.model');

class CalibrationReportsController {
    /**
     * GET /api/reports/calibration/compliance
     * Get calibration compliance report
     * GMP Requirement: Track compliance rate, overdue count, OOT incidents
     */
    static async getComplianceReport(req, res) {
        try {
            const from = req.query.from || new Date(new Date().getFullYear(), 0, 1); // Start of year
            const to = req.query.to || new Date();
            
            const report = await CalibrationService.getComplianceReport(from, to);
            
            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            console.error('Error generating compliance report:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    /**
     * GET /api/reports/calibration/overdue
     * Get detailed overdue calibration report
     * GMP Critical: All overdue equipment must be tracked
     */
    static async getOverdueReport(req, res) {
        try {
            const assets = await CalibrationService.getOverdueAssets();
            
            // Calculate days overdue
            const now = new Date();
            const enriched = assets.map(asset => {
                const days_overdue = Math.floor((now - new Date(asset.next_due_at)) / (1000 * 60 * 60 * 24));
                
                return {
                    asset_id: asset.id,
                    dk_code: asset.dk_code,
                    asset_name: asset.name,
                    last_calibrated_at: asset.last_calibrated_at,
                    next_due_at: asset.next_due_at,
                    days_overdue,
                    calibration_status: asset.calibration_status,
                    operational_status: asset.operational_status,
                    calibration_interval_days: asset.calibration_interval_days,
                    location: asset.location,
                    responsible_person: asset.responsible_person
                };
            });
            
            // Sort by days_overdue descending (most critical first)
            enriched.sort((a, b) => b.days_overdue - a.days_overdue);
            
            res.json({
                success: true,
                data: {
                    total_overdue: enriched.length,
                    critical_count: enriched.filter(a => a.days_overdue > 90).length, // > 3 months
                    high_count: enriched.filter(a => a.days_overdue > 30 && a.days_overdue <= 90).length,
                    medium_count: enriched.filter(a => a.days_overdue <= 30).length,
                    assets: enriched
                }
            });
        } catch (error) {
            console.error('Error generating overdue report:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    /**
     * GET /api/reports/calibration/oot
     * Get Out of Tolerance incidents report
     * GMP Critical: Track all OOT events for quality investigation
     */
    static async getOOTReport(req, res) {
        try {
            const from = req.query.from;
            const to = req.query.to;
            
            const where = {
                status: { [Op.in]: ['out_of_tolerance', 'corrective_action', 'closed'] },
                oot_detected_at: { [Op.ne]: null }
            };
            
            if (from || to) {
                where.oot_detected_at = {};
                if (from) where.oot_detected_at[Op.gte] = from;
                if (to) where.oot_detected_at[Op.lte] = to;
            }
            
            const orders = await CalibrationOrder.findAll({
                where,
                include: [
                    { model: Asset, as: 'asset', attributes: ['id', 'dk_code', 'name', 'location'] }
                ],
                order: [['oot_detected_at', 'DESC']]
            });
            
            // Group by severity
            const bySeverity = {
                critical: orders.filter(o => o.oot_severity === 'critical'),
                major: orders.filter(o => o.oot_severity === 'major'),
                minor: orders.filter(o => o.oot_severity === 'minor')
            };
            
            // Average resolution time (for closed OOT cases)
            const closed_oot = orders.filter(o => o.status === 'closed' && o.completed_at);
            const avg_resolution_days = closed_oot.length > 0 
                ? closed_oot.reduce((sum, o) => {
                    const days = (new Date(o.completed_at) - new Date(o.oot_detected_at)) / (1000 * 60 * 60 * 24);
                    return sum + days;
                }, 0) / closed_oot.length
                : 0;
            
            res.json({
                success: true,
                data: {
                    total_oot_count: orders.length,
                    critical_count: bySeverity.critical.length,
                    major_count: bySeverity.major.length,
                    minor_count: bySeverity.minor.length,
                    open_count: orders.filter(o => o.status !== 'closed').length,
                    closed_count: closed_oot.length,
                    avg_resolution_days: Math.round(avg_resolution_days * 10) / 10,
                    incidents: orders.map(o => ({
                        order_id: o.id,
                        order_code: o.order_code,
                        asset_id: o.asset_id,
                        dk_code: o.asset?.dk_code,
                        asset_name: o.asset?.name,
                        location: o.asset?.location,
                        oot_severity: o.oot_severity,
                        oot_detected_at: o.oot_detected_at,
                        oot_description: o.oot_description,
                        status: o.status,
                        corrective_action_notes: o.corrective_action_notes,
                        maintenance_id: o.maintenance_id,
                        capa_id: o.capa_id,
                        completed_at: o.completed_at
                    }))
                }
            });
        } catch (error) {
            console.error('Error generating OOT report:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    /**
     * GET /api/reports/calibration/due-soon
     * Get assets due for calibration soon
     * Helps with planning
     */
    static async getDueSoonReport(req, res) {
        try {
            const days = parseInt(req.query.days) || 30;
            const assets = await CalibrationService.getAssetsDueSoon(days);
            
            // Group by urgency
            const now = new Date();
            const enriched = assets.map(asset => {
                const days_until_due = Math.floor((new Date(asset.next_due_at) - now) / (1000 * 60 * 60 * 24));
                
                let urgency;
                if (days_until_due <= 7) urgency = 'critical';
                else if (days_until_due <= 14) urgency = 'high';
                else urgency = 'medium';
                
                return {
                    asset_id: asset.id,
                    dk_code: asset.dk_code,
                    asset_name: asset.name,
                    next_due_at: asset.next_due_at,
                    days_until_due,
                    urgency,
                    calibration_interval_days: asset.calibration_interval_days,
                    location: asset.location
                };
            });
            
            // Sort by days_until_due ascending (most urgent first)
            enriched.sort((a, b) => a.days_until_due - b.days_until_due);
            
            res.json({
                success: true,
                data: {
                    total_due_soon: enriched.length,
                    critical_count: enriched.filter(a => a.urgency === 'critical').length,
                    high_count: enriched.filter(a => a.urgency === 'high').length,
                    medium_count: enriched.filter(a => a.urgency === 'medium').length,
                    assets: enriched
                }
            });
        } catch (error) {
            console.error('Error generating due soon report:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    /**
     * GET /api/reports/calibration/summary
     * Get calibration summary dashboard
     */
    static async getSummaryDashboard(req, res) {
        try {
            // Total assets requiring calibration
            const total_assets = await Asset.count({ where: { requires_calibration: true } });
            
            // Status breakdown
            const status_breakdown = await Asset.findAll({
                where: { requires_calibration: true },
                attributes: [
                    'calibration_status',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['calibration_status'],
                raw: true
            });
            
            // Operational status of calibration assets
            const operational_breakdown = await Asset.findAll({
                where: { requires_calibration: true },
                attributes: [
                    'operational_status',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['operational_status'],
                raw: true
            });
            
            // Active calibration orders by status
            const active_orders = await CalibrationOrder.findAll({
                where: {
                    status: { [Op.notIn]: ['closed', 'cancelled'] }
                },
                attributes: [
                    'status',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['status'],
                raw: true
            });
            
            // Get compliance report for current year
            const year_start = new Date(new Date().getFullYear(), 0, 1);
            const compliance = await CalibrationService.getComplianceReport(year_start, new Date());
            
            res.json({
                success: true,
                data: {
                    total_assets_requiring_calibration: total_assets,
                    calibration_status_breakdown: status_breakdown,
                    operational_status_breakdown: operational_breakdown,
                    active_orders_by_status: active_orders,
                    compliance_rate: compliance.compliance_rate,
                    overdue_count: compliance.overdue,
                    oot_count_ytd: compliance.oot_count,
                    completed_count_ytd: compliance.completed_count
                }
            });
        } catch (error) {
            console.error('Error generating summary dashboard:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = CalibrationReportsController;
