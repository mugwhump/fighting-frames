const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
//const logger = require('morgan'); //this one sucks

const bodyParser = require('body-parser');
const cors = require('cors');
const { log, ExpressAPILogMiddleware } = require('@rama41222/node-logger');

const indexRouter = require('./routes/index');
const apiRouter = require('./routes/api');

const app = express();

//app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json());
app.use(cors());

app.use('/', indexRouter);
app.use('/api', apiRouter);

const config = {
  name: 'ff-server',
  port: 3000,
  host: '0.0.0.0',
};

const logger = log({ console: true, file: false, label: config.name });

app.listen(config.port, config.host, (e)=> {
  if(e) {
    throw new Error('Internal Server Error');
  }
  logger.info(`*glomp* uwu ${config.name} running on ${config.host}:${config.port}`);
});

module.exports = app;
