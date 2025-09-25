const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send('Hello from the API root!');
});

module.exports = router;