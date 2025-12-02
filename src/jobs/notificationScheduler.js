const cron = require('node-cron');
const { Maintenance, Calibration, Assets } = require('../models');
const NotificationService = require('../service/NotificationService');
const { Op } = require('sequelize');

/**
 * Scheduled job: Check for maintenance due soon (3 days before scheduled_date)
 * Runs daily at 8:00 AM
 */
const checkMaintenanceDueSoon = cron.schedule('0 8 * * *', async () => {
    try {
        console.log('🔔 Running scheduled job: Check Maintenance Due Soon...');
        
        const today = new Date();
        const threeDaysLater = new Date();
        threeDaysLater.setDate(today.getDate() + 3);
        
        // Reset time to start of day for accurate comparison
        today.setHours(0, 0, 0, 0);
        threeDaysLater.setHours(23, 59, 59, 999);

        // Find maintenance scheduled within 3 days
        const upcomingMaintenance = await Maintenance.findAll({
            where: {
                scheduled_date: {
                    [Op.between]: [today, threeDaysLater]
                },
                status: {
                    [Op.in]: ['pending', 'awaiting_approval']
                }
            },
            include: [
                {
                    model: Assets,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'name']
                }
            ]
        });

        console.log(`Found ${upcomingMaintenance.length} maintenance tasks due within 3 days`);

        for (const maintenance of upcomingMaintenance) {
            const daysUntil = Math.ceil((new Date(maintenance.scheduled_date) - today) / (1000 * 60 * 60 * 24));
            
            await NotificationService.notifyMaintenanceDueSoon({
                maintenanceId: maintenance.id,
                maintenanceCode: maintenance.maintenance_code,
                assetCode: maintenance.asset?.asset_code,
                assetName: maintenance.asset?.name,
                scheduledDate: maintenance.scheduled_date,
                daysUntil,
                technicianId: maintenance.technician_id,
                createdBy: maintenance.created_by
            });
        }

        console.log('✅ Maintenance Due Soon check completed');
    } catch (error) {
        console.error('❌ Error in checkMaintenanceDueSoon:', error);
    }
});

/**
 * Scheduled job: Check for overdue maintenance
 * Runs daily at 9:00 AM
 */
const checkMaintenanceOverdue = cron.schedule('0 9 * * *', async () => {
    try {
        console.log('🔔 Running scheduled job: Check Maintenance Overdue...');
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find maintenance that is overdue
        const overdueMaintenance = await Maintenance.findAll({
            where: {
                scheduled_date: {
                    [Op.lt]: today
                },
                status: {
                    [Op.in]: ['pending', 'in_progress']
                }
            },
            include: [
                {
                    model: Assets,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'name']
                }
            ]
        });

        console.log(`Found ${overdueMaintenance.length} overdue maintenance tasks`);

        for (const maintenance of overdueMaintenance) {
            const daysOverdue = Math.floor((today - new Date(maintenance.scheduled_date)) / (1000 * 60 * 60 * 24));
            
            await NotificationService.notifyMaintenanceOverdue({
                maintenanceId: maintenance.id,
                maintenanceCode: maintenance.maintenance_code,
                assetCode: maintenance.asset?.asset_code,
                assetName: maintenance.asset?.name,
                scheduledDate: maintenance.scheduled_date,
                daysOverdue,
                technicianId: maintenance.technician_id,
                createdBy: maintenance.created_by
            });
        }

        console.log('✅ Maintenance Overdue check completed');
    } catch (error) {
        console.error('❌ Error in checkMaintenanceOverdue:', error);
    }
});

/**
 * Scheduled job: Check for calibration due soon (7 days before scheduled_date)
 * Runs daily at 8:30 AM
 */
const checkCalibrationDueSoon = cron.schedule('30 8 * * *', async () => {
    try {
        console.log('🔔 Running scheduled job: Check Calibration Due Soon...');
        
        const today = new Date();
        const sevenDaysLater = new Date();
        sevenDaysLater.setDate(today.getDate() + 7);
        
        today.setHours(0, 0, 0, 0);
        sevenDaysLater.setHours(23, 59, 59, 999);

        // Find calibration scheduled within 7 days
        const upcomingCalibration = await Calibration.findAll({
            where: {
                scheduled_date: {
                    [Op.between]: [today, sevenDaysLater]
                },
                status: {
                    [Op.in]: ['pending']
                }
            },
            include: [
                {
                    model: Assets,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'name']
                }
            ]
        });

        console.log(`Found ${upcomingCalibration.length} calibration tasks due within 7 days`);

        for (const calibration of upcomingCalibration) {
            const daysUntil = Math.ceil((new Date(calibration.scheduled_date) - today) / (1000 * 60 * 60 * 24));
            
            await NotificationService.notifyCalibrationDueSoon({
                calibrationId: calibration.id,
                calibrationCode: calibration.calibration_code,
                assetCode: calibration.asset?.asset_code,
                assetName: calibration.asset?.name,
                scheduledDate: calibration.scheduled_date,
                daysUntil,
                technicianId: calibration.technician_id,
                createdBy: calibration.created_by
            });
        }

        console.log('✅ Calibration Due Soon check completed');
    } catch (error) {
        console.error('❌ Error in checkCalibrationDueSoon:', error);
    }
});

/**
 * Scheduled job: Check for overdue calibration
 * Runs daily at 9:30 AM
 */
const checkCalibrationOverdue = cron.schedule('30 9 * * *', async () => {
    try {
        console.log('🔔 Running scheduled job: Check Calibration Overdue...');
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find calibration that is overdue
        const overdueCalibration = await Calibration.findAll({
            where: {
                scheduled_date: {
                    [Op.lt]: today
                },
                status: {
                    [Op.in]: ['pending', 'in_progress']
                }
            },
            include: [
                {
                    model: Assets,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'name']
                }
            ]
        });

        console.log(`Found ${overdueCalibration.length} overdue calibration tasks`);

        for (const calibration of overdueCalibration) {
            const daysOverdue = Math.floor((today - new Date(calibration.scheduled_date)) / (1000 * 60 * 60 * 24));
            
            await NotificationService.notifyCalibrationOverdue({
                calibrationId: calibration.id,
                calibrationCode: calibration.calibration_code,
                assetCode: calibration.asset?.asset_code,
                assetName: calibration.asset?.name,
                scheduledDate: calibration.scheduled_date,
                daysOverdue,
                technicianId: calibration.technician_id,
                createdBy: calibration.created_by
            });
        }

        console.log('✅ Calibration Overdue check completed');
    } catch (error) {
        console.error('❌ Error in checkCalibrationOverdue:', error);
    }
});

/**
 * Scheduled job: Check for assets with warranty expiring soon (30 days)
 * Runs daily at 10:00 AM
 */
const checkWarrantyExpiring = cron.schedule('0 10 * * *', async () => {
    try {
        console.log('🔔 Running scheduled job: Check Warranty Expiring...');
        
        const today = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(today.getDate() + 30);
        
        today.setHours(0, 0, 0, 0);
        thirtyDaysLater.setHours(23, 59, 59, 999);

        // Find assets with warranty expiring within 30 days
        const expiringAssets = await Assets.findAll({
            where: {
                warranty_expiry: {
                    [Op.between]: [today, thirtyDaysLater]
                },
                status: {
                    [Op.notIn]: ['disposed', 'retired']
                }
            }
        });

        console.log(`Found ${expiringAssets.length} assets with warranty expiring within 30 days`);

        for (const asset of expiringAssets) {
            const daysUntilExpiry = Math.ceil((new Date(asset.warranty_expiry) - today) / (1000 * 60 * 60 * 24));
            
            await NotificationService.notifyWarrantyExpiring({
                assetId: asset.id,
                assetCode: asset.asset_code,
                assetName: asset.name,
                warrantyExpiry: asset.warranty_expiry,
                daysUntilExpiry,
                department: asset.department
            });
        }

        console.log('✅ Warranty Expiring check completed');
    } catch (error) {
        console.error('❌ Error in checkWarrantyExpiring:', error);
    }
});

/**
 * Start all scheduled jobs
 */
function startNotificationScheduler() {
    console.log('🚀 Starting Notification Scheduler...');
    
    checkMaintenanceDueSoon.start();
    checkMaintenanceOverdue.start();
    checkCalibrationDueSoon.start();
    checkCalibrationOverdue.start();
    checkWarrantyExpiring.start();
    
    console.log('✅ Notification Scheduler started successfully!');
    console.log('📅 Schedule:');
    console.log('  - Maintenance Due Soon: Daily at 8:00 AM');
    console.log('  - Maintenance Overdue: Daily at 9:00 AM');
    console.log('  - Calibration Due Soon: Daily at 8:30 AM');
    console.log('  - Calibration Overdue: Daily at 9:30 AM');
    console.log('  - Warranty Expiring: Daily at 10:00 AM');
}

/**
 * Stop all scheduled jobs
 */
function stopNotificationScheduler() {
    console.log('🛑 Stopping Notification Scheduler...');
    
    checkMaintenanceDueSoon.stop();
    checkMaintenanceOverdue.stop();
    checkCalibrationDueSoon.stop();
    checkCalibrationOverdue.stop();
    checkWarrantyExpiring.stop();
    
    console.log('✅ Notification Scheduler stopped');
}

module.exports = {
    startNotificationScheduler,
    stopNotificationScheduler,
    // Export individual jobs for manual testing
    checkMaintenanceDueSoon,
    checkMaintenanceOverdue,
    checkCalibrationDueSoon,
    checkCalibrationOverdue,
    checkWarrantyExpiring
};
