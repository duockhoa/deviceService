const express = require('express');
const router = express.Router();
const assetsRouter = require('./assets.router');
const assetCategoriesRouter = require('./assetCategories.router');
const departmentRouter = require('./department.router');
const plantsRouter = require('./plants.router');
const areasRouter = require('./areas.router');

router.use('/asset-categories', assetCategoriesRouter);
router.use('/assets', assetsRouter);
router.use('/departments', departmentRouter);
router.use('/plants', plantsRouter);
router.use('/areas', areasRouter);

router.get('/', (req, res) => {
    res.send('Hello from the API root!');
});

module.exports = router;