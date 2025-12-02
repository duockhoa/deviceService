const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const departmentGuard = require('../middleware/departmentGuard');
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
// Chỉ phòng ban "xưởng cơ điện" (hoặc DEV) được truy cập yêu cầu xử lý
router.use(departmentGuard(['xưởng cơ điện']));

router.post('/', createWorkRequest);
router.get('/', getWorkRequests);
router.get('/my-tasks', getMyAssignedWorkRequests);
router.get('/:id', getWorkRequestById);
router.patch('/:id', updateWorkRequest);
router.post('/:id/progress', addProgress);
router.post('/:id/close', closeWorkRequest);
router.post('/:id/create-maintenance', createMaintenanceFromRequest);
router.post('/:id/create-incident', createIncidentFromRequest);
router.post('/:id/create-incident-maintenance', createIncidentAndMaintenanceFromRequest);
router.delete('/:id', deleteWorkRequest);

module.exports = router;
