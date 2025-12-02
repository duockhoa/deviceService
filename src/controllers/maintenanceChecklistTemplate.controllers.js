const { MaintenanceChecklistTemplate, MaintenanceChecklistTemplateItem, User } = require('../models');
const { Op } = require('sequelize');

// GET /api/v1/checklist-templates - Lấy danh sách mẫu checklist
const getAllTemplates = async (req, res) => {
    try {
        const { maintenance_type, is_active } = req.query;
        const where = {};
        
        if (maintenance_type) {
            where.maintenance_type = { [Op.in]: [maintenance_type, 'all'] };
        }
        if (is_active !== undefined) {
            where.is_active = is_active === 'true';
        }

        const templates = await MaintenanceChecklistTemplate.findAll({
            where,
            include: [
                {
                    model: MaintenanceChecklistTemplateItem,
                    as: 'items',
                    separate: true,
                    order: [['order_index', 'ASC']]
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name', 'employee_code']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: templates
        });
    } catch (error) {
        console.error('Error fetching checklist templates:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách mẫu checklist',
            error: error.message
        });
    }
};

// GET /api/v1/checklist-templates/:id - Lấy chi tiết mẫu checklist
const getTemplateById = async (req, res) => {
    try {
        const { id } = req.params;
        const template = await MaintenanceChecklistTemplate.findByPk(id, {
            include: [
                {
                    model: MaintenanceChecklistTemplateItem,
                    as: 'items',
                    separate: true,
                    order: [['order_index', 'ASC']]
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name', 'employee_code']
                }
            ]
        });

        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy mẫu checklist'
            });
        }

        res.status(200).json({
            success: true,
            data: template
        });
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy mẫu checklist',
            error: error.message
        });
    }
};

// POST /api/v1/checklist-templates - Tạo mẫu checklist mới
const createTemplate = async (req, res) => {
    const transaction = await MaintenanceChecklistTemplate.sequelize.transaction();
    try {
        const { template_name, maintenance_type, description, items } = req.body;

        if (!template_name || !items || items.length === 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập tên mẫu và danh sách hạng mục'
            });
        }

        const template = await MaintenanceChecklistTemplate.create({
            template_name,
            maintenance_type: maintenance_type || 'all',
            description,
            is_active: true,
            created_by: req.user?.id
        }, { transaction });

        if (items && items.length > 0) {
            await MaintenanceChecklistTemplateItem.bulkCreate(
                items.map((item, idx) => ({
                    template_id: template.id,
                    task_name: item.task_name,
                    check_item: item.check_item || null,
                    standard_value: item.standard_value || null,
                    check_method: item.check_method || null,
                    description: item.description || null,
                    is_required: item.is_required !== false,
                    order_index: item.order_index !== undefined ? item.order_index : idx
                })),
                { transaction }
            );
        }

        await transaction.commit();

        const result = await MaintenanceChecklistTemplate.findByPk(template.id, {
            include: [{
                model: MaintenanceChecklistTemplateItem,
                as: 'items',
                separate: true,
                order: [['order_index', 'ASC']]
            }]
        });

        res.status(201).json({
            success: true,
            data: result,
            message: 'Tạo mẫu checklist thành công'
        });
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error('Error creating template:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo mẫu checklist',
            error: error.message
        });
    }
};

// PUT /api/v1/checklist-templates/:id - Cập nhật mẫu checklist
const updateTemplate = async (req, res) => {
    const transaction = await MaintenanceChecklistTemplate.sequelize.transaction();
    try {
        const { id } = req.params;
        const { template_name, maintenance_type, description, is_active, items } = req.body;

        const template = await MaintenanceChecklistTemplate.findByPk(id, { transaction });
        if (!template) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy mẫu checklist'
            });
        }

        await template.update({
            template_name: template_name || template.template_name,
            maintenance_type: maintenance_type || template.maintenance_type,
            description: description !== undefined ? description : template.description,
            is_active: is_active !== undefined ? is_active : template.is_active
        }, { transaction });

        if (items) {
            // Xóa items cũ và tạo mới
            await MaintenanceChecklistTemplateItem.destroy({
                where: { template_id: id },
                transaction
            });

            if (items.length > 0) {
                await MaintenanceChecklistTemplateItem.bulkCreate(
                    items.map((item, idx) => ({
                        template_id: id,
                        task_name: item.task_name,
                        check_item: item.check_item || null,
                        standard_value: item.standard_value || null,
                        check_method: item.check_method || null,
                        description: item.description || null,
                        is_required: item.is_required !== false,
                        order_index: item.order_index !== undefined ? item.order_index : idx
                    })),
                    { transaction }
                );
            }
        }

        await transaction.commit();

        const result = await MaintenanceChecklistTemplate.findByPk(id, {
            include: [{
                model: MaintenanceChecklistTemplateItem,
                as: 'items',
                separate: true,
                order: [['order_index', 'ASC']]
            }]
        });

        res.status(200).json({
            success: true,
            data: result,
            message: 'Cập nhật mẫu checklist thành công'
        });
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error('Error updating template:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật mẫu checklist',
            error: error.message
        });
    }
};

// DELETE /api/v1/checklist-templates/:id - Xóa mẫu checklist
const deleteTemplate = async (req, res) => {
    const transaction = await MaintenanceChecklistTemplate.sequelize.transaction();
    try {
        const { id } = req.params;

        const template = await MaintenanceChecklistTemplate.findByPk(id, { transaction });
        if (!template) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy mẫu checklist'
            });
        }

        await MaintenanceChecklistTemplateItem.destroy({
            where: { template_id: id },
            transaction
        });

        await template.destroy({ transaction });
        await transaction.commit();

        res.status(200).json({
            success: true,
            message: 'Xóa mẫu checklist thành công'
        });
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error('Error deleting template:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa mẫu checklist',
            error: error.message
        });
    }
};

// POST /api/v1/checklist-templates/seed - Tạo 4 mẫu checklist mặc định
const seedDefaultTemplates = async (req, res) => {
    const transaction = await MaintenanceChecklistTemplate.sequelize.transaction();
    try {
        const templates = [
            {
                template_name: 'Checklist Vệ sinh tiêu chuẩn',
                maintenance_type: 'cleaning',
                description: 'Quy trình vệ sinh chuẩn cho thiết bị',
                items: [
                    { task_name: 'Kiểm tra và làm sạch bề mặt thiết bị', check_item: 'Bề mặt thiết bị', standard_value: 'Sạch, không bụi bẩn', check_method: 'Kiểm tra trực quan', is_required: true },
                    { task_name: 'Vệ sinh các bộ phận linh kiện', check_item: 'Linh kiện', standard_value: 'Sạch sẽ', check_method: 'Vệ sinh bằng dung dịch chuyên dụng', is_required: true },
                    { task_name: 'Làm sạch khu vực xung quanh thiết bị', check_item: 'Khu vực xung quanh', standard_value: 'Không có vật cản', check_method: 'Dọn dẹp vệ sinh', is_required: true },
                    { task_name: 'Kiểm tra độ sạch sau vệ sinh', check_item: 'Tổng thể', standard_value: 'Đạt tiêu chuẩn', check_method: 'Kiểm tra trực quan', is_required: true }
                ]
            },
            {
                template_name: 'Checklist Kiểm tra định kỳ',
                maintenance_type: 'inspection',
                description: 'Quy trình kiểm tra định kỳ thiết bị',
                items: [
                    { task_name: 'Kiểm tra hệ thống, thay dầu bôi trơn, lọc dầu', check_item: 'Hệ thống bôi trơn', standard_value: 'Dầu sạch, mức dầu đúng', check_method: 'Kiểm tra mức dầu và độ nhớt', is_required: true },
                    { task_name: 'Kiểm tra áp suất và nhiệt độ vận hành', check_item: 'Thông số vận hành', standard_value: 'Trong ngưỡng cho phép', check_method: 'Đo áp suất và nhiệt độ', is_required: true },
                    { task_name: 'Kiểm tra độ ồn và rung', check_item: 'Độ ồn, rung', standard_value: 'Bình thường', check_method: 'Kiểm tra bằng thiết bị đo', is_required: false },
                    { task_name: 'Kiểm tra các đầu nối, bu lông, đai ốc', check_item: 'Đầu nối', standard_value: 'Chặt chẽ', check_method: 'Kiểm tra và siết lại nếu cần', is_required: true },
                    { task_name: 'Nhật ký thiết bị và nhiệt độ vận hành', check_item: 'Nhật ký', standard_value: 'Đầy đủ', check_method: 'Ghi nhận và lưu trữ', is_required: true }
                ]
            },
            {
                template_name: 'Checklist Bảo trì định kỳ',
                maintenance_type: 'maintenance',
                description: 'Quy trình bảo trì định kỳ đầy đủ',
                items: [
                    { task_name: 'Kiểm tra hệ thống, thay dầu bôi trơn, lọc dầu', check_item: 'Hệ thống bôi trơn', standard_value: 'Dầu mới, sạch', check_method: 'Thay dầu và lọc theo chu kỳ', is_required: true },
                    { task_name: 'Kiểm tra và điều chỉnh các bu lông, đai ốc', check_item: 'Bu lông, đai ốc', standard_value: 'Chặt chẽ', check_method: 'Siết lại với moment quy định', is_required: true },
                    { task_name: 'Bôi trơn các bộ phận chuyển động', check_item: 'Bộ phận chuyển động', standard_value: 'Được bôi trơn', check_method: 'Bôi mỡ theo quy định', is_required: true },
                    { task_name: 'Kiểm tra áp suất và nhiệt độ vận hành', check_item: 'Thông số vận hành', standard_value: 'Trong ngưỡng', check_method: 'Đo và ghi nhận', is_required: true },
                    { task_name: 'Kiểm tra độ ồn và rung', check_item: 'Độ ồn, rung', standard_value: 'Bình thường', check_method: 'Đo bằng thiết bị', is_required: false },
                    { task_name: 'Hiệu chuẩn các thông số vận hành', check_item: 'Thông số', standard_value: 'Đúng tiêu chuẩn', check_method: 'Hiệu chuẩn theo quy trình', is_required: true },
                    { task_name: 'Nhật ký thiết bị và nhiệt độ vận hành', check_item: 'Nhật ký', standard_value: 'Đầy đủ', check_method: 'Ghi nhận và lưu trữ', is_required: true }
                ]
            },
            {
                template_name: 'Checklist Sửa chữa khắc phục',
                maintenance_type: 'corrective',
                description: 'Quy trình sửa chữa khi có sự cố',
                items: [
                    { task_name: 'Xác định nguyên nhân hư hỏng', check_item: 'Nguyên nhân', standard_value: 'Được xác định', check_method: 'Kiểm tra và phân tích', is_required: true },
                    { task_name: 'Đánh giá mức độ hư hỏng', check_item: 'Mức độ hư hỏng', standard_value: 'Được đánh giá', check_method: 'Kiểm tra chi tiết', is_required: true },
                    { task_name: 'Lập kế hoạch sửa chữa', check_item: 'Kế hoạch', standard_value: 'Đầy đủ', check_method: 'Lập kế hoạch chi tiết', is_required: true },
                    { task_name: 'Thay thế linh kiện hỏng', check_item: 'Linh kiện', standard_value: 'Hoạt động tốt', check_method: 'Thay thế và kiểm tra', is_required: false },
                    { task_name: 'Kiểm tra hoạt động sau sửa chữa', check_item: 'Hoạt động', standard_value: 'Bình thường', check_method: 'Test vận hành', is_required: true },
                    { task_name: 'Test vận hành đầy tải', check_item: 'Vận hành đầy tải', standard_value: 'Ổn định', check_method: 'Chạy thử 100% tải', is_required: true },
                    { task_name: 'Ghi nhận vào nhật ký bảo trì', check_item: 'Nhật ký', standard_value: 'Hoàn thành', check_method: 'Ghi nhận chi tiết', is_required: true },
                    { task_name: 'Đề xuất phương án phòng ngừa', check_item: 'Phòng ngừa', standard_value: 'Có đề xuất', check_method: 'Lập báo cáo đề xuất', is_required: false }
                ]
            }
        ];

        for (const templateData of templates) {
            const template = await MaintenanceChecklistTemplate.create({
                template_name: templateData.template_name,
                maintenance_type: templateData.maintenance_type,
                description: templateData.description,
                is_active: true,
                created_by: req.user?.id
            }, { transaction });

            await MaintenanceChecklistTemplateItem.bulkCreate(
                templateData.items.map((item, idx) => ({
                    template_id: template.id,
                    task_name: item.task_name,
                    check_item: item.check_item,
                    standard_value: item.standard_value,
                    check_method: item.check_method,
                    is_required: item.is_required,
                    order_index: idx
                })),
                { transaction }
            );
        }

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Đã tạo 4 mẫu checklist mặc định thành công'
        });
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error('Error seeding templates:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo mẫu checklist mặc định',
            error: error.message
        });
    }
};

module.exports = {
    getAllTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    seedDefaultTemplates
};
