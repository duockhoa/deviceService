const { AssetSubCategories, AssetCategories, Assets } = require('../models');

// GET /api/asset-sub-categories - Lấy tất cả asset sub categories
const getAllAssetSubCategories = async (req, res) => {
    try {
        const { category_id } = req.query;
        
        let whereCondition = {};
        if (category_id) {
            whereCondition.category_id = category_id;
        }

        const subCategories = await AssetSubCategories.findAll({
            where: whereCondition,
            include: [
                {
                    model: AssetCategories,
                    as: 'Category',
                    attributes: ['id', 'code', 'name']
                }
            ],
            order: [['name', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: subCategories,
            count: subCategories.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching asset sub categories',
            error: error.message
        });
    }
};

// GET /api/asset-sub-categories/:id - Lấy asset sub category theo ID
const getAssetSubCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const subCategory = await AssetSubCategories.findByPk(id, {
            include: [
                {
                    model: AssetCategories,
                    as: 'Category',
                    attributes: ['id', 'code', 'name', 'description']
                },
                {
                    model: Assets,
                    as: 'Assets',
                    attributes: ['id', 'name', 'asset_code', 'description']
                }
            ]
        });

        if (!subCategory) {
            return res.status(404).json({
                success: false,
                message: 'Asset sub category not found'
            });
        }

        res.status(200).json({
            success: true,
            data: subCategory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching asset sub category',
            error: error.message
        });
    }
};

// POST /api/asset-sub-categories - Tạo asset sub category mới
const createAssetSubCategory = async (req, res) => {
    try {
        const { category_id, name, description } = req.body;

        // Validation
        if (!category_id || !name) {
            return res.status(400).json({
                success: false,
                message: 'Category ID and name are required'
            });
        }

        // Kiểm tra category có tồn tại không
        const category = await AssetCategories.findByPk(category_id);
        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Tự động tạo mã code
        const generateSubCategoryCode = async (categoryCode) => {
            const existingSubCategories = await AssetSubCategories.findAll({
                attributes: ['code'],
                where: {
                    code: {
                        [require('sequelize').Op.like]: `${categoryCode}%`
                    }
                },
                order: [['code', 'DESC']]
            });

            if (existingSubCategories.length === 0) {
                return `${categoryCode}0001`;
            }

            const numbers = existingSubCategories
                .map(sc => {
                    const match = sc.code.match(new RegExp(`${categoryCode}(\\d+)`));
                    return match ? parseInt(match[1]) : 0;
                })
                .filter(num => !isNaN(num))
                .sort((a, b) => b - a);

            const nextNumber = numbers.length > 0 ? numbers[0] + 1 : 1;
            return `${categoryCode}${String(nextNumber).padStart(4, '0')}`;
        };

        const code = await generateSubCategoryCode(category.code);

        const newSubCategory = await AssetSubCategories.create({
            category_id,
            code,
            name,
            description
        });

        // Lấy sub category mới tạo với thông tin category
        const subCategoryWithCategory = await AssetSubCategories.findByPk(newSubCategory.id, {
            include: [
                {
                    model: AssetCategories,
                    as: 'Category'
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Asset sub category created successfully',
            data: subCategoryWithCategory
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Sub category code already exists'
            });
        }

        res.status(400).json({
            success: false,
            message: 'Error creating asset sub category',
            error: error.message
        });
    }
};

// PUT /api/asset-sub-categories/:id - Cập nhật asset sub category
const updateAssetSubCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const subCategory = await AssetSubCategories.findByPk(id);

        if (!subCategory) {
            return res.status(404).json({
                success: false,
                message: 'Asset sub category not found'
            });
        }

        await subCategory.update({
            name: name || subCategory.name,
            description: description !== undefined ? description : subCategory.description
        });

        // Lấy sub category đã cập nhật với thông tin category
        const updatedSubCategory = await AssetSubCategories.findByPk(id, {
            include: [
                {
                    model: AssetCategories,
                    as: 'Category'
                }
            ]
        });

        res.status(200).json({
            success: true,
            message: 'Asset sub category updated successfully',
            data: updatedSubCategory
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error updating asset sub category',
            error: error.message
        });
    }
};

// DELETE /api/asset-sub-categories/:id - Xóa asset sub category
const deleteAssetSubCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const subCategory = await AssetSubCategories.findByPk(id, {
            include: [{ model: Assets, as: 'Assets' }]
        });

        if (!subCategory) {
            return res.status(404).json({
                success: false,
                message: 'Asset sub category not found'
            });
        }

        // Kiểm tra xem có asset nào đang sử dụng sub category này không
        if (subCategory.Assets && subCategory.Assets.length > 0) {
            return res.status(409).json({
                success: false,
                message: `Cannot delete sub category. It has ${subCategory.Assets.length} asset(s) assigned to it.`
            });
        }

        await subCategory.destroy();

        res.status(200).json({
            success: true,
            message: 'Asset sub category deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting asset sub category',
            error: error.message
        });
    }
};

// GET /api/asset-sub-categories/by-category/:categoryId - Lấy sub categories theo category
const getSubCategoriesByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        const category = await AssetCategories.findByPk(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        const subCategories = await AssetSubCategories.findAll({
            where: { category_id: categoryId },
            include: [
                {
                    model: AssetCategories,
                    as: 'Category',
                    attributes: ['id', 'code', 'name']
                }
            ],
            order: [['name', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: {
                category: category,
                subCategories: subCategories,
                count: subCategories.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching sub categories by category',
            error: error.message
        });
    }
};

module.exports = {
    getAllAssetSubCategories,
    getAssetSubCategoryById,
    createAssetSubCategory,
    updateAssetSubCategory,
    deleteAssetSubCategory,
    getSubCategoriesByCategory
};