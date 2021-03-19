const express = require('express');
const morgan = require('morgan');
const axios = require('axios');
const path = require('path');
const database = require('../database');
const app = express();
const port = 3000;

app.use(morgan('dev'));
app.use(express.json());

//==========================================================
//Need to set up query parameters for parent object of nested results array including page, count, sort, and product_id
//Look up ORDER BY to handle sort portion of request

const reviewsResultsArrayBuilder = (num) => {

  database.query(
    `SELECT reviews.review_id, reviews.rating, reviews.summary, reviews.recommend, reviews.response, reviews.body, reviews.date, reviews.reviewer_name, reviews.helpfulness, (
      SELECT JSON_BUILD_OBJECT(
        'id', id, 'url', url
      ) AS photos
      FROM reviews_photos
      WHERE reviews_photos.review_id = ${num}
      GROUP BY id)
    FROM reviews
    LEFT JOIN reviews_photos
    ON reviews_photos.review_id = reviews.review_id
    WHERE reviews.product = ${num}
    GROUP BY reviews.review_id`, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      const results = data.rows;
      console.log(results);
    }
  });
}

app.get('/reviews', (req, res) => {
  reviewsResultsArrayBuilder(15);
});



//============================================================

// This builds the ratings object contents without the key of "ratings"
// `SELECT
//   SUM(1) AS "1",
//   SUM(2) AS "2",
//   SUM(3) AS "3",
//   SUM(4) AS "4",
//   SUM(5) AS "5"
// FROM reviews
// WHERE product = ${num}

// This builds the recommended object contents without the key of "recommended"
// SELECT
//   COUNT(*) filter (WHERE NOT "recommend") AS false,
//   COUNT(*) filter (WHERE "recommend") AS true
// FROM reviews
// WHERE product = ${num}

// SELECT JSON_BUILD_OBJECT(
//   'photos', (SELECT JSON_AGG(ROW_TO_JSON("reviews_photos")) FROM reviews_photos))

// Still need to compile tables to get characteristics name with appropriate id and value

// This creates average value for characteristics.quality.value
// `SELECT AVG(value) AS "value" FROM characteristic_reviews`


const metadataObjectBuilder = (num) => {

  database.query(
    `SELECT
      COUNT(*) filter (WHERE NOT "recommend") AS false,
      COUNT(*) filter (WHERE "recommend") AS true
    FROM reviews
    WHERE product = ${num}`
    , (err, data) => {
    if (err) {
      console.log(err);
    } else {
      const results = data.rows;
      console.log(results);
    }
  });
}

app.get('/reviews/meta', (req, res) => {
  metadataObjectBuilder(15);
});

app.listen(port, () => {
  console.log(`Reviews service listening at http://localhost:${port}`);
})