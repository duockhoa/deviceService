const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Import routers
const plantsRouter = require('./plants.router');
const areasRouter = require('./areas.router');
const assetsRouter = require('./assets.router');
const assetCategoriesRouter = require('./assetCategories.router');
const departmentsRouter = require('./departments.router');

// Use department router

router.use('/departments', departmentsRouter);

// Use routers
router.use('/plants', plantsRouter);
router.use('/areas', areasRouter);
router.use('/asset-categories', assetCategoriesRouter);
router.use(authMiddleware);
router.use('/assets', assetsRouter);


module.exports = router;