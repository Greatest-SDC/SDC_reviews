DROP TABLE reviews;
DROP TABLE characteristics;
DROP TABLE characteristic_reviews;
DROP TABLE reviews_photos;

CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  product_id INTEGER,
  rating INTEGER,
  date TIMESTAMP,
  summary VARCHAR(50),
  body VARCHAR(1000),
  recommended BOOLEAN,
  reported BOOLEAN,
  reviewer_name VARCHAR(25),
  reviewer_email VARCHAR(35),
  response VARCHAR(1000),
  helpfulness INTEGER
);

CREATE TABLE characteristics (
  id SERIAL PRIMARY KEY,
  product_id INTEGER,
  FOREIGN KEY (product_id) REFERENCES reviews (product_id),
  name VARCHAR(7)
);

CREATE TABLE characteristic_reviews (
  id SERIAL PRIMARY KEY,
  characteristic_id INTEGER,
  FOREIGN KEY (characteristic_id) REFERENCES characteristics (id),
  review_id INTEGER,
  FOREIGN KEY (review_id) REFERENCES reviews (id),
  value VARCHAR(1)
);

CREATE TABLE reviews_photos (
  id SERIAL PRIMARY KEY,
  review_id INTEGER,
  FOREIGN KEY (review_id) REFERENCES reviews (id),
  url VARCHAR(100)
);