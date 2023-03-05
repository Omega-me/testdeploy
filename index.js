/* eslint-disable no-unused-vars */
/* eslint-disable no-console */

'use-strict';

require('dotenv').config();
const mongoose = require('mongoose');

process.on('uncaughtException', (err) => {
  console.log(
    'Uncaught Exception! >>>>> Shooting down...',
    '\n',
    err.name,
    '-',
    err.message
  );
  process.exit(1);
});

const app = require('./app');

// connect to dhe mongodb db
const DB = process.env.MONGO_CONECTION_STRING.replace(
  '<PASSWORD>',
  process.env.MONGO_PASSWORD
);

const options = {
  autoIndex: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
};

mongoose.set('strictQuery', true);
mongoose
  .connect(DB, options)
  .then((con) => {
    console.log('connected to the db');
  })
  .catch((err) => console.error(err.name, '-', err.message, '\n', err));

const PORT = process.env.PORT || 3333;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}...`);
});

process.on('unhandledRejection', (err) => {
  console.log(
    'Unhandled Rejection! >>>>> Shooting down...',
    '\n',
    err.name,
    '-',
    err.message
  );
  server.close(() => {
    // 0 stands for success, 1 stands for unhandled rejection
    process.exit(1);
  });
});
