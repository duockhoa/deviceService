const express = require('express');
const router = express.Router();
const { uploadMiddleware, previewImportOee, commitImportOee } = require('../controllers/oee.controllers');

router.post('/import/preview', uploadMiddleware, previewImportOee);
router.post('/import/commit', uploadMiddleware, commitImportOee);

module.exports = router;
