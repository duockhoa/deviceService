const { Assets, AssetCategories, User, Departments, Areas, Plants } = require('../models');

// GET /api/assets - Lấy tất cả assets
const getAllAssets = async (req, res) => {
    try {
        const assets = await Assets.findAll({
            include: [
                { model: AssetCategories, as: 'Category' },
                { model: User, as: 'Creator', attributes: ['id', 'name', 'employee_code'] },
                { model: Departments, as: 'Department', attributes: ['name', 'description'] },
                {
                    model: Areas,
                    as: 'Area',
                    attributes: ['id', 'code', 'name', 'description'],
                    include: [
                        {
                            model: Plants,
                            as: 'Plant',
                            attributes: ['id', 'code', 'name', 'description']
                        }
                    ]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: assets,
            count: assets.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching assets',
            error: error.message
        });
    }
};

// GET /api/assets/:id - Lấy asset theo ID
const getAssetById = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await Assets.findByPk(id, {
            include: [
                {
                    model: AssetCategories,
                    as: 'Category',
                    attributes: ['id', 'name', 'description']
                },
                {
                    model: User,
                    as: 'Creator',
                    attributes: ['id', 'name', 'employee_code', 'email']
                },
                {
                    model: Departments,
                    as: 'Department',
                    attributes: ['name', 'description', 'team_leader']
                },
                {
                    model: Areas,
                    as: 'Area',
                    attributes: ['id', 'code', 'name', 'description'],
                    include: [
                        {
                            model: Plants,
                            as: 'Plant',
                            attributes: ['id', 'code', 'name', 'description']
                        }
                    ]
                }
            ]
        });

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        res.status(200).json({
            success: true,
            data: asset
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching asset',
            error: error.message
        });
    }
};

// POST /api/assets - Tạo asset mới
const createAsset = async (req, res) => {
    try {
        const {
            category_id,
            team_id,
            area_id,
            asset_code,
            name,
            description,
            image
            // Bỏ serial_number và notes
        } = req.body;

        // Validation
        if (!category_id || !asset_code || !name) {
            return res.status(400).json({
                success: false,
                message: 'Category ID, Asset Code, and Name are required'
            });
        }

        // Kiểm tra asset_code đã tồn tại chưa
        const existingAsset = await Assets.findOne({
            where: { asset_code }
        });

        if (existingAsset) {
            return res.status(409).json({
                success: false,
                message: 'Asset code already exists'
            });
        }

        const assetData = {
            category_id,
            team_id,
            area_id,
            asset_code,
            name,
            description,
            image,
            // Bỏ serial_number và notes
            created_by: req.user?.id || 1
        };

        const newAsset = await Assets.create(assetData);

        // Lấy asset mới tạo với đầy đủ thông tin
        const assetWithDetails = await Assets.findByPk(newAsset.id, {
            include: [
                { model: AssetCategories, as: 'Category' },
                { model: User, as: 'Creator', attributes: ['id', 'name', 'employee_code'] },
                { model: Departments, as: 'Department' },
                {
                    model: Areas,
                    as: 'Area',
                    include: [{ model: Plants, as: 'Plant' }]
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Asset created successfully',
            data: assetWithDetails
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Asset code already exists'  // Bỏ "or serial number"
            });
        }

        res.status(400).json({
            success: false,
            message: 'Error creating asset',
            error: error.message
        });
    }
};

// PUT /api/assets/:id - Cập nhật asset
const updateAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await Assets.findByPk(id);

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        // Kiểm tra asset_code trùng (nếu có thay đổi)
        if (req.body.asset_code && req.body.asset_code !== asset.asset_code) {
            const existingAsset = await Assets.findOne({
                where: { asset_code: req.body.asset_code }
            });

            if (existingAsset) {
                return res.status(409).json({
                    success: false,
                    message: 'Asset code already exists'
                });
            }
        }

        await asset.update(req.body);

        // Lấy asset đã cập nhật với đầy đủ thông tin
        const updatedAsset = await Assets.findByPk(id, {
            include: [
                { model: AssetCategories, as: 'Category' },
                { model: User, as: 'Creator', attributes: ['id', 'name', 'employee_code'] },
                { model: Departments, as: 'Department' },
                {
                    model: Areas,
                    as: 'Area',
                    include: [{ model: Plants, as: 'Plant' }]
                }
            ]
        });

        res.status(200).json({
            success: true,
            message: 'Asset updated successfully',
            data: updatedAsset
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Asset code already exists'  // Bỏ "or serial number"
            });
        }

        res.status(400).json({
            success: false,
            message: 'Error updating asset',
            error: error.message
        });
    }
};

// DELETE /api/assets/:id - Xóa asset
const deleteAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await Assets.findByPk(id);

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        await asset.destroy();

        res.status(200).json({
            success: true,
            message: 'Asset deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting asset',
            error: error.message
        });
    }
};

// GET /api/assets/by-area/:areaId - Lấy assets theo area (thay đổi từ position)
const getAssetsByArea = async (req, res) => {
    try {
        const { areaId } = req.params;

        const assets = await Assets.findAll({
            where: { area_id: areaId },
            include: [
                { model: AssetCategories, as: 'Category' },
                { model: Departments, as: 'Department' },
                {
                    model: Areas,
                    as: 'Area',
                    include: [{ model: Plants, as: 'Plant' }]
                }
            ]
        });

        res.status(200).json({
            success: true,
            data: assets,
            count: assets.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching assets by area',
            error: error.message
        });
    }
};

// GET /api/assets/by-category/:categoryId - Lấy assets theo category
const getAssetsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        const assets = await Assets.findAll({
            where: { category_id: categoryId },
            include: [
                { model: AssetCategories, as: 'Category' },
                { model: Departments, as: 'Department' },
                {
                    model: Areas,
                    as: 'Area',
                    include: [{ model: Plants, as: 'Plant' }]
                }
            ]
        });

        res.status(200).json({
            success: true,
            data: assets,
            count: assets.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching assets by category',
            error: error.message
        });
    }
};

// GET /api/assets/by-department/:departmentName - Lấy assets theo department
const getAssetsByDepartment = async (req, res) => {
    try {
        const { departmentName } = req.params;

        const assets = await Assets.findAll({
            where: { team_id: departmentName },
            include: [
                { model: AssetCategories, as: 'Category' },
                { model: Departments, as: 'Department' },
                {
                    model: Areas,
                    as: 'Area',
                    include: [{ model: Plants, as: 'Plant' }]
                }
            ]
        });

        res.status(200).json({
            success: true,
            data: assets,
            count: assets.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching assets by department',
            error: error.message
        });
    }
};

// GET /api/assets/search - Tìm kiếm assets
const searchAssets = async (req, res) => {
    try {
        const { query, category_id, team_id, area_id } = req.query; // Thay đổi từ position_id sang area_id

        let whereCondition = {};

        // Thêm điều kiện tìm kiếm theo text
        if (query) {
            whereCondition = {
                [require('sequelize').Op.or]: [
                    { name: { [require('sequelize').Op.like]: `%${query}%` } },
                    { asset_code: { [require('sequelize').Op.like]: `%${query}%` } },
                    { description: { [require('sequelize').Op.like]: `%${query}%` } },
                    { serial_number: { [require('sequelize').Op.like]: `%${query}%` } }
                ]
            };
        }

        // Thêm điều kiện filter
        if (category_id) whereCondition.category_id = category_id;
        if (team_id) whereCondition.team_id = team_id;
        if (area_id) whereCondition.area_id = area_id; // Thay đổi từ position_id sang area_id

        const assets = await Assets.findAll({
            where: whereCondition,
            include: [
                { model: AssetCategories, as: 'Category' },
                { model: Departments, as: 'Department' },
                {
                    model: Areas,
                    as: 'Area',
                    include: [{ model: Plants, as: 'Plant' }]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: assets,
            count: assets.length,
            query: req.query
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching assets',
            error: error.message
        });
    }
};

// GET /api/assets/by-asset-code/:assetCode - Lấy asset theo asset code
const getAssetByCode = async (req, res) => {
    try {
        const { assetCode } = req.params;
        const asset = await Assets.findOne({
            where: { asset_code: assetCode },
            include: [
                { model: AssetCategories, as: 'Category' },
                { model: User, as: 'Creator', attributes: ['id', 'name', 'employee_code'] },
                { model: Departments, as: 'Department' },
                {
                    model: Areas,
                    as: 'Area',
                    include: [{ model: Plants, as: 'Plant' }]
                }
            ]
        });

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        res.status(200).json({
            success: true,
            data: asset
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching asset by code',
            error: error.message
        });
    }
};

// Cập nhật exports
module.exports = {
    getAllAssets,
    getAssetById,
    createAsset,
    updateAsset,
    deleteAsset,
    getAssetsByArea,      // Thay đổi từ getAssetsByPosition
    getAssetsByCategory,
    getAssetsByDepartment,
    searchAssets,
    getAssetByCode
};