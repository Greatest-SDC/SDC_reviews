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
  host: 'ec2-54-212-7-107.us-west-2.compute.amazonaws.com',
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
