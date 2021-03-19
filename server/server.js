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

  const product = num;

  const resultsArr = `SELECT reviews.review_id, reviews.rating, reviews.summary, reviews.recommend, reviews.response, reviews.body, reviews.date, reviews.reviewer_name, reviews.helpfulness, (
    SELECT JSON_BUILD_OBJECT(
      'id', id,
      'url', url
    ) AS photos
    FROM reviews_photos
    WHERE reviews_photos.review_id = $1
    GROUP BY id)
  FROM reviews
  LEFT JOIN reviews_photos
  ON reviews_photos.review_id = reviews.review_id
  WHERE reviews.product = $1 AND reviews.reported = false
  GROUP BY reviews.review_id`;

  database.query(
    resultsArr, [product], (err, data) => {
    if (err) {
      console.log(err);
    } else {
      const results = data.rows;
      console.log(results);
    }
  });
}

app.get('/reviews/:page/:count/:sort/:product_id', (req, res) => {
  const page = req.params.page;
  const count = req.params.count;
  const sort = req.params.count;
  const productId = req.params.product_id;

  if (page === undefined) {
    page = 0;
  }

  if (count === undefined) {
    count = 5;
  }

  if (sort === undefined) {
    sort = 'relevant';
  }

  const builtQuery = {
    'product': productId,
    'page': page,
    'count': count,
    'results': reviewsResultsArrayBuilder(productId)
  }

  res.send(builtQuery);
});



//============================================================

// This builds the ratings object contents with the key of "ratings", but the values are integers not strings
// SELECT JSON_BUILD_OBJECT(
//   '1', SUM(1),
//   '2', SUM(2),
//   '3', SUM(3),
//   '4', SUM(4),
//   '5', SUM(5)
// ) AS ratings
// FROM reviews
// WHERE product = ${num}

// This builds the recommended object contents, but the values of false and true are integers, not strings
// SELECT JSON_BUILD_OBJECT(
//   'false', COUNT(*) filter (WHERE NOT "recommend"),
//   'true', COUNT(*) filter (WHERE "recommend")
// ) AS recommended
// FROM reviews
// WHERE product = ${num}

// This builds an object with the names, ids, and values of the characteristics tied to the product id
// SELECT
//   characteristics.name, characteristics.id, characteristic_reviews.value
// FROM characteristics, characteristic_reviews
// WHERE characteristics.product_id = ${num} AND characteristic_reviews.characteristic_id = characteristics.id

// This creates average value for characteristics.quality.value
// `SELECT AVG(value) AS "value" FROM characteristic_reviews`

const metadataObjectBuilder = (num) => {

  database.query(
    `SELECT JSON_BUILD_OBJECT(
      'false', COUNT(*) filter (WHERE NOT "recommend"),
      'true', COUNT(*) filter (WHERE "recommend")
    ) AS recommended
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

app.put('/reviews/:review_id/helpful', (req, res) => {
  const reviewIdParam = req.params.review_id;

  let postgresStr = `UPDATE reviews SET helpfulness = helpfulness + 1 WHERE reviews.review_id = $1`;

  database.query(
    postgresStr, [reviewIdParam], (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.sendStatus(204);
    }
  });
});

app.put('/reviews/:review_id/report', (req, res) => {
  const reviewIdParam = req.params.review_id;

  let postgresStr = `UPDATE reviews SET reported = true WHERE reviews.review_id = $1`;

  database.query(
    postgresStr, [reviewIdParam], (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.sendStatus(204);
    }
  });
});

  // sqlText, [lineIdParam],

  // let sqlText = 'UPDATE stations SET is_favorite = ? WHERE id = ?';
  // sqlText, [req.body.is_favorite, req.params.stationId],

app.listen(port, () => {
  console.log(`Reviews service listening at http://localhost:${port}`);
})