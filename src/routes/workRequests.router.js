const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
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

router.post('/', validateRequest(createWorkRequestSchema), createWorkRequest);
router.get('/', getWorkRequests);
router.get('/my-tasks', getMyAssignedWorkRequests);
router.get('/:id', getWorkRequestById);
router.patch('/:id', validateRequest(updateWorkRequestSchema), updateWorkRequest);
router.post('/:id/progress', addProgress);
router.post('/:id/close', closeWorkRequest);
router.post('/:id/create-maintenance', createMaintenanceFromRequest);
router.post('/:id/create-incident', createIncidentFromRequest);
router.post('/:id/create-incident-maintenance', createIncidentAndMaintenanceFromRequest);
router.delete('/:id', deleteWorkRequest);

module.exports = router;
