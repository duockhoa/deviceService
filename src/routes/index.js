const express = require('express');
const router = express.Router();
const assetsRouter = require('./assets.router');
const assetCategoriesRouter = require('./assetCategories.router');
const departmentRouter = require('./department.router');

router.use('/asset-categories', assetCategoriesRouter);
router.use('/assets', assetsRouter);
router.use('/departments', departmentRouter);
router.get('/', (req, res) => {
    res.send('Hello from the API root!');
});

module.exports = router;