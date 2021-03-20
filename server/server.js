const express = require('express');
const morgan = require('morgan');
const axios = require('axios');
const path = require('path');
const database = require('../database');

const app = express();
const port = 3000;

app.use(morgan('dev'));
app.use(express.json());

const reviewsResultsArrayBuilder = async (num, resultCount, sortBy, callback) => {
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

  try {
    response = await database.query(resultsArr, [product, sort, resultsTotal]);
  } catch (err) {
    console.log(err.stack);
  }

  callback(null, response);
};

app.get('/reviews/:product_id', (req, res) => {
  let { page, count, sort } = req.body;
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
      return 'helpfulness DESC';
    }

    if (str === 'newest') {
      return 'date DESC';
    }

    if (str === 'relevant') {
      return 'helpfulness DESC, date, DESC';
    }
  };

  reviewsResultsArrayBuilder(productId, count, sortingFunc(sort), (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      const builtQuery = {
        product: productId,
        page: page,
        count: count,
        results: data.rows,
      };
      res.send(builtQuery);
    }
  });
});

app.get('/reviews/meta/:product_id', async (req, res) => {
  const productId = req.params.product_id;

  const recommendStr = `SELECT JSON_BUILD_OBJECT(
    'false', COUNT(*) filter (WHERE NOT "recommend"),
    'true', COUNT(*) filter (WHERE "recommend")
  ) AS recommended
  FROM reviews
  WHERE product = $1`;

  const ratingString = `SELECT JSON_BUILD_OBJECT(
    '1', SUM(1),
    '2', SUM(2),
    '3', SUM(3),
    '4', SUM(4),
    '5', SUM(5)
  ) AS ratings
  FROM reviews
  WHERE product = $1`;

  const characterNamesString = 'SELECT name FROM characteristics WHERE characteristics.product_id = $1';

  const charUniqueIdString = 'SELECT id FROM characteristics WHERE characteristics.product_id = $1';

  const getCharIds = 'SELECT id FROM characteristics WHERE characteristics.product_id = $1';

  const recommendedObj = await database.query(recommendStr, [productId]);
  const ratingsObj = await database.query(ratingString, [productId]);
  const characteristicNames = await database.query(characterNamesString, [productId]);
  const characterisiticUniqueIds = await database.query(charUniqueIdString, [productId]);
  const charIdsAndValsQuery = await database.query(getCharIds, [productId]);

  let str = '(';

  for (let i = 0; i < charIdsAndValsQuery.rows.length; i++) {
    if (i === charIdsAndValsQuery.rows.length - 1) {
      str = str.concat(charIdsAndValsQuery.rows[i].id.toString(), ')');
    } else {
      str = str.concat(charIdsAndValsQuery.rows[i].id.toString(), ', ');
    }
  }

  const avgCalcString = `SELECT characteristic_id, AVG(value) AS "value" FROM characteristic_reviews WHERE characteristic_reviews.characteristic_id IN ${str} GROUP BY characteristic_id`;

  const avgs = await database.query(avgCalcString);

  const names = characteristicNames.rows;
  const ids = characterisiticUniqueIds.rows;
  const vals = avgs.rows;

  const characteristics = {};

  for (let i = 0; i < names.length; i++) {
    characteristics[names[i].name] = {};
    characteristics[names[i].name].id = ids[i].id;
    characteristics[names[i].name].value = vals[i].value;
  }

  const metaObj = {
    product_id: productId,
    recommended: recommendedObj.rows[0].recommended,
    ratings: ratingsObj.rows[0].ratings,
    characteristics,
  };

  try {
    res.send(metaObj);
  } catch (err) {
    res.sendStatus(500);
  }
});

app.post('/reviews', async (req, res) => {
  const {
    productId,
    rating,
    summary,
    body,
    recommend,
    name,
    email,
    photos,
    characteristics,
    reviewId,
  } = req.body;

  const defaultDate = new Date();
  const formatDate = defaultDate.toISOString();
  const defaultReported = false;
  const defaultResponse = null;
  const defaultHelpfulness = 0;
  const urlStr = photos.join(', ');
  const charIdsArr = Object.keys(characteristics);
  const charValuesArr = Object.values(characteristics);

  const reviewStr = 'INSERT INTO reviews (product, rating, date, summary, body, recommend, reported, reviewer_name, reviewer_email, response, helpfulness) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)';

  const photosStr = 'INSERT INTO reviews_photos (url, review_id) VALUES ($1, $2)';

  let charIds;

  let charVals;

  charIdsArr.forEach(async (id) => {
    const idToNum = parseInt(id);

    const characteristicsIdStr = 'INSERT INTO characteristic_reviews (characteristic_id, review_id) VALUES ($1, $2)';

    charIds = await database.query(characteristicsIdStr, [idToNum, reviewId]);
  });

  charValuesArr.forEach(async (val) => {
    const characteristicsValStr = 'INSERT INTO characteristic_reviews (value, review_id) VALUES ($1, $2)';

    charVals = await database.query(characteristicsValStr, [val, reviewId]);
  });

  try {
    await database.query(reviewStr, [productId, rating, formatDate, summary, body, recommend, defaultReported, name, email, defaultResponse, defaultHelpfulness]);

    await database.query(photosStr, [urlStr, reviewId]);
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.put('/reviews/:review_id/helpful', (req, res) => {
  const reviewIdParam = req.params.review_id;

  const postgresStr = 'UPDATE reviews SET helpfulness = helpfulness + 1 WHERE reviews.review_id = $1';

  database.query(
    postgresStr, [reviewIdParam], (err, data) => {
      if (err) {
        res.sendStatus(500);
      } else {
        res.sendStatus(204);
      }
    },
  );
});

app.put('/reviews/:review_id/report', (req, res) => {
  const reviewIdParam = req.params.review_id;

  const postgresStr = 'UPDATE reviews SET reported = true WHERE reviews.review_id = $1';

  database.query(
    postgresStr, [reviewIdParam], (err, data) => {
      if (err) {
        res.sendStatus(500);
      } else {
        res.sendStatus(204);
      }
    },
  );
});

app.listen(port, () => {
  console.log(`Reviews service listening at http://localhost:${port}`);
});
