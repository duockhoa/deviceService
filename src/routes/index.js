const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Import routers
const plantsRouter = require('./plants.router');
const areasRouter = require('./areas.router');
const assetsRouter = require('./assets.router');
const assetCategoriesRouter = require('./assetCategories.router');
const departmentsRouter = require('./departments.router');
const assetSubCategoriesRouter = require('./assetSubCategories.router');
const specificationCategoriesRouter = require('./specificationCategories.routes');
const consumableCategoriesRouter = require('./consumableCategories.routes');

// Use asset sub-categories router
router.use('/consumable-categories', consumableCategoriesRouter);
router.use('/specification-categories', specificationCategoriesRouter);
router.use('/asset-sub-categories', assetSubCategoriesRouter);
router.use('/departments', departmentsRouter);
router.use('/plants', plantsRouter);
router.use('/areas', areasRouter);
router.use('/asset-categories', assetCategoriesRouter);
router.use(authMiddleware);
router.use('/assets', assetsRouter);


module.exports = router;