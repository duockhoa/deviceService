const { Maintenance, Assets, User, MaintenanceConsumables, MaintenanceChecklist, MaintenanceWorkTask } = require('../models');

// GET /api/maintenance - Lấy tất cả maintenance records
const getAllMaintenance = async (req, res) => {
    try {
        const maintenance = await Maintenance.findAll({
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
        const maintenance = await Maintenance.findAll({
            where: { asset_id: assetId },
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
        const maintenance = await Maintenance.findAll({
            where: { status: status },
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
        const maintenance = await Maintenance.findAll({
            where: { technician_id: technicianId },
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
            where: { technician_id: userId }, // Chỉ lấy công việc của user hiện tại
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
                status: ['in_progress', 'awaiting_approval', 'completed']
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
            maintenance_code: `MT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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

        const processedData = {
            // Required fields with defaults
            maintenance_code: maintenanceData.maintenance_code || defaultValues.maintenance_code,
            maintenance_type: maintenanceData.maintenance_type || defaultValues.maintenance_type,
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

        // Set default values for required fields if not provided or null
        if (!updateData.priority || updateData.priority === null || updateData.priority === '') {
            updateData.priority = 'medium';
        }
        if (!updateData.title || updateData.title === null || updateData.title === '') {
            updateData.title = 'Maintenance Task';
        }
        if (!updateData.status || updateData.status === null || updateData.status === '') {
            updateData.status = 'pending';
        }
        if (!updateData.scheduled_date || updateData.scheduled_date === null || updateData.scheduled_date === '') {
            updateData.scheduled_date = new Date();
        }
        if (!updateData.asset_id || updateData.asset_id === null || updateData.asset_id === '') {
            // If no asset_id provided, try to get from existing record
            const existingMaintenance = await Maintenance.findByPk(id);
            if (!existingMaintenance) {
                if (transaction && !transaction.finished) {
                    await transaction.rollback();
                }
                return res.status(404).json({
                    success: false,
                    message: 'Maintenance record not found'
                });
            }
            updateData.asset_id = existingMaintenance.asset_id;
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
        const deletedRowsCount = await Maintenance.destroy({
            where: { id: id }
        });

        if (deletedRowsCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Maintenance record not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Maintenance record deleted successfully'
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
        const { notes, actual_end_date } = req.body;

        // Tìm maintenance record
        const maintenance = await Maintenance.findByPk(id);

        if (!maintenance) {
            return res.status(404).json({
                success: false,
                message: 'Maintenance record not found'
            });
        }

        // Kiểm tra trạng thái hiện tại
        if (maintenance.status !== 'awaiting_approval') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể phê duyệt lịch bảo trì đang ở trạng thái "Chờ phê duyệt"'
            });
        }

        // Cập nhật trạng thái thành completed
        const updateData = {
            status: 'completed',
            notes: notes || maintenance.notes
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
        if (maintenance.status !== 'awaiting_approval') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể từ chối lịch bảo trì đang ở trạng thái "Chờ phê duyệt"'
            });
        }

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
        const { period = 'month', startDate, endDate } = req.query;
        const { Sequelize } = require('sequelize');
        const Op = Sequelize.Op;

        // Xác định khoảng thời gian
        let dateFilter = {};
        let currentPeriodStart, currentPeriodEnd, previousPeriodStart, previousPeriodEnd;
        
        if (startDate && endDate) {
            currentPeriodStart = new Date(startDate);
            currentPeriodEnd = new Date(endDate);
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
            // Tháng hiện tại
            currentPeriodEnd = new Date();
            currentPeriodStart = new Date(currentPeriodEnd.getFullYear(), currentPeriodEnd.getMonth(), 1);
            
            // Tháng trước
            previousPeriodEnd = new Date(currentPeriodStart);
            previousPeriodStart = new Date(previousPeriodEnd.getFullYear(), previousPeriodEnd.getMonth() - 1, 1);
        }

        // Lấy dữ liệu kỳ hiện tại
        const currentPeriodData = await Maintenance.findAll({
            where: {
                scheduled_date: {
                    [Op.between]: [currentPeriodStart, currentPeriodEnd]
                }
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
                }
            }
        });

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
            repair: currentPeriodData.filter(m => m.maintenance_type === 'repair').length,
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
                        repair: 0
                    };
                }
                assetStats[assetName].total++;
                if (m.maintenance_type) {
                    assetStats[assetName][m.maintenance_type] = (assetStats[assetName][m.maintenance_type] || 0) + 1;
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
                    }
                }
            });

            monthlyData.push({
                month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
                total: data.length,
                completed: data.filter(m => m.status === 'completed').length,
                cleaning: data.filter(m => m.maintenance_type === 'cleaning').length,
                inspection: data.filter(m => m.maintenance_type === 'inspection').length,
                maintenance: data.filter(m => m.maintenance_type === 'maintenance').length,
                repair: data.filter(m => m.maintenance_type === 'repair').length,
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

        // Chỉ cho phép start từ status pending hoặc awaiting_approval
        if (!['pending', 'awaiting_approval'].includes(maintenance.status)) {
            return res.status(400).json({
                success: false,
                message: `Không thể bắt đầu lệnh bảo trì với trạng thái: ${maintenance.status}`
            });
        }

        // Cập nhật status và ghi thời gian bắt đầu
        await maintenance.update({
            status: 'in_progress',
            actual_start_date: new Date()
        });

        res.status(200).json({
            success: true,
            message: 'Đã bắt đầu lệnh bảo trì',
            data: maintenance
        });
    } catch (error) {
        console.error('Error starting maintenance:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi bắt đầu lệnh bảo trì',
            error: error.message
        });
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
    saveMaintenanceProgress,
    getMaintenanceReportSummary,
    getMonthlyMaintenanceReport
};