CREATE TABLE IF NOT EXISTS product_id (
  id SERIAL PRIMARY KEY,
  product VARCHAR(6) NOT NULL,
  ratings JSONB,
  recommended JSONB
);

CREATE TABLE IF NOT EXISTS results (
  id SERIAL REFERENCES product_id (id),
  review_id INTEGER PRIMARY KEY NOT NULL,
  rating INTEGER,
  summary VARCHAR(50),
  recommended BOOLEAN,
  response VARCHAR(1000),
  body VARCHAR(1000),
  date TIMESTAMP,
  reviewer_name VARCHAR(25),
  helpfulness INTEGER,
  email VARCHAR(35),
  photos INTEGER,
  characteristics INTEGER,
  CONSTRAINT fk_all_photos
    FOREIGN KEY (review_id)
      REFERENCES photos_table (photo_id),
  CONSTRAINT fk_all_characteristics
    FOREIGN KEY (review_id)
      REFERENCES characteristics_table (characteristics_id)
);

CREATE TABLE IF NOT EXISTS characteristics_table (
  id INTEGER REFERENCES product_id,
  review_id INTEGER REFERENCES results,
  characteristics_name VARCHAR(7),
  characteristics_id INTEGER,
  value VARCHAR(18)
);

CREATE TABLE IF NOT EXISTS photos_table (
  review_id INTEGER REFERENCES results,
  photo_id INTEGER,
  url VARCHAR(100)
);