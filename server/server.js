const express = require('express');
const morgan = require('morgan');
const axios = require('axios');
const path = require('path');
const database = require('../database');
const app = express();
const port = 3000;

app.use(morgan('dev'));
app.use(express.json());

// app.get('/reviews', (req, res) => {
//   database.query('SELECT * FROM reviews WHERE product = 1', (err, data) => {
//     if (err) {
//       res.sendStatus(500);
//     } else {
//       res.send(data.rows)
//     }
//   });
// });

//==========================================================
//The below works, but need to have photos be in a key-value pair like this - 'photos': {id: INT, url: STRING}
//Also need to set up query parameters for parent object of nested results array including page, count, sort, and product_id
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

// SELECT JSON_BUILD_OBJECT(
//   'photos', (SELECT JSON_AGG(ROW_TO_JSON("reviews_photos")) FROM reviews_photos))

// ratings 1 = SELECT COUNT(*) FROM reviews WHERE rating = 1;
// ratings 2 = SELECT COUNT(*) FROM reviews WHERE rating = 2;
// ratings 3 = SELECT COUNT(*) FROM reviews WHERE rating = 3;
// ratings 4 = SELECT COUNT(*) FROM reviews WHERE rating = 4;
// ratings 5 = SELECT COUNT(*) FROM reviews WHERE rating = 5;

// Investigate TO_CHAR(integer, '9') further

// recommend false = SELECT COUNT(*) FROM reviews WHERE recommend = false;
// recommend true = SELECT COUNT(*) FROM reviews WHERE recommend = true;

// characteristic name value = SELECT AVG(value) FROM characteristic_reviews;

// SELECT characteristics.name, characteristics.id FROM characteristics INNER JOIN ON characteristic_reviews WHERE characteristics.id = characteristic_reviews.characteristic_id;


const metadataObjectBuilder = () => {

  database.query(`SELECT AVG(characteristic_reviews.value) FROM characteristic_reviews`, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      const results = data.rows;
      console.log(results);
    }
  });
}

app.get('/reviews/meta', (req, res) => {
  metadataObjectBuilder();
});

app.listen(port, () => {
  console.log(`Reviews service listening at http://localhost:${port}`);
})