//var express = require('express');
import express, { Express, Request, Response, NextFunction } from 'express';
import nodeUtil from 'util'; //node's util
import logger from '../util/logger';
import * as Security from '../shared/services/security';
import { secrets } from "docker-secret";
import couchAuth from './couchauth';
import { adminNano, TypedRequest, getSuccessObject, sendSuccess, getErrorObject, sendError, needsPermissions, getUser } from '../util/expressUtil';
import * as CouchAuthTypes from '@perfood/couch-auth/lib/types/typings';
import { cloneDeep, isEqual } from 'lodash';
import * as Nano from 'nano';
import type * as T from '../shared/types/characterTypes'; //= //not included in runtime buildo
import type { ApiResponse, PublishChangeBody, CreateCharacterBody } from '../shared/types/utilTypes'; //= 
import * as intCols from '../shared/constants/internalColumns';
import * as colUtil from '../shared/services/columnUtil';
import * as util from '../shared/services/util';
import * as metaDefs from '../shared/constants/metaDefs';
import * as merging from '../shared/services/merging';
import CompileConstants from '../shared/constants/CompileConstants';

const DesignDocValidator = require('../schema/DesignDoc-validator').default;
const ChangeDocValidator = require('../schema/ChangeDocServer-validator').default;

const router = express.Router();
const testUser = 'joesmith2';

//TODO: make custom error handler for nonexistent endpoint or method, right now express returns html


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

//Returns 422 if submitted changes are based on an outdated character document
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
      return getErrorObject(`Type validation failed. Error in ${ChangeDocValidator?.errors?.[0]?.instancePath}, ${ChangeDocValidator?.errors?.[0]?.message}`, 400); //`
    }

    //make sure changeDoc actually has changes
    if(!changeDoc.moveChanges && !changeDoc.universalPropChanges) {
      return getErrorObject("Change list has no changes", 400);
    }

    //fetch doc, make sure changeDoc's baseRevision matches. Return 422 error otherwise to tell client to fetch new 
    const charDoc = await db.get(util.getCharDocId(characterId)) as T.CharDocWithMeta;
    if(changeDoc.baseRevision !== charDoc._rev) {
      return getErrorObject(`Changes based on outdated character document ${changeDoc.baseRevision}, latest is ${charDoc._rev}, please refresh and update`, 422);
    }

    //fetch config ddoc, insert builtin and mandatory defs for validation
    const designDoc = await db.get('_design/columns') as T.DesignDoc; //TODO: this won't include builtin/mandatory?
    designDoc.universalPropDefs = colUtil.insertDefsSortGroupsCompileRegexes(designDoc.universalPropDefs, true, true, false, false);
    designDoc.columnDefs = colUtil.insertDefsSortGroupsCompileRegexes(designDoc.columnDefs, false, true, false, false);

    logger.info("TESTING, ddoc prop defs used in validation are " + JSON.stringify(designDoc.universalPropDefs));

    //make sure changeDoc is well formed (which includes moveName checks)
    const changeDocErrors = util.validateChangeDoc(changeDoc, charDoc, designDoc);
    if(changeDocErrors) {
      return getErrorObject(`Errors in submitted changes: ${changeDocErrors.join('\n')}`, 400);  //`
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

    const charDocErrors = colUtil.getCharDocErrors(newCharDoc, designDoc);
    if(charDocErrors) {
      return getErrorObject("Errors validating, "+JSON.stringify(charDocErrors), 400);
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
      logger.info("TESTING, not actually inserting. Doc is "+JSON.stringify(uploadDoc));
      //await db.insert(uploadDoc); 
    }
    catch(err: any) {
      return getErrorObject("Error inserting change document, " + err, err.statusCode); //usually 409 for conflicts
    }
    //return getSuccessResponse("Changes uploaded, someone with editor permissions must publish these changes.");
    return false;
    //TODO: send email notifications to editors?
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
           async (req: TypedRequest<{gameId:string, characterId:string}, PublishChangeBody>, res) => {
           //async (req: Request<{gameId:string, characterId:string, changeTitle:string}>, res) => {
  let testoId: string = req.body.changeTitle;
  let error = await publishChange(req);
  if(error) sendError(res, error.message, error.status);
  else sendSuccess(res, "Changes published!");
});

//If justUploaded, can skip error checking on changeDoc. Currently unused.
async function publishChange(req: TypedRequest<{gameId:string, characterId:string}, PublishChangeBody>/*, justUploaded: boolean*/): Promise<false | ApiResponse> {
  try {
    const {gameId, characterId} = req.params;
    const changeTitle = req.body.changeTitle;
    const changeId = util.getChangeId(characterId, changeTitle); //if client provides invalid body type, this will fail
    let changeDoc: T.ChangeDocServer & Nano.DocumentGetResponse;
    const charDocId = util.getCharDocId(characterId);
    let charDoc: T.CharDocWithMeta;
    const db = adminNano.use(gameId);

    //fetch specified changeList
    try {
      changeDoc = await db.get(changeId) as T.ChangeDocServer & Nano.DocumentGetResponse;
    }
    catch(err) {
      return getErrorObject(`Error getting change ${changeId}: ${err}`, 404);
    }
    //fetch current charDoc
    try {
      charDoc = await db.get(charDocId) as T.CharDocWithMeta;
    }
    catch(err) {
      return getErrorObject(`Error getting character document ${charDocId}: ${err}`, 404);
    }

    //verify changeList's prevChange and baseRevision
    const lastHistoryItem = charDoc.changeHistory.at(-1);
    const prevChange = changeDoc.previousChange;
    if(charDoc._rev !== changeDoc.baseRevision) {
      return getErrorObject(`Outdated change: listed base revision ${changeDoc.baseRevision} does not match current revision, ${charDoc._rev}. Try importing the change.`, 422);
    }
    if(charDoc.changeHistory.length > 0) {
      if(prevChange !== lastHistoryItem) {
        return getErrorObject(`Outdated change: listed previous change ${prevChange} does not match final item of document's change history, ${lastHistoryItem}. Try importing the change.`, 422);
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
    //if(!justUploaded) {
      const designDoc = await db.get('_design/columns') as T.DesignDoc;
      const errors = colUtil.getCharDocErrors(charDoc, designDoc); //TODO: test that moveNames are actually checked against regex
      if(errors) {
        return getErrorObject("Errors validating, "+JSON.stringify(errors), 400);
      }
    //}

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
      return getErrorObject("Error inserting character document, " + err, err.statusCode);
    }
    return false;
  }
  catch(err) {
    return getErrorObject(`Server Error publishing change, ${err}`);
  }
}

router.post(CompileConstants.API_ADD_CHARACTER_MATCH, needsPermissions("GameAdmin"),
           async (req: TypedRequest<{gameId:string}, CreateCharacterBody>, res) => {
  try {
    const {gameId} = req.params;
    const db = adminNano.use(gameId);

    if(!req.body.charName || !req.body.displayName) {
      return sendError(res, "Body must specify charName and displayName", 400);
    }

    //sanitize character Id, displayName
    const charId = req.body.charName.trim();
    const displayName = req.body.displayName.trim();
    const user = getUser(req)?._id;

    if(!user) {
      return sendError(res, `No user`);
    }

    //validate charName against regex. 
    const charIdMatch = CompileConstants.ALLOWED_CHARACTER_ID_REGEX.test(charId);
    if(!charIdMatch) {
      return sendError(res, `Illegal character ID ${charId}`);
    }
    //validate display name
    const charDisplayNameMatch = CompileConstants.ALLOWED_CHARACTER_DISPLAY_NAME_REGEX.test(displayName);
    if(!charDisplayNameMatch) {
      return sendError(res, `Illegal character display name ${displayName}`);
    }

    //construct starting charDoc
    let charDoc: T.CharDoc & {_id: string} = {
      _id: util.getCharDocId(charId),
      charName: charId,
      updatedAt: util.getDateString(),
      updatedBy: user,
      changeHistory: [],
      universalProps: {characterDisplayName: displayName, moveOrder: []},
      moves: {},
    }

    try {
      const putResult = await db.insert(charDoc); 
    }
    catch(err: any) {
      if(err.statusCode === 409) {
        return sendError(res, `Error, a character with id ${charId} already exists (${err})`, err.statusCode);
      }
      else {
        return sendError(res, "Error creating character document, " + err, err.statusCode);
      }
    }

    return sendSuccess(res, "Character created!");
  }
  catch(err) {
    return sendError(res, `Server Error creating character, ${err}`);
  }
});

//router.delete(CompileConstants.API_CHARACTER_MATCH, needsPermissions("GameAdmin"),
           //async (req: TypedRequest<{gameId:string}, CreateCharacterBody>, res) => {
  //try {
  //}
  //catch(err) {
    //return sendError(res, `Server Error creating character, ${err}`);
  //}
//});



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
