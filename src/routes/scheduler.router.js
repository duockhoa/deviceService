const express = require('express');
const router = express.Router();

// Import individual job tasks
const {
    checkMaintenanceDueSoon,
    checkMaintenanceOverdue,
    checkCalibrationDueSoon,
    checkCalibrationOverdue,
    checkWarrantyExpiring
} = require('../jobs/notificationScheduler');

/**
 * POST /api/v1/scheduler/test/maintenance-due-soon
 * Manually trigger maintenance due soon check
 */
router.post('/test/maintenance-due-soon', async (req, res) => {
    try {
        console.log('Manual trigger: Maintenance Due Soon check');
        
        // Execute the task manually by calling the internal function
        await checkMaintenanceDueSoon.now();
        
        res.status(200).json({
            success: true,
            message: 'Maintenance Due Soon check executed successfully'
        });
    } catch (error) {
        console.error('Error executing maintenance due soon check:', error);
        res.status(500).json({
            success: false,
            message: 'Error executing check',
            error: error.message
        });
    }
});

/**
 * POST /api/v1/scheduler/test/maintenance-overdue
 * Manually trigger maintenance overdue check
 */
router.post('/test/maintenance-overdue', async (req, res) => {
    try {
        console.log('Manual trigger: Maintenance Overdue check');
        await checkMaintenanceOverdue.now();
        
        res.status(200).json({
            success: true,
            message: 'Maintenance Overdue check executed successfully'
        });
    } catch (error) {
        console.error('Error executing maintenance overdue check:', error);
        res.status(500).json({
            success: false,
            message: 'Error executing check',
            error: error.message
        });
    }
});

/**
 * POST /api/v1/scheduler/test/calibration-due-soon
 * Manually trigger calibration due soon check
 */
router.post('/test/calibration-due-soon', async (req, res) => {
    try {
        console.log('Manual trigger: Calibration Due Soon check');
        await checkCalibrationDueSoon.now();
        
        res.status(200).json({
            success: true,
            message: 'Calibration Due Soon check executed successfully'
        });
    } catch (error) {
        console.error('Error executing calibration due soon check:', error);
        res.status(500).json({
            success: false,
            message: 'Error executing check',
            error: error.message
        });
    }
});

/**
 * POST /api/v1/scheduler/test/calibration-overdue
 * Manually trigger calibration overdue check
 */
router.post('/test/calibration-overdue', async (req, res) => {
    try {
        console.log('Manual trigger: Calibration Overdue check');
        await checkCalibrationOverdue.now();
        
        res.status(200).json({
            success: true,
            message: 'Calibration Overdue check executed successfully'
        });
    } catch (error) {
        console.error('Error executing calibration overdue check:', error);
        res.status(500).json({
            success: false,
            message: 'Error executing check',
            error: error.message
        });
    }
});

/**
 * POST /api/v1/scheduler/test/warranty-expiring
 * Manually trigger warranty expiring check
 */
router.post('/test/warranty-expiring', async (req, res) => {
    try {
        console.log('Manual trigger: Warranty Expiring check');
        await checkWarrantyExpiring.now();
        
        res.status(200).json({
            success: true,
            message: 'Warranty Expiring check executed successfully'
        });
    } catch (error) {
        console.error('Error executing warranty expiring check:', error);
        res.status(500).json({
            success: false,
            message: 'Error executing check',
            error: error.message
        });
    }
});

/**
 * POST /api/v1/scheduler/test/all
 * Manually trigger all scheduled checks
 */
router.post('/test/all', async (req, res) => {
    try {
        console.log('Manual trigger: All scheduled checks');
        
        await Promise.all([
            checkMaintenanceDueSoon.now(),
            checkMaintenanceOverdue.now(),
            checkCalibrationDueSoon.now(),
            checkCalibrationOverdue.now(),
            checkWarrantyExpiring.now()
        ]);
        
        res.status(200).json({
            success: true,
            message: 'All scheduled checks executed successfully'
        });
    } catch (error) {
        console.error('Error executing all checks:', error);
        res.status(500).json({
            success: false,
            message: 'Error executing checks',
            error: error.message
        });
    }
});

/**
 * GET /api/v1/scheduler/status
 * Get scheduler status
 */
router.get('/status', (req, res) => {
    res.status(200).json({
        success: true,
        scheduler: {
            running: true,
            jobs: [
                {
                    name: 'Maintenance Due Soon',
                    schedule: '0 8 * * *',
                    description: 'Checks for maintenance due within 3 days',
                    nextRun: 'Daily at 8:00 AM'
                },
                {
                    name: 'Maintenance Overdue',
                    schedule: '0 9 * * *',
                    description: 'Checks for overdue maintenance',
                    nextRun: 'Daily at 9:00 AM'
                },
                {
                    name: 'Calibration Due Soon',
                    schedule: '30 8 * * *',
                    description: 'Checks for calibration due within 7 days',
                    nextRun: 'Daily at 8:30 AM'
                },
                {
                    name: 'Calibration Overdue',
                    schedule: '30 9 * * *',
                    description: 'Checks for overdue calibration',
                    nextRun: 'Daily at 9:30 AM'
                },
                {
                    name: 'Warranty Expiring',
                    schedule: '0 10 * * *',
                    description: 'Checks for assets with warranty expiring within 30 days',
                    nextRun: 'Daily at 10:00 AM'
                }
            ]
        }
    });
});

module.exports = router;
