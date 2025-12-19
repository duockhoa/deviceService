const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    getAllHandovers,
    createHandover,
    acceptHandover,
    addFollowUpRecord,
    closeHandover
} = require('../controllers/handovers.controllers');

router.use(authMiddleware);

router.get('/',getAllHandovers);
router.post('/',createHandover);
router.post('/:id/accept',acceptHandover);
router.post('/:id/follow-up',addFollowUpRecord);
router.post('/:id/close',closeHandover);

module.exports = router;
