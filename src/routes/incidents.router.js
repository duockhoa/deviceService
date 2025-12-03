const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { permissionGuard } = require('../middleware/permissionGuard');
const {
    getAllIncidents,
    getIncidentById,
    createIncident,
    updateIncident,
    assignIncident,
    startIncident,
    resolveIncident,
    closeIncident,
    getMyIncidents,
    getIncidentStatistics,
    assessIncident,
    approveSolution,
    deleteIncident
} = require('../controllers/incidents.controllers');

router.use(authMiddleware);

router.get('/', permissionGuard('incidents.view'), getAllIncidents);
router.get('/my-incidents', permissionGuard('incidents.view'), getMyIncidents);
router.get('/statistics', permissionGuard('incidents.view'), getIncidentStatistics);
router.get('/:id', permissionGuard('incidents.view'), getIncidentById);

router.post('/', permissionGuard('incidents.create'), createIncident);
router.put('/:id', permissionGuard('incidents.update'), updateIncident);
router.put('/:id/assess', permissionGuard('incidents.update'), assessIncident);
router.post('/:id/approve-solution', permissionGuard('incidents.resolve'), approveSolution);
router.put('/:id/assign', permissionGuard('incidents.update'), assignIncident);
router.put('/:id/start', permissionGuard('incidents.update'), startIncident);
router.put('/:id/resolve', permissionGuard('incidents.resolve'), resolveIncident);
router.put('/:id/close', permissionGuard('incidents.resolve'), closeIncident);
router.delete('/:id', permissionGuard('incidents.update'), deleteIncident);

module.exports = router;
