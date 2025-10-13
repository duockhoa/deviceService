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
                },
                // FIX: Include Components với fields đúng model
                {
                    model: AssetComponent,
                    as: 'Components',
                    attributes: ['id', 'component_name', 'component_code', 'specification', 'quantity', 'unit', 'remarks']
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
                },
                // FIX: Include Components với đầy đủ thông tin theo model
                {
                    model: AssetComponent,
                    as: 'Components',
                    attributes: [
                        'id', 
                        'component_name',
                        'component_code',
                        'specification',
                        'quantity', 
                        'unit',  
                        'remarks',
                        'created_at',
                        'updated_at'
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

// POST /api/assets - Tạo asset mới (bao gồm general info và components)
const createAsset = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const {
            // Basic asset info
            sub_category_id,
            team_id,
            area_id,
            asset_code,
            name,
            status,
            // General info object
            generalInfo,
            // Components array
            components = []
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
            area_id,
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
            warranty_period_months: generalInfo?.warranty_period_months || null,
            warranty_expiry_date: generalInfo?.warranty_expiry_date || null,
            supplier: generalInfo?.supplier || null,
            description: generalInfo?.description || null
        };

        await AssetGeneralInfo.create(generalInfoData, { transaction: t });
        
        // FIX: Tạo Components theo model structure
        console.log('Components to create:', components);
        if (components && components.length > 0) {

            // Filter out empty components
            const validComponents = components.filter(comp => 
                comp.component_name && comp.component_name.trim() !== ''
            );
            console.log('Valid components:', validComponents);
            if (validComponents.length > 0) {
                const componentData = validComponents.map(comp => ({
                    asset_id: newAsset.id,
                    component_name: comp.component_name?.trim(),
                    component_code: comp.component_code?.trim() || null, // FIX: component_code thay vì part_number
                    specification: comp.specification?.trim() || null,   // FIX: thêm specification
                    quantity: comp.quantity || 1,
                    unit: comp.unit?.trim() || null,
                    remarks: comp.remarks?.trim() || null
                }));

                await AssetComponent.bulkCreate(componentData, { transaction: t });
            }
        }

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
                },
                // Include created components
                {
                    model: AssetComponent,
                    as: 'Components'
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Asset, general info, and components created successfully',
            data: assetWithDetails
        });
    } catch (error) {
        await t.rollback();
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Asset code or component code already exists'
            });
        }

        res.status(400).json({
            success: false,
            message: 'Error creating asset',
            error: error.message
        });
    }
};

// PUT /api/assets/:id - Cập nhật asset (bao gồm components)
const updateAsset = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { generalInfo, components, ...assetData } = req.body;
        
        const asset = await Assets.findByPk(id);

        if (!asset) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        // Kiểm tra sub_category có tồn tại không (nếu có thay đổi)
        if (assetData.sub_category_id && assetData.sub_category_id !== asset.sub_category_id) {
            const subCategory = await AssetSubCategories.findByPk(assetData.sub_category_id);
            if (!subCategory) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Sub category not found'
                });
            }
        }

        // Kiểm tra asset_code trùng (nếu có thay đổi)
        if (assetData.asset_code && assetData.asset_code !== asset.asset_code) {
            const existingAsset = await Assets.findOne({
                where: { asset_code: assetData.asset_code }
            });

            if (existingAsset) {
                await t.rollback();
                return res.status(409).json({
                    success: false,
                    message: 'Asset code already exists'
                });
            }
        }

        // Cập nhật thông tin asset cơ bản
        await asset.update(assetData, { transaction: t });

        // Cập nhật thông tin chung (general info) nếu có thay đổi
        if (generalInfo) {
            const generalInfoData = {
                asset_id: id,
                manufacture_year: generalInfo.manufacture_year || null,
                manufacturer: generalInfo.manufacturer || null,
                country_of_origin: generalInfo.country_of_origin || null,
                model: generalInfo.model || null,
                serial_number: generalInfo.serial_number || null,
                warranty_period_months: generalInfo.warranty_period_months || null,
                warranty_expiry_date: generalInfo.warranty_expiry_date || null,
                supplier: generalInfo.supplier || null,
                description: generalInfo.description || null
            };

            await AssetGeneralInfo.upsert(generalInfoData, { transaction: t });
        }

        // FIX: Cập nhật Components theo model structure
        if (components !== undefined) {
            // Xóa tất cả components cũ
            await AssetComponent.destroy({
                where: { asset_id: id },
                transaction: t
            });

            // Thêm components mới (nếu có)
            if (components && components.length > 0) {
                // Filter out empty components
                const validComponents = components.filter(comp => 
                    comp.component_name && comp.component_name.trim() !== ''
                );

                if (validComponents.length > 0) {
                    const componentData = validComponents.map(comp => ({
                        asset_id: id,
                        component_name: comp.component_name?.trim(),
                        component_code: comp.component_code?.trim() || null, // FIX: component_code
                        specification: comp.specification?.trim() || null,   // FIX: thêm specification
                        quantity: comp.quantity || 1,
                        unit: comp.unit?.trim() || null,
                        remarks: comp.remarks?.trim() || null
                    }));

                    await AssetComponent.bulkCreate(componentData, { transaction: t });
                }
            }
        }

        // Commit transaction
        await t.commit();

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
                },
                {
                    model: AssetGeneralInfo,
                    as: 'GeneralInfo'
                },
                // Include updated components
                {
                    model: AssetComponent,
                    as: 'Components'
                }
            ]
        });

        res.status(200).json({
            success: true,
            message: 'Asset, general info, and components updated successfully',
            data: updatedAsset
        });
    } catch (error) {
        await t.rollback();
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Asset code or component code already exists'
            });
        }

        res.status(400).json({
            success: false,
            message: 'Error updating asset',
            error: error.message
        });
    }
};

// DELETE /api/assets/:id - Xóa asset (cascade delete components)
const deleteAsset = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const asset = await Assets.findByPk(id);

        if (!asset) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        // Xóa components trước (nếu không có foreign key cascade)
        await AssetComponent.destroy({
            where: { asset_id: id },
            transaction: t
        });

        // Xóa general info (nếu không có foreign key cascade)
        await AssetGeneralInfo.destroy({
            where: { asset_id: id },
            transaction: t
        });

        // Xóa asset
        await asset.destroy({ transaction: t });

        await t.commit();

        res.status(200).json({
            success: true,
            message: 'Asset and all related data deleted successfully'
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({
            success: false,
            message: 'Error deleting asset',
            error: error.message
        });
    }
};

// FIX: Cập nhật tất cả các GET methods khác để include Components với fields đúng
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
                },
                {
                    model: AssetComponent,
                    as: 'Components'
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
                },
                {
                    model: AssetComponent,
                    as: 'Components'
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

const getAssetsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

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
                },
                {
                    model: AssetComponent,
                    as: 'Components'
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
                },
                {
                    model: AssetComponent,
                    as: 'Components'
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

const searchAssets = async (req, res) => {
    try {
        const { query, category_id, sub_category_id, team_id, area_id } = req.query;

        let whereCondition = {};

        if (query) {
            whereCondition = {
                [require('sequelize').Op.or]: [
                    { name: { [require('sequelize').Op.like]: `%${query}%` } },
                    { asset_code: { [require('sequelize').Op.like]: `%${query}%` } },
                    { description: { [require('sequelize').Op.like]: `%${query}%` } }
                ]
            };
        }

        if (sub_category_id) {
            whereCondition.sub_category_id = sub_category_id;
        } else if (category_id) {
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
                },
                {
                    model: AssetComponent,
                    as: 'Components'
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
                },
                {
                    model: AssetComponent,
                    as: 'Components'
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