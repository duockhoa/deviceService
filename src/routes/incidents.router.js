const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const departmentGuard = require('../middleware/departmentGuard');
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
router.use(departmentGuard(['xưởng cơ điện']));

router.get('/', getAllIncidents);
router.get('/my-incidents', getMyIncidents);
router.get('/statistics', getIncidentStatistics);
router.get('/:id', getIncidentById);

router.post('/', createIncident);
router.put('/:id', updateIncident);
router.put('/:id/assess', assessIncident);
router.post('/:id/approve-solution', approveSolution);
router.put('/:id/assign', assignIncident);
router.put('/:id/start', startIncident);
router.put('/:id/resolve', resolveIncident);
router.put('/:id/close', closeIncident);
router.delete('/:id', deleteIncident);

module.exports = router;
