const express = require('express');
const router = express.Router();
const assetsRouter = require('./assets.router');

router.use('/assets', assetsRouter);

router.get('/', (req, res) => {
    res.send('Hello from the API root!');
});

module.exports = router;