const Joi = require('joi');

const statusEnum = ['active', 'inactive', 'maintenance', 'retired'];

const baseSchema = {
    asset_code: Joi.string().min(1).max(50),
    name: Joi.string().min(3).max(255),
    sub_category_id: Joi.number().integer().positive(),
    area_id: Joi.number().integer().positive().allow(null),
    department_id: Joi.number().integer().positive().allow(null),
    plant_id: Joi.number().integer().positive().allow(null),
    status: Joi.string().valid(...statusEnum),
    description: Joi.string().allow('', null),
    image: Joi.string().allow('', null),
    qr_code_url: Joi.string().uri().allow('', null)
};

const createAssetSchema = Joi.object({
    ...baseSchema,
    asset_code: baseSchema.asset_code.required(),
    name: baseSchema.name.required(),
    sub_category_id: baseSchema.sub_category_id.required(),
    status: baseSchema.status.default('active')
});

const updateAssetSchema = Joi.object(baseSchema).min(1);

module.exports = {
    createAssetSchema,
    updateAssetSchema
};
