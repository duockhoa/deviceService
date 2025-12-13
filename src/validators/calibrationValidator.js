const Joi = require('joi');

const calibrationStatuses = ['pending', 'in_progress', 'completed', 'failed'];
const priorityEnum = ['low', 'medium', 'high', 'critical'];
const calibrationTypes = ['internal', 'external'];
const results = ['pass', 'fail', 'pending'];

const baseSchema = {
    asset_id: Joi.number().integer().positive(),
    technician_id: Joi.number().integer().positive().allow(null),
    calibration_type: Joi.string().valid(...calibrationTypes),
    priority: Joi.string().valid(...priorityEnum),
    status: Joi.string().valid(...calibrationStatuses),
    title: Joi.string().min(3).max(255),
    description: Joi.string().allow('', null),
    scheduled_date: Joi.date(),
    actual_start_date: Joi.date().allow(null),
    actual_end_date: Joi.date().allow(null),
    estimated_duration: Joi.number().positive(),
    actual_duration: Joi.number().positive().allow(null),
    calibration_standard: Joi.string().allow('', null),
    tolerance: Joi.number().precision(4).allow(null),
    measured_value: Joi.number().precision(4).allow(null),
    reference_value: Joi.number().precision(4).allow(null),
    deviation: Joi.number().precision(4).allow(null),
    result: Joi.string().valid(...results),
    certificate_number: Joi.string().allow('', null),
    certificate_issued_date: Joi.date().allow(null),
    certificate_expiry_date: Joi.date().allow(null),
    notes: Joi.string().allow('', null),
    cost: Joi.number().precision(2).allow(null)
};

const createCalibrationSchema = Joi.object({
    ...baseSchema,
    asset_id: baseSchema.asset_id.required(),
    title: baseSchema.title.required(),
    scheduled_date: baseSchema.scheduled_date.required(),
    estimated_duration: baseSchema.estimated_duration.required(),
    calibration_type: baseSchema.calibration_type.default('internal'),
    priority: baseSchema.priority.default('medium'),
    status: baseSchema.status.default('pending'),
    result: baseSchema.result.default('pending')
});

const updateCalibrationSchema = Joi.object(baseSchema).min(1);

module.exports = {
    createCalibrationSchema,
    updateCalibrationSchema
};
