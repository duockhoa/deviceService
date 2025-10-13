const { SpecificationCategories, AssetSubCategories, AssetSpecifications, User } = require('../models');
const sequelize = require('../configs/sequelize');

// GET /api/specification-categories - Lấy tất cả specification categories
const getAllSpecificationCategories = async (req, res) => {
    try {
        const { sub_category_id, status } = req.query;
        
        let whereCondition = {};
        
        if (sub_category_id) {
            whereCondition.sub_category_id = sub_category_id;
        }
        
        if (status) {
            whereCondition.status = status;
        }

        const specificationCategories = await SpecificationCategories.findAll({
            where: whereCondition,
            include: [
                {
                    model: AssetSubCategories,
                    as: 'SubCategory',
                    attributes: ['id', 'code', 'name'],
                    include: [
                        {
                            model: require('../models').AssetCategories,
                            as: 'Category',
                            attributes: ['id', 'code', 'name']
                        }
                    ]
                },
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
                ['sub_category_id', 'ASC'],
                ['display_order', 'ASC'],
                ['spec_name', 'ASC']
            ]
        });

        res.status(200).json({
            success: true,
            data: specificationCategories,
            count: specificationCategories.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching specification categories',
            error: error.message
        });
    }
};

// GET /api/specification-categories/:id - Lấy specification category theo ID
const getSpecificationCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const specificationCategory = await SpecificationCategories.findByPk(id, {
            include: [
                {
                    model: AssetSubCategories,
                    as: 'SubCategory',
                    attributes: ['id', 'code', 'name', 'description'],
                    include: [
                        {
                            model: require('../models').AssetCategories,
                            as: 'Category',
                            attributes: ['id', 'code', 'name', 'description']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'Creator',
                    attributes: ['id', 'name', 'employee_code', 'email']
                },
                {
                    model: User,
                    as: 'Updater',
                    attributes: ['id', 'name', 'employee_code', 'email']
                },
                {
                    model: AssetSpecifications,
                    as: 'AssetSpecifications',
                    attributes: ['id', 'asset_id', 'value', 'numeric_value'],
                    limit: 5 // Chỉ lấy 5 specifications gần nhất
                }
            ]
        });

        if (!specificationCategory) {
            return res.status(404).json({
                success: false,
                message: 'Specification category not found'
            });
        }

        res.status(200).json({
            success: true,
            data: specificationCategory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching specification category',
            error: error.message
        });
    }
};

// POST /api/specification-categories - Tạo specification category mới
const createSpecificationCategory = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const {
            sub_category_id,
            spec_name,
            spec_code,
            unit,
            data_type = 'text',
            options,
            min_value,
            max_value,
            is_required = false,
            display_order,
            description,
            status = 'active'
        } = req.body;

        // Validation cơ bản
        if (!sub_category_id || !spec_name) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Sub category ID and specification name are required'
            });
        }

        // Kiểm tra sub_category có tồn tại không
        const subCategory = await AssetSubCategories.findByPk(sub_category_id);
        if (!subCategory) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Sub category not found'
            });
        }

        // Kiểm tra spec_code trùng trong cùng sub_category (nếu có spec_code)
        if (spec_code) {
            const existingSpec = await SpecificationCategories.findOne({
                where: {
                    sub_category_id,
                    spec_code
                }
            });

            if (existingSpec) {
                await t.rollback();
                return res.status(409).json({
                    success: false,
                    message: 'Specification code already exists in this sub category'
                });
            }
        }

        // Validate options cho kiểu select
        if (data_type === 'select' && options) {
            try {
                JSON.parse(options);
            } catch (e) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Invalid JSON format for options'
                });
            }
        }

        // Tự động tạo display_order nếu không có
        let finalDisplayOrder = display_order;
        if (finalDisplayOrder === undefined || finalDisplayOrder === null) {
            const maxOrder = await SpecificationCategories.max('display_order', {
                where: { sub_category_id }
            });
            finalDisplayOrder = (maxOrder || 0) + 1;
        }

        const newSpecificationCategory = await SpecificationCategories.create({
            sub_category_id,
            spec_name,
            spec_code,
            unit,
            data_type,
            options,
            min_value,
            max_value,
            is_required,
            display_order: finalDisplayOrder,
            description,
            status,
            created_by: req.user?.id
        }, { transaction: t });

        await t.commit();

        // Lấy specification category mới tạo với đầy đủ thông tin
        const specWithDetails = await SpecificationCategories.findByPk(newSpecificationCategory.id, {
            include: [
                {
                    model: AssetSubCategories,
                    as: 'SubCategory',
                    include: [
                        {
                            model: require('../models').AssetCategories,
                            as: 'Category'
                        }
                    ]
                },
                {
                    model: User,
                    as: 'Creator',
                    attributes: ['id', 'name', 'employee_code']
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Specification category created successfully',
            data: specWithDetails
        });
    } catch (error) {
        await t.rollback();
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Specification code already exists in this sub category'
            });
        }

        res.status(400).json({
            success: false,
            message: 'Error creating specification category',
            error: error.message
        });
    }
};

// PUT /api/specification-categories/:id - Cập nhật specification category
const updateSpecificationCategory = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const {
            sub_category_id,
            spec_name,
            spec_code,
            unit,
            data_type,
            options,
            min_value,
            max_value,
            is_required,
            display_order,
            description,
            status
        } = req.body;

        const specificationCategory = await SpecificationCategories.findByPk(id);

        if (!specificationCategory) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Specification category not found'
            });
        }

        // Kiểm tra sub_category có tồn tại không (nếu có thay đổi)
        if (sub_category_id && sub_category_id !== specificationCategory.sub_category_id) {
            const subCategory = await AssetSubCategories.findByPk(sub_category_id);
            if (!subCategory) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Sub category not found'
                });
            }
        }

        // Kiểm tra spec_code trùng (nếu có thay đổi)
        if (spec_code && 
            (spec_code !== specificationCategory.spec_code || 
             sub_category_id !== specificationCategory.sub_category_id)) {
            
            const existingSpec = await SpecificationCategories.findOne({
                where: {
                    sub_category_id: sub_category_id || specificationCategory.sub_category_id,
                    spec_code,
                    id: { [require('sequelize').Op.ne]: id }
                }
            });

            if (existingSpec) {
                await t.rollback();
                return res.status(409).json({
                    success: false,
                    message: 'Specification code already exists in this sub category'
                });
            }
        }

        // Validate options cho kiểu select
        if (data_type === 'select' && options) {
            try {
                JSON.parse(options);
            } catch (e) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Invalid JSON format for options'
                });
            }
        }

        await specificationCategory.update({
            sub_category_id: sub_category_id || specificationCategory.sub_category_id,
            spec_name: spec_name || specificationCategory.spec_name,
            spec_code: spec_code !== undefined ? spec_code : specificationCategory.spec_code,
            unit: unit !== undefined ? unit : specificationCategory.unit,
            data_type: data_type || specificationCategory.data_type,
            options: options !== undefined ? options : specificationCategory.options,
            min_value: min_value !== undefined ? min_value : specificationCategory.min_value,
            max_value: max_value !== undefined ? max_value : specificationCategory.max_value,
            is_required: is_required !== undefined ? is_required : specificationCategory.is_required,
            display_order: display_order !== undefined ? display_order : specificationCategory.display_order,
            description: description !== undefined ? description : specificationCategory.description,
            status: status || specificationCategory.status,
            updated_by: req.user?.id
        }, { transaction: t });

        await t.commit();

        // Lấy specification category đã cập nhật với đầy đủ thông tin
        const updatedSpec = await SpecificationCategories.findByPk(id, {
            include: [
                {
                    model: AssetSubCategories,
                    as: 'SubCategory',
                    include: [
                        {
                            model: require('../models').AssetCategories,
                            as: 'Category'
                        }
                    ]
                },
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
            message: 'Specification category updated successfully',
            data: updatedSpec
        });
    } catch (error) {
        await t.rollback();
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Specification code already exists in this sub category'
            });
        }

        res.status(400).json({
            success: false,
            message: 'Error updating specification category',
            error: error.message
        });
    }
};

// DELETE /api/specification-categories/:id - Xóa specification category
const deleteSpecificationCategory = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { id } = req.params;

        const specificationCategory = await SpecificationCategories.findByPk(id, {
            include: [
                {
                    model: AssetSpecifications,
                    as: 'AssetSpecifications'
                }
            ]
        });

        if (!specificationCategory) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Specification category not found'
            });
        }

        // Kiểm tra có asset specifications nào đang sử dụng không
        if (specificationCategory.AssetSpecifications && 
            specificationCategory.AssetSpecifications.length > 0) {
            await t.rollback();
            return res.status(409).json({
                success: false,
                message: `Cannot delete specification category. It has ${specificationCategory.AssetSpecifications.length} asset specification(s) using it.`
            });
        }

        await specificationCategory.destroy({ transaction: t });

        await t.commit();

        res.status(200).json({
            success: true,
            message: 'Specification category deleted successfully'
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({
            success: false,
            message: 'Error deleting specification category',
            error: error.message
        });
    }
};

// GET /api/specification-categories/by-sub-category/:subCategoryId
const getSpecificationCategoriesBySubCategory = async (req, res) => {
    try {
        const { subCategoryId } = req.params;
        const { status = 'active' } = req.query;

        const subCategory = await AssetSubCategories.findByPk(subCategoryId);
        if (!subCategory) {
            return res.status(404).json({
                success: false,
                message: 'Sub category not found'
            });
        }

        const specificationCategories = await SpecificationCategories.findAll({
            where: { 
                sub_category_id: subCategoryId,
                status: status
            },
            include: [
                {
                    model: AssetSubCategories,
                    as: 'SubCategory',
                    attributes: ['id', 'code', 'name']
                }
            ],
            order: [['display_order', 'ASC'], ['spec_name', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: {
                sub_category: subCategory,
                specification_categories: specificationCategories,
                count: specificationCategories.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching specification categories by sub category',
            error: error.message
        });
    }
};

// GET /api/specification-categories/by-code/:specCode
const getSpecificationCategoryByCode = async (req, res) => {
    try {
        const { specCode } = req.params;
        const { sub_category_id } = req.query;

        let whereCondition = { spec_code: specCode };
        
        if (sub_category_id) {
            whereCondition.sub_category_id = sub_category_id;
        }

        const specificationCategory = await SpecificationCategories.findOne({
            where: whereCondition,
            include: [
                {
                    model: AssetSubCategories,
                    as: 'SubCategory',
                    include: [
                        {
                            model: require('../models').AssetCategories,
                            as: 'Category'
                        }
                    ]
                }
            ]
        });

        if (!specificationCategory) {
            return res.status(404).json({
                success: false,
                message: 'Specification category not found'
            });
        }

        res.status(200).json({
            success: true,
            data: specificationCategory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching specification category by code',
            error: error.message
        });
    }
};

// PUT /api/specification-categories/reorder/:subCategoryId - Sắp xếp lại thứ tự
const reorderSpecificationCategories = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { subCategoryId } = req.params;
        const { orders } = req.body; // Array of { id, display_order }

        if (!Array.isArray(orders)) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Orders must be an array'
            });
        }

        // Kiểm tra sub category có tồn tại không
        const subCategory = await AssetSubCategories.findByPk(subCategoryId);
        if (!subCategory) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Sub category not found'
            });
        }

        // Update display_order cho từng specification category
        for (const order of orders) {
            if (order.id && order.display_order !== undefined) {
                await SpecificationCategories.update(
                    { 
                        display_order: order.display_order,
                        updated_by: req.user?.id
                    },
                    {
                        where: {
                            id: order.id,
                            sub_category_id: subCategoryId
                        },
                        transaction: t
                    }
                );
            }
        }

        await t.commit();

        // Lấy danh sách đã sắp xếp lại
        const reorderedSpecs = await SpecificationCategories.findAll({
            where: { sub_category_id: subCategoryId },
            order: [['display_order', 'ASC'], ['spec_name', 'ASC']]
        });

        res.status(200).json({
            success: true,
            message: 'Specification categories reordered successfully',
            data: reorderedSpecs
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({
            success: false,
            message: 'Error reordering specification categories',
            error: error.message
        });
    }
};

module.exports = {
    getAllSpecificationCategories,
    getSpecificationCategoryById,
    createSpecificationCategory,
    updateSpecificationCategory,
    deleteSpecificationCategory,
    getSpecificationCategoriesBySubCategory,
    getSpecificationCategoryByCode,
    reorderSpecificationCategories
};