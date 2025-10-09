const express = require('express');
const router = express.Router();

// Import routers
const plantsRouter = require('./plants.router');
const areasRouter = require('./areas.router');
const assetsRouter = require('./assets.router');

// Use routers
router.use('/plants', plantsRouter);
router.use('/areas', areasRouter);
router.use('/assets', assetsRouter);

module.exports = router;