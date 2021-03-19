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

const reviewsResultsArrayBuilder = async(num, resultCount, sortBy, callback) => {

  const product = num;
  const sort = sortBy;
  const resultsTotal = resultCount;

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
  GROUP BY reviews.review_id
  ORDER BY $2
  LIMIT $3`;

  let response;

  try{
    response = await database.query(resultsArr, [product, sort, resultsTotal])
  } catch (err) {
    console.log(err.stack)
  }

  callback(null, response);
}

app.get('/reviews/:product_id', (req, res) => {
  let { page, count, sort } = req.body
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

  const sortingFunc = (str) => {
    if (str === 'helpful') {
      return 'helpfulness DESC'
    } else if (str === 'newest') {
      return 'date DESC'
    } else if (str === 'relevant') {
      return 'helpfulness DESC, date, DESC'
    }
  }

  reviewsResultsArrayBuilder(productId, count, sortingFunc(sort), (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      const builtQuery = {
        'product': productId,
        'page': page,
        'count': count,
        'results': data.rows
      }
      res.send(builtQuery);
    }
  });
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
      const results = data.rows[0];
      console.log(results);
    }
  });
}

app.get('/reviews/meta/:product_id', (req, res) => {
  const productId = req.params.product_id;

  // metadataObjectBuilder(productId, count, sortingFunc(sort), (err, data) => {
  //   if (err) {
  //     res.sendStatus(500);
  //   } else {
  //     const builtQuery = {
  //       'product': productId,
  //       'ratings': page,
  //       'count': count,
  //       'results': data.rows
  //     }
  //     res.send(builtQuery);
  //   }
  // });
  metadataObjectBuilder(productId);
});

//=============================================================

app.post('/reviews', (req, res) => {
  const { productId, rating, summary, body, recommend, name, email, photos, characteristics, reviewId } = req.body.reviewObj;
  // productId = $1
  // rating = $2
  // summary = $3
  // body = $4
  // recommend = $5
  // name = $6
  // email = $7
  // photos = $8
  // characteristics = $9
  // reviewId = $10

  let reviewStr = `INTERT INTO reviews (rating, summary, body, recommend, reviewer_name, reviewer_email) VALUES ($2, $3, $4, $5, $6, $7) WHERE reviews.review_id = $1`;

  database.query(
    reviewStr, [productId, rating, summary, body, recommend, name, email], (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.sendStatus(201);
    }
  });

  let photosStr = `INSERT INTO reviews_photos (url) VALUES ($9) WHERE reviews_photos.review_id = $10`;

  const urlStr = photos.join(', ');

  database.query(
    photosStr, [urlStr, reviewId], (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.sendStatus(201);
    }
  });

  const charIdsArr = parseInt(Object.keys(characteristics)); //$11
  const charValuesArr = Object.values(characteristics); //$12

  charIdsArr.forEach((id) => {
    let characteristicsIdStr = `INSERT INTO characteristic_reviews (characteristic_id) VALUES ($11) WHERE characteristic_reviews.review_id = $10`;

    database.query(
      characteristicsIdStr, [id, reviewId], (err, data) => {
        if (err) {
          res.sendStatus(500);
        } else {
          res.sendStatus(201);
        }
      }
    );
  });

  charValuesArr.forEach((val) => {
    let characteristicsValStr = `INSERT INTO characteristic_reviews (value) VALUES ($12) WHERE characteristic_reviews.review_id = $10`;

    database.query(
      characteristicsValStr, [val, reviewId], (err, data) => {
        if (err) {
          res.sendStatus(500);
        } else {
          res.sendStatus(201);
        }
      }
    );
  });
});

//=============================================================

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

//==============================================================

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

app.listen(port, () => {
  console.log(`Reviews service listening at http://localhost:${port}`);
})