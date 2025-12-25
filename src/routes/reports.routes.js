/**
 * Reports Routes - Analytics & CAPA endpoints
 */

const express = require('express');
const router = express.Router();
const {
    getIncidentDowntime,
    getIncidentPareto,
    getMtbfMttr,
    getCapaList,
    getDashboardSummary,
    getOeeReport,
    getMtbfReport
} = require('../controllers/reports.controllers');

// Calibration reports
const calibrationReportsRouter = require('./calibrationReports.routes');
router.use('/calibration', calibrationReportsRouter);

// Dashboard summary
router.get('/dashboard', getDashboardSummary);

// OEE & MTBF reports
router.get('/oee', getOeeReport);
router.get('/mtbf', getMtbfReport);

// Incident analytics
router.get('/incidents/downtime', getIncidentDowntime);
router.get('/incidents/pareto', getIncidentPareto);

// MTBF/MTTR
router.get('/mtbf-mttr', getMtbfMttr);

// CAPA tracking
router.get('/capa', getCapaList);

module.exports = router;
