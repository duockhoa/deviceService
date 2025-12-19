const { Op } = require('sequelize');
const { Incidents, Maintenance, Assets, AssetSubCategories, AssetCategories, Areas, Plants } = require('../models');
const { listStoredBatches, toNumber } = require('../service/oeeImport.service');
const { normalizeCode } = require('../utils/normalize');

const parseDateRange = (from, to) => {
    const range = {};
    if (from) {
        const start = new Date(from);
        if (!isNaN(start)) {
            range[Op.gte] = start;
        }
    }
    if (to) {
        const end = new Date(to);
        if (!isNaN(end)) {
            range[Op.lte] = end;
        }
    }
    return Object.keys(range).length > 0 ? range : null;
};

const enforceDateRangeLimit = (from, to, maxDays = 185) => {
    if (!from || !to) return null;
    const start = new Date(from);
    const end = new Date(to);
    if (isNaN(start) || isNaN(end)) return null;
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
    return diffDays > maxDays ? { tooWide: true, diffDays } : null;
};

const loadImportOeeRows = async ({ from, to, assetIds = new Set(), normalizedCode }) => {
    const batches = listStoredBatches();
    if (!batches.length) return [];
    const start = from ? new Date(from) : null;
    const end = to ? new Date(to) : null;
    const rows = [];
    batches.forEach((batch) => {
        const src = batch?.source_rows || [];
        const results = batch?.rows || [];
        // Map row_index -> asset_id from results
        const assetByIndex = new Map();
        results.forEach((r) => {
            assetByIndex.set(r.row_index, r.asset_id);
        });
        src.forEach((r, idx) => {
            const assetId = assetByIndex.get(idx) || null;
            const code = normalizeCode(r.dk_code || r.asset_code);
            if (normalizedCode && code !== normalizedCode) return;
            if (assetIds.size && !assetIds.has(assetId)) return;
            const d = r.date ? new Date(r.date) : null;
            if (start && d && d < start) return;
            if (end && d && d > end) return;
            rows.push({ ...r, asset_id: assetId, normalized_code: code });
        });
    });
    return rows;
};

const sumImportDowntimeMinutes = (row) => {
    return (
        (toNumber(row.downtime_unplanned_breakdown_minutes) || 0) +
        (toNumber(row.downtime_setup_changeover_minutes) || 0) +
        (toNumber(row.downtime_planned_maintenance_minutes) || 0) +
        (toNumber(row.downtime_unplanned_maintenance_minutes) || 0) +
        (toNumber(row.downtime_material_wait_minutes) || 0) +
        (toNumber(row.downtime_quality_hold_minutes) || 0) +
        (toNumber(row.downtime_other_minutes) || 0)
    );
};

const buildIncidentQuery = (filters = {}) => {
    const { dk_code, asset_id, area_id, category_id } = filters;
    const incidentWhere = {};
    const assetWhere = {};
    const assetIncludes = [];

    if (asset_id) {
        assetWhere.id = asset_id;
    }
    if (dk_code) {
        assetWhere.dk_code = dk_code;
    }
    if (area_id) {
        assetWhere.area_id = area_id;
    }
    if (category_id) {
        assetIncludes.push({
            model: AssetSubCategories,
            as: 'SubCategory',
            required: true,
            where: { category_id },
            include: [{
                model: AssetCategories,
                as: 'Category'
            }]
        });
    } else {
        // still include for response enrichment
        assetIncludes.push({
            model: AssetSubCategories,
            as: 'SubCategory',
            include: [{
                model: AssetCategories,
                as: 'Category'
            }]
        });
    }

    assetIncludes.push({
        model: Areas,
        as: 'Area',
        include: [{ model: Plants, as: 'Plant' }]
    });

    return { incidentWhere, assetWhere, assetIncludes };
};

const calculateMttr = (incidents = [], maintenanceMap = {}) => {
    const durations = incidents.map((inc) => {
        if (inc.downtime_hours !== null && inc.downtime_hours !== undefined) {
            return Number(inc.downtime_hours) || 0;
        }
        const m = inc.maintenance_id ? maintenanceMap[inc.maintenance_id] : null;
        if (m && m.actual_duration != null) {
            return Number(m.actual_duration) || 0;
        }
        return null;
    }).filter((v) => v !== null && !isNaN(v));

    if (!durations.length) return { value: null, status: 'insufficient_data' };
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    return { value: Number(avg.toFixed(2)), status: 'ok' };
};

const getIncidentTimestamp = (incident) => {
    const reported = incident?.reported_date ? new Date(incident.reported_date) : null;
    if (reported && !isNaN(reported)) return reported;
    const created = incident?.createdAt || incident?.created_at;
    if (created) {
        const d = new Date(created);
        if (!isNaN(d)) return d;
    }
    return null;
};

const calculateMtbf = (incidents = []) => {
    if (!incidents || incidents.length < 2) {
        return { value: null, status: 'insufficient_data' };
    }
    const sorted = [...incidents]
        .map((i) => ({ ...i, _ts: getIncidentTimestamp(i) }))
        .filter((i) => i._ts)
        .sort((a, b) => a._ts - b._ts);
    if (sorted.length < 2) return { value: null, status: 'insufficient_data' };

    const diffs = [];
    for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1]._ts;
        const curr = sorted[i]._ts;
        const hours = (curr - prev) / (1000 * 60 * 60);
        diffs.push(hours);
    }
    if (!diffs.length) return { value: null, status: 'insufficient_data' };
    const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    return { value: Number(avg.toFixed(2)), status: 'ok' };
};

const getMtbfReport = async (req, res) => {
    try {
        const { from, to, dk_code, asset_id, area_id, category_id } = req.query;
        const rangeIssue = enforceDateRangeLimit(from, to);
        if (rangeIssue?.tooWide) {
            return res.status(400).json({ success: false, message: 'Date range too wide, please limit to 185 days' });
        }
        const dateRange = parseDateRange(from, to);
        const { incidentWhere, assetWhere, assetIncludes } = buildIncidentQuery({ dk_code, asset_id, area_id, category_id });

        if (dateRange) {
            incidentWhere.reported_date = dateRange;
        }

        const incidents = await Incidents.findAll({
            where: incidentWhere,
            include: [{
                model: Assets,
                as: 'asset',
                required: true,
                where: assetWhere,
                include: assetIncludes
            }],
            order: [['reported_date', 'ASC']]
        });

        const maintenanceIds = incidents
            .map((i) => i.maintenance_id)
            .filter((id) => id);
        let maintenanceMap = {};
        if (maintenanceIds.length) {
            const maintenances = await Maintenance.findAll({
                where: { id: { [Op.in]: maintenanceIds } },
                attributes: ['id', 'actual_duration']
            });
            maintenanceMap = maintenances.reduce((acc, m) => {
                acc[m.id] = m;
                return acc;
            }, {});
        }

        const mttr = calculateMttr(incidents, maintenanceMap);
        const mtbf = calculateMtbf(incidents);
        const status = mtbf.status === 'insufficient_data' ? 'insufficient_data' : mttr.status;

        return res.status(200).json({
            success: true,
            data: {
                failure_count: incidents.length,
                mttr_hours_avg: mttr.value,
                mtbf_calendar_hours_avg: mtbf.value,
                status: status || 'ok',
                definition: 'MTBF tính theo thời gian lịch giữa các sự cố'
            }
        });
    } catch (error) {
        console.error('Error generating MTBF report:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating MTBF report',
            error: error.message
        });
    }
};

const getOeeReport = async (req, res) => {
    try {
        const { from, to, dk_code, asset_id, area_id, category_id, planned_hours } = req.query;
        const rangeIssue = enforceDateRangeLimit(from, to);
        if (rangeIssue?.tooWide) {
            return res.status(400).json({ success: false, message: 'Date range too wide, please limit to 185 days' });
        }
        const dateRange = parseDateRange(from, to);
        const { incidentWhere, assetWhere, assetIncludes } = buildIncidentQuery({ dk_code, asset_id, area_id, category_id });

        if (dateRange) {
            incidentWhere.reported_date = dateRange;
        }

        const parsedPlanned = planned_hours !== undefined ? parseFloat(planned_hours) : null;
        const planned = Number.isFinite(parsedPlanned) ? parsedPlanned : null;
        let status = 'ok';
        let availability = null;
        let downtime_hours = 0;

        // Prefer imported OEE data if available
        const normalizedCode = normalizeCode(dk_code || null);
        let assetIdsFilter = new Set();
        if (asset_id) assetIdsFilter.add(Number(asset_id));
        // If filter by area/category, fetch asset ids
        if (area_id || category_id) {
            const assetIds = await Assets.findAll({
                where: assetWhere,
                include: assetIncludes,
                attributes: ['id']
            });
            assetIds.forEach((a) => assetIdsFilter.add(a.id));
        }

        const importRows = await loadImportOeeRows({ from, to, assetIds: assetIdsFilter, normalizedCode });

        if (importRows.length) {
            const totalDowntimeMinutes = importRows.reduce((sum, row) => sum + sumImportDowntimeMinutes(row), 0);
            downtime_hours = totalDowntimeMinutes / 60;
            if (!planned || planned <= 0) {
                status = 'insufficient_data';
            } else {
                availability = Number(Math.max(0, Math.min(1, (planned - downtime_hours) / planned)).toFixed(4));
            }
        } else {
            // Fallback to incidents downtime
            const incidents = await Incidents.findAll({
                where: incidentWhere,
                include: [{
                    model: Assets,
                    as: 'asset',
                    required: true,
                    where: assetWhere,
                    include: assetIncludes
                }]
            });

            downtime_hours = incidents.reduce((sum, i) => {
                const val = i.downtime_hours != null ? Number(i.downtime_hours) : 0;
                return sum + (isNaN(val) ? 0 : val);
            }, 0);

            if (!planned || planned <= 0) {
                status = 'insufficient_data';
            } else {
                availability = Number(Math.max(0, Math.min(1, (planned - downtime_hours) / planned)).toFixed(4));
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                downtime_hours: Number(downtime_hours.toFixed(2)),
                planned_hours: planned || null,
                availability,
                performance: null,
                quality: null,
                oee: availability,
                status,
                source: importRows.length ? 'import_oee' : 'incidents'
            }
        });
    } catch (error) {
        console.error('Error generating OEE report:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating OEE report',
            error: error.message
        });
    }
};

module.exports = {
    getMtbfReport,
    getOeeReport,
    calculateMtbf,
    calculateMttr
};
