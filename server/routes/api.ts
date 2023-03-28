//var express = require('express');
import express, { Express, Request, Response, NextFunction } from 'express';
import nodeUtil from 'util'; //node's util
import logger from '../util/logger';
import * as Security from '../shared/services/security';
import { secrets } from "docker-secret";
import couchAuth from './couchauth';
import * as CouchAuthTypes from '@perfood/couch-auth/lib/types/typings';
import { cloneDeep, isEqual } from 'lodash';
import * as Nano from 'nano';
import type * as T from '../shared/types/characterTypes'; //= //not included in runtime buildo
import type { ApiResponse } from '../shared/types/utilTypes'; //= 
import * as util from '../shared/services/util';
import * as colUtil from '../shared/services/columnUtil';
import * as metaDefs from '../shared/constants/metaDefs';
import * as merging from '../shared/services/merging';
import CompileConstants from '../shared/constants/CompileConstants';
import nodeTest from 'node:test';

const DesignDocValidator = require('../schema/DesignDoc-validator').default;
const ChangeDocValidator = require('../schema/ChangeDocServer-validator').default;

const router = express.Router();
const admin = secrets.couch_admin;
const password = secrets.couch_password;
const adminNano = Nano.default(`http://${admin}:${password}@`+process.env.COUCHDB_URL); //can configure http pool size, by default has infinite active connections
const testUser = 'joesmith2';

function getSuccessObject(message: string, code: number = 200): ApiResponse {
  return {message: message, status: code};
}
function sendSuccess(res: Response, message: string, code: number = 200): Response<ApiResponse> {
  return res.status(code).json(getSuccessObject(message, code));
}
function getErrorObject(message: string, code: number = 500): ApiResponse {
  return {message: message, status: code};
}
function sendError(res: Response, message: string, code: number = 500): Response<ApiResponse> {
  // Pouchdb error obj has name, error, message, and reason fields
  logger.warn(`${code} error: ${message}`);
  return res.status(code).json(getSuccessObject(message, code));
}

//Could make it so any route with a :game match attaches the nano db obj to the request, but it's not really saving anything
//Would also have to extend the Request type like so https://blog.logrocket.com/extend-express-request-object-typescript/
//router.param('game', function(req: Request, res: Response, next: NextFunction, gameId: string) {
  //try {
    //const db = adminNano.use(req.params.gameId);
    //req.db = db;
    //next();
  //}
  //catch (err) {
    //sendError(res, `Error using db ${gameId}, ${err}`);
  //}
//});

function needsPermissions(perms: Security.PermissionLevel) {
  //TODO: debug occasional empty responses w/ "failed to fetch" message. 
  return async function(req: Request, res: Response, next: NextFunction) { //actual middleware
    try {
      const db = adminNano.use(req.params.gameId);
      const sec = await db.get("_security") as Security.SecObj;
      console.log("Need perms "+perms+", authInfo "+nodeUtil.inspect(req.authInfo)+", -------------- HEADERINOS "+req.headers.authorization);
      if(req.headers.authorization?.startsWith('Bearer ')) {
        console.log("U liek SL? ogey");
        couchAuth.requireAuth(req, res, () => { //this is the next() function I'm giving to couchAuth that it calls upon success
          //Don't think there's any need for couchAuth.requireRole('user'), requireAuth only works with SL users
          const user: CouchAuthTypes.SlRequestUser = req.user!;
          console.log("I guess ur legit?? You am "+JSON.stringify(user));
          let hasPerms = Security.userHasPerms({secObj: sec, currentUser: user._id, roles: user.roles}, perms);
          console.log(`You am ${perms}? It be ${hasPerms}`);
          if(hasPerms) {
            next(); //I let the chain progress
          }
          else {
            return sendError(res, "Not logged in as user with permissions "+perms, 403);
          }
        }); //if couchAuth.requireAuth() rejects, it sets res to 401 and doesn't call next.
      }
      else {
        console.log("hello PUBLIC");
        let hasPerms = Security.userHasPerms({secObj: sec, currentUser: 'public'}, perms);
        console.log(`You am ${perms}? It be ${hasPerms}`);
        if(hasPerms) {
          next();
        }
        else {
          return sendError(res, "Non-users require permissions "+perms+" for endpoint "+req.url, 403);
        }
      }
    }
    catch(err) {
      return sendError(res, `Authorization error, ${err}`);
    }
  }
}

// If this request went through couchAuth authentication, it attached user to request object. If no user, request was made as public.
function getUser(req: Request): CouchAuthTypes.SlRequestUser | undefined {
  return req.user;
}


router.put(CompileConstants.API_UPLOAD_CONFIG_MATCH, needsPermissions("GameAdmin"), //couchAuth.requireAuth, couchAuth.requireRole("user") as any,
           async (req: Request<{gameId:string}>, res) => {
  try {
    //const user: CouchAuthTypes.SlRequestUser = req.user!;
    const db = adminNano.use(req.params.gameId);
    //const sec = await db.get("_security") as Security.SecObj;
    //const isGameAdmin = Security.userIsGameAdminOrHigher(user._id, user.roles, sec);
    //if(!isGameAdmin) return sendError(res, "Game Admin permissions required to change game config", 403); 

    const newDesignDoc: T.DesignDoc = req.body;
    if(newDesignDoc._id !== '_design/columns') {
      return sendError(res, `Incorrect _id ${newDesignDoc._id}`, 400);
    }

    //repair mandatory columns, ensure group sorting
    //remember that clients may have outdated versions of mandatory cols, so just repair w/o error
    colUtil.insertDefsSortGroupsCompileRegexes(newDesignDoc.universalPropDefs, true, false, false);
    colUtil.insertDefsSortGroupsCompileRegexes(newDesignDoc.columnDefs, false, false, false);
    logger.info(JSON.stringify(newDesignDoc.universalPropDefs));


    //Cannot have {key: undefined} since undefined not valid json, key gets stripped by pouch
    //check type errors
    let typeValidationResult = DesignDocValidator(newDesignDoc);
    if(typeValidationResult) {
      logger.info('Type validation successful');
    }
    else {
      logger.warn('Validation result: '+JSON.stringify(DesignDocValidator.errors)+' for design doc '+JSON.stringify(newDesignDoc.universalPropDefs));
      return sendError(res, "Type validation failed", 400);
    }
    //trim whitespace in strings, remove unused properties, then check validation errors
    const err = metaDefs.getDesignDocErrorMessageAndClean(newDesignDoc);
    if(err) {
      return sendError(res, err, 400);
    }

    try {
      const putResult = await db.insert(newDesignDoc); 
    }
    catch(err: any) {
      return sendError(res, "Error inserting document: " + err, err.statusCode);
    }
    return sendSuccess(res, JSON.stringify(newDesignDoc));
  }
  catch(err) {
    return sendError(res, `Server Error to ${req.url}, ${err}`);
  }
});


router.put(CompileConstants.API_UPLOAD_CHANGE_MATCH, needsPermissions("Uploader"),
           async (req: Request<{gameId:string, characterId:string, changeTitle:string}>, res) => {
  let error = await uploadChange(req);
  if(error) sendError(res, error.message, error.status);
  else sendSuccess(res, "Changes uploaded, someone with editor permissions must publish these changes.");
});

async function uploadChange(req: Request<{gameId:string, characterId:string, changeTitle:string}>): Promise<false | ApiResponse> {
  try {
    const {gameId, characterId, changeTitle} = req.params;
    const db = adminNano.use(gameId);

    const changeDoc: T.ChangeDocServer = req.body;

    //trim strings, fix keys for added/deleted moves
    util.sanitizeChangeDoc(changeDoc);

    //type validation
    //changeDoc.moveChanges!.AA = {'not-a-real-col': {type: 'modify', new: 69, old: 420}}; //rejected by inversion check
    //changeDoc.moveChanges!.AA = {'not-a-real-col': {type: 'delete', old: 420}}; //rejected by inversion check
    //changeDoc.moveChanges!.AA!.height = {type: 'add', new: 'bad add already there  '}; //rejected by inversion check
    //changeDoc.universalPropChanges!.Age = {type: 'delete', old: ' fake old donut match '}; //rejected by inversion check
    //changeDoc.universalPropChanges!.moveOrder = {type: 'modify', old: [], new: [{name:'fail'}]}; //fails
    //let failDoc = changeDoc as any;
    //failDoc.moveChanges = {crummyMove: {moveOrder: {type: 'modify', new: [{name: '  trim'}], old:[]}}}; //fails
    //failDoc.universalPropChanges = {moveName: {type: 'add', new: 'testo '}, madeUpListField: {type:'add', new: [' trim ', 'b']}}; //fails
    //failDoc.hoopla = 'banan'; //caught with --noExtraProps
    //failDoc.moveChanges[0] = 'poop'; //caught
    let typeValidationResult = ChangeDocValidator(changeDoc);
    if(typeValidationResult) {
      logger.info('Type validation successful');
    }
    else {
      logger.warn("Type validation errors "+JSON.stringify(ChangeDocValidator.errors));
      logger.info("In changeDoc "+JSON.stringify(changeDoc));
      return getErrorObject(`Type validation failed. Error in ${ChangeDocValidator?.errors?.[0]?.instancePath}, ${ChangeDocValidator?.errors?.[0]?.message}`, 400);
    }

    //make sure changeDoc actually has changes
    if(!changeDoc.moveChanges && !changeDoc.universalPropChanges) {
      return getErrorObject("Change list has no changes", 400);
    }

    //fetch doc, make sure changeDoc's baseRevision matches
    const charDoc = await db.get('character/' + characterId) as T.CharDocWithMeta;
    if(changeDoc.baseRevision !== charDoc._rev) {
      return getErrorObject(`Changes based on outdated character document ${changeDoc.baseRevision}, latest is ${charDoc._rev}, please refresh and update`, 409);
    }

    //create new document that reflects submitted changes, for testing
    const newCharDoc = cloneDeep<T.CharDocWithMeta>(charDoc);
    merging.applyChangeDoc(newCharDoc, changeDoc);

    //if moveOrder changed, make sure it matches moves in new charDoc. *Modifies changeDoc and newCharDoc*
    let fixedMoveOrder = merging.getRepairedChangedMoveOrder(newCharDoc, changeDoc);
    if(fixedMoveOrder && changeDoc.universalPropChanges?.moveOrder) {
      logger.warn("Repairing moveOrder. Before >> \n" + JSON.stringify(changeDoc.universalPropChanges.moveOrder.new));
      changeDoc.universalPropChanges!.moveOrder = {type: 'modify', old: changeDoc.universalPropChanges.moveOrder.old, new: fixedMoveOrder};
      newCharDoc.universalProps.moveOrder = fixedMoveOrder;
      logger.warn("After >> \n" + JSON.stringify(fixedMoveOrder));
    }

    //make sure updated doc passes validation (which includes moveName checks)
    const designDoc = await db.get('_design/columns') as T.DesignDoc;
    const errors = colUtil.getCharDocErrors(newCharDoc, designDoc);
    if(errors) {
      return getErrorObject("Errors validating, "+JSON.stringify(errors), 400);
    }

    //then apply inverse change to document and make sure it matches. Remember isEqual doesn't care about object key order.
    //TODO: test carefully, this could stop people from uploading changes
    let invertedChanges = cloneDeep<T.ChangeDocServer>(changeDoc);
    merging.invertChangeDoc(invertedChanges, false);
    merging.applyChangeDoc(newCharDoc, invertedChanges);
    if(!isEqual(charDoc, newCharDoc)) {
      const diffString = util.recursiveCompare('', charDoc, newCharDoc);
      logger.info("Before >> "+JSON.stringify(charDoc));
      logger.info("After >> "+JSON.stringify(newCharDoc));
      return getErrorObject("charDoc is not same after changes are applied then unapplied. Differences >> "+diffString);
    }

    //set _id, createdAd, createdBy, check prevChange
    const uploadDoc = changeDoc as T.ChangeDocWithMeta;
    uploadDoc._id = util.getChangeId(characterId, changeTitle);
    uploadDoc.createdAt = util.getDateString();
    uploadDoc.createdBy = getUser(req)?._id ?? 'public';

    if(uploadDoc.previousChange !== charDoc.changeHistory.at(-1)) {
      logger.warn(`Submitted uploadDoc's previousChange ${uploadDoc.previousChange} doesn't match charDoc's last history item ${charDoc.changeHistory.at(-1)}, repairing`) //`
      uploadDoc.previousChange = charDoc.changeHistory.at(-1);
    }

    //finally upload changeDoc
    try {
      //logger.info("TESTING, not actually inserting");
      await db.insert(uploadDoc); 
    }
    catch(err: any) {
      return getErrorObject("Error inserting document, " + err, err.statusCode);
    }
    //return getSuccessResponse("Changes uploaded, someone with editor permissions must publish these changes.");
    return false;
  }
  catch(err) {
    return getErrorObject(`Server Error uploading change, ${err}`);
  }
}

//router.post(CompileConstants.API_PUBLISH_CHANGE_MATCH_PUBLIC, 
           //async (req: Request<{gameId:string, characterId:string, changeTitle:string}>, res) => {
  //let error = await publishChange(req, false);
  //if(error) sendError(res, error.message, error.status);
  //else sendSuccess(res, "Changes published!");
//});

router.put(CompileConstants.API_PUBLISH_CHANGE_MATCH, needsPermissions("Editor"),
           async (req: Request<{gameId:string, characterId:string, changeTitle:string}>, res) => {
  let error = await publishChange(req, false);
  if(error) sendError(res, error.message, error.status);
  else sendSuccess(res, "Changes published!");
});

//If justUploaded, can skip error checking on changeDoc
async function publishChange(req: Request<{gameId:string, characterId:string, changeTitle:string}>, justUploaded: boolean): Promise<false | ApiResponse> {
  try {
    const {gameId, characterId, changeTitle} = req.params;
    const db = adminNano.use(gameId);

    //fetch specified changeList
    const changeDoc = await db.get(`character/${characterId}/changes/${changeTitle}`) as T.ChangeDocServer & Nano.DocumentGetResponse;
    //fetch current charDoc
    const charDoc = await db.get('character/' + characterId) as T.CharDocWithMeta;
    //verify changeList's prevChange and baseRevision
    const lastHistoryItem = charDoc.changeHistory.at(-1);
    const prevChange = changeDoc.previousChange;
    if(charDoc._rev !== changeDoc.baseRevision) {
      return getErrorObject(`Outdated change: listed base revision ${changeDoc.baseRevision} does not match current revision, ${charDoc._rev}. Try importing the change.`, 409);
    }
    if(charDoc.changeHistory.length > 0) {
      if(prevChange !== lastHistoryItem) {
        return getErrorObject(`Outdated change: listed previous change ${prevChange} does not match final item of document's change history, ${lastHistoryItem}. Try importing the change.`, 409);
      }
      if(charDoc.changeHistory.includes(changeTitle)) {
        //TODO: test
        return getErrorObject(`Duplicate change: change ${changeTitle} has already been published. You can import and upload it as a new change.`, 409);
      }
    }
    else { // this is the first change
      if(prevChange) {
        return getErrorObject(`Malformed change: listed previous change ${prevChange} does not match, since document has not yet been changed`, 400);
      }
    }

    //apply changeList to charDoc
    merging.applyChangeDoc(charDoc, changeDoc);

    //make sure updated doc passes validation
    if(!justUploaded) {
      const designDoc = await db.get('_design/columns') as T.DesignDoc;
      const errors = colUtil.getCharDocErrors(charDoc, designDoc);
      if(errors) {
        return getErrorObject("Errors validating, "+JSON.stringify(errors), 400);
      }
    }

    //write charDoc w metadata
    charDoc.changeHistory.push(changeTitle);
    charDoc.updatedAt = util.getDateString();
    charDoc.updatedBy = changeDoc.createdBy; //TODO: should this be the editor who published instead of whoever uploaded the change?
    charDoc.charName = characterId; //make sure they always match

    try {
      //logger.info("TESTING, not actually updating");
      const putResult = await db.insert(charDoc); 
    }
    catch(err: any) {
      return getErrorObject("Error inserting document, " + err, err.statusCode);
    }
    return false;
  }
  catch(err) {
    return getErrorObject(`Server Error uploading change, ${err}`);
  }
}


router.put(CompileConstants.API_UPLOAD_AND_PUBLISH_CHANGE_MATCH, needsPermissions("Editor"), 
           async (req: Request<{gameId:string, characterId:string, changeTitle:string}>, res) => {
  logger.info("Uploading and publishing");
  //upload
  let uploadError = await uploadChange(req);
  if(uploadError) return sendError(res, uploadError.message, uploadError.status);
  logger.info("Uploaded successfully");

  //publish
  let publishError = await publishChange(req, true);
  //TODO: return different error nesting this one, so client knows upload succeeded but publish failed?
  //It's more RESTful to keep upload and publish as two separate api calls and let client invoke both tbh.
  if(publishError) return sendError(res, publishError.message, publishError.status);
  else sendSuccess(res, "Changes published!");
});



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

//function sleep(ms: number) {
    //return new Promise(resolve => setTimeout(resolve, ms));
//}

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
