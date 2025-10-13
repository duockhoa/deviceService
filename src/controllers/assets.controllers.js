const { Assets, AssetCategories, AssetSubCategories, User, Departments, Areas, Plants, AssetGeneralInfo , AssetComponent } = require('../models');
const  sequelize  = require('../configs/sequelize');


// GET /api/assets - Lấy tất cả assets
const getAllAssets = async (req, res) => {
    try {
        const assets = await Assets.findAll({
            include: [
                { 
                    model: AssetSubCategories, 
                    as: 'SubCategory',
                    include: [{
                        model: AssetCategories,
                        as: 'Category'
                    }]
                },
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
                    model: AssetSubCategories,
                    as: 'SubCategory',
                    include: [{
                        model: AssetCategories,
                        as: 'Category',
                        attributes: ['id', 'code', 'name', 'description']
                    }]
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
                },
                {
                    model: AssetGeneralInfo,
                    as: 'GeneralInfo',
                    attributes: [
                        'manufacture_year',
                        'manufacturer',
                        'country_of_origin',
                        'model',
                        'serial_number',
                        'warranty_expiry_date',
                        'warranty_period_months',
                        'supplier'
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

// POST /api/assets - Tạo asset mới (bao gồm general info)
const createAsset = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const {
            // Basic asset info
            sub_category_id,
            team_id,
            asset_code,
            name,
            status,
            // General info object
            generalInfo
        } = req.body;

        // Validation cơ bản
        if (!sub_category_id || !asset_code || !name) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Sub Category ID, Asset Code, and Name are required'
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

        // Kiểm tra asset_code đã tồn tại chưa
        const existingAsset = await Assets.findOne({
            where: { asset_code }
        });

        if (existingAsset) {
            await t.rollback();
            return res.status(409).json({
                success: false,
                message: 'Asset code already exists'
            });
        }

        // Tạo asset cơ bản
        const assetData = {
            sub_category_id,
            team_id,
            asset_code,
            name,
            status: status || 'active',
            created_by: req.user.id
        };

        const newAsset = await Assets.create(assetData, { transaction : t });


        // Tạo AssetGeneralInfo - luôn tạo record (có thể để trống)
        const generalInfoData = {
            asset_id: newAsset.id,
            manufacture_year: generalInfo?.manufacture_year || null,
            manufacturer: generalInfo?.manufacturer || null,
            country_of_origin: generalInfo?.country_of_origin || null,
            model: generalInfo?.model || null,
            serial_number: generalInfo?.serial_number || null,
            warranty_period_months: generalInfo?.warranty_period_months || null,  // Thêm trường mới
            warranty_expiry_date: generalInfo?.warranty_expiry_date || null,
            supplier: generalInfo?.supplier || null,
            description: generalInfo?.description || null
        };

        await AssetGeneralInfo.create(generalInfoData, { transaction: t });
        
        // Tạo thành phần cấu tạo (nếu có) 

        // Commit transaction
        await t.commit();

        // Lấy asset mới tạo với đầy đủ thông tin
        const assetWithDetails = await Assets.findByPk(newAsset.id, {
            include: [
                { 
                    model: AssetSubCategories, 
                    as: 'SubCategory',
                    include: [{
                        model: AssetCategories,
                        as: 'Category'
                    }]
                },
                { model: User, as: 'Creator', attributes: ['id', 'name', 'employee_code'] },
                { model: Departments, as: 'Department' },
                {
                    model: Areas,
                    as: 'Area',
                    include: [{ model: Plants, as: 'Plant' }]
                },
                {
                    model: AssetGeneralInfo,
                    as: 'GeneralInfo'
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Asset and general info created successfully',
            data: assetWithDetails
        });
    } catch (error) {
        await t.rollback();
        
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

        // Kiểm tra sub_category có tồn tại không (nếu có thay đổi)
        if (req.body.sub_category_id && req.body.sub_category_id !== asset.sub_category_id) {
            const subCategory = await AssetSubCategories.findByPk(req.body.sub_category_id);
            if (!subCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Sub category not found'
                });
            }
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
                { 
                    model: AssetSubCategories, 
                    as: 'SubCategory',
                    include: [{
                        model: AssetCategories,
                        as: 'Category'
                    }]
                },
                { model: User, as: 'Creator', attributes: ['id', 'name', 'employee_code'] },
                { model: Departments, as: 'Department' },
                {
                    model: Areas,
                    as: 'Area',
                    include: [{ model: Plants, as: 'Plant' }]
                }
            ]
        });

        // Cập nhật thông tin chung (general info) nếu có thay đổi
        const { generalInfo } = req.body;
        if (generalInfo) {
            const generalInfoData = {
                asset_id: id,
                manufacture_year: generalInfo.manufacture_year || null,
                manufacturer: generalInfo.manufacturer || null,
                country_of_origin: generalInfo.country_of_origin || null,
                model: generalInfo.model || null,
                serial_number: generalInfo.serial_number || null,
                warranty_period_months: generalInfo.warranty_period_months || null,  // Thêm trường mới
                warranty_expiry_date: generalInfo.warranty_expiry_date || null,
                supplier: generalInfo.supplier || null,
                description: generalInfo.description || null
            };

            await AssetGeneralInfo.upsert(generalInfoData, { transaction });
        }

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

// GET /api/assets/by-area/:areaId - Lấy assets theo area
const getAssetsByArea = async (req, res) => {
    try {
        const { areaId } = req.params;

        const assets = await Assets.findAll({
            where: { area_id: areaId },
            include: [
                { 
                    model: AssetSubCategories, 
                    as: 'SubCategory',
                    include: [{
                        model: AssetCategories,
                        as: 'Category'
                    }]
                },
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

// GET /api/assets/by-sub-category/:subCategoryId - Lấy assets theo sub category
const getAssetsBySubCategory = async (req, res) => {
    try {
        const { subCategoryId } = req.params;

        const assets = await Assets.findAll({
            where: { sub_category_id: subCategoryId },
            include: [
                { 
                    model: AssetSubCategories, 
                    as: 'SubCategory',
                    include: [{
                        model: AssetCategories,
                        as: 'Category'
                    }]
                },
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
            message: 'Error fetching assets by sub category',
            error: error.message
        });
    }
};

// GET /api/assets/by-category/:categoryId - Lấy assets theo category (thông qua sub categories)
const getAssetsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        // Lấy tất cả sub categories thuộc category này
        const subCategories = await AssetSubCategories.findAll({
            where: { category_id: categoryId },
            attributes: ['id']
        });

        const subCategoryIds = subCategories.map(sc => sc.id);

        const assets = await Assets.findAll({
            where: { 
                sub_category_id: {
                    [require('sequelize').Op.in]: subCategoryIds
                }
            },
            include: [
                { 
                    model: AssetSubCategories, 
                    as: 'SubCategory',
                    include: [{
                        model: AssetCategories,
                        as: 'Category'
                    }]
                },
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
                { 
                    model: AssetSubCategories, 
                    as: 'SubCategory',
                    include: [{
                        model: AssetCategories,
                        as: 'Category'
                    }]
                },
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
        const { query, category_id, sub_category_id, team_id, area_id } = req.query;

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
        if (sub_category_id) {
            whereCondition.sub_category_id = sub_category_id;
        } else if (category_id) {
            // Nếu filter theo category, lấy tất cả sub categories thuộc category đó
            const subCategories = await AssetSubCategories.findAll({
                where: { category_id: category_id },
                attributes: ['id']
            });
            const subCategoryIds = subCategories.map(sc => sc.id);
            whereCondition.sub_category_id = {
                [require('sequelize').Op.in]: subCategoryIds
            };
        }

        if (team_id) whereCondition.team_id = team_id;
        if (area_id) whereCondition.area_id = area_id;

        const assets = await Assets.findAll({
            where: whereCondition,
            include: [
                { 
                    model: AssetSubCategories, 
                    as: 'SubCategory',
                    include: [{
                        model: AssetCategories,
                        as: 'Category'
                    }]
                },
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
                { 
                    model: AssetSubCategories, 
                    as: 'SubCategory',
                    include: [{
                        model: AssetCategories,
                        as: 'Category'
                    }]
                },
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

module.exports = {
    getAllAssets,
    getAssetById,
    createAsset,
    updateAsset,
    deleteAsset,
    getAssetsByArea,
    getAssetsBySubCategory,
    getAssetsByCategory,
    getAssetsByDepartment,
    searchAssets,
    getAssetByCode
};