const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { permissionGuard } = require('../middleware/permissionGuard');
const {
    getAllHandovers,
    createHandover,
    acceptHandover,
    addFollowUpRecord,
    closeHandover
} = require('../controllers/handovers.controllers');

router.use(authMiddleware);

router.get('/', permissionGuard('handover.view'), getAllHandovers);
router.post('/', permissionGuard('handover.create'), createHandover);
router.post('/:id/accept', permissionGuard('handover.approve'), acceptHandover);
router.post('/:id/follow-up', permissionGuard('handover.create'), addFollowUpRecord);
router.post('/:id/close', permissionGuard('handover.approve'), closeHandover);

module.exports = router;
