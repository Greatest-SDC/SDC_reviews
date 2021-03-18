const { Client } = require('pg');

const client = new Client({
  user: adamwhitman,
  host: localhost,
  database: sdcreviews,
  port: 5432,
})

client.connect();

client.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.log(err);
  } else {
    console.log('Connected to PostgreSQL Database')
  }
});

module.exports = client;