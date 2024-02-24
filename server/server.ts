import express, { Express, Request, Response } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
//const logger = require('morgan'); //this one sucks

//import bodyParser from 'body-parser'; //bundled now
import cors from 'cors';
//import events from 'events';

import indexRouter from './routes/index';
import apiRouter from './routes/api';
//const superlogin = require('./routes/superlogin');
import couchAuth from './routes/couchauth';
import { SlUserDoc } from '@perfood/couch-auth/lib/types/typings';
import logger from './util/logger';

const app: Express = express();
//const emitter = new events.EventEmitter();

//app.use(logger('dev'));
app.use(express.json()); //access json docs in application/json requests via req.body
app.use(express.urlencoded({ extended: false })); //access url query params as object props via req.body. If extended, objects+arrays can be encoded
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors());

//import nodeUtil from 'util'; //node's util
//logger.info("ENV vars: " + nodeUtil.inspect(process.env));
//import * as Nano from 'nano';
//const adminNano = Nano.default(`http://admin:password@`+process.env.COUCHDB_URL); 
//const testfunc = async () => {
  //let allDBs = await adminNano.db.list();
  //logger.info("deebs = " + nodeUtil.inspect(allDBs));
//}
//testfunc();

app.use('/', indexRouter);
app.use('/api/v1', apiRouter);
app.use('/auth', couchAuth.router);

const config = {
  name: 'ff-server',
  port: 3000,
  host: '0.0.0.0',
};

//imports, require statements, top-level variables etc are run once when server starts and persist between requests.
app.listen(config.port, config.host, ()=> {
  logger.info(`*glomp* uwu ${config.name} running on ${config.host}:${config.port}`);
});

//Run every 20m to remove expired sessions from _users
setInterval(() => {
  couchAuth.removeExpiredKeys().then((removedThings) => {
    logger.info("Cleaned up expired sessions: " + removedThings.join(', '));
  });
}, 1200000);

//If confirmation emails fail to send, delete the user so they can try to register again.
couchAuth.emitter.on('confirmation-email-error', function(userDoc: SlUserDoc) {
  logger.error("Confirmation email did not send, deleting user. userDoc: " + JSON.stringify(userDoc));
  const userEmail = userDoc.unverifiedEmail?.email;
  if(!!userEmail) {
    couchAuth.removeUser(userEmail, true, "Confirmation email did not send, deleting user");
  }
})

module.exports = app;
