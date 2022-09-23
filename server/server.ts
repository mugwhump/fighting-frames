import express, { Express, Request, Response } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
//const logger = require('morgan'); //this one sucks

import bodyParser from 'body-parser';
import cors from 'cors';

import indexRouter from './routes/index';
import apiRouter from './routes/api';
//const superlogin = require('./routes/superlogin');
import couchAuth from './routes/couchauth';
import logger from './util/logger';

const app: Express = express();

//app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json());
app.use(cors());

app.use('/', indexRouter);
app.use('/api', apiRouter);
app.use('/auth', couchAuth.router);

const config = {
  name: 'ff-server',
  port: 3000,
  host: '0.0.0.0',
};

app.listen(config.port, config.host, ()=> {
  logger.info(`*glomp* uwu ${config.name} running on ${config.host}:${config.port}`);
});

//TODO: run superlogin.removeExpiredKeys() every interval to remove expired sessions from _users

module.exports = app;
