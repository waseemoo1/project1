const winston = require('winston');
const mongoose = require("mongoose");
const config = require('config');


const db = config.get('db');
mongoose
  .connect(db, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log(`Connected to MongoDB ${db}...`));
