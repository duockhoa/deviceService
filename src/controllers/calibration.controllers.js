const { Calibration, Assets, User } = require('../models');

// GET /api/calibration - Lấy tất cả calibration records
const getAllCalibrations = async (req, res) => {
    try {
        const calibrations = await Calibration.findAll({
            include: [
                {
                    model: Assets,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'name']
                },
                {
                    model: User,
                    as: 'technician',
                    attributes: ['id', 'name', 'email']
                }
            ],
            order: [['scheduled_date', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: calibrations,
            count: calibrations.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching calibration records',
            error: error.message
        });
    }
};

// GET /api/calibration/:id - Lấy calibration theo ID
const getCalibrationById = async (req, res) => {
    try {
        const { id } = req.params;
        const calibration = await Calibration.findByPk(id);

        if (!calibration) {
            return res.status(404).json({
                success: false,
                message: 'Calibration record not found'
            });
        }

        res.status(200).json({
            success: true,
            data: calibration
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching calibration record',
            error: error.message
        });
    }
};

// GET /api/calibration/asset/:assetId - Lấy calibration theo asset
const getCalibrationsByAsset = async (req, res) => {
    try {
        const { assetId } = req.params;
        const calibrations = await Calibration.findAll({
            where: { asset_id: assetId },
            order: [['scheduled_date', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: calibrations,
            count: calibrations.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching calibrations by asset',
            error: error.message
        });
    }
};

// GET /api/calibration/status/:status - Lấy calibration theo status
const getCalibrationsByStatus = async (req, res) => {
    try {
        const { status } = req.params;
        const calibrations = await Calibration.findAll({
            where: { status },
            order: [['scheduled_date', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: calibrations,
            count: calibrations.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching calibrations by status',
            error: error.message
        });
    }
};

// GET /api/calibration/technician/:technicianId - Lấy calibration theo technician
const getCalibrationsByTechnician = async (req, res) => {
    try {
        const { technicianId } = req.params;
        const calibrations = await Calibration.findAll({
            where: { technician_id: technicianId },
            order: [['scheduled_date', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: calibrations,
            count: calibrations.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching calibrations by technician',
            error: error.message
        });
    }
};

// POST /api/calibration - Tạo calibration mới
const createCalibration = async (req, res) => {
    try {
        const calibrationData = {
            ...req.body,
            asset_id: parseInt(req.body.asset_id),
            technician_id: req.body.technician_id ? parseInt(req.body.technician_id) : null,
            estimated_duration: parseFloat(req.body.estimated_duration),
            tolerance: req.body.tolerance ? parseFloat(req.body.tolerance) : null,
            measured_value: req.body.measured_value ? parseFloat(req.body.measured_value) : null,
            reference_value: req.body.reference_value ? parseFloat(req.body.reference_value) : null,
            deviation: req.body.deviation ? parseFloat(req.body.deviation) : null,
            cost: req.body.cost ? parseFloat(req.body.cost) : null,
            created_by: req.user ? req.user.id : req.body.created_by || 1,
            status: req.body.status || 'pending',
            result: req.body.result || 'pending'
        };

        // Remove any undefined or null values that shouldn't be in the data
        Object.keys(calibrationData).forEach(key => {
            if (calibrationData[key] === undefined || calibrationData[key] === '') {
                delete calibrationData[key];
            }
        });

        console.log('Creating calibration with data:', calibrationData);

        const calibration = await Calibration.create(calibrationData);

        // Fetch the created calibration
        const createdCalibration = await Calibration.findByPk(calibration.id);

        res.status(201).json({
            success: true,
            data: createdCalibration,
            message: 'Calibration record created successfully'
        });
    } catch (error) {
        console.error('Error in createCalibration:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating calibration record',
            error: error.message
        });
    }
};

// PUT /api/calibration/:id - Cập nhật calibration
const updateCalibration = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // Exclude calibration_code from update to prevent unique constraint violation
        delete updateData.calibration_code;

        // Convert data types if provided
        if (updateData.asset_id) updateData.asset_id = parseInt(updateData.asset_id);
        // Handle technician_id - convert empty string to null
        if ('technician_id' in updateData) {
            updateData.technician_id = updateData.technician_id === '' || updateData.technician_id === null ? null : parseInt(updateData.technician_id);
        }
        if (updateData.estimated_duration) updateData.estimated_duration = parseFloat(updateData.estimated_duration);
        if (updateData.actual_duration) updateData.actual_duration = parseFloat(updateData.actual_duration);
        if (updateData.tolerance) updateData.tolerance = parseFloat(updateData.tolerance);
        if (updateData.measured_value) updateData.measured_value = parseFloat(updateData.measured_value);
        if (updateData.reference_value) updateData.reference_value = parseFloat(updateData.reference_value);
        if (updateData.deviation) updateData.deviation = parseFloat(updateData.deviation);
        if (updateData.cost) updateData.cost = parseFloat(updateData.cost);
        if (updateData.scheduled_date) updateData.scheduled_date = new Date(updateData.scheduled_date);
        if (updateData.actual_start_date) updateData.actual_start_date = new Date(updateData.actual_start_date);
        if (updateData.actual_end_date) updateData.actual_end_date = new Date(updateData.actual_end_date);

        const [updatedRowsCount] = await Calibration.update(updateData, {
            where: { id }
        });

        if (updatedRowsCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Calibration record not found'
            });
        }

        const updatedCalibration = await Calibration.findByPk(id, {
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

        res.status(200).json({
            success: true,
            data: updatedCalibration,
            message: 'Calibration record updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating calibration record',
            error: error.message
        });
    }
};

// DELETE /api/calibration/:id - Xóa calibration
const deleteCalibration = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedRowsCount = await Calibration.destroy({
            where: { id }
        });

        if (deletedRowsCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Calibration record not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Calibration record deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting calibration record',
            error: error.message
        });
    }
};

module.exports = {
    getAllCalibrations,
    getCalibrationById,
    getCalibrationsByAsset,
    getCalibrationsByStatus,
    getCalibrationsByTechnician,
    createCalibration,
    updateCalibration,
    deleteCalibration
};