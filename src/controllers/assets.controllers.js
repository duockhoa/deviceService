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

// GET /api/assets/active - Lấy chỉ assets đang hoạt động
const getActiveAssets = async (req, res) => {
    try {
        const assets = await Assets.findAll({
            where: { status: 'active' },
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
            message: 'Error fetching active assets',
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
            image,
            status, // Thêm status với default value
        } = req.body;

        // Validation
        if (!category_id || !asset_code || !name) {
            return res.status(400).json({
                success: false,
                message: 'Category ID, Asset Code, and Name are required'
            });
        }

        // Validate status
        if (status && !['active', 'inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be either "active" or "inactive"'
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
            status, // Thêm status
            created_by: req.user?.id
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
                message: 'Asset code already exists'
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

        // Validate status nếu có trong request
        if (req.body.status && !['active', 'inactive'].includes(req.body.status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be either "active" or "inactive"'
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
                message: 'Asset code already exists'
            });
        }

        res.status(400).json({
            success: false,
            message: 'Error updating asset',
            error: error.message
        });
    }
};

// PUT /api/assets/:id/status - Cập nhật chỉ status của asset
const updateAssetStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate status
        if (!status || !['active', 'inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Valid status is required (active or inactive)'
            });
        }

        const asset = await Assets.findByPk(id);

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        await asset.update({ status });

        res.status(200).json({
            success: true,
            message: `Asset status updated to ${status} successfully`,
            data: { id: asset.id, status: asset.status }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error updating asset status',
            error: error.message
        });
    }
};

// DELETE /api/assets/:id - Xóa asset (có thể chuyển thành inactive thay vì xóa thật)
const deleteAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { soft = false } = req.query; // Query param để chọn soft delete hay hard delete

        const asset = await Assets.findByPk(id);

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        if (soft === 'true') {
            // Soft delete: chuyển status thành inactive
            await asset.update({ status: 'inactive' });
            res.status(200).json({
                success: true,
                message: 'Asset deactivated successfully'
            });
        } else {
            // Hard delete: xóa thật khỏi database
            await asset.destroy();
            res.status(200).json({
                success: true,
                message: 'Asset deleted successfully'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting asset',
            error: error.message
        });
    }
};

// GET /api/assets/by-area/:areaId - Lấy assets theo area
const getAssetsByArea = async (req, res) => {
    try {
        const { areaId } = req.params;
        const { status } = req.query; // Optional filter by status

        let whereCondition = { area_id: areaId };
        if (status && ['active', 'inactive'].includes(status)) {
            whereCondition.status = status;
        }

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
        const { status } = req.query; // Optional filter by status

        let whereCondition = { category_id: categoryId };
        if (status && ['active', 'inactive'].includes(status)) {
            whereCondition.status = status;
        }

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
        const { status } = req.query; // Optional filter by status

        let whereCondition = { team_id: departmentName };
        if (status && ['active', 'inactive'].includes(status)) {
            whereCondition.status = status;
        }

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
        const { query, category_id, team_id, area_id, status } = req.query;

        let whereCondition = {};

        // Thêm điều kiện tìm kiếm theo text
        if (query) {
            whereCondition = {
                [require('sequelize').Op.or]: [
                    { name: { [require('sequelize').Op.like]: `%${query}%` } },
                    { asset_code: { [require('sequelize').Op.like]: `%${query}%` } },
                    { description: { [require('sequelize').Op.like]: `%${query}%` } }
                ]
            };
        }

        // Thêm điều kiện filter
        if (category_id) whereCondition.category_id = category_id;
        if (team_id) whereCondition.team_id = team_id;
        if (area_id) whereCondition.area_id = area_id;
        if (status && ['active', 'inactive'].includes(status)) whereCondition.status = status; // Thêm filter theo status

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
    getActiveAssets,      // Mới thêm
    getAssetById,
    createAsset,
    updateAsset,
    updateAssetStatus,    // Mới thêm
    deleteAsset,
    getAssetsByArea,
    getAssetsByCategory,
    getAssetsByDepartment,
    searchAssets,
    getAssetByCode
};