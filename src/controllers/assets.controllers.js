const { Op } = require('sequelize');
const { Assets, AssetCategories, AssetSubCategories, User, Departments, Areas, Plants, AssetGeneralInfo, AssetComponent, AssetSpecifications, AssetAttachment, AssetConsumables, SpecificationCategories, Maintenance, MaintenanceChecklist, MaintenanceProgress, MaintenanceImages, MaintenanceConsumables, MaintenanceAttachments } = require('../models');
const  sequelize  = require('../configs/sequelize');
const XLSX = require('xlsx');

// Helper: sinh asset_code dạng TB-YYYYMMDD-HHMMSS-XXX (retry tránh trùng)
const generateAssetCode = async () => {
    const pad = (n) => String(n).padStart(2, '0');
    const randomSuffix = () => Math.random().toString(36).slice(-3).toUpperCase();

    for (let i = 0; i < 5; i++) {
        const d = new Date();
        const code = `TB-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${randomSuffix()}`;
        const exists = await Assets.findOne({ where: { asset_code: code } });
        if (!exists) return code;
    }
    throw new Error('Không thể sinh asset_code duy nhất sau 5 lần thử');
};


// GET /api/assets - Lấy tất cả assets
const getAllAssets = async (req, res) => {
    try {
        const assets = await Assets.findAll({
            include: [
                { 
                    model: AssetSubCategories, 
                    as: 'SubCategory',
                    include: [{ model: AssetCategories, as: 'Category' }]
                },
                { model: User, as: 'Creator', attributes: ['id', 'name', 'employee_code'] },
                { model: Departments, as: 'Department', attributes: ['name', 'description'] },
                { model: Areas, as: 'Area', attributes: ['code', 'name'] }
            ]
        });
        res.status(200).json({ success: true, data: assets });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching assets', error: error.message });
    }
};

// PUT /api/assets/:id - Cập nhật asset (bao gồm components)
// GET /api/assets/:id - Get asset by ID
const getAssetById = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await Assets.findByPk(id, {
            include: [
                { model: AssetSubCategories, as: 'SubCategory', include: [{ model: AssetCategories, as: 'Category' }] },
                { model: User, as: 'Creator', attributes: ['id', 'name', 'employee_code'] },
                { model: Departments, as: 'Department' },
                { model: Areas, as: 'Area' }
            ]
        });
        if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
        res.status(200).json({ success: true, data: asset });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching asset', error: error.message });
    }
};

// POST /api/assets - Create new asset
const createAsset = async (req, res) => {
    try {
        const asset = await Assets.create(req.body);
        res.status(201).json({ success: true, data: asset });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Error creating asset', error: error.message });
    }
};

const updateAsset = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { generalInfo, components, ...assetData } = req.body;
        if (assetData.dk_code !== undefined) {
            assetData.dk_code = assetData.dk_code
                ? assetData.dk_code.toString().trim().toUpperCase()
                : null;
        }
        
        const asset = await Assets.findByPk(id);

        if (!asset) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        // Kiểm tra dk_code trùng (nếu có)
        if (assetData.dk_code) {
            const existingDk = await Assets.findOne({
                where: {
                    dk_code: assetData.dk_code,
                    id: { [Op.ne]: id }
                }
            });
            if (existingDk) {
                await t.rollback();
                return res.status(409).json({
                    success: false,
                    message: 'DK code already exists'
                });
            }
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

// DELETE /api/assets/:id - Soft delete asset (không xóa maintenance)
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

        // Soft delete asset: giữ maintenance để đảm bảo traceability
        await asset.update(
            {
                status: 'inactive',
                updated_at: new Date()
            },
            { transaction: t }
        );

        await t.commit();

        res.status(200).json({
            success: true,
            message: 'Asset đã được vô hiệu hóa (soft delete). Maintenance giữ nguyên để audit.'
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
                    { dk_code: { [require('sequelize').Op.like]: `%${query}%` } },
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
                'Mã DK (tùy chọn)': 'DK-001',
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
            { wch: 20 }, // Mã thiết bị
            { wch: 20 }, // Mã DK (tùy chọn)
            { wch: 30 }, // Tên thiết bị
            { wch: 20 }, // Mã danh mục phụ
            { wch: 15 }, // Khu vực
            { wch: 20 }, // Phòng ban
            { wch: 15 }, // Trạng thái
            { wch: 15 }, // Năm sản xuất
            { wch: 25 }, // Nhà sản xuất
            { wch: 15 }, // Xuất xứ
            { wch: 15 }, // Model
            { wch: 20 }, // Serial
            { wch: 25 }, // Thời hạn BH
            { wch: 20 }, // Ngày hết BH
            { wch: 25 }, // Nhà cung cấp
            { wch: 40 }  // Mô tả
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
            { 'Nội dung': '   - Cột \"Mã DK (tùy chọn)\": mã nội bộ để chọn thiết bị trong kế hoạch bảo trì; có thể bỏ trống nếu chưa dùng' },
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

// GET /api/assets/export/template/spec - Export Spec template
const exportSpecTemplate = async (req, res) => {
    try {
        const specCategories = await SpecificationCategories.findAll({
            attributes: ['spec_code', 'spec_name', 'unit', 'data_type'],
            order: [['spec_code', 'ASC']]
        });

        const wb = XLSX.utils.book_new();
        const data = [{
            'asset_code (*)': '',
            'Tên thông số (*)': '',
            'Giá trị': '',
            'Đơn vị': '',
            'Ghi chú': ''
        }];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Thông số');

        const instructions = [
            { 'Nội dung': 'IMPORT THÔNG SỐ' },
            { 'Nội dung': 'Bắt buộc: asset_code, Tên thông số.' },
            { 'Nội dung': 'Chỉ map theo asset_code (không dùng dk_code).' },
            { 'Nội dung': 'Không tự tạo thiết bị nếu không tìm thấy asset_code.' }
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instructions), 'Hướng dẫn');

        const specRef = specCategories.map(sc => ({
            'Mã thông số': sc.spec_code,
            'Tên thông số': sc.spec_name,
            'Đơn vị': sc.unit || '',
            'Kiểu dữ liệu': sc.data_type
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(specRef), 'Danh mục thông số');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Template_Thong_So.xlsx');
        return res.send(buffer);
    } catch (error) {
        console.error('Error exporting spec template:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi export template thông số', error: error.message });
    }
};

// GET /api/assets/export/template/consumable - Export Consumable template
const exportConsumableTemplate = async (req, res) => {
    try {
        const wb = XLSX.utils.book_new();
        const data = [{
            'asset_code (*)': '',
            'Tên vật tư (*)': '',
            'Định mức': '',
            'Chu kỳ': '',
            'Đơn vị': '',
            'Ghi chú': ''
        }];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Vật tư tiêu hao');

        const instructions = [
            { 'Nội dung': 'IMPORT VẬT TƯ TIÊU HAO' },
            { 'Nội dung': 'Bắt buộc: asset_code, Tên vật tư.' },
            { 'Nội dung': 'Chỉ map theo asset_code (không dùng dk_code).' },
            { 'Nội dung': 'Không tự tạo thiết bị nếu không tìm thấy asset_code.' }
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instructions), 'Hướng dẫn');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Template_Vat_Tu.xlsx');
        return res.send(buffer);
    } catch (error) {
        console.error('Error exporting consumable template:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi export template vật tư', error: error.message });
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
        // Process each row
        for (let i = 0; i < mainData.length; i++) {
            const row = mainData[i];
            const rowNum = i + 2; // Excel row number (starting from 2, after header)

            try {
                // Validate required fields (asset_code optional: sẽ auto-generate)
                const assetName = row['Tên thiết bị'] || row['Tên thiết bị (*)'];
                const subCatCodeOrName = row['Loại thiết bị'] || row['Loại thiết bị (mã)'];

                if (!assetName || !subCatCodeOrName) {
                    results.errors.push({
                        row: rowNum,
                        error: 'Thiếu thông tin bắt buộc (Tên thiết bị, Loại thiết bị)'
                    });
                    continue;
                }

                const providedAssetCode = row['asset_code'] || row['Mã thiết bị'] || row['Mã thiết bị (*)'] || null;
                const normalizedAssetCode = providedAssetCode && providedAssetCode.toString().trim() !== ''
                    ? providedAssetCode.toString().trim().toUpperCase()
                    : null;

                const rawDkCode = row['dk_code'] || row['DK Code'] || row['Mã DK'] || row['Mã DK (tùy chọn)'];
                const finalDkCode = rawDkCode
                    ? rawDkCode.toString().trim().toUpperCase() || null
                    : null;

                // Find sub_category_id by code or name (case-insensitive)
                const subCatLookup = subCatCodeOrName.toString().trim().toUpperCase();
                const subCat = subCategories.find(sc =>
                    sc.code?.toUpperCase() === subCatLookup ||
                    sc.name?.toUpperCase() === subCatLookup
                );
                if (!subCat) {
                    results.errors.push({
                        row: rowNum,
                        error: `Không tìm thấy loại thiết bị: ${subCatCodeOrName}`
                    });
                    continue;
                }

                // Find area_id (optional) by code or name
                let area_id = null;
                const areaValue = row['Khu vực'] || row['Khu vực (mã)'];
                if (areaValue) {
                    const area = areas.find(a =>
                        a.code?.toUpperCase() === areaValue.toString().trim().toUpperCase() ||
                        a.name?.toUpperCase() === areaValue.toString().trim().toUpperCase()
                    );
                    if (area) {
                        area_id = area.id;
                    }
                }

                // Find team_id (optional) by name
                let team_id = null;
                const teamValue = row['Bộ phận'];
                if (teamValue) {
                    const dept = departments.find(d => d.name?.toUpperCase() === teamValue.toString().trim().toUpperCase());
                    if (dept) {
                        team_id = dept.name;
                    }
                }

                // Resolve final asset_code (auto-generate if missing)
                let finalAssetCode = normalizedAssetCode;
                if (!finalAssetCode) {
                    finalAssetCode = await generateAssetCode();
                }

                // Check if asset_code already exists
                const existingAsset = await Assets.findOne({
                    where: { asset_code: finalAssetCode }
                });

                if (existingAsset) {
                    results.skipped.push({
                        row: rowNum,
                        asset_code: finalAssetCode,
                        name: assetName,
                        reason: `Mã thiết bị đã tồn tại trong hệ thống`
                    });
                    continue;
                }

                // Create asset
                const asset = await Assets.create({
                    asset_code: finalAssetCode,
                    dk_code: finalDkCode,
                    name: assetName,
                    sub_category_id: subCat.id,
                    area_id: area_id,
                    team_id: team_id,
                    description: row['Ghi chú'] || null,
                    status: 'active',
                    created_by: req.user?.id
                }, { transaction: t });

                // Create general info if provided
                const usageDate = excelDateToMySQL(row['Ngày sử dụng']);
                if (usageDate || row['Model'] || row['Serial']) {
                    await AssetGeneralInfo.create({
                        asset_id: asset.id,
                        model: row['Model'] || null,
                        serial_number: row['Serial'] || null,
                        description: usageDate ? `Ngày sử dụng: ${usageDate}` : null
                    }, { transaction: t });
                }

                results.success.push({
                    row: rowNum,
                    asset_code: finalAssetCode,
                    name: assetName
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

// POST /api/assets/import/specifications - Import specifications for existing assets
const importAssetSpecificationsFromExcel = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng upload file Excel'
            });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames.find(name => name.includes('Thông số')) || workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Sheet không có dữ liệu'
            });
        }

        const assets = await Assets.findAll({ attributes: ['id', 'asset_code'] });
        const assetMap = new Map(assets.map(a => [a.asset_code.toUpperCase(), a.id]));

        const specCategories = await SpecificationCategories.findAll({ attributes: ['id', 'spec_code', 'spec_name'] });
        const specCatMap = new Map();
        specCategories.forEach(sc => {
            if (sc.spec_code) specCatMap.set(sc.spec_code, sc.id);
            if (sc.spec_code) specCatMap.set(sc.spec_code.toUpperCase(), sc.id);
            if (sc.spec_name) specCatMap.set(sc.spec_name, sc.id);
            if (sc.spec_name) specCatMap.set(sc.spec_name.toUpperCase(), sc.id);
        });

        const results = { created: 0, updated: 0, errors: [], skipped: [] };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // header at row 1

            try {
                const assetCodeRaw = row['asset_code (*)'] || row['asset_code'] || row['Mã thiết bị'] || row['Mã thiết bị (*)'];
                const specNameRaw = row['Tên thông số (*)'] || row['Tên thông số'];
                const specCodeRaw = row['Mã thông số'] || row['Spec Code'];

                if (!assetCodeRaw || !specNameRaw) {
                    results.errors.push({ row: rowNum, error: 'Thiếu asset_code hoặc Tên thông số' });
                    continue;
                }

                const assetCode = assetCodeRaw.toString().trim().toUpperCase();
                const specLookup = (specCodeRaw || specNameRaw).toString().trim();

                const assetId = assetMap.get(assetCode);
                if (!assetId) {
                    results.errors.push({ row: rowNum, error: `Không tìm thấy thiết bị với mã ${assetCode}` });
                    continue;
                }

                const specCatId = specCatMap.get(specLookup) || specCatMap.get(specLookup.toUpperCase());
                if (!specCatId) {
                    results.errors.push({ row: rowNum, error: `Không tìm thấy danh mục thông số cho: ${specLookup}` });
                    continue;
                }

                const payload = {
                    asset_id: assetId,
                    spec_category_id: specCatId,
                    value: row['Giá trị'] || null,
                    numeric_value: row['Giá trị số'] ? parseFloat(row['Giá trị số']) : null,
                    remarks: row['Ghi chú'] || null,
                    updated_by: req.user?.id || null,
                    created_by: req.user?.id || null
                };

                const existing = await AssetSpecifications.findOne({
                    where: { asset_id: assetId, spec_category_id: specCatId }
                });

                if (existing) {
                    await existing.update(payload, { transaction: t });
                    results.updated += 1;
                } else {
                    await AssetSpecifications.create(payload, { transaction: t });
                    results.created += 1;
                }
            } catch (err) {
                results.errors.push({ row: rowNum, error: err.message || 'Lỗi không xác định' });
            }
        }

        await t.commit();

        res.status(200).json({
            success: true,
            message: `Import thông số hoàn tất: ${results.created} thêm mới, ${results.updated} cập nhật, ${results.errors.length} lỗi` ,
            data: results
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({
            success: false,
            message: 'Lỗi khi import thông số',
            error: error.message
        });
    }
};

// POST /api/assets/import/consumables - Import consumables for existing assets
const importAssetConsumablesFromExcel = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng upload file Excel'
            });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames.find(name => name.includes('Vật tư')) || workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Sheet không có dữ liệu'
            });
        }

        const assets = await Assets.findAll({ attributes: ['id', 'asset_code'] });
        const assetMap = new Map(assets.map(a => [a.asset_code.toUpperCase(), a.id]));

        const results = { created: 0, updated: 0, errors: [], skipped: [] };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;

            try {
                const assetCodeRaw = row['asset_code (*)'] || row['asset_code'] || row['Mã thiết bị'] || row['Mã thiết bị (*)'];
                const itemNameRaw = row['Tên vật tư (*)'] || row['Tên vật tư'] || row['Item Name'];

                if (!assetCodeRaw || !itemNameRaw) {
                    results.errors.push({ row: rowNum, error: 'Thiếu Mã thiết bị hoặc Tên vật tư' });
                    continue;
                }

                const assetCode = assetCodeRaw.toString().trim().toUpperCase();
                const assetId = assetMap.get(assetCode);

                if (!assetId) {
                    results.errors.push({ row: rowNum, error: `Không tìm thấy thiết bị với mã ${assetCode}` });
                    continue;
                }

                const itemName = itemNameRaw.toString().trim();
                const payload = {
                    asset_id: assetId,
                    item_name: itemName,
                    specification: row['Định mức'] || null,
                    unit: row['Đơn vị'] || null,
                    replacement_cycle: row['Chu kỳ'] ? parseInt(row['Chu kỳ']) : null,
                    unit_price: null,
                    supplier: null,
                    remarks: row['Ghi chú'] || null
                };

                const existing = await AssetConsumables.findOne({
                    where: { asset_id: assetId, item_name: itemName }
                });

                if (existing) {
                    await existing.update(payload, { transaction: t });
                    results.updated += 1;
                } else {
                    await AssetConsumables.create(payload, { transaction: t });
                    results.created += 1;
                }
            } catch (err) {
                results.errors.push({ row: rowNum, error: err.message || 'Lỗi không xác định' });
            }
        }

        await t.commit();

        res.status(200).json({
            success: true,
            message: `Import vật tư tiêu hao hoàn tất: ${results.created} thêm mới, ${results.updated} cập nhật, ${results.errors.length} lỗi`,
            data: results
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({
            success: false,
            message: 'Lỗi khi import vật tư tiêu hao',
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

const getAssetByDkCode = async (req, res) => {
    try {
        const { dkCode } = req.params;
        const asset = await Assets.findOne({
            where: { dk_code: dkCode },
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
            message: 'Error fetching asset by DK code',
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
    getAssetByDkCode,
    getAssetConsumables,
    exportTemplate,
    exportSpecTemplate,
    exportConsumableTemplate,
    importFromExcel,
    importAssetSpecificationsFromExcel,
    importAssetConsumablesFromExcel
};
