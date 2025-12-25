/**
 * Calibration Controllers - SAP PM-lite Pattern with GMP Compliance
 * All actions follow state machine + RBAC + Side effects pattern
 */

const CalibrationService = require('../services/CalibrationService');
const { CALIBRATION_ACTIONS } = require('../utils/stateMachine');

class CalibrationController {
    /**
     * GET /api/calibration
     * Get all calibration orders with filters
     */
    static async getAllCalibrationOrders(req, res) {
        try {
            const filters = {
                asset_id: req.query.asset_id,
                status: req.query.status,
                system_status: req.query.system_status,
                assigned_to: req.query.assigned_to,
                calibration_type: req.query.calibration_type,
                from: req.query.from,
                to: req.query.to
            };
            
            const orders = await CalibrationService.getAllCalibrationOrders(filters);
            
            res.json({
                success: true,
                data: orders,
                count: orders.length
            });
        } catch (error) {
            console.error('Error fetching calibration orders:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    /**
     * GET /api/calibration/:id
     * Get single calibration order with available actions
     */
    static async getCalibrationOrderById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const userRoles = req.user.roles || [];
            
            const order = await CalibrationService.getCalibrationOrderWithActions(id, userId, userRoles);
            
            res.json({
                success: true,
                data: order
            });
        } catch (error) {
            console.error('Error fetching calibration order:', error);
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }
    
    /**
     * POST /api/calibration
     * Create new calibration order
     */
    static async createCalibrationOrder(req, res) {
        try {
            const data = req.body;
            const userId = req.user.id;
            
            // Validate required fields
            if (!data.asset_id) {
                return res.status(400).json({
                    success: false,
                    message: 'asset_id is required'
                });
            }
            
            if (!data.calibration_method) {
                return res.status(400).json({
                    success: false,
                    message: 'calibration_method is required'
                });
            }
            
            const order = await CalibrationService.createCalibrationOrder(data, userId);
            
            res.status(201).json({
                success: true,
                message: 'Calibration order created successfully',
                data: order
            });
        } catch (error) {
            console.error('Error creating calibration order:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    /**
     * POST /api/calibration/:id/submit
     * Submit calibration order (draft → scheduled)
     */
    static async submitOrder(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            const userId = req.user.id;
            const userRoles = req.user.roles || [];
            
            const order = await CalibrationService.handleAction(
                id,
                CALIBRATION_ACTIONS.SUBMIT,
                data,
                userId,
                userRoles
            );
            
            res.json({
                success: true,
                message: 'Calibration order submitted successfully',
                data: order
            });
        } catch (error) {
            console.error('Error submitting calibration order:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    /**
     * POST /api/calibration/:id/schedule
     * Schedule calibration order (draft/submitted → scheduled)
     */
    static async scheduleOrder(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            const userId = req.user.id;
            const userRoles = req.user.roles || [];
            
            if (!data.scheduled_date || !data.assigned_to) {
                return res.status(400).json({
                    success: false,
                    message: 'scheduled_date and assigned_to are required'
                });
            }
            
            const order = await CalibrationService.handleAction(
                id,
                CALIBRATION_ACTIONS.SCHEDULE,
                data,
                userId,
                userRoles
            );
            
            res.json({
                success: true,
                message: 'Calibration order scheduled successfully',
                data: order
            });
        } catch (error) {
            console.error('Error scheduling calibration order:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    /**
     * POST /api/calibration/:id/start
     * Start calibration (scheduled → in_progress)
     */
    static async startOrder(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            const userId = req.user.id;
            const userRoles = req.user.roles || [];
            
            const order = await CalibrationService.handleAction(
                id,
                CALIBRATION_ACTIONS.START,
                data,
                userId,
                userRoles
            );
            
            res.json({
                success: true,
                message: 'Calibration started successfully',
                data: order
            });
        } catch (error) {
            console.error('Error starting calibration:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    /**
     * POST /api/calibration/:id/submit-results
     * Submit calibration results (in_progress → awaiting_qa_review)
     */
    static async submitResults(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            const userId = req.user.id;
            const userRoles = req.user.roles || [];
            
            // Validate required fields
            if (!data.result_status || !data.measured_values) {
                return res.status(400).json({
                    success: false,
                    message: 'result_status and measured_values are required'
                });
            }
            
            const order = await CalibrationService.handleAction(
                id,
                CALIBRATION_ACTIONS.SUBMIT_RESULTS,
                data,
                userId,
                userRoles
            );
            
            res.json({
                success: true,
                message: 'Calibration results submitted successfully',
                data: order
            });
        } catch (error) {
            console.error('Error submitting results:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    /**
     * POST /api/calibration/:id/qa-accept
     * QA accept calibration (awaiting_qa_review → accepted)
     */
    static async qaAccept(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            const userId = req.user.id;
            const userRoles = req.user.roles || [];
            
            if (!data.qa_notes) {
                return res.status(400).json({
                    success: false,
                    message: 'qa_notes is required'
                });
            }
            
            const order = await CalibrationService.handleAction(
                id,
                CALIBRATION_ACTIONS.QA_ACCEPT,
                data,
                userId,
                userRoles
            );
            
            res.json({
                success: true,
                message: 'Calibration accepted by QA',
                data: order
            });
        } catch (error) {
            console.error('Error accepting calibration:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    /**
     * POST /api/calibration/:id/qa-reject
     * QA reject calibration (awaiting_qa_review → rejected)
     */
    static async qaReject(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            const userId = req.user.id;
            const userRoles = req.user.roles || [];
            
            if (!data.rejection_reason) {
                return res.status(400).json({
                    success: false,
                    message: 'rejection_reason is required'
                });
            }
            
            const order = await CalibrationService.handleAction(
                id,
                CALIBRATION_ACTIONS.QA_REJECT,
                data,
                userId,
                userRoles
            );
            
            res.json({
                success: true,
                message: 'Calibration rejected by QA',
                data: order
            });
        } catch (error) {
            console.error('Error rejecting calibration:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    /**
     * POST /api/calibration/:id/mark-oot
     * Mark calibration as Out of Tolerance (awaiting_qa_review → out_of_tolerance)
     */
    static async markOutOfTolerance(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            const userId = req.user.id;
            const userRoles = req.user.roles || [];
            
            if (!data.oot_severity || !data.oot_description) {
                return res.status(400).json({
                    success: false,
                    message: 'oot_severity and oot_description are required'
                });
            }
            
            const order = await CalibrationService.handleAction(
                id,
                CALIBRATION_ACTIONS.MARK_OOT,
                data,
                userId,
                userRoles
            );
            
            res.json({
                success: true,
                message: 'Calibration marked as Out of Tolerance. Asset has been taken offline.',
                data: order
            });
        } catch (error) {
            console.error('Error marking OOT:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    /**
     * POST /api/calibration/:id/start-capa
     * Start corrective action (out_of_tolerance → corrective_action)
     */
    static async startCorrectiveAction(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            const userId = req.user.id;
            const userRoles = req.user.roles || [];
            
            if (!data.corrective_action_notes) {
                return res.status(400).json({
                    success: false,
                    message: 'corrective_action_notes is required'
                });
            }
            
            const order = await CalibrationService.handleAction(
                id,
                CALIBRATION_ACTIONS.START_CAPA,
                data,
                userId,
                userRoles
            );
            
            res.json({
                success: true,
                message: 'Corrective action started. Maintenance work order created.',
                data: order
            });
        } catch (error) {
            console.error('Error starting corrective action:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    /**
     * POST /api/calibration/:id/complete-capa
     * Complete corrective action (corrective_action → awaiting_qa_review)
     */
    static async completeCorrectiveAction(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            const userId = req.user.id;
            const userRoles = req.user.roles || [];
            
            const order = await CalibrationService.handleAction(
                id,
                CALIBRATION_ACTIONS.COMPLETE_CAPA,
                data,
                userId,
                userRoles
            );
            
            res.json({
                success: true,
                message: 'Corrective action completed. Awaiting QA re-review.',
                data: order
            });
        } catch (error) {
            console.error('Error completing corrective action:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    /**
     * POST /api/calibration/:id/close
     * Close calibration order (accepted → closed)
     */
    static async closeOrder(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            const userId = req.user.id;
            const userRoles = req.user.roles || [];
            
            const order = await CalibrationService.handleAction(
                id,
                CALIBRATION_ACTIONS.CLOSE,
                data,
                userId,
                userRoles
            );
            
            res.json({
                success: true,
                message: 'Calibration order closed successfully',
                data: order
            });
        } catch (error) {
            console.error('Error closing calibration order:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    /**
     * POST /api/calibration/:id/cancel
     * Cancel calibration order (draft/scheduled → cancelled)
     */
    static async cancelOrder(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            const userId = req.user.id;
            const userRoles = req.user.roles || [];
            
            if (!data.cancellation_reason) {
                return res.status(400).json({
                    success: false,
                    message: 'cancellation_reason is required'
                });
            }
            
            const order = await CalibrationService.handleAction(
                id,
                CALIBRATION_ACTIONS.CANCEL,
                data,
                userId,
                userRoles
            );
            
            res.json({
                success: true,
                message: 'Calibration order cancelled',
                data: order
            });
        } catch (error) {
            console.error('Error cancelling calibration order:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    /**
     * GET /api/calibration/overdue
     * Get overdue calibration assets
     */
    static async getOverdueAssets(req, res) {
        try {
            const assets = await CalibrationService.getOverdueAssets();
            
            res.json({
                success: true,
                data: assets,
                count: assets.length
            });
        } catch (error) {
            console.error('Error fetching overdue assets:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    /**
     * GET /api/calibration/due-soon
     * Get assets due for calibration soon
     */
    static async getAssetsDueSoon(req, res) {
        try {
            const days = parseInt(req.query.days) || 30;
            const assets = await CalibrationService.getAssetsDueSoon(days);
            
            res.json({
                success: true,
                data: assets,
                count: assets.length
            });
        } catch (error) {
            console.error('Error fetching due soon assets:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    /**
     * GET /api/calibration/oot
     * Get Out of Tolerance orders
     */
    static async getOOTOrders(req, res) {
        try {
            const orders = await CalibrationService.getOOTOrders();
            
            res.json({
                success: true,
                data: orders,
                count: orders.length
            });
        } catch (error) {
            console.error('Error fetching OOT orders:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = CalibrationController;
