const { AssetCategories, Assets } = require('../models');

// GET /api/asset-categories - Lấy tất cả asset categories
const getAllAssetCategories = async (req, res) => {
    try {
        const categories = await AssetCategories.findAll({
            order: [['name', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: categories,
            count: categories.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching asset categories',
            error: error.message
        });
    }
};

// GET /api/asset-categories/:id - Lấy asset category theo ID
const getAssetCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await AssetCategories.findByPk(id, {
            include: [
                {
                    model: Assets,
                    as: 'Assets',
                    attributes: ['id', 'name', 'asset_code', 'description', 'serial_number']
                }
            ]
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Asset category not found'
            });
        }

        res.status(200).json({
            success: true,
            data: category
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching asset category',
            error: error.message
        });
    }
};

// POST /api/asset-categories - Tạo asset category mới
const createAssetCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        // Validation
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        // Kiểm tra trùng tên
        const existingCategory = await AssetCategories.findOne({
            where: { name }
        });

        if (existingCategory) {
            return res.status(409).json({
                success: false,
                message: 'Category name already exists'
            });
        }

        const newCategory = await AssetCategories.create({
            name,
            description
        });

        res.status(201).json({
            success: true,
            message: 'Asset category created successfully',
            data: newCategory
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Category name already exists'
            });
        }

        res.status(400).json({
            success: false,
            message: 'Error creating asset category',
            error: error.message
        });
    }
};

// PUT /api/asset-categories/:id - Cập nhật asset category
const updateAssetCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const category = await AssetCategories.findByPk(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Asset category not found'
            });
        }

        // Kiểm tra trùng tên (nếu tên thay đổi)
        if (name && name !== category.name) {
            const existingCategory = await AssetCategories.findOne({
                where: { name }
            });

            if (existingCategory) {
                return res.status(409).json({
                    success: false,
                    message: 'Category name already exists'
                });
            }
        }

        await category.update({
            name: name || category.name,
            description: description !== undefined ? description : category.description
        });

        res.status(200).json({
            success: true,
            message: 'Asset category updated successfully',
            data: category
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Category name already exists'
            });
        }

        res.status(400).json({
            success: false,
            message: 'Error updating asset category',
            error: error.message
        });
    }
};

// DELETE /api/asset-categories/:id - Xóa asset category
const deleteAssetCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await AssetCategories.findByPk(id, {
            include: [{ model: Assets, as: 'Assets' }]
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Asset category not found'
            });
        }

        // Kiểm tra xem có asset nào đang sử dụng category này không
        if (category.Assets && category.Assets.length > 0) {
            return res.status(409).json({
                success: false,
                message: `Cannot delete category. It has ${category.Assets.length} asset(s) assigned to it.`
            });
        }

        await category.destroy();

        res.status(200).json({
            success: true,
            message: 'Asset category deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting asset category',
            error: error.message
        });
    }
};

// GET /api/asset-categories/:id/assets - Lấy tất cả assets thuộc category
const getAssetsByCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await AssetCategories.findByPk(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Asset category not found'
            });
        }

        const assets = await Assets.findAll({
            where: { category_id: id },
            include: [
                { 
                    model: AssetCategories, 
                    as: 'Category',
                    attributes: ['id', 'name']
                }
            ],
            order: [['name', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: {
                category: category,
                assets: assets,
                count: assets.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching assets by category',
            error: error.message
        });
    }
};

module.exports = {
    getAllAssetCategories,
    getAssetCategoryById,
    createAssetCategory,
    updateAssetCategory,
    deleteAssetCategory,
    getAssetsByCategory
};