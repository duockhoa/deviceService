const Joi = require('joi');

const maintenanceStatuses = ['draft', 'approved', 'in_progress', 'awaiting_acceptance', 'accepted', 'cancelled', 'closed'];
const maintenanceTypes = ['cleaning', 'inspection', 'maintenance', 'corrective', 'preventive'];
const priorityEnum = ['low', 'medium', 'high', 'critical'];

const baseSchema = {
    asset_id: Joi.number().integer().positive(),
    technician_id: Joi.number().integer().positive().allow(null),
    maintenance_type: Joi.string().valid(...maintenanceTypes),
    priority: Joi.string().valid(...priorityEnum),
    status: Joi.string().valid(...maintenanceStatuses),
    title: Joi.string().min(3).max(255),
    description: Joi.string().allow('', null),
    scheduled_date: Joi.date(),
    actual_start_date: Joi.date().allow(null),
    actual_end_date: Joi.date().allow(null),
    estimated_duration: Joi.number().positive(),
    actual_duration: Joi.number().positive().allow(null),
    cost: Joi.number().precision(2).allow(null),
    estimated_cost: Joi.number().precision(2).allow(null),
    location: Joi.string().allow('', null),
    safety_requirements: Joi.string().allow('', null),
    tools_required: Joi.string().allow('', null),
    measuring_tools: Joi.string().allow('', null),
    safety_tools: Joi.string().allow('', null),
    spare_parts: Joi.string().allow('', null)
};

const createMaintenanceSchema = Joi.object({
    ...baseSchema,
    asset_id: baseSchema.asset_id.required(),
    title: baseSchema.title.required(),
    scheduled_date: baseSchema.scheduled_date.required(),
    estimated_duration: baseSchema.estimated_duration.required(),
    maintenance_type: baseSchema.maintenance_type.default('preventive'),
    priority: baseSchema.priority.default('medium'),
    status: baseSchema.status.default('draft')
});

const updateMaintenanceSchema = Joi.object(baseSchema).min(1);

module.exports = {
    createMaintenanceSchema,
    updateMaintenanceSchema
};
