/**
 * Calibration Routes - SAP PM-lite Pattern
 * All actions follow state machine + RBAC gates
 */

const express = require('express');
const router = express.Router();
const CalibrationController = require('../controllers/calibration.controllers');
const authMiddleware = require('../middleware/authMiddleware');

// ============ QUERY ENDPOINTS ============

/**
 * GET /api/calibration
 * Get all calibration orders with filters
 * Permissions: Any authenticated user
 */
router.get('/', 
    authMiddleware, 
    CalibrationController.getAllCalibrationOrders
);

/**
 * GET /api/calibration/:id
 * Get single calibration order with available actions
 * Permissions: Any authenticated user
 */
router.get('/:id', 
    authMiddleware, 
    CalibrationController.getCalibrationOrderById
);

/**
 * GET /api/calibration/overdue
 * Get overdue calibration assets
 * Permissions: PLANNER, QA, MANAGER
 */
router.get('/reports/overdue', 
    authMiddleware,
    CalibrationController.getOverdueAssets
);

/**
 * GET /api/calibration/due-soon
 * Get assets due for calibration soon
 * Permissions: PLANNER, QA
 */
router.get('/reports/due-soon', 
    authMiddleware,
    CalibrationController.getAssetsDueSoon
);

/**
 * GET /api/calibration/oot
 * Get Out of Tolerance orders
 * Permissions: QA, MANAGER
 */
router.get('/reports/oot', 
    authMiddleware,
    CalibrationController.getOOTOrders
);

// ============ CREATE ENDPOINT ============

/**
 * POST /api/calibration
 * Create new calibration order
 * Permissions: PLANNER, QA
 */
router.post('/', 
    authMiddleware,
    CalibrationController.createCalibrationOrder
);

// ============ STATE TRANSITION ENDPOINTS (Action-based) ============

/**
 * POST /api/calibration/:id/submit
 * Submit calibration order (draft → scheduled)
 * Permissions: PLANNER, QA
 */
router.post('/:id/submit', 
    authMiddleware,
    CalibrationController.submitOrder
);

/**
 * POST /api/calibration/:id/schedule
 * Schedule calibration (draft → scheduled)
 * System Status: CRTD → REL (scope locked)
 * Permissions: PLANNER
 */
router.post('/:id/schedule', 
    authMiddleware,
    CalibrationController.scheduleOrder
);

/**
 * POST /api/calibration/:id/start
 * Start calibration (scheduled → in_progress)
 * Side Effect: asset.operational_status → 'limited'
 * Permissions: TECHNICIAN (assigned)
 */
router.post('/:id/start', 
    authMiddleware,
    CalibrationController.startOrder
);

/**
 * POST /api/calibration/:id/submit-results
 * Submit calibration results (in_progress → awaiting_qa_review)
 * Permissions: TECHNICIAN (assigned)
 */
router.post('/:id/submit-results', 
    authMiddleware,
    CalibrationController.submitResults
);

/**
 * POST /api/calibration/:id/qa-accept
 * QA accept calibration (awaiting_qa_review → accepted)
 * Side Effect: asset.calibration_status → 'valid', next_due_at updated
 * Permissions: QA only
 */
router.post('/:id/qa-accept', 
    authMiddleware,
    CalibrationController.qaAccept
);

/**
 * POST /api/calibration/:id/qa-reject
 * QA reject calibration (awaiting_qa_review → rejected)
 * Side Effect: Notify technician and planner
 * Permissions: QA only
 */
router.post('/:id/qa-reject', 
    authMiddleware,
    CalibrationController.qaReject
);

/**
 * POST /api/calibration/:id/mark-oot
 * Mark calibration as Out of Tolerance
 * Side Effect: asset.operational_status → 'down' (CRITICAL)
 * Permissions: QA only
 */
router.post('/:id/mark-oot', 
    authMiddleware,
    CalibrationController.markOutOfTolerance
);

/**
 * POST /api/calibration/:id/start-capa
 * Start corrective action (out_of_tolerance → corrective_action)
 * Side Effect: Create maintenance work order
 * Permissions: MANAGER
 */
router.post('/:id/start-capa', 
    authMiddleware,
    CalibrationController.startCorrectiveAction
);

/**
 * POST /api/calibration/:id/complete-capa
 * Complete corrective action (corrective_action → awaiting_qa_review)
 * Side Effect: Notify QA for re-review
 * Permissions: TECHNICIAN (assigned to maintenance WO)
 */
router.post('/:id/complete-capa', 
    authMiddleware,
    CalibrationController.completeCorrectiveAction
);

/**
 * POST /api/calibration/:id/close
 * Close calibration order (accepted → closed)
 * System Status: REL → TECO (cost locked)
 * Permissions: PLANNER, QA
 */
router.post('/:id/close', 
    authMiddleware,
    CalibrationController.closeOrder
);

/**
 * POST /api/calibration/:id/cancel
 * Cancel calibration order (draft/scheduled → cancelled)
 * Note: Cannot cancel after started
 * Permissions: PLANNER, MANAGER
 */
router.post('/:id/cancel', 
    authMiddleware,
    CalibrationController.cancelOrder
);

module.exports = router;
