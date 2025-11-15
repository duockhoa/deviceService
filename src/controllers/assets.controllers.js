const { Assets, AssetCategories, AssetSubCategories, User, Departments, Areas, Plants, AssetGeneralInfo, AssetComponent, AssetSpecifications, AssetAttachment, AssetConsumables, SpecificationCategories, Maintenance, MaintenanceChecklist, MaintenanceProgress, MaintenanceImages, MaintenanceConsumables, MaintenanceAttachments } = require('../models');
const  sequelize  = require('../configs/sequelize');
const XLSX = require('xlsx');


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
        console.log('getAssetById called for ID:', id);
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
                        'supplier',
                        'description'
                    ]
                },
                // Include Components
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
                },
                // Include Specifications
                {
                    model: AssetSpecifications,
                    as: 'Specifications',
                    attributes: [
                        'id',
                        'spec_category_id',
                        'value',
                        'numeric_value',
                        'remarks',
                        'verified_at',
                        'verified_by'
                    ],
                    include: [
                        {
                            model: SpecificationCategories,
                            as: 'SpecCategory',
                            attributes: ['id', 'spec_code', 'spec_name', 'unit', 'data_type']
                        }
                    ]
                },
                // Include Attachments
                {
                    model: AssetAttachment,
                    as: 'Attachments',
                    attributes: [
                        'id',
                        'file_name',
                        'file_path',
                        'file_type',
                        'file_size',
                        'description',
                        'uploaded_by',
                        'uploaded_at'
                    ]
                },
                // Include Consumables
                {
                    model: AssetConsumables,
                    as: 'Consumables',
                    attributes: [
                        'id',
                        'item_name',
                        'specification',
                        'unit',
                        'replacement_cycle',
                        'unit_price',
                        'supplier',
                        'remarks'
                    ]
                }
            ]
        });

        if (!asset) {
            console.log('Asset not found for ID:', id);
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        console.log('Asset found, returning data for ID:', id);
        res.status(200).json({
            success: true,
            data: asset
        });
    } catch (error) {
        console.error('Error in getAssetById for ID:', req.params.id);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error SQL:', error.sql);
        console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error fetching asset',
            error: error.message || error.toString()
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

        // Xóa tất cả related data trước (nếu không có foreign key cascade)
        
        // Lấy danh sách maintenance_id của asset này để xóa related tables
        const maintenanceRecords = await Maintenance.findAll({
            where: { asset_id: id },
            attributes: ['id'],
            transaction: t
        });
        const maintenanceIds = maintenanceRecords.map(m => m.id);

        // Xóa tất cả maintenance related data
        if (maintenanceIds.length > 0) {
            await MaintenanceChecklist.destroy({
                where: { maintenance_id: maintenanceIds },
                transaction: t
            });

            await MaintenanceProgress.destroy({
                where: { maintenance_id: maintenanceIds },
                transaction: t
            });

            await MaintenanceImages.destroy({
                where: { maintenance_id: maintenanceIds },
                transaction: t
            });

            await MaintenanceConsumables.destroy({
                where: { maintenance_id: maintenanceIds },
                transaction: t
            });

            await MaintenanceAttachments.destroy({
                where: { maintenance_id: maintenanceIds },
                transaction: t
            });
        }

        // Xóa maintenance records của asset này
        await Maintenance.destroy({
            where: { asset_id: id },
            transaction: t
        });

        // Xóa asset related data
        await AssetComponent.destroy({
            where: { asset_id: id },
            transaction: t
        });

        await AssetGeneralInfo.destroy({
            where: { asset_id: id },
            transaction: t
        });

        await AssetSpecifications.destroy({
            where: { asset_id: id },
            transaction: t
        });

        await AssetAttachment.destroy({
            where: { asset_id: id },
            transaction: t
        });

        await AssetConsumables.destroy({
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
        console.error('Error deleting asset:', error);
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

// GET /api/assets/export/template - Export Excel template
const exportTemplate = async (req, res) => {
    try {
        // Lấy danh sách các dropdown options
        const categories = await AssetCategories.findAll({ attributes: ['id', 'code', 'name'] });
        const subCategories = await AssetSubCategories.findAll({ attributes: ['id', 'code', 'name', 'category_id'] });
        const areas = await Areas.findAll({ attributes: ['id', 'code', 'name'] });
        const departments = await Departments.findAll({ attributes: ['name'] });

        // Tạo template data với 1 row mẫu
        const templateData = [
            {
                'Mã thiết bị (*)': 'TB-001',
                'Tên thiết bị (*)': 'Máy nén khí',
                'Mã danh mục phụ (*)': subCategories[0]?.code || '',
                'Khu vực (mã)': areas[0]?.code || '',
                'Phòng ban': departments[0]?.name || '',
                'Trạng thái': 'active',
                'Năm sản xuất': '2023',
                'Nhà sản xuất': 'ABC Company',
                'Xuất xứ': 'Việt Nam',
                'Model': 'AC-100',
                'Serial number': 'SN123456',
                'Thời hạn bảo hành (tháng)': '24',
                'Ngày hết bảo hành': '2025-12-31',
                'Nhà cung cấp': 'XYZ Supplier',
                'Mô tả': 'Thiết bị máy nén khí công suất lớn'
            }
        ];

        // Sheet 2: Thành phần cấu tạo
        const componentsTemplate = [
            {
                'Mã thiết bị (*)': 'TB-001',
                'Tên thành phần': 'Motor điện',
                'Mã thành phần': 'MOTOR-01',
                'Thông số kỹ thuật': '3-phase, 380V, 5.5kW',
                'Số lượng': '1',
                'Đơn vị': 'cái',
                'Ghi chú': 'Motor chính'
            },
            {
                'Mã thiết bị (*)': 'TB-001',
                'Tên thành phần': 'Bình chứa khí',
                'Mã thành phần': 'TANK-01',
                'Thông số kỹ thuật': 'Dung tích 500L, áp suất max 10bar',
                'Số lượng': '1',
                'Đơn vị': 'cái',
                'Ghi chú': ''
            }
        ];

        // Sheet 3: Vật tư tiêu hao
        const consumablesTemplate = [
            {
                'Mã thiết bị (*)': 'TB-001',
                'Tên vật tư': 'Dầu máy nén',
                'Thông số kỹ thuật': 'SAE 40, Mobil Rarus 427',
                'Đơn vị': 'lít',
                'Chu kỳ thay thế (giờ)': '2000',
                'Đơn giá': '150000',
                'Nhà cung cấp': 'Mobil Vietnam',
                'Ghi chú': 'Thay định kỳ 6 tháng'
            },
            {
                'Mã thiết bị (*)': 'TB-001',
                'Tên vật tư': 'Lọc khí',
                'Thông số kỹ thuật': 'Part No: 1614905400',
                'Đơn vị': 'cái',
                'Chu kỳ thay thế (giờ)': '1000',
                'Đơn giá': '250000',
                'Nhà cung cấp': 'Atlas Copco',
                'Ghi chú': 'Thay khi áp suất chênh lệch >0.5bar'
            }
        ];

        // Sheet 4: Thông số kỹ thuật
        const specificationsTemplate = [
            {
                'Mã thiết bị (*)': 'TB-001',
                'Mã thông số (*)': 'POWER',
                'Giá trị': '15 kW',
                'Giá trị số': '15',
                'Ghi chú': ''
            },
            {
                'Mã thiết bị (*)': 'TB-001',
                'Mã thông số (*)': 'VOLTAGE',
                'Giá trị': '380 V',
                'Giá trị số': '380',
                'Ghi chú': ''
            },
            {
                'Mã thiết bị (*)': 'TB-001',
                'Mã thông số (*)': 'FREQUENCY',
                'Giá trị': '50 Hz',
                'Giá trị số': '50',
                'Ghi chú': ''
            }
        ];

        // Tạo workbook
        const wb = XLSX.utils.book_new();
        
        // Sheet 1: Thông tin chung thiết bị
        const ws = XLSX.utils.json_to_sheet(templateData);
        ws['!cols'] = [
            { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, 
            { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 25 },
            { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 25 },
            { wch: 20 }, { wch: 25 }, { wch: 40 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Thông tin thiết bị');

        // Sheet 2: Thành phần cấu tạo
        const wsComponents = XLSX.utils.json_to_sheet(componentsTemplate);
        wsComponents['!cols'] = [
            { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 40 },
            { wch: 12 }, { wch: 12 }, { wch: 30 }
        ];
        XLSX.utils.book_append_sheet(wb, wsComponents, 'Thành phần cấu tạo');

        // Sheet 3: Vật tư tiêu hao
        const wsConsumables = XLSX.utils.json_to_sheet(consumablesTemplate);
        wsConsumables['!cols'] = [
            { wch: 20 }, { wch: 30 }, { wch: 40 }, { wch: 12 },
            { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 30 }
        ];
        XLSX.utils.book_append_sheet(wb, wsConsumables, 'Vật tư tiêu hao');

        // Sheet 4: Thông số kỹ thuật
        const wsSpecifications = XLSX.utils.json_to_sheet(specificationsTemplate);
        wsSpecifications['!cols'] = [
            { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 30 }
        ];
        XLSX.utils.book_append_sheet(wb, wsSpecifications, 'Thông số kỹ thuật');

        // Sheet 5: Hướng dẫn
        const instructions = [
            { 'Nội dung': '📋 HƯỚNG DẪN SỬ DỤNG TEMPLATE IMPORT THIẾT BỊ' },
            { 'Nội dung': '' },
            { 'Nội dung': '1. SHEET "Thông tin thiết bị":' },
            { 'Nội dung': '   - Điền thông tin cơ bản của thiết bị' },
            { 'Nội dung': '   - Các cột có dấu (*) là bắt buộc' },
            { 'Nội dung': '   - Mã thiết bị phải duy nhất, không trùng lặp' },
            { 'Nội dung': '' },
            { 'Nội dung': '2. SHEET "Thành phần cấu tạo":' },
            { 'Nội dung': '   - Liệt kê các bộ phận cấu tạo của thiết bị' },
            { 'Nội dung': '   - Mã thiết bị phải khớp với Sheet "Thông tin thiết bị"' },
            { 'Nội dung': '   - Có thể có nhiều dòng cho cùng 1 thiết bị' },
            { 'Nội dung': '' },
            { 'Nội dung': '3. SHEET "Vật tư tiêu hao":' },
            { 'Nội dung': '   - Liệt kê vật tư cần thay thế định kỳ' },
            { 'Nội dung': '   - Mã thiết bị phải khớp với Sheet "Thông tin thiết bị"' },
            { 'Nội dung': '   - Chu kỳ thay thế tính bằng giờ hoạt động' },
            { 'Nội dung': '' },
            { 'Nội dung': '4. Tham khảo các sheet "Danh mục phụ", "Khu vực", "Phòng ban"' },
            { 'Nội dung': '   để điền đúng mã/tên vào các cột tương ứng' },
            { 'Nội dung': '' },
            { 'Nội dung': '5. Sau khi điền xong, vào hệ thống chọn Excel > Import dữ liệu' },
            { 'Nội dung': '' },
            { 'Nội dung': '⚠️ LƯU Ý:' },
            { 'Nội dung': '- Không xóa dòng tiêu đề (header)' },
            { 'Nội dung': '- Không thay đổi tên các cột' },
            { 'Nội dung': '- Định dạng ngày: YYYY-MM-DD (VD: 2025-12-31)' },
            { 'Nội dung': '- Trạng thái chỉ nhận 2 giá trị: active hoặc inactive' }
        ];
        const wsInstructions = XLSX.utils.json_to_sheet(instructions);
        wsInstructions['!cols'] = [{ wch: 80 }];
        XLSX.utils.book_append_sheet(wb, wsInstructions, 'Hướng dẫn');

        // Sheet 6: Danh mục phụ reference
        const subCatData = subCategories.map(sc => ({
            'Mã danh mục phụ': sc.code,
            'Tên danh mục phụ': sc.name,
            'ID danh mục cha': sc.category_id
        }));
        const wsSubCat = XLSX.utils.json_to_sheet(subCatData);
        XLSX.utils.book_append_sheet(wb, wsSubCat, 'Danh mục phụ');

        // Sheet 7: Khu vực reference
        const areaData = areas.map(a => ({
            'Mã khu vực': a.code,
            'Tên khu vực': a.name
        }));
        const wsArea = XLSX.utils.json_to_sheet(areaData);
        XLSX.utils.book_append_sheet(wb, wsArea, 'Khu vực');

        // Sheet 8: Phòng ban reference
        const deptData = departments.map(d => ({
            'Tên phòng ban': d.name
        }));
        const wsDept = XLSX.utils.json_to_sheet(deptData);
        XLSX.utils.book_append_sheet(wb, wsDept, 'Phòng ban');

        // Sheet 9: Thông số kỹ thuật categories reference
        const specCategories = await SpecificationCategories.findAll({
            attributes: ['id', 'spec_code', 'spec_name', 'unit', 'data_type'],
            order: [['spec_code', 'ASC']]
        });
        const specCatData = specCategories.map(sc => ({
            'Mã thông số': sc.spec_code,
            'Tên thông số': sc.spec_name,
            'Đơn vị': sc.unit || '',
            'Kiểu dữ liệu': sc.data_type
        }));
        const wsSpecCat = XLSX.utils.json_to_sheet(specCatData);
        XLSX.utils.book_append_sheet(wb, wsSpecCat, 'Danh mục thông số');

        // Generate buffer
        const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        // Set headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Template_Thiet_Bi.xlsx');
        
        res.send(excelBuffer);
    } catch (error) {
        console.error('Error exporting template:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi export template',
            error: error.message
        });
    }
};

// POST /api/assets/import/excel - Import Excel data
const importFromExcel = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng upload file Excel'
            });
        }

        // Helper function to convert Excel date serial number to MySQL date format
        const excelDateToMySQL = (excelDate) => {
            if (!excelDate) return null;
            
            // If already a string in YYYY-MM-DD format, return as is
            if (typeof excelDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(excelDate)) {
                return excelDate;
            }
            
            // If it's an Excel serial number
            if (typeof excelDate === 'number') {
                const date = new Date((excelDate - 25569) * 86400 * 1000);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
            
            // Try to parse as date string
            try {
                const date = new Date(excelDate);
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }
            } catch (e) {
                return null;
            }
            
            return null;
        };

        // Read Excel file
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        
        // Read main sheet (Thông tin thiết bị)
        const mainSheetName = workbook.SheetNames.find(name => name.includes('Thông tin') || name === 'Thiết bị') || workbook.SheetNames[0];
        const mainSheet = workbook.Sheets[mainSheetName];
        const mainData = XLSX.utils.sheet_to_json(mainSheet);

        // Read components sheet if exists
        const componentsSheetName = workbook.SheetNames.find(name => name.includes('Thành phần'));
        const componentsData = componentsSheetName ? XLSX.utils.sheet_to_json(workbook.Sheets[componentsSheetName]) : [];

        // Read consumables sheet if exists
        const consumablesSheetName = workbook.SheetNames.find(name => name.includes('Vật tư'));
        const consumablesData = consumablesSheetName ? XLSX.utils.sheet_to_json(workbook.Sheets[consumablesSheetName]) : [];

        // Read specifications sheet if exists
        const specificationsSheetName = workbook.SheetNames.find(name => name.includes('Thông số'));
        const specificationsData = specificationsSheetName ? XLSX.utils.sheet_to_json(workbook.Sheets[specificationsSheetName]) : [];

        if (mainData.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Sheet thông tin thiết bị không có dữ liệu'
            });
        }

        const results = {
            success: [],
            errors: [],
            skipped: []
        };

        // Get lookup data
        const subCategories = await AssetSubCategories.findAll();
        const areas = await Areas.findAll();
        const departments = await Departments.findAll();
        const specCategories = await SpecificationCategories.findAll();

        // Process each row
        for (let i = 0; i < mainData.length; i++) {
            const row = mainData[i];
            const rowNum = i + 2; // Excel row number (starting from 2, after header)

            try {
                // Validate required fields
                if (!row['Mã thiết bị (*)'] || !row['Tên thiết bị (*)'] || !row['Mã danh mục phụ (*)']) {
                    results.errors.push({
                        row: rowNum,
                        error: 'Thiếu thông tin bắt buộc (Mã thiết bị, Tên thiết bị, Mã danh mục phụ)'
                    });
                    continue;
                }

                const assetCode = row['Mã thiết bị (*)'];

                // Find sub_category_id
                const subCat = subCategories.find(sc => sc.code === row['Mã danh mục phụ (*)']);
                if (!subCat) {
                    results.errors.push({
                        row: rowNum,
                        error: `Không tìm thấy danh mục phụ với mã: ${row['Mã danh mục phụ (*)']}`
                    });
                    continue;
                }

                // Find area_id (optional)
                let area_id = null;
                if (row['Khu vực (mã)']) {
                    const area = areas.find(a => a.code === row['Khu vực (mã)']);
                    if (area) {
                        area_id = area.id;
                    }
                }

                // Find team_id (optional)
                let team_id = null;
                if (row['Phòng ban']) {
                    const dept = departments.find(d => d.name === row['Phòng ban']);
                    if (dept) {
                        team_id = dept.name;
                    }
                }

                // Check if asset_code already exists
                const existingAsset = await Assets.findOne({
                    where: { asset_code: row['Mã thiết bị (*)'] }
                });

                if (existingAsset) {
                    results.skipped.push({
                        row: rowNum,
                        asset_code: assetCode,
                        name: row['Tên thiết bị (*)'],
                        reason: `Mã thiết bị đã tồn tại trong hệ thống`
                    });
                    continue;
                }

                // Create asset
                const asset = await Assets.create({
                    asset_code: row['Mã thiết bị (*)'],
                    name: row['Tên thiết bị (*)'],
                    sub_category_id: subCat.id,
                    area_id: area_id,
                    team_id: team_id,
                    status: row['Trạng thái'] || 'active',
                    created_by: req.user?.id
                }, { transaction: t });

                // Create general info if provided
                if (row['Năm sản xuất'] || row['Nhà sản xuất'] || row['Model']) {
                    await AssetGeneralInfo.create({
                        asset_id: asset.id,
                        manufacture_year: row['Năm sản xuất'] ? parseInt(row['Năm sản xuất']) : null,
                        manufacturer: row['Nhà sản xuất'] || null,
                        country_of_origin: row['Xuất xứ'] || null,
                        model: row['Model'] || null,
                        serial_number: row['Serial number'] || null,
                        warranty_period_months: row['Thời hạn bảo hành (tháng)'] ? parseInt(row['Thời hạn bảo hành (tháng)']) : null,
                        warranty_expiry_date: excelDateToMySQL(row['Ngày hết bảo hành']),
                        supplier: row['Nhà cung cấp'] || null,
                        description: row['Mô tả'] || null
                    }, { transaction: t });
                }

                // Create components from components sheet
                const assetComponents = componentsData.filter(comp => comp['Mã thiết bị (*)'] === assetCode);
                console.log(`[Import] Asset ${assetCode}: Found ${assetComponents.length} components in sheet`);
                if (assetComponents.length > 0) {
                    const componentsToCreate = assetComponents
                        .filter(comp => comp['Tên thành phần']) // Only create if has name
                        .map(comp => ({
                            asset_id: asset.id,
                            component_name: comp['Tên thành phần'],
                            component_code: comp['Mã thành phần'] || null,
                            specification: comp['Thông số kỹ thuật'] || null,
                            quantity: comp['Số lượng'] ? parseInt(comp['Số lượng']) : null,
                            unit: comp['Đơn vị'] || null,
                            remarks: comp['Ghi chú'] || null
                        }));
                    
                    if (componentsToCreate.length > 0) {
                        await AssetComponent.bulkCreate(componentsToCreate, { transaction: t });
                        console.log(`[Import] Created ${componentsToCreate.length} components for ${assetCode}`);
                    }
                }

                // Create consumables from consumables sheet
                const assetConsumables = consumablesData.filter(cons => cons['Mã thiết bị (*)'] === assetCode);
                console.log(`[Import] Asset ${assetCode}: Found ${assetConsumables.length} consumables in sheet`);
                if (assetConsumables.length > 0) {
                    const consumablesToCreate = assetConsumables
                        .filter(cons => cons['Tên vật tư']) // Only create if has name
                        .map(cons => ({
                            asset_id: asset.id,
                            item_name: cons['Tên vật tư'],
                            specification: cons['Thông số kỹ thuật'] || null,
                            unit: cons['Đơn vị'] || null,
                            replacement_cycle: cons['Chu kỳ thay thế (giờ)'] ? parseInt(cons['Chu kỳ thay thế (giờ)']) : null,
                            unit_price: cons['Đơn giá'] ? parseFloat(cons['Đơn giá']) : null,
                            supplier: cons['Nhà cung cấp'] || null,
                            remarks: cons['Ghi chú'] || null
                        }));
                    
                    if (consumablesToCreate.length > 0) {
                        await AssetConsumables.bulkCreate(consumablesToCreate, { transaction: t });
                        console.log(`[Import] Created ${consumablesToCreate.length} consumables for ${assetCode}`);
                    }
                }

                // Create specifications from specifications sheet
                const assetSpecifications = specificationsData.filter(spec => spec['Mã thiết bị (*)'] === assetCode);
                console.log(`[Import] Asset ${assetCode}: Found ${assetSpecifications.length} specifications in sheet`);
                if (assetSpecifications.length > 0) {
                    const specificationsToCreate = assetSpecifications
                        .filter(spec => spec['Mã thông số (*)']) // Only create if has spec code
                        .map(spec => {
                            const excelSpecCode = spec['Mã thông số (*)'];
                            const specCat = specCategories.find(sc => sc.spec_code === excelSpecCode);
                            if (!specCat) {
                                console.log(`[Import] WARNING: Spec code "${excelSpecCode}" not found in categories. Available codes:`, specCategories.map(sc => sc.spec_code).join(', '));
                                return null;
                            }
                            
                            return {
                                asset_id: asset.id,
                                spec_category_id: specCat.id,
                                value: spec['Giá trị'] || null,
                                numeric_value: spec['Giá trị số'] ? parseFloat(spec['Giá trị số']) : null,
                                remarks: spec['Ghi chú'] || null
                            };
                        })
                        .filter(spec => spec !== null); // Remove invalid specs
                    
                    if (specificationsToCreate.length > 0) {
                        await AssetSpecifications.bulkCreate(specificationsToCreate, { transaction: t });
                        console.log(`[Import] Created ${specificationsToCreate.length} specifications for ${assetCode}`);
                    } else {
                        console.log(`[Import] No valid specifications to create for ${assetCode} (all spec codes not found)`);
                    }
                }

                results.success.push({
                    row: rowNum,
                    asset_code: assetCode,
                    name: row['Tên thiết bị (*)'],
                    components: assetComponents.length,
                    consumables: assetConsumables.length,
                    specifications: assetSpecifications.length
                });

            } catch (error) {
                console.error(`[Import] Error at row ${rowNum}:`, error);
                console.error(`[Import] Error details - Name: ${error.name}, Message: ${error.message}`);
                if (error.errors && error.errors.length > 0) {
                    console.error(`[Import] Validation errors:`, error.errors.map(e => e.message).join(', '));
                }
                results.errors.push({
                    row: rowNum,
                    error: error.errors ? error.errors.map(e => e.message).join('; ') : (error.message || error.toString())
                });
            }
        }

        await t.commit();

        res.status(200).json({
            success: true,
            message: `Import hoàn tất: ${results.success.length} thành công, ${results.skipped.length} bỏ qua, ${results.errors.length} lỗi`,
            data: results
        });

    } catch (error) {
        await t.rollback();
        console.error('Error importing from Excel:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi import dữ liệu',
            error: error.message
        });
    }
};

// GET /api/assets/:id/consumables - Lấy vật tư tiêu hao của asset
const getAssetConsumables = async (req, res) => {
    try {
        const { id } = req.params;
        
        const consumables = await AssetConsumables.findAll({
            where: { asset_id: id },
            order: [['created_at', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: consumables,
            count: consumables.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching asset consumables',
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
    getAssetByCode,
    getAssetConsumables,
    exportTemplate,
    importFromExcel
};