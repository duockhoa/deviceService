/**
 * Reports Controller - Analytics & CAPA endpoints
 */

const { Incidents, Assets, Maintenance, User } = require('../models');
const { Op } = require('sequelize');

/**
 * GET /api/reports/incidents/downtime
 * Báo cáo downtime theo asset/period
 * Query: ?asset_id=123&startDate=2025-01-01&endDate=2025-12-31
 */
const getIncidentDowntime = async (req, res) => {
    try {
        const { asset_id, startDate, endDate, groupBy = 'asset' } = req.query;

        const where = {
            downtime_minutes: { [Op.not]: null }
        };

        if (asset_id) where.asset_id = asset_id;
        if (startDate || endDate) {
            where.reported_date = {};
            if (startDate) where.reported_date[Op.gte] = new Date(startDate);
            if (endDate) where.reported_date[Op.lte] = new Date(endDate);
        }

        let groupByField = 'asset_id';
        let includeModels = [
            { model: Assets, as: 'asset', attributes: ['id', 'asset_code', 'name'] }
        ];

        if (groupBy === 'severity') {
            groupByField = 'severity';
            includeModels = [];
        } else if (groupBy === 'month') {
            groupByField = [
                Incidents.sequelize.fn('YEAR', Incidents.sequelize.col('reported_date')),
                Incidents.sequelize.fn('MONTH', Incidents.sequelize.col('reported_date'))
            ];
        }

        const results = await Incidents.findAll({
            where,
            attributes: [
                ...(Array.isArray(groupByField) ? [] : [groupByField]),
                [Incidents.sequelize.fn('COUNT', Incidents.sequelize.col('incidents.id')), 'incident_count'],
                [Incidents.sequelize.fn('SUM', Incidents.sequelize.col('downtime_minutes')), 'total_downtime_minutes'],
                [Incidents.sequelize.fn('AVG', Incidents.sequelize.col('downtime_minutes')), 'avg_downtime_minutes'],
                [Incidents.sequelize.fn('MAX', Incidents.sequelize.col('downtime_minutes')), 'max_downtime_minutes']
            ],
            include: includeModels,
            group: Array.isArray(groupByField) ? groupByField : [groupByField],
            order: [[Incidents.sequelize.literal('total_downtime_minutes'), 'DESC']]
        });

        const data = results.map(r => {
            const json = r.toJSON();
            return {
                ...json,
                total_downtime_hours: (json.total_downtime_minutes / 60).toFixed(2),
                avg_downtime_hours: (json.avg_downtime_minutes / 60).toFixed(2),
                max_downtime_hours: (json.max_downtime_minutes / 60).toFixed(2)
            };
        });

        return res.status(200).json({
            success: true,
            data,
            summary: {
                total_incidents: data.reduce((sum, d) => sum + parseInt(d.incident_count || 0), 0),
                total_downtime_hours: data.reduce((sum, d) => sum + parseFloat(d.total_downtime_hours || 0), 0).toFixed(2)
            }
        });
    } catch (error) {
        console.error('Error getting downtime report:', error);
        return res.status(500).json({
            success: false,
            message: 'Error generating downtime report',
            error: error.message
        });
    }
};

/**
 * GET /api/reports/incidents/pareto
 * Pareto analysis theo root_cause/component
 * Query: ?startDate=2025-01-01&endDate=2025-12-31&groupBy=root_cause
 */
const getIncidentPareto = async (req, res) => {
    try {
        const { startDate, endDate, groupBy = 'root_cause' } = req.query;

        const where = {
            [groupBy]: { [Op.not]: null }
        };

        if (startDate || endDate) {
            where.reported_date = {};
            if (startDate) where.reported_date[Op.gte] = new Date(startDate);
            if (endDate) where.reported_date[Op.lte] = new Date(endDate);
        }

        const results = await Incidents.findAll({
            where,
            attributes: [
                groupBy,
                [Incidents.sequelize.fn('COUNT', Incidents.sequelize.col('id')), 'count'],
                [Incidents.sequelize.fn('SUM', Incidents.sequelize.col('downtime_minutes')), 'total_downtime']
            ],
            group: [groupBy],
            order: [[Incidents.sequelize.literal('count'), 'DESC']]
        });

        const totalCount = results.reduce((sum, r) => sum + parseInt(r.dataValues.count), 0);
        let cumulativeCount = 0;
        let cumulativePercent = 0;

        const data = results.map(r => {
            const count = parseInt(r.dataValues.count);
            const percent = (count / totalCount * 100).toFixed(2);
            cumulativeCount += count;
            cumulativePercent = (cumulativeCount / totalCount * 100).toFixed(2);

            return {
                [groupBy]: r.dataValues[groupBy],
                count,
                percent: parseFloat(percent),
                cumulative_count: cumulativeCount,
                cumulative_percent: parseFloat(cumulativePercent),
                total_downtime_hours: r.dataValues.total_downtime 
                    ? (r.dataValues.total_downtime / 60).toFixed(2) 
                    : '0.00'
            };
        });

        return res.status(200).json({
            success: true,
            data,
            summary: {
                total_incidents: totalCount,
                top_3: data.slice(0, 3).map(d => ({
                    [groupBy]: d[groupBy],
                    count: d.count,
                    percent: d.percent
                }))
            }
        });
    } catch (error) {
        console.error('Error getting Pareto analysis:', error);
        return res.status(500).json({
            success: false,
            message: 'Error generating Pareto analysis',
            error: error.message
        });
    }
};

/**
 * GET /api/reports/mtbf-mttr
 * Tính MTBF (Mean Time Between Failures) và MTTR (Mean Time To Repair)
 * Query: ?asset_id=123&startDate=2025-01-01&endDate=2025-12-31
 */
const getMtbfMttr = async (req, res) => {
    try {
        const { asset_id, startDate, endDate } = req.query;

        const incidentWhere = {};
        const maintenanceWhere = { is_deleted: false };

        if (asset_id) {
            incidentWhere.asset_id = asset_id;
            maintenanceWhere.asset_id = asset_id;
        }

        if (startDate || endDate) {
            incidentWhere.reported_date = {};
            maintenanceWhere.scheduled_date = {};
            if (startDate) {
                incidentWhere.reported_date[Op.gte] = new Date(startDate);
                maintenanceWhere.scheduled_date[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                incidentWhere.reported_date[Op.lte] = new Date(endDate);
                maintenanceWhere.scheduled_date[Op.lte] = new Date(endDate);
            }
        }

        // MTTR: Average time from incident start to resolved
        const mttrData = await Incidents.findAll({
            where: {
                ...incidentWhere,
                started_date: { [Op.not]: null },
                resolved_date: { [Op.not]: null }
            },
            attributes: [
                'asset_id',
                [Incidents.sequelize.fn('COUNT', Incidents.sequelize.col('incidents.id')), 'incident_count'],
                [Incidents.sequelize.fn('AVG', 
                    Incidents.sequelize.literal('TIMESTAMPDIFF(MINUTE, started_date, resolved_date)')
                ), 'avg_repair_time_minutes']
            ],
            include: [
                { model: Assets, as: 'asset', attributes: ['id', 'asset_code', 'name'] }
            ],
            group: ['asset_id']
        });

        // MTBF: Average time between failures
        const incidents = await Incidents.findAll({
            where: {
                ...incidentWhere,
                reported_date: { [Op.not]: null }
            },
            attributes: ['asset_id', 'reported_date'],
            order: [['asset_id', 'ASC'], ['reported_date', 'ASC']]
        });

        const mtbfByAsset = {};
        let currentAsset = null;
        let lastDate = null;
        let intervals = [];

        incidents.forEach(inc => {
            if (currentAsset !== inc.asset_id) {
                if (intervals.length > 0) {
                    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                    mtbfByAsset[currentAsset] = avgInterval;
                }
                currentAsset = inc.asset_id;
                lastDate = new Date(inc.reported_date);
                intervals = [];
            } else if (lastDate) {
                const interval = (new Date(inc.reported_date) - lastDate) / (1000 * 60 * 60); // hours
                intervals.push(interval);
                lastDate = new Date(inc.reported_date);
            }
        });

        // Last asset
        if (intervals.length > 0 && currentAsset) {
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            mtbfByAsset[currentAsset] = avgInterval;
        }

        // Combine MTTR and MTBF
        const data = mttrData.map(m => {
            const json = m.toJSON();
            const mtbf = mtbfByAsset[json.asset_id] || 0;
            const mttr = json.avg_repair_time_minutes || 0;
            const availability = mtbf > 0 ? ((mtbf - mttr/60) / mtbf * 100).toFixed(2) : 0;

            return {
                asset: json.asset,
                incident_count: json.incident_count,
                mttr_hours: (mttr / 60).toFixed(2),
                mtbf_hours: mtbf.toFixed(2),
                availability_percent: parseFloat(availability)
            };
        });

        return res.status(200).json({
            success: true,
            data,
            summary: {
                avg_mttr_hours: data.length > 0 
                    ? (data.reduce((sum, d) => sum + parseFloat(d.mttr_hours), 0) / data.length).toFixed(2)
                    : '0.00',
                avg_mtbf_hours: data.length > 0
                    ? (data.reduce((sum, d) => sum + parseFloat(d.mtbf_hours), 0) / data.length).toFixed(2)
                    : '0.00'
            }
        });
    } catch (error) {
        console.error('Error calculating MTBF/MTTR:', error);
        return res.status(500).json({
            success: false,
            message: 'Error calculating MTBF/MTTR',
            error: error.message
        });
    }
};

/**
 * GET /api/reports/capa
 * Danh sách CAPA (Corrective and Preventive Actions)
 * Query: ?status=open&severity=critical
 */
const getCapaList = async (req, res) => {
    try {
        const { status, severity } = req.query;

        const where = {
            capa_required: true
        };

        if (severity) where.severity = severity;
        if (status === 'open') {
            where.status = { [Op.notIn]: ['closed', 'cancelled'] };
        } else if (status === 'closed') {
            where.status = 'closed';
        }

        const incidents = await Incidents.findAll({
            where,
            attributes: [
                'id',
                'incident_code',
                'title',
                'severity',
                'status',
                'root_cause',
                'prevention_measures',
                'capa_actions',
                'reported_date',
                'closed_date'
            ],
            include: [
                { model: Assets, as: 'asset', attributes: ['id', 'asset_code', 'name'] },
                { model: User, as: 'assignee', attributes: ['id', 'name'] }
            ],
            order: [['severity', 'DESC'], ['reported_date', 'DESC']]
        });

        const data = incidents.map(inc => {
            const json = inc.toJSON();
            return {
                ...json,
                capa_status: json.status === 'closed' ? 'completed' : 'open',
                age_days: Math.floor((new Date() - new Date(json.reported_date)) / (1000 * 60 * 60 * 24))
            };
        });

        const summary = {
            total: data.length,
            by_severity: {
                critical: data.filter(d => d.severity === 'critical').length,
                high: data.filter(d => d.severity === 'high').length,
                medium: data.filter(d => d.severity === 'medium').length,
                low: data.filter(d => d.severity === 'low').length
            },
            open: data.filter(d => d.capa_status === 'open').length,
            completed: data.filter(d => d.capa_status === 'completed').length
        };

        return res.status(200).json({
            success: true,
            data,
            summary
        });
    } catch (error) {
        console.error('Error getting CAPA list:', error);
        return res.status(500).json({
            success: false,
            message: 'Error retrieving CAPA list',
            error: error.message
        });
    }
};

/**
 * GET /api/reports/dashboard
 * Dashboard summary - tổng hợp các chỉ số chính
 */
const getDashboardSummary = async (req, res) => {
    try {
        const { period = '30' } = req.query; // days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        const where = {
            reported_date: { [Op.gte]: startDate }
        };

        // Incident summary
        const totalIncidents = await Incidents.count({ where });
        const openIncidents = await Incidents.count({
            where: {
                ...where,
                status: { [Op.notIn]: ['closed', 'cancelled'] }
            }
        });

        const incidentsBySeverity = await Incidents.findAll({
            where,
            attributes: [
                'severity',
                [Incidents.sequelize.fn('COUNT', Incidents.sequelize.col('id')), 'count']
            ],
            group: ['severity']
        });

        // Maintenance summary
        const maintenanceWhere = {
            scheduled_date: { [Op.gte]: startDate },
            is_deleted: false
        };

        const totalMaintenance = await Maintenance.count({ where: maintenanceWhere });
        const pendingMaintenance = await Maintenance.count({
            where: {
                ...maintenanceWhere,
                status: { [Op.in]: ['pending', 'approved', 'scheduled'] }
            }
        });

        const completedMaintenance = await Maintenance.count({
            where: {
                ...maintenanceWhere,
                status: { [Op.in]: ['accepted', 'closed'] }
            }
        });

        // Downtime
        const totalDowntime = await Incidents.sum('downtime_minutes', { where }) || 0;

        // CAPA
        const openCapa = await Incidents.count({
            where: {
                capa_required: true,
                status: { [Op.notIn]: ['closed', 'cancelled'] }
            }
        });

        return res.status(200).json({
            success: true,
            data: {
                period_days: parseInt(period),
                incidents: {
                    total: totalIncidents,
                    open: openIncidents,
                    closed: totalIncidents - openIncidents,
                    by_severity: incidentsBySeverity.reduce((acc, item) => {
                        acc[item.severity] = parseInt(item.dataValues.count);
                        return acc;
                    }, {})
                },
                maintenance: {
                    total: totalMaintenance,
                    pending: pendingMaintenance,
                    completed: completedMaintenance,
                    completion_rate: totalMaintenance > 0 
                        ? ((completedMaintenance / totalMaintenance) * 100).toFixed(2)
                        : '0.00'
                },
                downtime: {
                    total_hours: (totalDowntime / 60).toFixed(2),
                    avg_per_incident: totalIncidents > 0 
                        ? ((totalDowntime / totalIncidents) / 60).toFixed(2)
                        : '0.00'
                },
                capa: {
                    open: openCapa
                }
            }
        });
    } catch (error) {
        console.error('Error getting dashboard summary:', error);
        return res.status(500).json({
            success: false,
            message: 'Error generating dashboard summary',
            error: error.message
        });
    }
};

/**
 * GET /api/reports/oee
 * OEE Report (Availability only - Level 1)
 */
const getOeeReport = async (req, res) => {
    try {
        const { dk_code, from, to, planned_hours = 160 } = req.query;
        const { Incidents, Assets } = require('../models');
        const { Op } = require('sequelize');

        const where = {
            status: { [Op.in]: ['resolved', 'closed'] }
        };

        if (dk_code) {
            where['$asset.dk_code$'] = dk_code;
        }
        if (from && to) {
            where.reported_date = {
                [Op.between]: [new Date(from), new Date(to)]
            };
        }

        const incidents = await Incidents.findAll({
            where,
            include: [{ model: Assets, as: 'asset', attributes: ['id', 'name', 'dk_code'] }],
            attributes: ['downtime_minutes']
        });

        const totalDowntime = incidents.reduce((sum, inc) => sum + (inc.downtime_minutes || 0), 0);
        const downtimeHours = totalDowntime / 60;
        const availableHours = planned_hours - downtimeHours;
        const availability = (availableHours / planned_hours * 100).toFixed(2);

        return res.status(200).json({
            success: true,
            data: {
                planned_hours: parseFloat(planned_hours),
                downtime_hours: parseFloat(downtimeHours.toFixed(2)),
                available_hours: parseFloat(availableHours.toFixed(2)),
                availability_percent: parseFloat(availability),
                oee_level1: parseFloat(availability), // OEE Level 1 = Availability
                incident_count: incidents.length,
                period: { from, to }
            }
        });
    } catch (error) {
        console.error('Error getting OEE report:', error);
        return res.status(500).json({
            success: false,
            message: 'Error generating OEE report',
            error: error.message
        });
    }
};

/**
 * GET /api/reports/mtbf
 * MTBF Report
 */
const getMtbfReport = async (req, res) => {
    try {
        const { dk_code, from, to } = req.query;
        const { Incidents, Assets } = require('../models');
        const { Op } = require('sequelize');

        const where = {
            status: { [Op.in]: ['resolved', 'closed'] }
        };

        if (dk_code) {
            where['$asset.dk_code$'] = dk_code;
        }
        if (from && to) {
            where.reported_date = {
                [Op.between]: [new Date(from), new Date(to)]
            };
        }

        const incidents = await Incidents.findAll({
            where,
            include: [{ model: Assets, as: 'asset', attributes: ['id', 'name', 'dk_code'] }],
            order: [['reported_date', 'ASC']]
        });

        if (incidents.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    mtbf_hours: 0,
                    failure_count: 0,
                    operating_hours: 0,
                    period: { from, to }
                }
            });
        }

        // Calculate operating hours
        const startDate = new Date(from);
        const endDate = new Date(to);
        const operatingHours = (endDate - startDate) / (1000 * 60 * 60);
        
        const mtbf = incidents.length > 0 ? (operatingHours / incidents.length).toFixed(2) : 0;

        return res.status(200).json({
            success: true,
            data: {
                mtbf_hours: parseFloat(mtbf),
                failure_count: incidents.length,
                operating_hours: parseFloat(operatingHours.toFixed(2)),
                period: { from, to }
            }
        });
    } catch (error) {
        console.error('Error getting MTBF report:', error);
        return res.status(500).json({
            success: false,
            message: 'Error generating MTBF report',
            error: error.message
        });
    }
};

module.exports = {
    getIncidentDowntime,
    getIncidentPareto,
    getMtbfMttr,
    getCapaList,
    getDashboardSummary,
    getOeeReport,
    getMtbfReport
};
