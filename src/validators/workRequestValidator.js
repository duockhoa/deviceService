const Joi = require('joi');

const priorityEnum = ['low', 'medium', 'high', 'critical'];
const statusEnum = ['new', 'pending', 'assigned', 'in_progress', 'awaiting_confirm', 'closed', 'cancelled'];
const typeEnum = ['support', 'inspection', 'cleaning', 'repair_request', 'other'];

const baseSchema = {
    asset_id: Joi.number().integer().positive().allow(null),
    title: Joi.string().min(3).max(255),
    description: Joi.string().allow('', null),
    type: Joi.string().valid(...typeEnum),
    priority: Joi.string().valid(...priorityEnum),
    status: Joi.string().valid(...statusEnum),
    technician_id: Joi.number().integer().positive().allow(null),
    due_date: Joi.date().allow(null),
    location: Joi.string().allow('', null),
    images: Joi.any(),
    notes: Joi.string().allow('', null)
};

const createWorkRequestSchema = Joi.object({
    ...baseSchema,
    title: baseSchema.title.required(),
    priority: baseSchema.priority.default('medium'),
    type: baseSchema.type.default('support')
});

const updateWorkRequestSchema = Joi.object(baseSchema).min(1);

module.exports = {
    createWorkRequestSchema,
    updateWorkRequestSchema
};
