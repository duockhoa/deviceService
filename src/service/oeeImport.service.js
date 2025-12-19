const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { Assets } = require('../models');
const { normalizeCode, sanitizeKey } = require('../utils/normalize');

const LOG_DIR = path.join(__dirname, '..', '..', 'logs', 'oee-import');

const ensureLogDir = () => {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
};

const parseCsvBuffer = (buffer) => {
    const text = buffer.toString('utf8');
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
    if (!lines.length) return [];
    const headers = lines[0].split(',').map((h) => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        const row = {};
        headers.forEach((h, idx) => {
            row[h] = parts[idx] !== undefined ? parts[idx].trim() : '';
        });
        rows.push(row);
    }
    return rows;
};

const toNumber = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const computeOee = (row) => {
    const downtime = {
        unplanned_breakdown: toNumber(row.downtime_unplanned_breakdown_minutes) || 0,
        setup_changeover: toNumber(row.downtime_setup_changeover_minutes) || 0,
        planned_maintenance: toNumber(row.downtime_planned_maintenance_minutes) || 0,
        unplanned_maintenance: toNumber(row.downtime_unplanned_maintenance_minutes) || 0,
        material_wait: toNumber(row.downtime_material_wait_minutes) || 0,
        quality_hold: toNumber(row.downtime_quality_hold_minutes) || 0,
        other: toNumber(row.downtime_other_minutes) || 0,
    };

    const totalDowntime = Object.values(downtime).reduce((a, b) => a + b, 0);
    const planned = toNumber(row.planned_time_minutes) ?? 0;
    const good = toNumber(row.good_qty) ?? 0;
    const reject = toNumber(row.reject_qty) ?? 0;
    const totalQty = good + reject;

    let status = 'valid';
    const reasons = [];

    if (planned <= 0) {
        status = 'insufficient_data';
        reasons.push('planned_time_minutes <= 0');
    }

    const netAvailable = planned - totalDowntime;
    if (netAvailable <= 0) {
        status = 'insufficient_data';
        reasons.push('net_available_minutes <= 0');
    }

    if (totalQty <= 0) {
        status = 'insufficient_data';
        reasons.push('total_qty <= 0');
    }

    const targetCycleSecRaw = toNumber(row.target_cycle_time_sec);
    const plannedQty = toNumber(row.planned_qty);
    let targetCycleSec = targetCycleSecRaw;
    if (!targetCycleSec && plannedQty && planned > 0) {
        targetCycleSec = (planned * 60) / plannedQty;
    }
    if (!targetCycleSec || targetCycleSec <= 0) {
        status = 'insufficient_data';
        reasons.push('target_cycle_time_sec missing');
    }

    let availability = null;
    let performance = null;
    let quality = null;
    let oee = null;
    const netAvailableMinutes = netAvailable;

    if (status !== 'insufficient_data') {
        availability = planned > 0 ? netAvailableMinutes / planned : null;
        const idealRunTimeMinutes = totalQty * (targetCycleSec / 60);
        performance = netAvailableMinutes > 0 ? idealRunTimeMinutes / netAvailableMinutes : null;
        quality = totalQty > 0 ? good / totalQty : null;
        if ([availability, performance, quality].every((v) => v !== null && Number.isFinite(v))) {
            oee = availability * performance * quality;
        }
    }

    return {
        availability,
        performance,
        quality,
        oee,
        total_downtime_minutes: totalDowntime,
        net_available_minutes: netAvailableMinutes,
        status,
        reasons
    };
};

const findAssetsByCodes = async (codes = []) => {
    if (!codes.length) return [];
    const unique = Array.from(new Set(codes.filter((c) => c)));
    if (!unique.length) return [];
    const assets = await Assets.findAll({
        where: {
            [Op.or]: [
                { dk_code: { [Op.in]: unique } },
                { asset_code: { [Op.in]: unique } }
            ]
        },
        attributes: ['id', 'asset_code', 'dk_code']
    });
    return assets;
};

const processRows = async (rows = []) => {
    const normalizedRows = rows.map((row, idx) => {
        const code = normalizeCode(row.dk_code || row.asset_code);
        return { ...row, __row_index: idx, __normalized_code: code };
    });

    const codes = normalizedRows.map((r) => r.__normalized_code).filter(Boolean);
    const assets = await findAssetsByCodes(codes);
    const assetMap = new Map();
    assets.forEach((a) => {
        if (a.dk_code) assetMap.set(normalizeCode(a.dk_code), a);
        if (a.asset_code) assetMap.set(normalizeCode(a.asset_code), a);
    });

    const results = normalizedRows.map((row) => {
        const asset = row.__normalized_code ? assetMap.get(row.__normalized_code) : null;
        const metrics = computeOee(row);
        let data_status = metrics.status;
        const errors = [...metrics.reasons];
        if (!asset) {
            data_status = 'unmatched_asset';
            errors.push('asset not found');
        }
        return {
            row_index: row.__row_index,
            normalized_code: row.__normalized_code,
            asset_id: asset ? asset.id : null,
            data_status,
            availability: metrics.availability,
            performance: metrics.performance,
            quality: metrics.quality,
            oee: metrics.oee,
            total_downtime_minutes: metrics.total_downtime_minutes,
            net_available_minutes: metrics.net_available_minutes,
            errors
        };
    });

    const summary = {
        total_rows: results.length,
        valid_rows: results.filter((r) => r.data_status === 'valid').length,
        insufficient_data_rows: results.filter((r) => r.data_status === 'insufficient_data').length,
        unmatched_asset_rows: results.filter((r) => r.data_status === 'unmatched_asset').length,
        downtime_totals: {
            unplanned_breakdown: 0,
            unplanned_maintenance: 0,
            planned_maintenance: 0,
            setup_changeover: 0,
            material_wait: 0,
            quality_hold: 0,
            other: 0,
            total: 0
        }
    };

    rows.forEach((row) => {
        summary.downtime_totals.unplanned_breakdown += toNumber(row.downtime_unplanned_breakdown_minutes) || 0;
        summary.downtime_totals.unplanned_maintenance += toNumber(row.downtime_unplanned_maintenance_minutes) || 0;
        summary.downtime_totals.planned_maintenance += toNumber(row.downtime_planned_maintenance_minutes) || 0;
        summary.downtime_totals.setup_changeover += toNumber(row.downtime_setup_changeover_minutes) || 0;
        summary.downtime_totals.material_wait += toNumber(row.downtime_material_wait_minutes) || 0;
        summary.downtime_totals.quality_hold += toNumber(row.downtime_quality_hold_minutes) || 0;
        summary.downtime_totals.other += toNumber(row.downtime_other_minutes) || 0;
    });
    summary.downtime_totals.total = Object.values(summary.downtime_totals).reduce((a, b) => a + (b || 0), 0);

    return { results, summary };
};

const storeBatch = async (key, payload) => {
    ensureLogDir();
    const safeKey = sanitizeKey(key);
    if (!safeKey) throw new Error('Invalid idempotency key');
    const filePath = path.join(LOG_DIR, `${safeKey}.json`);
    if (fs.existsSync(filePath)) {
        const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return { alreadyExists: true, data: existing, filePath };
    }
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
    return { alreadyExists: false, data: payload, filePath };
};

const loadBatchIfExists = (key) => {
    ensureLogDir();
    const safeKey = sanitizeKey(key);
    if (!safeKey) return null;
    const filePath = path.join(LOG_DIR, `${safeKey}.json`);
    if (fs.existsSync(filePath)) {
        const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return { data: existing, filePath };
    }
    return null;
};

const listStoredBatches = () => {
    ensureLogDir();
    const files = fs.readdirSync(LOG_DIR).filter((f) => f.endsWith('.json'));
    const batches = [];
    files.forEach((file) => {
        try {
            const content = fs.readFileSync(path.join(LOG_DIR, file), 'utf8');
            const parsed = JSON.parse(content);
            batches.push(parsed);
        } catch (err) {
            // skip corrupted file
        }
    });
    return batches;
};

const parsePayload = async (req) => {
    if (req.file && req.file.buffer) {
        return parseCsvBuffer(req.file.buffer);
    }
    if (req.body && req.body.rows) {
        return Array.isArray(req.body.rows) ? req.body.rows : [];
    }
    return [];
};

module.exports = {
    parseCsvBuffer,
    parsePayload,
    processRows,
    storeBatch,
    loadBatchIfExists,
    listStoredBatches,
    toNumber,
    LOG_DIR
};
