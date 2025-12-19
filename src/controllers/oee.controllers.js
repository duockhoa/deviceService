const multer = require('multer');
const { previewSchema } = require('../validators/oeeImport.validator');
const { parsePayload, processRows, storeBatch, loadBatchIfExists } = require('../service/oeeImport.service');
const { normalizeCode } = require('../utils/normalize');

const upload = multer({ storage: multer.memoryStorage() });
const uploadMiddleware = upload.single('file');

const validateBody = (payload) => {
    const { error, value } = previewSchema.validate(payload, { abortEarly: false, allowUnknown: true });
    if (error) {
        const details = error.details.map((d) => d.message);
        const err = new Error(details.join('; '));
        err.status = 400;
        throw err;
    }
    return value;
};

const previewImportOee = async (req, res) => {
    try {
        const rows = await parsePayload(req);
        if (!rows.length) {
            return res.status(400).json({ success: false, message: 'No rows provided' });
        }
        const idempotency_key = req.body?.idempotency_key || req.query?.idempotency_key;
        if (!idempotency_key) {
            return res.status(400).json({ success: false, message: 'idempotency_key is required' });
        }
        validateBody({ idempotency_key, rows });

        // Normalize codes in-place for consistency
        const normalizedRows = rows.map((r) => ({
            ...r,
            dk_code: normalizeCode(r.dk_code),
            asset_code: normalizeCode(r.asset_code)
        }));

        const { results, summary } = await processRows(normalizedRows);

        return res.status(200).json({
            success: true,
            batch: summary,
            rows: results
        });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            success: false,
            message: err.message || 'Error previewing OEE import'
        });
    }
};

const commitImportOee = async (req, res) => {
    try {
        const rows = await parsePayload(req);
        if (!rows.length) {
            return res.status(400).json({ success: false, message: 'No rows provided' });
        }
        const idempotency_key = req.body?.idempotency_key || req.query?.idempotency_key;
        if (!idempotency_key) {
            return res.status(400).json({ success: false, message: 'idempotency_key is required' });
        }

        const existing = loadBatchIfExists(idempotency_key);
        if (existing) {
            return res.status(200).json({ success: true, batch: existing.data.summary, storage_ref: existing.filePath, idempotent: true });
        }

        validateBody({ idempotency_key, rows });
        const normalizedRows = rows.map((r) => ({
            ...r,
            dk_code: normalizeCode(r.dk_code),
            asset_code: normalizeCode(r.asset_code)
        }));
        const { results, summary } = await processRows(normalizedRows);

        const payloadToStore = {
            idempotency_key,
            created_at: new Date().toISOString(),
            user_id: req.user?.id || null,
            summary,
            rows: results,
            source_rows: normalizedRows
        };

        const stored = await storeBatch(idempotency_key, payloadToStore);

        return res.status(200).json({
            success: true,
            batch: summary,
            storage_ref: stored.filePath,
            idempotent: stored.alreadyExists
        });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            success: false,
            message: err.message || 'Error committing OEE import'
        });
    }
};

module.exports = {
    uploadMiddleware,
    previewImportOee,
    commitImportOee
};
