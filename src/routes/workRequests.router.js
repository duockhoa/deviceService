const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { permissionGuard } = require('../middleware/permissionGuard');
const validateRequest = require('../middleware/validateMiddleware');
const { createWorkRequestSchema, updateWorkRequestSchema } = require('../validators/workRequestValidator');
const {
    createWorkRequest,
    getWorkRequests,
    getWorkRequestById,
    updateWorkRequest,
    addProgress,
    closeWorkRequest,
    deleteWorkRequest,
    createMaintenanceFromRequest,
    createIncidentFromRequest,
    getMyAssignedWorkRequests,
    createIncidentAndMaintenanceFromRequest
} = require('../controllers/workRequests.controllers');

router.use(authMiddleware);

router.post('/', permissionGuard('work_requests.create'), validateRequest(createWorkRequestSchema), createWorkRequest);
router.get('/', permissionGuard('work_requests.view'), getWorkRequests);
router.get('/my-tasks', permissionGuard('work_requests.view'), getMyAssignedWorkRequests);
router.get('/:id', permissionGuard('work_requests.view'), getWorkRequestById);
router.patch('/:id', permissionGuard('work_requests.update'), validateRequest(updateWorkRequestSchema), updateWorkRequest);
router.post('/:id/progress', permissionGuard('work_requests.update'), addProgress);
router.post('/:id/close', permissionGuard('work_requests.approve'), closeWorkRequest);
router.post('/:id/create-maintenance', permissionGuard('work_requests.approve'), createMaintenanceFromRequest);
router.post('/:id/create-incident', permissionGuard('work_requests.approve'), createIncidentFromRequest);
router.post('/:id/create-incident-maintenance', permissionGuard('work_requests.approve'), createIncidentAndMaintenanceFromRequest);
router.delete('/:id', permissionGuard('work_requests.update'), deleteWorkRequest);

module.exports = router;
