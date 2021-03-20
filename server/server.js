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

// const uniqueQualityIdFunc = async (ids, callback) => {
//   const idArr = ids.rows;

//   let values;

//   try {
//     for (let i = 0; i < idArr.length; i++) {
//       const avgCalcString = `SELECT AVG(value) AS "value" FROM characteristic_reviews WHERE characteristic_reviews.characteristic_id = ${idArr[i]}`;
//       values = await database.query(avgCalcString);
//     }
//   } catch (err) {
//     console.log(err.stack);
//   }

//   callback(null, values);
// };

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

//============================================================

// This builds an object with the names, ids, and values of the characteristics tied to the product id
// SELECT
//   characteristics.name, characteristics.id, characteristic_reviews.value
// FROM characteristics, characteristic_reviews
// WHERE characteristics.product_id = ${num} AND characteristic_reviews.characteristic_id = characteristics.id

// This creates average value for characteristics.quality.value
// `SELECT AVG(value) AS "value" FROM characteristic_reviews`
// 'SELECT AVG(value) AS "value" FROM characteristic_reviews, characteristics WHERE characteristic_reviews.characteristic_id = characteristics.id AND characteristics.product_id = $1'

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

  const recommendedObj = await database.query(recommendStr, [productId]);
  const ratingsObj = await database.query(ratingString, [productId]);
  const characteristicNames = await database.query(characterNamesString, [productId]);
  const characterisiticUniqueIds = await database.query(charUniqueIdString, [productId]);

  const names = characteristicNames.rows;
  const ids = characterisiticUniqueIds.rows;

  const characteristics = {};

  for (let i = 0; i < names.length; i++) {
    characteristics[names[i].name] = {};
    characteristics[names[i].name].id = ids[i].id;
    characteristics[names[i].name].value = 0;
  }

  // let valuesArr;

  // ids.forEach((id) => {
  //   const avgCalcString = `SELECT AVG(value) AS "value" FROM characteristic_reviews WHERE characteristic_reviews.characteristic_id = ${id}`;

  //   database.query(
  //     avgCalcString, (err, data) => {
  //       if (err) {
  //         res.sendStatus(500);
  //       } else {
  //         res.send(metaObj);
  //       }
  //     },
  //   );
  // });

  // valuesArr(ids, (err, data) => {

  //   if (err) {
  //     res.sendStatus(500);
  //   } else {
  //     const metaObj = {
  //       product_id: productId,
  //       recommended: recommendedObj.rows[0].recommended,
  //       ratings: ratingsObj.rows[0].ratings,
  //       characteristics,
  //     };
  //     res.send(metaObj);
  //   }
  // });
});

//=============================================================

app.post('/reviews', (req, res) => {
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
  } = req.body.reviewObj;
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

  const reviewStr = 'INTERT INTO reviews (rating, summary, body, recommend, reviewer_name, reviewer_email) VALUES ($2, $3, $4, $5, $6, $7) WHERE reviews.review_id = $1';

  database.query(
    reviewStr, [productId, rating, summary, body, recommend, name, email], (err, data) => {
      if (err) {
        res.sendStatus(500);
      } else {
        res.sendStatus(201);
      }
    },
  );

  const photosStr = `INSERT INTO reviews_photos (url) VALUES ($9) WHERE reviews_photos.review_id = $10`;

  const urlStr = photos.join(', ');

  database.query(
    photosStr, [urlStr, reviewId], (err, data) => {
      if (err) {
        res.sendStatus(500);
      } else {
        res.sendStatus(201);
      }
    },
  );

  const charIdsArr = parseInt(Object.keys(characteristics)); //$11
  const charValuesArr = Object.values(characteristics); //$12

  charIdsArr.forEach((id) => {
    const characteristicsIdStr = 'INSERT INTO characteristic_reviews (characteristic_id) VALUES ($11) WHERE characteristic_reviews.review_id = $10';

    database.query(
      characteristicsIdStr, [id, reviewId], (err, data) => {
        if (err) {
          res.sendStatus(500);
        } else {
          res.sendStatus(201);
        }
      },
    );
  });

  charValuesArr.forEach((val) => {
    const characteristicsValStr = 'INSERT INTO characteristic_reviews (value) VALUES ($12) WHERE characteristic_reviews.review_id = $10';

    database.query(
      characteristicsValStr, [val, reviewId], (err, data) => {
        if (err) {
          res.sendStatus(500);
        } else {
          res.sendStatus(201);
        }
      },
    );
  });
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
