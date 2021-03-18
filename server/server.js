const express = require('express');
const morgan = require('morgan');
const axios = require('axios');
const path = require('path');
const database = require('../database');
const app = express();
const port = 3000;

app.use(morgan('dev'));
app.use(express.json());

// app.get('/', (req, res) => {
//   database.query('SELECT NOW() as now', (err, res) => {
//     if (err) {
//       next(err);
//     } else {
//       console.log('It works!')
//     }
//   })
//   res.send('Hello World!')
// });

// app.get('/reviews', (req, res) => {
//   database.query('SELECT * FROM reviews WHERE product = 1', (err, data) => {
//     if (err) {
//       res.sendStatus(500);
//     } else {
//       res.send(data.rows)
//     }
//   });
// });

const reviewsObjBuilder = (num) => {

  database.query(`SELECT review_id, rating, summary, recommend, response, body, date, reviewer_name, helpfulness FROM reviews WHERE product = ${num}`, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      const results = data.rows;
      return results;
    }
  });
}

app.get('/reviews', (req, res) => {
  reviewsObjBuilder(1);
});

// const reviewsObjBuilder = (num) => {

//   database.query(`SELECT review_id, rating, summary, recommend, response, body, date, reviewer_name, helpfulness, id, url FROM reviews INNER JOIN reviews_photos ON reviews_photos.review_id = reviews.review_id WHERE product = ${num}`, (err, data) => {
//     if (err) {
//       console.log(err);
//     } else {
//       const results = data.rows;
//       // results.push(data.rows);
//       console.log(results);
//       // res.send(data.rows)
//     }
//   });
// }

// app.get('/reviews', (req, res) => {
//   reviewsObjBuilder(1);
// });

app.listen(port, () => {
  console.log(`Reviews service listening at http://localhost:${port}`);
})