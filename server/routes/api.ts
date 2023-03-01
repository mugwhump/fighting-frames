//var express = require('express');
import express, { Express, Request, Response } from 'express';
import nodeUtil from 'util'; //node's util
import logger from '../util/logger';
import * as Security from '../util/security';
import { secrets } from "docker-secret";
import couchAuth from './couchauth';
import * as CouchAuthTypes from '@perfood/couch-auth/lib/types/typings';
//const nano = require('nano')(`http://${admin}:${password}@`+process.env.COUCHDB_URL); //TODO: put inside each API call?
import { cloneDeep, isEqual } from 'lodash';
import * as Nano from 'nano';
//import * as T from '@app/types/characterTypes';
//import * as util from '@app/services/util';
//import * as merging from '@app/services/merging';
import type * as T from '../shared/types/characterTypes'; //= //not included in runtime buildo
import * as util from '../shared/services/util';
import * as colUtil from '../shared/services/columnUtil';
import * as metaDefs from '../shared/constants/metaDefs';
import * as merging from '../shared/services/merging';

const DesignDocValidator = require('../schema/DesignDoc-validator').default;

const router = express.Router();
const admin = secrets.couch_admin;
const password = secrets.couch_password;
const adminNano = Nano.default(`http://${admin}:${password}@`+process.env.COUCHDB_URL); //can configure http pool size, by default has infinite active connections
const testUser = 'joesmith2';

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


function sendSuccess(res: Response, message: string, code: number = 200) {
  return res.status(code).json({message: message, status: code});
}
function sendError(res: Response, message: string, code: number = 500) {
  // Pouchdb error obj has name, error, message, and reason fields
  logger.warn(`${code} error: ${message}`);
  return res.status(code).json({message: message, status: code});
}

router.post('/game/:gameId/config/publish', couchAuth.requireAuth, couchAuth.requireRole("user") as any,
           async (req: Request<{gameId:string}>, res) => {
  try {
    logger.warn(`startin da tangy`);
    const user: CouchAuthTypes.SlRequestUser = req.user!;
    const db = adminNano.use(req.params.gameId);
    const sec = await db.get("_security") as Security.SecObj;
    const isGameAdmin = Security.userIsGameAdminOrHigher(user, sec);
    if(!isGameAdmin) return sendError(res, "Game Admin permissions required to change game config", 403); 

    const newDesignDoc: T.DesignDoc = req.body;
    if(newDesignDoc._id !== '_design/columns') {
      return sendError(res, `Incorrect _id ${newDesignDoc._id}`, 400);
    }
    //repair mandatory columns, ensure group sorting
    colUtil.insertDefsSortGroupsCompileRegexes(newDesignDoc.universalPropDefs, true, false, false);
    colUtil.insertDefsSortGroupsCompileRegexes(newDesignDoc.columnDefs, false, false, false);

    //TODO: check errors
    let typeValidationResult = DesignDocValidator(newDesignDoc);
    if(typeValidationResult) {
      logger.info('Type validation successful');
    }
    else {
      logger.warn('Validation result: '+JSON.stringify(typeValidationResult));
      return sendError(res, "Type validation failed", 400);
    }
    const error = metaDefs.getDesignDocErrorMessage(newDesignDoc);
    if(error) {
      return sendError(res, error, 400);
    }

    //TODO: remove useless columns
    try {
      const putResult = await db.insert(newDesignDoc); 
    }
    catch(err: any) {
      return sendError(res, err.reason ?? JSON.stringify(err), err.statusCode);
    }
    return sendSuccess(res, JSON.stringify(newDesignDoc));
  }
  catch(err) {
    return sendError(res, JSON.stringify(err));
  }
});

// Couchauth middleware verifies user is who they say they are. If not, rejects with 401.
router.post('/game/:gameId/character/:characterId/changes/:changeTitle/publish', couchAuth.requireAuth, couchAuth.requireRole("user") as any,
           async (req: Request<{gameId:string, characterId:string, changeTitle:string}>, res) => {
  try {
    const {gameId, characterId, changeTitle} = req.params;
    const user: CouchAuthTypes.SlRequestUser = req.user!;
    const db = adminNano.use(req.params.gameId);
    const sec = await db.get("_security") as Security.SecObj;
    const isWriter = Security.userIsWriterOrHigher(user, sec);
    //if(!isWriter) return res.status(403).send("Write permissions required to publish changes"); 
    if(!isWriter) return sendError(res, "Write permissions required to publish changes", 403); 

    //fetch specified changeList
    const changeList = await db.get(`character/${characterId}/changes/${changeTitle}`) as T.ChangeDocServer & Nano.DocumentGetResponse;
    //fetch current charDoc
    const charDoc = await db.get('character/' + characterId) as T.CharDocWithMeta;
    //verify changeList's prevChange and baseRevision
    const lastHistoryItem = charDoc.changeHistory.at(-1);
    const prevChange = changeList.previousChange;
    if(charDoc._rev !== changeList.baseRevision) {
      return sendError(res, `Outdated change: listed base revision ${changeList.baseRevision} does not match current revision, ${charDoc._rev}. Try importing the change.`, 409);
    }
    if(charDoc.changeHistory.length > 0) {
      if(prevChange !== lastHistoryItem) {
        return sendError(res, `Outdated change: listed previous change ${prevChange} does not match final item of document's change history, ${lastHistoryItem}. Try importing the change.`, 409);
      }
      if(charDoc.changeHistory.includes(changeTitle)) {
        //TODO: test
        return sendError(res, `Duplicate change: change ${changeTitle} has already been published. You can import and upload it as a new change.`, 409);
      }
    }
    else { // this is the first change
      if(prevChange) {
        return sendError(res, `Malformed change: listed previous change ${prevChange} does not match, since document has not yet been changed`, 400);
      }
    }
    //apply changeList to charDoc
    if(changeList.universalPropChanges) {
      //let newProps = applyAndCheckChanges("universalProps", changeList.universalPropChanges, charDoc.universalProps);
      let changedProps = merging.getChangedCols(charDoc.universalProps, changeList.universalPropChanges);
      charDoc.universalProps = changedProps as T.PropCols;
    }
    else {
      if(!changeList.moveChanges) {
        return sendError(res, "Change list has no changes", 400);
      }
    }
    if(changeList.moveChanges) {
      for(const [moveName, moveChanges] of util.keyVals(changeList.moveChanges)) {
        if(!moveChanges) {
          logger.warn(`move ${moveName} in ${JSON.stringify(req.params)} has key but no value`);
          continue;
        }
        let changedMove = merging.getChangedCols(charDoc.moves[moveName], moveChanges, true) as T.MoveCols;
        charDoc.moves[moveName] = changedMove;
        if(Object.keys(changedMove).length === 0) {
          delete charDoc.moves[moveName];
        }
      }
    }
    //write charDoc w metadata
    charDoc.changeHistory.push(changeTitle);
    charDoc.updatedAt = (new Date()).toString();
    charDoc.updatedBy = changeList.createdBy;
    const putResult = await db.insert(charDoc); 
    //possibly update changeList w/ published status? But a single pass/fail write operation does make it more atomic.

    return sendSuccess(res, "Successfully published change!");
  }
  catch(err) {
    sendError(res, JSON.stringify(err));
  }
});

//TODO: validate changeList old values
//throws error if no match
//function applyAndCheckChanges<C extends T.ColumnData>(moveName: string, changes: T.GetChangesType<C>, baseValues?: Readonly<T.Cols>): T.Cols<C> {
  //for(const colName in changes) {
    //const change = changes[colName];
    //const baseVal = baseValues?.[colName];
    //if(!change) {
      //logger.warn(`key ${colName} in ${moveName} missing value`);
      //continue;
    //}
    //if(change.type !== "add") {
      //if(change.old !== baseVal) {
      //}
    //}
  //}
//}

router.get('/list', function(req, res, next) {
  adminNano.db.list().then((dblist) => {
    res.send('list = '+nodeUtil.inspect(dblist));
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
  logger.info('finna create! protocol=' + nodeUtil.inspect(req.protocol) + ', host=' + nodeUtil.inspect(req.headers.host));
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

//function getSlBearerCreds(authString: string): [string, string] {
  //let res = authString.replace("Bearer ", "").split(":");
  //return [res[0], res[1]];
//}

/* GET api listing. */
//router.get('/', function(req, res, next) {
  //res.send('COUCHDB_URL = '+process.env.COUCHDB_URL+', secrets = '+admin+', '+password);
//});
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

export default router;
