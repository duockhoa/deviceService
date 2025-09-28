require('dotenv').config();
const express = require('express')
const app = express()
const port = process.env.PORT || 3009
const path = require('path')
require('./jobs');

// cookie-parser
var cookieParser = require('cookie-parser')
app.use(cookieParser())

// cors
const cors = require('cors');
app.use(cors({ origin: '*' , credentials: true}));

// body-parser
app.use(express.json({ limit: '100MB' }));
app.use(express.urlencoded({ limit: '100MB', extended: true }));

// static
app.use(express.static(path.join(  __dirname, '../','public')))

// routes
const router = require('./routes/index.js');
app.use('/api/v1/', router)

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
