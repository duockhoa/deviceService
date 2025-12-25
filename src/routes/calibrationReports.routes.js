/**
 * Calibration Reports Routes - GMP Compliance Reports
 */

const express = require('express');
const router = express.Router();
const CalibrationReportsController = require('../controllers/calibrationReports.controllers');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * GET /api/reports/calibration/compliance
 * Get calibration compliance rate report
 * Permissions: QA, MANAGER
 */
router.get('/compliance', authMiddleware, CalibrationReportsController.getComplianceReport);

/**
 * GET /api/reports/calibration/overdue
 * Get overdue calibration assets report
 * Permissions: PLANNER, QA, MANAGER
 */
router.get('/overdue', authMiddleware, CalibrationReportsController.getOverdueReport);

/**
 * GET /api/reports/calibration/oot
 * Get Out of Tolerance incidents report
 * Permissions: QA, MANAGER
 */
router.get('/oot', authMiddleware, CalibrationReportsController.getOOTReport);

/**
 * GET /api/reports/calibration/due-soon
 * Get assets due for calibration soon
 * Permissions: PLANNER, QA
 */
router.get('/due-soon', authMiddleware, CalibrationReportsController.getDueSoonReport);

/**
 * GET /api/reports/calibration/summary
 * Get calibration summary dashboard
 * Permissions: Any authenticated user
 */
router.get('/summary', authMiddleware, CalibrationReportsController.getSummaryDashboard);

module.exports = router;
