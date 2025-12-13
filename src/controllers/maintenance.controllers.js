const { Maintenance, Assets, User, MaintenanceConsumables, MaintenanceChecklist, MaintenanceWorkTask } = require('../models');
const { Op } = require('sequelize');
const NotificationService = require('../service/NotificationService');
const { logAudit } = require('../utils/auditLogger');

const buildMaintenanceCode = async () => {
    const year = new Date().getFullYear();
    const last = await Maintenance.findOne({
        where: { maintenance_code: { [Op.like]: `MT-${year}-%` } },
        order: [['maintenance_code', 'DESC']]
    });
    const next = last ? parseInt(last.maintenance_code.split('-')[2]) + 1 : 1;
    return `MT-${year}-${String(next).padStart(4, '0')}`;
};

// GET /api/maintenance - Lấy tất cả maintenance records
const getAllMaintenance = async (req, res) => {
    try {
        const { include_deleted } = req.query;
        const where = {};
        if (include_deleted !== '1') {
            where.is_deleted = false;
        }

        const maintenance = await Maintenance.findAll({
            where,
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
                }
            ],
            order: [['scheduled_date', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: maintenance,
            count: maintenance.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching maintenance records',
            error: error.message
        });
    }
};

// GET /api/maintenance/:id - Lấy maintenance theo ID
const getMaintenanceById = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Fetching maintenance ID: ${id}`);
        
        const maintenance = await Maintenance.findByPk(id, {
            include: [
                {
                    model: Assets,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'name', 'image']
                },
                {
                    model: User,
                    as: 'technician',
                    attributes: ['id', 'name', 'employee_code', 'email']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name', 'employee_code']
                },
                {
                    model: MaintenanceConsumables,
                    as: 'maintenanceConsumables',
                    include: [
                        {
                            model: require('../models').ConsumableCategories,
                            as: 'consumableCategory',
                            attributes: ['id', 'name', 'description']
                        },
                        {
                            model: require('../models').AssetConsumables,
                            as: 'assetConsumable',
                            attributes: ['id', 'item_name', 'specification', 'unit', 'unit_price', 'supplier']
                        }
                    ]
                },
                {
                    model: MaintenanceChecklist,
                    as: 'checklists',
                    attributes: ['id', 'task_name', 'check_item', 'standard_value', 'check_method', 'actual_value', 'description', 'is_completed', 'order_index', 'notes'],
                    order: [['order_index', 'ASC']]
                },
                {
                    model: MaintenanceWorkTask,
                    as: 'workTasks',
                    attributes: ['id', 'task_name', 'task_type', 'description', 'assigned_to', 'estimated_hours', 'actual_hours', 'status', 'priority', 'work_report', 'issues_found', 'materials_used', 'started_at', 'completed_at', 'completed_by', 'image_before', 'image_after', 'order_index'],
                    order: [['order_index', 'ASC']]
                }
            ]
        });

        console.log('Maintenance found:', maintenance ? 'Yes' : 'No');
        if (maintenance && maintenance.maintenanceConsumables) {
            console.log('Consumables count:', maintenance.maintenanceConsumables.length);
        }

        if (!maintenance) {
            return res.status(404).json({
                success: false,
                message: 'Maintenance record not found'
            });
        }
        if (maintenance.is_deleted) {
            return res.status(400).json({
                success: false,
                message: 'Không thể từ chối bản ghi đã xóa'
            });
        }
        if (maintenance.is_deleted) {
            return res.status(400).json({
                success: false,
                message: 'Không thể phê duyệt bản ghi đã xóa'
            });
        }

        // Parse JSON fields in workTasks and get assigned user names
        const maintenanceData = maintenance.toJSON();
        if (maintenanceData.workTasks && maintenanceData.workTasks.length > 0) {
            // Get all unique user IDs from assigned_to
            const userIds = new Set();
            maintenanceData.workTasks.forEach(task => {
                const assignedTo = typeof task.assigned_to === 'string' ? JSON.parse(task.assigned_to) : task.assigned_to;
                if (Array.isArray(assignedTo)) {
                    assignedTo.forEach(id => userIds.add(id));
                }
            });

            // Fetch all users at once
            const users = await User.findAll({
                where: { id: Array.from(userIds) },
                attributes: ['id', 'name']
            });
            const userMap = {};
            users.forEach(user => {
                userMap[user.id] = user.name;
            });

            // Map tasks with user names
            maintenanceData.workTasks = maintenanceData.workTasks.map(task => {
                const assignedTo = typeof task.assigned_to === 'string' ? JSON.parse(task.assigned_to) : task.assigned_to;
                const assignedNames = Array.isArray(assignedTo) 
                    ? assignedTo.map(id => userMap[id] || 'Unknown').join(', ')
                    : '';
                
                return {
                    ...task,
                    assigned_to: assignedTo,
                    assigned_to_name: assignedNames
                };
            });
        }

        res.status(200).json({
            success: true,
            data: maintenanceData
        });
    } catch (error) {
        console.error('Error in getMaintenanceById:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching maintenance record',
            error: error.message
        });
    }
};

// GET /api/maintenance/asset/:assetId - Lấy maintenance theo asset
const getMaintenanceByAsset = async (req, res) => {
    try {
        const { assetId } = req.params;
        const { include_deleted } = req.query;
        const maintenance = await Maintenance.findAll({
            where: { asset_id: assetId, ...(include_deleted === '1' ? {} : { is_deleted: false }) },
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
                }
            ],
            order: [['scheduled_date', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: maintenance,
            count: maintenance.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching maintenance by asset',
            error: error.message
        });
    }
};

// GET /api/maintenance/status/:status - Lấy maintenance theo status
const getMaintenanceByStatus = async (req, res) => {
    try {
        const { status } = req.params;
        const { include_deleted } = req.query;
        const maintenance = await Maintenance.findAll({
            where: { status: status, ...(include_deleted === '1' ? {} : { is_deleted: false }) },
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
                }
            ],
            order: [['scheduled_date', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: maintenance,
            count: maintenance.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching maintenance by status',
            error: error.message
        });
    }
};

// GET /api/maintenance/technician/:technicianId - Lấy maintenance theo technician
const getMaintenanceByTechnician = async (req, res) => {
    try {
        const { technicianId } = req.params;
        const { include_deleted } = req.query;
        const maintenance = await Maintenance.findAll({
            where: { technician_id: technicianId, ...(include_deleted === '1' ? {} : { is_deleted: false }) },
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
                }
            ],
            order: [['scheduled_date', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: maintenance,
            count: maintenance.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching maintenance by technician',
            error: error.message
        });
    }
};

// GET /api/maintenance/my-work - Lấy maintenance của user đang đăng nhập (Bảo trì thiết bị)
const getMyMaintenanceWork = async (req, res) => {
    try {
        const userId = req.user?.id; // Lấy từ middleware auth
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized - User ID not found'
            });
        }

        const maintenance = await Maintenance.findAll({
            where: { technician_id: userId, is_deleted: false }, // Chỉ lấy công việc của user hiện tại
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
                }
            ],
            order: [['scheduled_date', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: maintenance,
            count: maintenance.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching my maintenance work',
            error: error.message
        });
    }
};

// GET /api/maintenance/results - Lấy kết quả bảo trì (in_progress, awaiting_approval, completed) - CHỈ QUẢN LÝ
const getMaintenanceResults = async (req, res) => {
    try {
        const maintenance = await Maintenance.findAll({
            where: {
                status: ['in_progress', 'awaiting_approval', 'completed'],
                is_deleted: false
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
                }
            ],
            order: [['scheduled_date', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: maintenance,
            count: maintenance.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching maintenance results',
            error: error.message
        });
    }
};

// POST /api/maintenance - Tạo maintenance mới
const createMaintenance = async (req, res) => {
    let transaction;
    try {
        transaction = await Maintenance.sequelize.transaction();
        
        const { consumables, checklist, ...maintenanceData } = req.body;

        // Validate created_by: require auth or explicit created_by from body
        if (!req.user && (!maintenanceData.created_by || maintenanceData.created_by === null)) {
            // no authenticated user and no created_by provided — return error
            if (transaction && !transaction.finished) await transaction.rollback();
            return res.status(401).json({ success: false, message: 'Authentication required or provide created_by in request body' });
        }
        const defaultValues = {
            maintenance_code: await buildMaintenanceCode(),
            maintenance_type: 'preventive',
            priority: 'medium',
            title: 'Maintenance Task',
            status: 'pending',
            scheduled_date: new Date(),
            estimated_duration: 1,
            created_by: req.user ? req.user.id : maintenanceData.created_by
        };

        console.log('Default values:', defaultValues);
        console.log('Maintenance data:', maintenanceData);

        // Normalize maintenance_type to match ENUM ('corrective' instead of legacy 'repair')
        const normalizedType = maintenanceData.maintenance_type === 'repair' ? 'corrective' :
            (maintenanceData.maintenance_type || 'preventive');

        const processedData = {
            // Required fields with defaults
            maintenance_code: maintenanceData.maintenance_code || defaultValues.maintenance_code,
            maintenance_type: normalizedType,
            priority: maintenanceData.priority || defaultValues.priority,
            title: maintenanceData.title || defaultValues.title,
            status: maintenanceData.status || defaultValues.status,
            scheduled_date: maintenanceData.scheduled_date ? new Date(maintenanceData.scheduled_date) : defaultValues.scheduled_date,
            estimated_duration: maintenanceData.estimated_duration !== undefined && maintenanceData.estimated_duration !== '' && maintenanceData.estimated_duration !== null ? parseFloat(maintenanceData.estimated_duration) : defaultValues.estimated_duration,
            created_by: defaultValues.created_by,
            // Asset and technician
            asset_id: parseInt(maintenanceData.asset_id),
            technician_id: maintenanceData.technician_id === '' || maintenanceData.technician_id === null ? null : (maintenanceData.technician_id ? parseInt(maintenanceData.technician_id) : null),
            // Optional fields
            actual_duration: maintenanceData.actual_duration === '' || maintenanceData.actual_duration === null ? null : (maintenanceData.actual_duration ? parseFloat(maintenanceData.actual_duration) : null),
            cost: maintenanceData.cost === '' || maintenanceData.cost === null ? null : (maintenanceData.cost ? parseFloat(maintenanceData.cost) : null),
            estimated_cost: maintenanceData.estimated_cost === '' || maintenanceData.estimated_cost === null ? null : (maintenanceData.estimated_cost ? parseFloat(maintenanceData.estimated_cost) : null),
            // Other optional fields
            description: maintenanceData.description || null,
            notes: maintenanceData.notes || null,
            actual_start_date: maintenanceData.actual_start_date ? new Date(maintenanceData.actual_start_date) : null,
            actual_end_date: maintenanceData.actual_end_date ? new Date(maintenanceData.actual_end_date) : null,
            // Planning fields
            location: maintenanceData.location || null,
            safety_requirements: maintenanceData.safety_requirements || null,
            tools_required: maintenanceData.tools_required || null,
            measuring_tools: maintenanceData.measuring_tools || null,
            safety_tools: maintenanceData.safety_tools || null,
            spare_parts: maintenanceData.spare_parts || null
        };

        console.log('Processed data before NaN conversion:', processedData);

        // Convert NaN values to null only for numeric fields
        const numericFields = ['estimated_duration', 'actual_duration', 'cost', 'estimated_cost', 'asset_id', 'technician_id'];
        numericFields.forEach(key => {
            if (processedData[key] !== null && processedData[key] !== undefined && isNaN(processedData[key])) {
                processedData[key] = null;
            }
        });

        console.log('Creating maintenance with data:', processedData);

        const maintenance = await Maintenance.create(processedData, { transaction });

        await logAudit({
            entityType: 'maintenance',
            entityId: maintenance.id,
            action: 'MAINTENANCE_CREATE',
            before: null,
            after: maintenance.toJSON(),
            reason: maintenanceData.reason,
            user: req.user,
            req
        });

        // Handle consumables if provided
        if (consumables && Array.isArray(consumables) && consumables.length > 0) {
            console.log('Consumables received:', JSON.stringify(consumables, null, 2));
            
            const consumableRecords = consumables.map(consumable => {
                const record = {
                    maintenance_id: maintenance.id,
                    consumable_category_id: consumable.consumable_category_id ? parseInt(consumable.consumable_category_id) : null,
                    asset_consumable_id: consumable.asset_consumable_id ? parseInt(consumable.asset_consumable_id) : null,
                    item_name: consumable.item_name || null,
                    specification: consumable.specification || null,
                    quantity_required: parseFloat(consumable.quantity_required) || 1,
                    unit_cost: consumable.unit_cost ? parseFloat(consumable.unit_cost) : null,
                    total_cost: consumable.total_cost ? parseFloat(consumable.total_cost) : null,
                    notes: consumable.notes || null,
                    status: consumable.status || 'planned'
                };
                console.log('Mapped consumable record:', record);
                return record;
            });

            console.log('Final consumable records:', JSON.stringify(consumableRecords, null, 2));
            await MaintenanceConsumables.bulkCreate(consumableRecords, { transaction });
        }

        // Handle checklist if provided
        if (checklist && Array.isArray(checklist) && checklist.length > 0) {
            const checklistRecords = checklist.map((item, index) => ({
                maintenance_id: maintenance.id,
                task_name: item.task || item.task_name,
                check_item: item.check_item || null,
                standard_value: item.standard_value || null,
                check_method: item.check_method || null,
                description: item.description || null,
                is_completed: false,
                order_index: item.order_index !== undefined ? item.order_index : index,
                notes: item.notes || null
            }));

            await MaintenanceChecklist.bulkCreate(checklistRecords, { transaction });
        }

        // Handle work tasks if provided
        if (req.body.workTasks && Array.isArray(req.body.workTasks) && req.body.workTasks.length > 0) {
            console.log('2025-11-17: Received workTasks:', JSON.stringify(req.body.workTasks, null, 2));
            
            const workTaskRecords = req.body.workTasks.map((task, index) => ({
                maintenance_id: maintenance.id,
                task_name: task.task_name,
                task_type: task.task_type || 'custom',
                description: task.description || null,
                assigned_to: JSON.stringify(task.assigned_to || []),
                estimated_hours: task.estimated_hours || null,
                status: 'pending',
                priority: task.priority || 'medium',
                order_index: task.order_index !== undefined ? task.order_index : index
            }));

            console.log('2025-11-17: Creating workTasks:', workTaskRecords.length);
            await MaintenanceWorkTask.bulkCreate(workTaskRecords, { transaction });
            console.log('2025-11-17: WorkTasks created successfully');
        } else {
            console.log('2025-11-17: No workTasks provided or empty array');
        }

        // Commit transaction
        if (transaction && !transaction.finished) {
            await transaction.commit();
        }

        // Fetch the created maintenance with associations
        const createdMaintenance = await Maintenance.findByPk(maintenance.id, {
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
                }
                // Temporarily remove MaintenanceConsumables include to test
                // {
                //     model: MaintenanceConsumables,
                //     as: 'maintenanceConsumables',
                //     include: [{
                //         model: require('../models').ConsumableCategories,
                //         as: 'consumableCategory',
                //         attributes: ['id', 'name', 'unit']
                //     }]
                // }
            ]
        });

        res.status(201).json({
            success: true,
            data: createdMaintenance,
            message: 'Maintenance record created successfully'
        });

        // 🆕 Gửi thông báo sau khi tạo thành công
        try {
            await NotificationService.onMaintenanceCreated({
                id: createdMaintenance.id,
                maintenance_code: createdMaintenance.maintenance_code,
                title: createdMaintenance.title,
                asset: createdMaintenance.asset,
                technician_id: createdMaintenance.technician_id,
                created_by: createdMaintenance.created_by
            });
        } catch (notifError) {
            console.error('Error sending notification:', notifError);
            // Không throw error để không ảnh hưởng đến response chính
        }
    } catch (error) {
        // Rollback only if transaction exists and not finished
        if (transaction && !transaction.finished) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error('Error rolling back transaction:', rollbackError);
            }
        }
        
        console.error('Error in createMaintenance:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating maintenance record',
            error: error.message
        });
    }
};

// PUT /api/maintenance/:id - Cập nhật maintenance
const updateMaintenance = async (req, res) => {
    let transaction;
    try {
        transaction = await Maintenance.sequelize.transaction();
        
        const { id } = req.params;
        const { consumables, checklist, ...updateData } = req.body;

        // 🆕 Lấy maintenance cũ để so sánh technician_id
        const existingMaintenance = await Maintenance.findByPk(id, {
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
                }
            ]
        });

        if (!existingMaintenance) {
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
            return res.status(404).json({
                success: false,
                message: 'Maintenance record not found'
            });
        }

        const oldTechnicianId = existingMaintenance.technician_id;
        const lockedStatuses = ['approved', 'in_progress', 'completed', 'closed', 'cancelled'];
        const lockedFields = ['asset_id', 'title', 'maintenance_type', 'priority', 'scheduled_date', 'description', 'location', 'safety_requirements', 'tools_required', 'measuring_tools', 'safety_tools', 'spare_parts', 'estimated_cost'];
        const allowedWhenLocked = new Set(['actual_start_date', 'actual_end_date', 'actual_duration', 'notes']);
        if (lockedStatuses.includes(existingMaintenance.status)) {
            if (consumables !== undefined || checklist !== undefined) {
                if (transaction && !transaction.finished) await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Không được sửa checklist/consumables sau khi đã approve'
                });
            }
            const attempted = Object.keys(updateData || {}).filter(
                (field) => lockedFields.includes(field) || !allowedWhenLocked.has(field)
            );
            if (attempted.length) {
                if (transaction && !transaction.finished) await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Không được sửa các trường sau khi approve: ${attempted.join(', ')}`
                });
            }
        }

        if ('status' in updateData) {
            if (transaction && !transaction.finished) await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Không được cập nhật trạng thái trực tiếp. Vui lòng dùng các endpoint approve/start/complete/close.'
            });
        }

        // Normalize maintenance_type from legacy value
        if (updateData.maintenance_type === 'repair') {
            updateData.maintenance_type = 'corrective';
        }

        // Exclude maintenance_code from update to prevent unique constraint violation
        delete updateData.maintenance_code;

        // Convert data types if provided
        if (updateData.asset_id) updateData.asset_id = parseInt(updateData.asset_id);
        // Handle technician_id - convert empty string to null
        if ('technician_id' in updateData) {
            updateData.technician_id = updateData.technician_id === '' || updateData.technician_id === null ? null : parseInt(updateData.technician_id);
        }
        
        // Handle decimal fields - convert empty strings to null
        if ('estimated_duration' in updateData) {
            updateData.estimated_duration = updateData.estimated_duration === '' || updateData.estimated_duration === null ? null : parseFloat(updateData.estimated_duration);
        }
        if ('actual_duration' in updateData) {
            updateData.actual_duration = updateData.actual_duration === '' || updateData.actual_duration === null ? null : parseFloat(updateData.actual_duration);
        }
        if ('cost' in updateData) {
            updateData.cost = updateData.cost === '' || updateData.cost === null ? null : parseFloat(updateData.cost);
        }
        if ('estimated_cost' in updateData) {
            updateData.estimated_cost = updateData.estimated_cost === '' || updateData.estimated_cost === null ? null : parseFloat(updateData.estimated_cost);
        }
        
        // Handle planning fields - preserve empty strings as null
        if ('location' in updateData) {
            updateData.location = updateData.location === '' ? null : updateData.location;
        }
        if ('safety_requirements' in updateData) {
            updateData.safety_requirements = updateData.safety_requirements === '' ? null : updateData.safety_requirements;
        }
        if ('tools_required' in updateData) {
            updateData.tools_required = updateData.tools_required === '' ? null : updateData.tools_required;
        }
        if ('measuring_tools' in updateData) {
            updateData.measuring_tools = updateData.measuring_tools === '' ? null : updateData.measuring_tools;
        }
        if ('safety_tools' in updateData) {
            updateData.safety_tools = updateData.safety_tools === '' ? null : updateData.safety_tools;
        }
        if ('spare_parts' in updateData) {
            updateData.spare_parts = updateData.spare_parts === '' ? null : updateData.spare_parts;
        }
        
        // Handle date fields
        if (updateData.scheduled_date) updateData.scheduled_date = new Date(updateData.scheduled_date);
        if (updateData.actual_start_date) updateData.actual_start_date = new Date(updateData.actual_start_date);
        if (updateData.actual_end_date) updateData.actual_end_date = new Date(updateData.actual_end_date);

        const [updatedRowsCount] = await Maintenance.update(updateData, {
            where: { id: id },
            transaction
        });

        if (updatedRowsCount === 0) {
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
            return res.status(404).json({
                success: false,
                message: 'Maintenance record not found'
            });
        }

        // Handle consumables update
        if (consumables !== undefined) {
            // Delete existing consumables
            await MaintenanceConsumables.destroy({
                where: { maintenance_id: id },
                transaction
            });

            // Create new consumables if provided
            if (Array.isArray(consumables) && consumables.length > 0) {
                const consumableRecords = consumables.map(consumable => ({
                    maintenance_id: parseInt(id),
                    consumable_category_id: consumable.consumable_category_id ? parseInt(consumable.consumable_category_id) : null,
                    asset_consumable_id: consumable.asset_consumable_id ? parseInt(consumable.asset_consumable_id) : null,
                    item_name: consumable.item_name || null,
                    specification: consumable.specification || null,
                    quantity_required: parseFloat(consumable.quantity_required) || 1,
                    quantity_used: consumable.quantity_used ? parseFloat(consumable.quantity_used) : null,
                    unit_cost: consumable.unit_cost ? parseFloat(consumable.unit_cost) : null,
                    total_cost: consumable.total_cost ? parseFloat(consumable.total_cost) : null,
                    notes: consumable.notes || null,
                    status: consumable.status || 'planned'
                }));

                await MaintenanceConsumables.bulkCreate(consumableRecords, { transaction });
            }
        }

        // Handle checklist update
        if (checklist !== undefined) {
            // Delete existing checklist items
            await MaintenanceChecklist.destroy({
                where: { maintenance_id: id },
                transaction
            });

            // Create new checklist items if provided
            if (Array.isArray(checklist) && checklist.length > 0) {
                const checklistRecords = checklist.map((item, index) => ({
                    maintenance_id: parseInt(id),
                    task_name: item.task || item.task_name,
                    check_item: item.check_item || null,
                    standard_value: item.standard_value || null,
                    check_method: item.check_method || null,
                    description: item.description || null,
                    is_completed: false,
                    order_index: item.order_index !== undefined ? item.order_index : index,
                    notes: item.notes || null
                }));

                await MaintenanceChecklist.bulkCreate(checklistRecords, { transaction });
            }
        }

        // Commit transaction
        if (transaction && !transaction.finished) {
            await transaction.commit();
        }

        // Fetch updated maintenance
        const updatedMaintenance = await Maintenance.findByPk(id, {
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
                }
                // Temporarily remove MaintenanceConsumables include to test
                // {
                //     model: MaintenanceConsumables,
                //     as: 'maintenanceConsumables',
                //     include: [{
                //         model: require('../models').ConsumableCategories,
                //         as: 'consumableCategory',
                //         attributes: ['id', 'name', 'unit']
                //     }]
                // }
            ]
        });

        res.status(200).json({
            success: true,
            data: updatedMaintenance,
            message: 'Maintenance record updated successfully'
        });

        await logAudit({
            entityType: 'maintenance',
            entityId: updatedMaintenance.id,
            action: 'MAINTENANCE_UPDATE',
            before: existingMaintenance.toJSON(),
            after: updatedMaintenance.toJSON(),
            user: req.user,
            req
        });

        // 🆕 Gửi thông báo nếu có thay đổi technician
        try {
            const newTechnicianId = updatedMaintenance.technician_id;
            if (newTechnicianId !== oldTechnicianId) {
                await NotificationService.onMaintenanceAssigned(
                    {
                        id: updatedMaintenance.id,
                        maintenance_code: updatedMaintenance.maintenance_code,
                        title: updatedMaintenance.title,
                        asset: updatedMaintenance.asset,
                        technician_id: newTechnicianId,
                        created_by: updatedMaintenance.created_by
                    },
                    oldTechnicianId
                );
            }
        } catch (notifError) {
            console.error('Error sending notification:', notifError);
        }
    } catch (error) {
        // Rollback only if transaction exists and not finished
        if (transaction && !transaction.finished) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error('Error rolling back transaction:', rollbackError);
            }
        }
        
        console.error('Error in updateMaintenance:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating maintenance record',
            error: error.message
        });
    }
};

// DELETE /api/maintenance/:id - Xóa maintenance
const deleteMaintenance = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Cần nhập reason để từ chối'
            });
        }
        if (!reason) {
            return res.status(400).json({ success: false, message: 'Cần nhập reason để xóa mềm' });
        }

        const maintenance = await Maintenance.findByPk(id);
        if (!maintenance) {
            return res.status(404).json({ success: false, message: 'Maintenance record not found' });
        }

        if (maintenance.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Chỉ cho phép xóa mềm khi trạng thái pending' });
        }

        const before = maintenance.toJSON();
        await maintenance.update({
            is_deleted: true,
            deleted_at: new Date(),
            deleted_by: req.user?.id || null,
            notes: reason ? `Soft delete: ${reason}${maintenance.notes ? '\n---\n' + maintenance.notes : ''}` : maintenance.notes
        });

        res.status(200).json({
            success: true,
            message: 'Maintenance record soft deleted'
        });

        await logAudit({
            entityType: 'maintenance',
            entityId: maintenance.id,
            action: 'MAINTENANCE_SOFT_DELETE',
            before,
            after: maintenance.toJSON(),
            reason,
            user: req.user,
            req
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting maintenance record',
            error: error.message
        });
    }
};

// POST /api/maintenance/:id/approve - Phê duyệt maintenance
const approveMaintenance = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes, actual_end_date, approval_comment } = req.body;

        // Tìm maintenance record
        const maintenance = await Maintenance.findByPk(id);

        if (!maintenance) {
            return res.status(404).json({
                success: false,
                message: 'Maintenance record not found'
            });
        }

        // Kiểm tra trạng thái hiện tại
        if (maintenance.status !== 'pending' && maintenance.status !== 'awaiting_approval') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể phê duyệt lịch bảo trì ở trạng thái pending/awaiting_approval'
            });
        }

        const before = maintenance.toJSON();

        // Cập nhật trạng thái thành approved
        const updateData = {
            status: 'approved',
            notes: notes || maintenance.notes,
            approved_by: req.user?.id || null,
            approved_at: new Date(),
            approval_comment: approval_comment || null
        };

        // Nếu có ngày kết thúc thực tế, cập nhật
        if (actual_end_date) {
            updateData.actual_end_date = new Date(actual_end_date);
        } else if (!maintenance.actual_end_date) {
            // Nếu chưa có ngày kết thúc, dùng ngày hiện tại
            updateData.actual_end_date = new Date();
        }

        await maintenance.update(updateData);

        // Fetch updated maintenance với relations
        const updatedMaintenance = await Maintenance.findByPk(id, {
            include: [
                {
                    model: Assets,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'name', 'image']
                },
                {
                    model: User,
                    as: 'technician',
                    attributes: ['id', 'name', 'employee_code']
                }
            ]
        });

        res.status(200).json({
            success: true,
            data: updatedMaintenance,
            message: 'Phê duyệt lịch bảo trì thành công'
        });

        await logAudit({
            entityType: 'maintenance',
            entityId: updatedMaintenance.id,
            action: 'MAINTENANCE_APPROVE',
            before,
            after: updatedMaintenance.toJSON(),
            reason: approval_comment || notes,
            user: req.user,
            req
        });

        // Send notification after successful approval
        try {
            await NotificationService.onMaintenanceApproved({
                maintenanceId: updatedMaintenance.id,
                technicianId: updatedMaintenance.technician_id,
                assetCode: updatedMaintenance.asset?.asset_code,
                assetName: updatedMaintenance.asset?.name,
                approverId: req.user?.id
            });
        } catch (notifError) {
            console.error('Error sending approval notification:', notifError);
        }
    } catch (error) {
        console.error('Error in approveMaintenance:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving maintenance record',
            error: error.message
        });
    }
};

// POST /api/maintenance/:id/reject - Từ chối phê duyệt maintenance
const rejectMaintenance = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        // Tìm maintenance record
        const maintenance = await Maintenance.findByPk(id);

        if (!maintenance) {
            return res.status(404).json({
                success: false,
                message: 'Maintenance record not found'
            });
        }

        // Kiểm tra trạng thái hiện tại
        if (maintenance.status !== 'pending' && maintenance.status !== 'awaiting_approval') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể từ chối lịch bảo trì ở trạng thái pending/awaiting_approval'
            });
        }

        const before = maintenance.toJSON();

        // Chuyển về trạng thái in_progress để kỹ thuật viên sửa lại
        await maintenance.update({
            status: 'in_progress',
            notes: reason ? `Lý do từ chối: ${reason}${maintenance.notes ? '\n---\n' + maintenance.notes : ''}` : maintenance.notes
        });

        // Fetch updated maintenance với relations
        const updatedMaintenance = await Maintenance.findByPk(id, {
            include: [
                {
                    model: Assets,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'name', 'image']
                },
                {
                    model: User,
                    as: 'technician',
                    attributes: ['id', 'name', 'employee_code']
                }
            ]
        });

        res.status(200).json({
            success: true,
            data: updatedMaintenance,
            message: 'Đã từ chối phê duyệt. Lịch bảo trì được chuyển về trạng thái "Đang thực hiện"'
        });

        await logAudit({
            entityType: 'maintenance',
            entityId: updatedMaintenance.id,
            action: 'MAINTENANCE_REJECT',
            before,
            after: updatedMaintenance.toJSON(),
            reason,
            user: req.user,
            req
        });

        // Send notification after successful rejection
        try {
            await NotificationService.onMaintenanceRejected({
                maintenanceId: updatedMaintenance.id,
                technicianId: updatedMaintenance.technician_id,
                assetCode: updatedMaintenance.asset?.asset_code,
                assetName: updatedMaintenance.asset?.name,
                reason,
                rejectedBy: req.user?.id
            });
        } catch (notifError) {
            console.error('Error sending rejection notification:', notifError);
        }
    } catch (error) {
        console.error('Error in rejectMaintenance:', error);
        res.status(500).json({
            success: false,
            message: 'Error rejecting maintenance record',
            error: error.message
        });
    }
};

// PUT /api/maintenance/:maintenanceId/work-tasks/:taskId - Cập nhật báo cáo công việc
const updateWorkTaskReport = async (req, res) => {
    try {
        const { maintenanceId, taskId } = req.params;
        const { work_report, actual_hours, issues_found, materials_used } = req.body;
        const userId = req.user?.id;

        // Tìm work task
        const workTask = await MaintenanceWorkTask.findOne({
            where: {
                id: taskId,
                maintenance_id: maintenanceId
            }
        });

        if (!workTask) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy công việc'
            });
        }

        // Cập nhật work task
        await workTask.update({
            work_report,
            actual_hours: actual_hours ? parseFloat(actual_hours) : null,
            issues_found,
            materials_used,
            status: 'completed',
            completed_at: new Date(),
            completed_by: userId
        });

        res.status(200).json({
            success: true,
            data: workTask,
            message: 'Đã lưu báo cáo công việc'
        });
    } catch (error) {
        console.error('Error in updateWorkTaskReport:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating work task report',
            error: error.message
        });
    }
};

// POST /api/maintenance/:maintenanceId/work-tasks/:taskId/start - Bắt đầu công việc
const startWorkTask = async (req, res) => {
    try {
        const { maintenanceId, taskId } = req.params;
        const { image_before } = req.body;

        console.log('startWorkTask called:', { maintenanceId, taskId, hasImage: !!image_before });

        const workTask = await MaintenanceWorkTask.findOne({
            where: {
                id: taskId,
                maintenance_id: maintenanceId
            }
        });

        console.log('workTask found:', workTask ? 'Yes' : 'No');

        if (!workTask) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy công việc'
            });
        }

        await workTask.update({
            status: 'in_progress',
            started_at: new Date(),
            image_before: image_before || null
        });

        // Set actual_start_date cho Maintenance nếu đây là task đầu tiên bắt đầu
        const maintenance = await Maintenance.findByPk(maintenanceId);
        if (maintenance && !maintenance.actual_start_date) {
            await maintenance.update({
                actual_start_date: new Date(),
                status: 'in_progress'
            });
        }

        res.status(200).json({
            success: true,
            data: workTask,
            message: 'Đã bắt đầu công việc'
        });
    } catch (error) {
        console.error('Error in startWorkTask:', error);
        res.status(500).json({
            success: false,
            message: 'Error starting work task',
            error: error.message
        });
    }
};

// POST /api/maintenance/:maintenanceId/work-tasks/:taskId/complete - Hoàn thành công việc
const completeWorkTask = async (req, res) => {
    try {
        const { maintenanceId, taskId } = req.params;
        const { work_report, image_after } = req.body;
        const userId = req.user?.id;

        const workTask = await MaintenanceWorkTask.findOne({
            where: {
                id: taskId,
                maintenance_id: maintenanceId
            }
        });

        if (!workTask) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy công việc'
            });
        }

        // Tính actual_hours nếu có started_at
        let actual_hours = null;
        if (workTask.started_at) {
            const diffMs = new Date() - new Date(workTask.started_at);
            actual_hours = (diffMs / (1000 * 60 * 60)).toFixed(2); // Convert to hours
        }

        await workTask.update({
            status: 'completed',
            completed_at: new Date(),
            completed_by: userId,
            work_report: work_report || null,
            image_after: image_after || null,
            actual_hours: actual_hours
        });

        res.status(200).json({
            success: true,
            data: workTask,
            message: 'Đã hoàn thành công việc'
        });
    } catch (error) {
        console.error('Error in completeWorkTask:', error);
        res.status(500).json({
            success: false,
            message: 'Error completing work task',
            error: error.message
        });
    }
};

// GET /api/maintenance/reports/summary - Báo cáo tổng hợp bảo trì
const getMaintenanceReportSummary = async (req, res) => {
    try {
        const { period = 'month', startDate, endDate, month, year } = req.query;
        const { Sequelize } = require('sequelize');
        const Op = Sequelize.Op;

        // Xác định khoảng thời gian
        let dateFilter = {};
        let currentPeriodStart, currentPeriodEnd, previousPeriodStart, previousPeriodEnd;
        
        if (startDate && endDate) {
            currentPeriodStart = new Date(startDate);
            currentPeriodEnd = new Date(endDate);
        } else if (month && year) {
            // Lấy theo tháng và năm cụ thể
            const selectedMonth = parseInt(month);
            const selectedYear = parseInt(year);
            
            currentPeriodStart = new Date(selectedYear, selectedMonth - 1, 1);
            currentPeriodEnd = new Date(selectedYear, selectedMonth, 0);
            currentPeriodEnd.setHours(23, 59, 59, 999);
            
            // Tháng trước
            previousPeriodStart = new Date(selectedYear, selectedMonth - 2, 1);
            previousPeriodEnd = new Date(selectedYear, selectedMonth - 1, 0);
            previousPeriodEnd.setHours(23, 59, 59, 999);
        } else if (period === 'week') {
            // Tuần hiện tại
            currentPeriodEnd = new Date();
            currentPeriodStart = new Date();
            currentPeriodStart.setDate(currentPeriodStart.getDate() - 7);
            
            // Tuần trước
            previousPeriodEnd = new Date(currentPeriodStart);
            previousPeriodStart = new Date(previousPeriodEnd);
            previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
        } else {
            // Tháng hiện tại - lấy cả tháng từ đầu đến cuối
            const now = new Date();
            currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
            currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Ngày cuối cùng của tháng
            currentPeriodEnd.setHours(23, 59, 59, 999);
            
            // Tháng trước
            previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            previousPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            previousPeriodEnd.setHours(23, 59, 59, 999);
        }

        // Lấy dữ liệu kỳ hiện tại
        const currentPeriodData = await Maintenance.findAll({
            where: {
                scheduled_date: {
                    [Op.between]: [currentPeriodStart, currentPeriodEnd]
                },
                is_deleted: false
            },
            include: [{
                model: Assets,
                as: 'asset',
                attributes: ['id', 'name']
            }]
        });

        // Lấy dữ liệu kỳ trước
        const previousPeriodData = await Maintenance.findAll({
            where: {
                scheduled_date: {
                    [Op.between]: [previousPeriodStart, previousPeriodEnd]
                },
                is_deleted: false
            }
        });

        const isCorrective = (type) => type === 'corrective' || type === 'repair';

        // Thống kê kỳ hiện tại
        const currentStats = {
            total: currentPeriodData.length,
            completed: currentPeriodData.filter(m => m.status === 'completed').length,
            in_progress: currentPeriodData.filter(m => m.status === 'in_progress').length,
            pending: currentPeriodData.filter(m => m.status === 'pending').length,
            awaiting_approval: currentPeriodData.filter(m => m.status === 'awaiting_approval').length,
            cleaning: currentPeriodData.filter(m => m.maintenance_type === 'cleaning').length,
            inspection: currentPeriodData.filter(m => m.maintenance_type === 'inspection').length,
            maintenance: currentPeriodData.filter(m => m.maintenance_type === 'maintenance').length,
            corrective: currentPeriodData.filter(m => isCorrective(m.maintenance_type)).length,
            totalCost: currentPeriodData.reduce((sum, m) => sum + (parseFloat(m.cost) || 0), 0),
            completionRate: currentPeriodData.length > 0 
                ? (currentPeriodData.filter(m => m.status === 'completed').length / currentPeriodData.length * 100).toFixed(2)
                : 0
        };

        // Thống kê kỳ trước
        const previousStats = {
            total: previousPeriodData.length,
            completed: previousPeriodData.filter(m => m.status === 'completed').length,
            totalCost: previousPeriodData.reduce((sum, m) => sum + (parseFloat(m.cost) || 0), 0)
        };

        // Tính % thay đổi
        const changes = {
            total: previousStats.total > 0 
                ? (((currentStats.total - previousStats.total) / previousStats.total) * 100).toFixed(2)
                : 0,
            completed: previousStats.completed > 0
                ? (((currentStats.completed - previousStats.completed) / previousStats.completed) * 100).toFixed(2)
                : 0,
            cost: previousStats.totalCost > 0
                ? (((currentStats.totalCost - previousStats.totalCost) / previousStats.totalCost) * 100).toFixed(2)
                : 0
        };

        // Thống kê theo thiết bị
        const assetStats = {};
        currentPeriodData.forEach(m => {
            if (m.asset) {
                const assetName = m.asset.name;
                if (!assetStats[assetName]) {
                    assetStats[assetName] = {
                        total: 0,
                        cleaning: 0,
                        inspection: 0,
                        maintenance: 0,
                        corrective: 0
                    };
                }
                assetStats[assetName].total++;
                if (m.maintenance_type) {
                    const normalizedType = isCorrective(m.maintenance_type) ? 'corrective' : m.maintenance_type;
                    assetStats[assetName][normalizedType] = (assetStats[assetName][normalizedType] || 0) + 1;
                }
            }
        });

        res.status(200).json({
            success: true,
            data: {
                period: {
                    type: period,
                    start: currentPeriodStart,
                    end: currentPeriodEnd
                },
                current: currentStats,
                previous: previousStats,
                changes: changes,
                assetStats: Object.entries(assetStats).map(([name, stats]) => ({
                    assetName: name,
                    ...stats
                }))
            }
        });
    } catch (error) {
        console.error('Error in getMaintenanceReportSummary:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching maintenance report',
            error: error.message
        });
    }
};

// GET /api/maintenance/reports/monthly - Báo cáo theo tháng (12 tháng gần nhất)
const getMonthlyMaintenanceReport = async (req, res) => {
    try {
        const { Sequelize } = require('sequelize');
        const Op = Sequelize.Op;
        
        // Lấy 12 tháng gần nhất
        const monthlyData = [];
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date();
            monthStart.setMonth(monthStart.getMonth() - i, 1);
            monthStart.setHours(0, 0, 0, 0);
            
            const monthEnd = new Date(monthStart);
            monthEnd.setMonth(monthEnd.getMonth() + 1);
            monthEnd.setDate(0);
            monthEnd.setHours(23, 59, 59, 999);

            const data = await Maintenance.findAll({
                where: {
                    scheduled_date: {
                        [Op.between]: [monthStart, monthEnd]
                    },
                    is_deleted: false
                }
            });

            monthlyData.push({
                month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
                total: data.length,
                completed: data.filter(m => m.status === 'completed').length,
                cleaning: data.filter(m => m.maintenance_type === 'cleaning').length,
                inspection: data.filter(m => m.maintenance_type === 'inspection').length,
                maintenance: data.filter(m => m.maintenance_type === 'maintenance').length,
                corrective: data.filter(m => m.maintenance_type === 'corrective').length,
                totalCost: data.reduce((sum, m) => sum + (parseFloat(m.cost) || 0), 0)
            });
        }

        res.status(200).json({
            success: true,
            data: monthlyData
        });
    } catch (error) {
        console.error('Error in getMonthlyMaintenanceReport:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching monthly report',
            error: error.message
        });
    }
};

// POST /api/maintenance/:id/start - Bắt đầu lệnh bảo trì
const startMaintenance = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const maintenance = await Maintenance.findByPk(id);

        if (!maintenance) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lệnh bảo trì'
            });
        }
        if (maintenance.is_deleted) {
            return res.status(400).json({
                success: false,
                message: 'Không thể cập nhật tiến độ của bản ghi đã xóa'
            });
        }
        if (maintenance.is_deleted) {
            return res.status(400).json({ success: false, message: 'Lệnh bảo trì đã bị xóa' });
        }

        // Chỉ cho phép start từ status approved
        if (maintenance.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: `Không thể bắt đầu lệnh bảo trì với trạng thái: ${maintenance.status}`
            });
        }

        const before = maintenance.toJSON();

        // Cập nhật status và ghi thời gian bắt đầu
        await maintenance.update({
            status: 'in_progress',
            actual_start_date: new Date()
        });

        // Fetch updated maintenance with relations for notification
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
            message: 'Đã bắt đầu lệnh bảo trì',
            data: updatedMaintenance
        });

        await logAudit({
            entityType: 'maintenance',
            entityId: updatedMaintenance.id,
            action: 'MAINTENANCE_START',
            before,
            after: updatedMaintenance.toJSON(),
            user: req.user,
            req
        });

        // Send notification after successful start
        try {
            await NotificationService.onMaintenanceStarted({
                maintenanceId: updatedMaintenance.id,
                technicianId: updatedMaintenance.technician_id,
                assetCode: updatedMaintenance.asset?.asset_code,
                assetName: updatedMaintenance.asset?.name,
                startDate: updatedMaintenance.actual_start_date
            });
        } catch (notifError) {
            console.error('Error sending start notification:', notifError);
        }
    } catch (error) {
        console.error('Error starting maintenance:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi bắt đầu lệnh bảo trì',
            error: error.message
        });
    }
};

// POST /api/maintenance/:id/complete - Hoàn thành bảo trì
const completeMaintenance = async (req, res) => {
    try {
        const { id } = req.params;
        const maintenance = await Maintenance.findByPk(id);

        if (!maintenance) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lệnh bảo trì' });
        }
        if (maintenance.is_deleted) {
            return res.status(400).json({ success: false, message: 'Lệnh bảo trì đã bị xóa' });
        }
        if (maintenance.status !== 'in_progress') {
            return res.status(400).json({ success: false, message: 'Chỉ hoàn thành từ trạng thái in_progress' });
        }

        const before = maintenance.toJSON();
        const actualEnd = req.body.actual_end_date ? new Date(req.body.actual_end_date) : new Date();
        let actualDuration = maintenance.actual_duration;
        if (maintenance.actual_start_date) {
            const diffMs = actualEnd - new Date(maintenance.actual_start_date);
            if (Number.isFinite(diffMs) && diffMs >= 0) {
                actualDuration = +(diffMs / 3600000).toFixed(2);
            }
        }

        await maintenance.update({
            status: 'completed',
            actual_end_date: actualEnd,
            actual_duration: actualDuration
        });

        const updated = await Maintenance.findByPk(id);
        res.status(200).json({ success: true, message: 'Đã hoàn thành lệnh bảo trì', data: updated });

        await logAudit({
            entityType: 'maintenance',
            entityId: updated.id,
            action: 'MAINTENANCE_COMPLETE',
            before,
            after: updated.toJSON(),
            user: req.user,
            req
        });
    } catch (error) {
        console.error('Error completing maintenance:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi hoàn thành lệnh bảo trì', error: error.message });
    }
};

// POST /api/maintenance/:id/close - Đóng lệnh bảo trì đã hoàn thành
const closeMaintenance = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ success: false, message: 'Cần nhập reason để đóng lệnh' });
        }

        const maintenance = await Maintenance.findByPk(id);
        if (!maintenance) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lệnh bảo trì' });
        }
        if (maintenance.is_deleted) {
            return res.status(400).json({ success: false, message: 'Lệnh bảo trì đã bị xóa' });
        }
        if (maintenance.status !== 'completed') {
            return res.status(400).json({ success: false, message: 'Chỉ đóng lệnh ở trạng thái completed' });
        }

        const before = maintenance.toJSON();
        await maintenance.update({
            status: 'closed',
            notes: reason ? `${reason}${maintenance.notes ? '\n---\n' + maintenance.notes : ''}` : maintenance.notes
        });

        const updated = await Maintenance.findByPk(id);
        res.status(200).json({ success: true, message: 'Đã đóng lệnh bảo trì', data: updated });

        await logAudit({
            entityType: 'maintenance',
            entityId: updated.id,
            action: 'MAINTENANCE_CLOSE',
            before,
            after: updated.toJSON(),
            reason,
            user: req.user,
            req
        });
    } catch (error) {
        console.error('Error closing maintenance:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi đóng lệnh bảo trì', error: error.message });
    }
};

// POST /api/maintenance/:id/cancel - Hủy lệnh khi đang thực hiện
const cancelMaintenance = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ success: false, message: 'Cần nhập reason để hủy lệnh' });
        }

        const maintenance = await Maintenance.findByPk(id);
        if (!maintenance) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lệnh bảo trì' });
        }
        if (maintenance.is_deleted) {
            return res.status(400).json({ success: false, message: 'Lệnh bảo trì đã bị xóa' });
        }
        if (maintenance.status !== 'in_progress') {
            return res.status(400).json({ success: false, message: 'Chỉ hủy lệnh khi đang in_progress' });
        }

        const before = maintenance.toJSON();
        await maintenance.update({
            status: 'cancelled',
            notes: reason ? `Hủy: ${reason}${maintenance.notes ? '\n---\n' + maintenance.notes : ''}` : maintenance.notes
        });

        const updated = await Maintenance.findByPk(id);
        res.status(200).json({ success: true, message: 'Đã hủy lệnh bảo trì', data: updated });

        await logAudit({
            entityType: 'maintenance',
            entityId: updated.id,
            action: 'MAINTENANCE_CANCEL',
            before,
            after: updated.toJSON(),
            reason,
            user: req.user,
            req
        });
    } catch (error) {
        console.error('Error cancelling maintenance:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi hủy lệnh bảo trì', error: error.message });
    }
};

// PUT /api/maintenance/:id/save-progress - Lưu tiến độ hiện tại
const saveMaintenanceProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const userId = req.user?.id;

        const maintenance = await Maintenance.findByPk(id);

        if (!maintenance) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lệnh bảo trì'
            });
        }

        // Chỉ cho phép lưu tiến độ khi đang thực hiện
        if (maintenance.status !== 'in_progress') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể lưu tiến độ khi lệnh bảo trì đang thực hiện'
            });
        }

        const before = maintenance.toJSON();

        // Cập nhật notes (có thể mở rộng thêm các field khác nếu cần)
        await maintenance.update({
            notes: notes || maintenance.notes,
            updated_at: new Date()
        });

        // Lấy lại dữ liệu đầy đủ
        const updatedMaintenance = await Maintenance.findByPk(id, {
            include: [
                { model: Assets, as: 'asset' },
                { model: User, as: 'technician' },
                { model: MaintenanceChecklist, as: 'checklists' },
                { model: MaintenanceWorkTask, as: 'workTasks' }
            ]
        });

        res.status(200).json({
            success: true,
            message: 'Đã lưu tiến độ công việc',
            data: updatedMaintenance
        });

        await logAudit({
            entityType: 'maintenance',
            entityId: updatedMaintenance.id,
            action: 'MAINTENANCE_PROGRESS',
            before,
            after: updatedMaintenance.toJSON(),
            user: req.user,
            req
        });
    } catch (error) {
        console.error('Error saving maintenance progress:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lưu tiến độ',
            error: error.message
        });
    }
};

module.exports = {
    getAllMaintenance,
    getMaintenanceById,
    getMaintenanceByAsset,
    getMaintenanceByStatus,
    getMaintenanceByTechnician,
    getMyMaintenanceWork,
    getMaintenanceResults,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
    approveMaintenance,
    rejectMaintenance,
    updateWorkTaskReport,
    startWorkTask,
    completeWorkTask,
    startMaintenance,
    completeMaintenance,
    closeMaintenance,
    cancelMaintenance,
    saveMaintenanceProgress,
    getMaintenanceReportSummary,
    getMonthlyMaintenanceReport,
    buildMaintenanceCode
};
