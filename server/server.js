const express = require('express');
const morgan = require('morgan');
const axios = require('axios');
const path = require('path');
const database = require('../database/index.js');
const app = express();
const port = 3000;

app.use(morgan('dev'));
app.use(express.json());

app.get('/', (req, res) => {
  database.query('SELECT NOW() as now', (err, res) => {
    if (err) {
      next(err);
    } else {
      console.log('It works!')
    }
  })
  res.send('Hello World!')
});

app.listen(port, () => {
  console.log(`Reviews service listening at http://localhost:${port}`);
})