const { ConsumableCategories, User } = require('../models');
const sequelize = require('../configs/sequelize');

// GET /api/consumable-categories - Lấy tất cả danh mục
const getAllConsumableCategories = async (req, res) => {
    try {
        const { type, is_active } = req.query;
        
        let whereCondition = {};
        
        if (type) {
            whereCondition.type = type;
        }
        
        if (is_active !== undefined) {
            whereCondition.is_active = is_active === 'true';
        }

        const categories = await ConsumableCategories.findAll({
            where: whereCondition,
            include: [
                {
                    model: User,
                    as: 'Creator',
                    attributes: ['id', 'name', 'employee_code']
                },
                {
                    model: User,
                    as: 'Updater',
                    attributes: ['id', 'name', 'employee_code']
                }
            ],
            order: [
                ['type', 'ASC'],
                ['name', 'ASC']
            ]
        });

        res.status(200).json({
            success: true,
            data: categories,
            count: categories.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching consumable categories',
            error: error.message
        });
    }
};

// GET /api/consumable-categories/:id - Lấy danh mục theo ID
const getConsumableCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const category = await ConsumableCategories.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'Creator',
                    attributes: ['id', 'name', 'employee_code', 'email']
                },
                {
                    model: User,
                    as: 'Updater',
                    attributes: ['id', 'name', 'employee_code', 'email']
                }
            ]
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Consumable category not found'
            });
        }

        res.status(200).json({
            success: true,
            data: category
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching consumable category',
            error: error.message
        });
    }
};

// POST /api/consumable-categories - Tạo danh mục mới
const createConsumableCategory = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const {
            type,
            code,
            name,
            description,
            is_active = true
        } = req.body;

        // Validation
        if (!type || !code || !name) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Type, code and name are required'
            });
        }

        // Kiểm tra code trùng
        const existingCategory = await ConsumableCategories.findOne({
            where: { code }
        });

        if (existingCategory) {
            await t.rollback();
            return res.status(409).json({
                success: false,
                message: 'Category code already exists'
            });
        }

        const newCategory = await ConsumableCategories.create({
            type,
            code,
            name,
            description,
            is_active,
            created_by: req.user?.id
        }, { transaction: t });

        await t.commit();

        // Lấy category mới tạo với đầy đủ thông tin
        const categoryWithDetails = await ConsumableCategories.findByPk(newCategory.id, {
            include: [
                {
                    model: User,
                    as: 'Creator',
                    attributes: ['id', 'name', 'employee_code']
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Consumable category created successfully',
            data: categoryWithDetails
        });
    } catch (error) {
        await t.rollback();
        res.status(400).json({
            success: false,
            message: 'Error creating consumable category',
            error: error.message
        });
    }
};

// PUT /api/consumable-categories/:id - Cập nhật danh mục
const updateConsumableCategory = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const {
            type,
            code,
            name,
            description,
            is_active
        } = req.body;

        const category = await ConsumableCategories.findByPk(id);

        if (!category) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Consumable category not found'
            });
        }

        // Kiểm tra code trùng (nếu có thay đổi)
        if (code && code !== category.code) {
            const existingCategory = await ConsumableCategories.findOne({
                where: { 
                    code,
                    id: { [require('sequelize').Op.ne]: id }
                }
            });

            if (existingCategory) {
                await t.rollback();
                return res.status(409).json({
                    success: false,
                    message: 'Category code already exists'
                });
            }
        }

        await category.update({
            type: type || category.type,
            code: code || category.code,
            name: name || category.name,
            description: description !== undefined ? description : category.description,
            is_active: is_active !== undefined ? is_active : category.is_active,
            updated_by: req.user?.id
        }, { transaction: t });

        await t.commit();

        // Lấy category đã cập nhật
        const updatedCategory = await ConsumableCategories.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'Creator',
                    attributes: ['id', 'name', 'employee_code']
                },
                {
                    model: User,
                    as: 'Updater',
                    attributes: ['id', 'name', 'employee_code']
                }
            ]
        });

        res.status(200).json({
            success: true,
            message: 'Consumable category updated successfully',
            data: updatedCategory
        });
    } catch (error) {
        await t.rollback();
        res.status(400).json({
            success: false,
            message: 'Error updating consumable category',
            error: error.message
        });
    }
};

// DELETE /api/consumable-categories/:id - Xóa danh mục
const deleteConsumableCategory = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { id } = req.params;

        const category = await ConsumableCategories.findByPk(id);

        if (!category) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Consumable category not found'
            });
        }

        await category.destroy({ transaction: t });
        await t.commit();

        res.status(200).json({
            success: true,
            message: 'Consumable category deleted successfully'
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({
            success: false,
            message: 'Error deleting consumable category',
            error: error.message
        });
    }
};

module.exports = {
    getAllConsumableCategories,
    getConsumableCategoryById,
    createConsumableCategory,
    updateConsumableCategory,
    deleteConsumableCategory
};