const express = require('express');
const router = express.Router();
const { permissionGuard } = require('../middleware/permissionGuard');
const { getMtbfReport, getOeeReport } = require('../controllers/reports.controllers');

// All routes protected by maintenance.report (reusing existing permission)
router.use(permissionGuard('maintenance.report'));

router.get('/mtbf', getMtbfReport);
router.get('/oee', getOeeReport);

module.exports = router;
