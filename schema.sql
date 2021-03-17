DROP TABLE products;
DROP TABLE reviews;
DROP TABLE characteristics;
DROP TABLE reviews_photos;

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  product VARCHAR(6) NOT NULL,
  ratings JSONB,
  recommended JSONB
);

CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  product_id INTEGER,
  FOREIGN KEY (product_id) REFERENCES products (id),
  review_id INTEGER,
  rating INTEGER,
  summary VARCHAR(50),
  recommended BOOLEAN,
  response VARCHAR(1000),
  body VARCHAR(1000),
  date TIMESTAMP,
  reviewer_name VARCHAR(25),
  helpfulness INTEGER
);

CREATE TABLE characteristics (
  id SERIAL PRIMARY KEY,
  product_id INTEGER,
  FOREIGN KEY (product_id) REFERENCES products (id),
  characteristics_name VARCHAR(7),
  characteristics_id INTEGER,
  value VARCHAR(18)
);

CREATE TABLE reviews_photos (
  id SERIAL PRIMARY KEY,
  review_id INTEGER,
  FOREIGN KEY (review_id) REFERENCES reviews (id),
  photo_id INTEGER,
  url VARCHAR(100)
);