const { Client } = require('pg');

// const client = new Client({
//   user: 'adamwhitman',
//   host: 'localhost',
//   // host: 'host.docker.internal',
//   database: 'sdcreviews',
//   port: 5432,
// });

const client = new Client({
  user: 'adamwhitman',
  host: '34.222.144.23',
  database: 'postgres',
  password: 'Freemind4@',
  port: 5432,
});

client.connect((err) => {
  if (err) {
    console.log(err);
  } else {
    console.log('Connected to PostgreSQL Database');
  }
});

module.exports = client;
