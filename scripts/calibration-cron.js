#!/usr/bin/env node

/**
 * Calibration Cron Script
 * Wrapper for running calibration compliance checks from crontab
 * 
 * Usage: node scripts/calibration-cron.js
 * Crontab: 0 6 * * * cd /home/binh/qltb/deviceService && node scripts/calibration-cron.js >> logs/calibration-cron.log 2>&1
 */

const path = require('path');

// Set NODE_ENV if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Load database config
const config = require('../config/config.json')[process.env.NODE_ENV];

console.log(`Starting calibration cron job in ${process.env.NODE_ENV} mode...`);
console.log(`Database: ${config.database}@${config.host}`);

// Load jobs
const { runDailyChecks } = require('../src/jobs/calibrationJobs');

// Run checks
runDailyChecks()
    .then(() => {
        console.log('✅ Calibration cron job completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Calibration cron job failed:', error);
        process.exit(1);
    });
