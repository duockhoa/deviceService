const { Maintenance, Assets, User, MaintenanceConsumables, MaintenanceChecklist } = require('../models');

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
                    include: [{
                        model: require('../models').ConsumableCategories,
                        as: 'consumableCategory',
                        attributes: ['id', 'name', 'unit', 'description']
                    }]
                },
                {
                    model: MaintenanceChecklist,
                    as: 'checklists',
                    attributes: ['id', 'task_name', 'description', 'is_completed', 'order_index', 'notes'],
                    order: [['order_index', 'ASC']]
                }
            ]
        });

        if (!maintenance) {
            return res.status(404).json({
                success: false,
                message: 'Maintenance record not found'
            });
        }

        res.status(200).json({
            success: true,
            data: maintenance
        });
    } catch (error) {
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
            actual_end_date: maintenanceData.actual_end_date ? new Date(maintenanceData.actual_end_date) : null
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
            const consumableRecords = consumables.map(consumable => ({
                maintenance_id: maintenance.id,
                consumable_category_id: parseInt(consumable.consumable_category_id),
                quantity_required: parseFloat(consumable.quantity_required) || 1,
                unit_cost: consumable.unit_cost ? parseFloat(consumable.unit_cost) : null,
                total_cost: consumable.total_cost ? parseFloat(consumable.total_cost) : null,
                notes: consumable.notes || null,
                status: consumable.status || 'planned'
            }));

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
                    consumable_category_id: parseInt(consumable.consumable_category_id),
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

module.exports = {
    getAllMaintenance,
    getMaintenanceById,
    getMaintenanceByAsset,
    getMaintenanceByStatus,
    getMaintenanceByTechnician,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance
};