const Joi = require('joi');

const rowSchema = Joi.object({
    asset_code: Joi.string().allow('', null),
    dk_code: Joi.string().allow('', null),
    date: Joi.date().required(),
    shift: Joi.string().allow('', null),
    production_lot: Joi.string().allow('', null),
    planned_time_minutes: Joi.number().min(0).required(),
    break_time_minutes: Joi.number().min(0).allow(null),
    good_qty: Joi.number().min(0).required(),
    reject_qty: Joi.number().min(0).required(),
    target_cycle_time_sec: Joi.number().min(0).allow(null),
    planned_qty: Joi.number().min(0).allow(null),
    downtime_unplanned_breakdown_minutes: Joi.number().min(0).required(),
    downtime_setup_changeover_minutes: Joi.number().min(0).required(),
    downtime_planned_maintenance_minutes: Joi.number().min(0).required(),
    downtime_unplanned_maintenance_minutes: Joi.number().min(0).required(),
    downtime_material_wait_minutes: Joi.number().min(0).required(),
    downtime_quality_hold_minutes: Joi.number().min(0).required(),
    downtime_other_minutes: Joi.number().min(0).required(),
    downtime_note: Joi.string().allow('', null),
    data_status: Joi.string().valid('valid', 'insufficient_data', 'unmatched_asset').allow(null),
    data_note: Joi.string().allow('', null)
});

const previewSchema = Joi.object({
    idempotency_key: Joi.string().max(128).required(),
    rows: Joi.array().items(rowSchema).min(1)
});

module.exports = {
    rowSchema,
    previewSchema
};
