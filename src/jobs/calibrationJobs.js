/**
 * Calibration Cron Jobs - GMP Compliance Automation
 * Run daily to check overdue and due soon calibrations
 */

const CalibrationService = require('../services/CalibrationService');

/**
 * Check overdue calibrations and update asset status
 * Should run daily at 6:00 AM
 */
async function checkOverdueCalibrations() {
    console.log(`[${new Date().toISOString()}] Starting overdue calibration check...`);
    
    try {
        const result = await CalibrationService.checkOverdueCalibrations();
        
        console.log(`✅ Overdue check complete:`);
        console.log(`   - Assets marked overdue: ${result.count}`);
        console.log(`   - Notifications sent: ${result.count * 2} (Planners + QA)`);
        
        if (result.count > 0) {
            console.log(`   - Assets:`);
            result.assets.forEach(asset => {
                const days_overdue = Math.floor((new Date() - new Date(asset.next_due_at)) / (1000 * 60 * 60 * 24));
                console.log(`     * ${asset.dk_code} - ${asset.name} (${days_overdue} days overdue)`);
            });
        }
        
        return result;
    } catch (error) {
        console.error(`❌ Overdue check failed:`, error);
        throw error;
    }
}

/**
 * Check calibrations due soon (within 30 days)
 * Should run daily at 6:00 AM
 */
async function checkDueSoon(days = 30) {
    console.log(`[${new Date().toISOString()}] Starting due soon check (${days} days)...`);
    
    try {
        const result = await CalibrationService.checkDueSoon(days);
        
        console.log(`✅ Due soon check complete:`);
        console.log(`   - Assets due soon: ${result.count}`);
        console.log(`   - Notifications sent to planners`);
        
        if (result.count > 0) {
            console.log(`   - Assets:`);
            result.assets.forEach(asset => {
                const days_until = Math.floor((new Date(asset.next_due_at) - new Date()) / (1000 * 60 * 60 * 24));
                console.log(`     * ${asset.dk_code} - ${asset.name} (due in ${days_until} days)`);
            });
        }
        
        return result;
    } catch (error) {
        console.error(`❌ Due soon check failed:`, error);
        throw error;
    }
}

/**
 * Run all daily checks
 */
async function runDailyChecks() {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`CALIBRATION DAILY COMPLIANCE CHECKS`);
    console.log(`${new Date().toISOString()}`);
    console.log(`${'='.repeat(80)}\n`);
    
    try {
        // Check overdue
        await checkOverdueCalibrations();
        
        console.log(); // blank line
        
        // Check due soon
        await checkDueSoon(30);
        
        console.log(`\n${'='.repeat(80)}`);
        console.log(`✅ All daily checks completed successfully`);
        console.log(`${'='.repeat(80)}\n`);
        
    } catch (error) {
        console.error(`\n${'='.repeat(80)}`);
        console.error(`❌ Daily checks failed`);
        console.error(`${'='.repeat(80)}\n`);
        throw error;
    }
}

module.exports = {
    checkOverdueCalibrations,
    checkDueSoon,
    runDailyChecks
};

// If run directly from command line
if (require.main === module) {
    runDailyChecks()
        .then(() => {
            console.log('Exiting with success');
            process.exit(0);
        })
        .catch(error => {
            console.error('Exiting with error:', error);
            process.exit(1);
        });
}
