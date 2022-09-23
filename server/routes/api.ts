//var express = require('express');
import express, { Express, Request, Response } from 'express';
import logger from '../util/logger';
import util from 'util'; //node's util
import { secrets } from "docker-secret";
import couchAuth from './couchauth';
//const nano = require('nano')(`http://${admin}:${password}@`+process.env.COUCHDB_URL); //TODO: put inside each API call?
import * as Nano from 'nano';

const router = express.Router();
const admin = secrets.couch_admin;
const password = secrets.couch_password;
const nano = Nano.default(`http://${admin}:${password}@`+process.env.COUCHDB_URL);
const testUser = 'joesmith2';

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/* GET api listing. */
router.get('/', function(req, res, next) {
  res.send('COUCHDB_URL = '+process.env.COUCHDB_URL+', secrets = '+admin+', '+password);
});
/*
router.get('/test', function(req, res, next) {
  couchAuth.passport.authenticate('local', function(err, user, info) {
    //logger.info('req = '+util.inspect(req));
    if(err) {
      logger.info('oh no');
      return next(err);
    }
    if(!user) {
      // Authentication failed
      logger.info('oh no no no, '+JSON.stringify(err)+JSON.stringify(user)+JSON.stringify(info));
      return res.status(401).json(info);
    }
    // Success
    req.logIn(user, {session: false}, function(err) {
      if (err) {
        logger.info('oh no no no no no, failed to login with ');
        return next(err);
      }
    });
    return next();
  })(req, res, next); //NOPE this req object doesn't contain any creds
  }, function(req, res, next) {
    // user.authenticate, but in codebase, /login first calls passport.authenticate. So not sure how to use the session made by createSession
    couchAuth.createSession(testUser, 'local', req).then((resp) => { 
      logger.info('resp = '+JSON.stringify(resp));
      //sleep(2000).then(() => {
      couchAuth.confirmSession(resp.token, 'bigsecret').then((confirmResp) => { //this does seem to just confirm the session, not a step to "activate" it
        logger.info('confirmResp = '+JSON.stringify(confirmResp));
        sessionNano = require('nano')({
          url:'http://'+process.env.COUCHDB_URL,
          headers: {
            //'Authorization': 'Bearer ' + resp.token + ':' + resp.password
            //'Content-Type': 'application/json',
            'Authorization': 'Basic ' + btoa(unescape(encodeURIComponent(resp.token + ':' + resp.password)))
          }
        });
        let sc6 = sessionNano.use('sc6');
        sc6.get('character/talim').then((talim) => {
          res.send('talim = '+util.inspect(talim));
        }).catch((err) => {
          res.send('Cannae get character with '+ resp.token + ':'+resp.password+', '+err.message);
        });
      }).catch((err) => {
        res.send('error confirming session, '+JSON.stringify(err));
      });
    }).catch((err) => {
      res.send('you made a booboo, '+err.message);
    });
  }
);
*/

router.get('/list', function(req, res, next) {
  nano.db.list().then((dblist) => {
    res.send('list = '+util.inspect(dblist));
  }).catch((err) => {
    res.send('you made a booboo, '+err.message);
  });
});

router.get('/cleanup', function(req, res, next) {
  couchAuth.removeExpiredKeys().then((resp) => {
    res.send('Removed keys = '+JSON.stringify(resp));
  }).catch((err) => {
    res.send('you made a booboo, '+err.message);
  });
});

router.get('/signup', function(req, res, next) {
  //logger.info('finna create!' + util.inspect(req));
  logger.info('finna create! protocol=' + util.inspect(req.protocol) + ', host=' + util.inspect(req.headers.host));
  couchAuth.createUser({
    "name": "Joe Smith",
    "username": testUser,
    "email": testUser+"@example.com",
    "password": "bigsecret",
    "confirmPassword": "bigsecret"
  }, req).then((created) => {
    logger.info('finna send!');
    res.send('created = '+JSON.stringify(created));
  }).catch((err) => {
    res.send('you made a creation booboo, '+err.message);
  });
});

router.get('/getjoe', function(req, res, next) {
  const joe = couchAuth.getUser(testUser).then((joe) => {
    res.send('joe = '+JSON.stringify(joe));
  }).catch((err) => {
    res.send('you made a booboo, '+err.message);
  });
});

router.get('/login', function(req, res, next) {
  couchAuth.createSession({login:testUser, provider:'local'}).then((resp) => {
  //couchAuth.createSession('public', 'local', req).then((resp) => { //only works with SL users, not regular users
    res.send('resp = '+JSON.stringify(resp));
  }).catch((err) => {
    res.send('you made a booboo, '+err.message);
  });
});

export default router;
