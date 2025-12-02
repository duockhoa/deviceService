const { 
    Maintenance, 
    MaintenanceChecklist, 
    MaintenanceProgress, 
    MaintenanceImages,
    Assets, 
    User,
    MaintenanceWorkTask
} = require('../models');
const { Op } = require('sequelize');
const NotificationService = require('../service/NotificationService');

// GET /api/maintenance-work/my-tasks - Lấy danh sách WO được giao cho user đăng nhập
const getMyWorkOrders = async (req, res) => {
    try {
        const userId = req.user.id; // Lấy từ JWT token middleware

        const workOrders = await Maintenance.findAll({
            where: {
                technician_id: userId,
                status: {
                    [Op.in]: ['pending', 'in_progress']
                }
            },
            include: [
                {
                    model: Assets,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'name', 'image']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name', 'employee_code']
                },
                {
                    model: MaintenanceChecklist,
                    as: 'checklists',
                    attributes: ['id', 'task_name', 'check_item', 'standard_value', 'actual_value', 'result', 'check_method', 'description', 'is_completed', 'order_index'],
                    order: [['order_index', 'ASC']]
                },
                {
                    model: MaintenanceProgress,
                    as: 'progress_updates',
                    attributes: ['id', 'progress_percentage', 'work_description', 'time_spent', 'created_at'],
                    order: [['created_at', 'DESC']],
                    limit: 1
                }
            ],
            order: [
                ['priority', 'DESC'],
                ['scheduled_date', 'ASC']
            ]
        });

        // Tính phần trăm hoàn thành checklist
        const workOrdersWithProgress = workOrders.map(wo => {
            const totalTasks = wo.checklists?.length || 0;
            const completedTasks = wo.checklists?.filter(c => c.is_completed).length || 0;
            const checklistProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            return {
                ...wo.toJSON(),
                checklist_progress: checklistProgress,
                latest_progress: wo.progress_updates?.[0] || null
            };
        });

        res.status(200).json({
            success: true,
            data: workOrdersWithProgress,
            count: workOrdersWithProgress.length
        });
    } catch (error) {
        console.error('Error fetching work orders:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách công việc',
            error: error.message
        });
    }
};

// GET /api/maintenance-work/:id - Lấy chi tiết WO
const getWorkOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const workOrder = await Maintenance.findOne({
            where: { 
                id,
                technician_id: userId // Chỉ xem được WO của mình
            },
            include: [
                {
                    model: Assets,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'name', 'image']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name', 'employee_code', 'email']
                },
                {
                    model: MaintenanceChecklist,
                    as: 'checklists',
                    order: [['order_index', 'ASC']],
                    include: [{
                        model: User,
                        as: 'completer',
                        attributes: ['id', 'name']
                    }]
                },
                {
                    model: MaintenanceProgress,
                    as: 'progress_updates',
                    order: [['created_at', 'DESC']],
                    include: [{
                        model: User,
                        as: 'updater',
                        attributes: ['id', 'name']
                    }]
                },
                {
                    model: MaintenanceImages,
                    as: 'images',
                    order: [['uploaded_at', 'DESC']],
                    include: [{
                        model: User,
                        as: 'uploader',
                        attributes: ['id', 'name']
                    }]
                }
                ,{
                    model: MaintenanceWorkTask,
                    as: 'workTasks',
                    attributes: ['id','task_name','task_type','description','assigned_to','estimated_hours','actual_hours','status','priority','work_report','issues_found','materials_used','started_at','completed_at','completed_by','image_before','image_after','order_index'],
                    order: [['order_index', 'ASC']]
                }
            ]
        });

        if (!workOrder) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy công việc hoặc bạn không có quyền truy cập'
            });
        }

        // Convert to plain object and map assigned_to IDs to user names for workTasks
        const workOrderData = workOrder.toJSON();
        if (workOrderData.workTasks && workOrderData.workTasks.length > 0) {
            const userIds = new Set();
            workOrderData.workTasks.forEach(task => {
                try {
                    const assignedTo = typeof task.assigned_to === 'string' ? JSON.parse(task.assigned_to) : task.assigned_to;
                    if (Array.isArray(assignedTo)) {
                        assignedTo.forEach(id => userIds.add(id));
                    }
                } catch (err) {
                    // ignore parse errors
                }
            });

            if (userIds.size > 0) {
                const users = await User.findAll({ where: { id: Array.from(userIds) }, attributes: ['id', 'name'] });
                const userMap = {};
                users.forEach(u => { userMap[u.id] = u.name; });

                workOrderData.workTasks = workOrderData.workTasks.map(task => {
                    const assignedTo = typeof task.assigned_to === 'string' ? JSON.parse(task.assigned_to) : task.assigned_to;
                    const assignedNames = Array.isArray(assignedTo) ? assignedTo.map(id => userMap[id] || 'Unknown').join(', ') : '';
                    return {
                        ...task,
                        assigned_to: assignedTo,
                        assigned_to_name: assignedNames
                    };
                });
            }
        }

        res.status(200).json({
            success: true,
            data: workOrderData
        });
    } catch (error) {
        console.error('Error fetching work order:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết công việc',
            error: error.message
        });
    }
};

// PUT /api/maintenance-work/:id/checklist/:checklistId - Cập nhật checklist item
const updateChecklistItem = async (req, res) => {
    try {
        const { id, checklistId } = req.params;
        const { is_completed, actual_value, notes } = req.body;
        const userId = req.user.id;

        // Kiểm tra quyền
        const maintenance = await Maintenance.findOne({
            where: { id, technician_id: userId }
        });

        if (!maintenance) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền cập nhật công việc này'
            });
        }

        const checklist = await MaintenanceChecklist.findOne({
            where: { id: checklistId, maintenance_id: id }
        });

        if (!checklist) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy mục checklist'
            });
        }

        // Tự động đánh giá kết quả nếu có actual_value và standard_value
        let result = checklist.result;
        if (actual_value && checklist.standard_value) {
            // So sánh actual_value với standard_value
            result = actual_value.toString().trim().toLowerCase() === checklist.standard_value.toString().trim().toLowerCase() ? 'OK' : 'NG';
        }

        // Cập nhật
        await checklist.update({
            is_completed,
            actual_value: actual_value || checklist.actual_value,
            result,
            notes,
            completed_by: is_completed ? userId : null,
            completed_at: is_completed ? new Date() : null
        });

        // Tự động cập nhật trạng thái maintenance nếu bắt đầu làm
        if (maintenance.status === 'pending' && is_completed) {
            await maintenance.update({
                status: 'in_progress',
                actual_start_date: new Date()
            });
        }

        res.status(200).json({
            success: true,
            data: checklist,
            message: 'Cập nhật checklist thành công'
        });
    } catch (error) {
        console.error('Error updating checklist:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật checklist',
            error: error.message
        });
    }
};

// POST /api/maintenance-work/:id/progress - Thêm cập nhật tiến độ
const addProgressUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            progress_percentage,
            work_description,
            time_spent,
            materials_used,
            issues_found,
            notes
        } = req.body;
        const userId = req.user.id;

        // Kiểm tra quyền
        const maintenance = await Maintenance.findOne({
            where: { id, technician_id: userId }
        });

        if (!maintenance) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền cập nhật công việc này'
            });
        }

        const progress = await MaintenanceProgress.create({
            maintenance_id: id,
            updated_by: userId,
            progress_percentage,
            work_description,
            time_spent,
            materials_used,
            issues_found,
            notes
        });

        // Cập nhật actual_duration trong maintenance
        if (time_spent) {
            const totalTimeSpent = await MaintenanceProgress.sum('time_spent', {
                where: { maintenance_id: id }
            });
            await maintenance.update({ actual_duration: totalTimeSpent });
        }

        // Tự động cập nhật trạng thái
        if (maintenance.status === 'pending') {
            await maintenance.update({
                status: 'in_progress',
                actual_start_date: new Date()
            });
        }

        res.status(201).json({
            success: true,
            data: progress,
            message: 'Cập nhật tiến độ thành công'
        });
    } catch (error) {
        console.error('Error adding progress:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật tiến độ',
            error: error.message
        });
    }
};

// POST /api/maintenance-work/:id/images - Upload hình ảnh
const uploadImage = async (req, res) => {
    try {
        const { id } = req.params;
        const { image_url, image_type, description } = req.body;
        const userId = req.user.id;

        // Kiểm tra quyền
        const maintenance = await Maintenance.findOne({
            where: { id, technician_id: userId }
        });

        if (!maintenance) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền upload hình ảnh cho công việc này'
            });
        }

        const image = await MaintenanceImages.create({
            maintenance_id: id,
            image_url,
            image_type,
            description,
            uploaded_by: userId,
            uploaded_at: new Date()
        });

        res.status(201).json({
            success: true,
            data: image,
            message: 'Upload hình ảnh thành công'
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi upload hình ảnh',
            error: error.message
        });
    }
};

// PUT /api/maintenance-work/:id/complete - Hoàn thành công việc (để trưởng BP duyệt)
const completeWork = async (req, res) => {
    try {
        const { id } = req.params;
        const { final_notes } = req.body;
        const userId = req.user.id;

        const maintenance = await Maintenance.findOne({
            where: { id, technician_id: userId }
        });

        if (!maintenance) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền cập nhật công việc này'
            });
        }

        // Kiểm tra tất cả checklist đã hoàn thành chưa
        const incompleteTasks = await MaintenanceChecklist.count({
            where: {
                maintenance_id: id,
                is_completed: false
            }
        });

        if (incompleteTasks > 0) {
            return res.status(400).json({
                success: false,
                message: `Còn ${incompleteTasks} công việc chưa hoàn thành trong checklist`
            });
        }

        // Tính actual_duration nếu có actual_start_date
        let actual_duration = null;
        const actual_end_date = new Date();
        
        if (maintenance.actual_start_date) {
            const diffMs = actual_end_date - new Date(maintenance.actual_start_date);
            actual_duration = (diffMs / (1000 * 60 * 60)).toFixed(2); // Convert to hours
        }

        await maintenance.update({
            status: 'awaiting_approval',
            actual_end_date: actual_end_date,
            actual_duration: actual_duration,
            notes: final_notes || maintenance.notes
        });

        // Fetch updated maintenance with asset info
        const updatedMaintenance = await Maintenance.findByPk(id, {
            include: [
                {
                    model: Assets,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'name']
                }
            ]
        });

        res.status(200).json({
            success: true,
            data: updatedMaintenance,
            message: 'Đã hoàn thành công việc. Chờ trưởng bộ phận duyệt.'
        });

        // Send notification after successful completion
        try {
            await NotificationService.onMaintenanceCompleted({
                maintenanceId: updatedMaintenance.id,
                technicianId: updatedMaintenance.technician_id,
                assetCode: updatedMaintenance.asset?.asset_code,
                assetName: updatedMaintenance.asset?.name,
                createdBy: updatedMaintenance.created_by
            });
        } catch (notifError) {
            console.error('Error sending completion notification:', notifError);
        }
    } catch (error) {
        console.error('Error completing work:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi hoàn thành công việc',
            error: error.message
        });
    }
};

// GET /api/maintenance-work/pending-approval - Danh sách WO chờ duyệt (cho trưởng BP)
const getPendingApproval = async (req, res) => {
    try {
        const userId = req.user.id;
        // Giả sử trưởng BP là người tạo WO (created_by)
        
        const pendingWOs = await Maintenance.findAll({
            where: {
                created_by: userId,
                status: 'completed' // Đã hoàn thành, chờ duyệt
            },
            include: [
                {
                    model: Assets,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'name']
                },
                {
                    model: User,
                    as: 'technician',
                    attributes: ['id', 'name', 'employee_code']
                },
                {
                    model: MaintenanceImages,
                    as: 'images',
                    where: { image_type: { [Op.in]: ['before', 'after'] } },
                    required: false
                }
            ],
            order: [['actual_end_date', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: pendingWOs,
            count: pendingWOs.length
        });
    } catch (error) {
        console.error('Error fetching pending approvals:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách chờ duyệt',
            error: error.message
        });
    }
};

// POST /api/maintenance-work/:id/approve - Trưởng BP duyệt và đóng WO
const approveWork = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejection_reason, approved } = req.body;
        const userId = req.user.id;

        const maintenance = await Maintenance.findOne({
            where: { id, created_by: userId, status: 'completed' }
        });

        if (!maintenance) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy công việc hoặc bạn không có quyền duyệt'
            });
        }

        if (approved) {
            // Phê duyệt - chuyển sang status 'completed' (hoàn thành)
            await maintenance.update({
                status: 'completed',
                notes: `${maintenance.notes || ''}\n[Đã duyệt bởi User ID: ${userId} vào ${new Date().toLocaleString('vi-VN')}]`.trim()
            });

            res.status(200).json({
                success: true,
                data: maintenance,
                message: 'Đã phê duyệt công việc. Chuyển vào Hồ sơ bảo trì.'
            });
        } else {
            // Từ chối - trả lại cho technician để sửa
            await maintenance.update({
                status: 'in_progress',
                notes: `${maintenance.notes || ''}\n[Yêu cầu sửa lại] ${rejection_reason || ''} - ${new Date().toLocaleString('vi-VN')}`.trim()
            });

            res.status(200).json({
                success: true,
                data: maintenance,
                message: 'Đã từ chối và yêu cầu chỉnh sửa'
            });
        }
    } catch (error) {
        console.error('Error approving work:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi duyệt công việc',
            error: error.message
        });
    }
};

module.exports = {
    getMyWorkOrders,
    getWorkOrderById,
    updateChecklistItem,
    addProgressUpdate,
    uploadImage,
    completeWork,
    getPendingApproval,
    approveWork
};
