//var express = require('express');
import express, { Express, Request, Response, NextFunction } from 'express';
import nodeUtil from 'util'; //node's util
import logger from '../util/logger';
import * as Security from '../shared/services/security';
import { secrets } from "docker-secret";
import couchAuth from './couchauth';
import { adminNano, TypedRequest, getSuccessObject, sendSuccess, getErrorObject, sendError, needsPermissions, getUser, mySleep } from '../util/expressUtil';
import * as CouchAuthTypes from '@perfood/couch-auth/lib/types/typings';
import { cloneDeep, isEqual, set } from 'lodash';
import * as Nano from 'nano';
import type * as T from '../shared/types/characterTypes'; //= //not included in runtime buildo
import type { ApiResponse, PublishChangeBody, CreateCharacterBody, CreateGameBody, ListChangesViewRow, ListChangesViewRowValue } from '../shared/types/utilTypes'; //= 
import { findSharedElements } from '../util/helper';
import * as intCols from '../shared/constants/internalColumns';
import * as colUtil from '../shared/services/columnUtil';
import * as util from '../shared/services/util';
import * as metaDefs from '../shared/constants/metaDefs';
import * as merging from '../shared/services/merging';
import CompileConstants from '../shared/constants/CompileConstants';


const couch_replicator_user = secrets.couch_replicator_user;
const couch_replicator_password = secrets.couch_replicator_password;

//TODO: what if multiple requests use these objects at once?
const DesignDocValidator = require('../schema/DesignDoc-validator').default;
const ChangeDocValidator = require('../schema/ChangeDocServer-validator').default;
const SecObjValidator = require('../schema/SecObj-validator').default;

const router = express.Router();
const testUser = 'joesmith2';

const testObject = {val: 1};

//TODO: make custom error handler for nonexistent endpoint or method, right now express returns html


/**
 * POST. Creates a new game. Non-atomic operation; partial failure allows users to retry.
 * Successful once entry is created in top/game-list
 */
router.post(CompileConstants.API_CREATE_GAME_MATCH ,// needsPermissions("ServerManager"), TODO: TESTING
           async (req: TypedRequest<{}, CreateGameBody>, res) => {
  try {
    const gameId = req.body.gameId;
    let displayName = req.body.displayName;

    if(typeof gameId !== 'string' || typeof displayName !== 'string') {
      return sendError(res, `game ID and displayed name must be strings`, 400);
    }

    //validate gameId
    let validId = CompileConstants.ALLOWED_GAME_ID_REGEX.test(gameId);
    if(!validId) {
      return sendError(res, `Invalid game ID ${gameId}`, 400);
    }

    //trim displayName, reject if doesn't pass regex
    displayName = displayName.trim();
    let validDisplayName = CompileConstants.ALLOWED_GAME_DISPLAY_NAME_REGEX.test(displayName);
    if(!validDisplayName) {
      return sendError(res, `Invalid game display name ${displayName}`, 400);
    }

    let allDBs = await adminNano.db.list();
    const replicatorDB = adminNano.use('_replicator');
    const topDB = adminNano.use<T.DBListDoc>('top');

    //check db doesn't exist.
    if(allDBs.includes(gameId)) {
      const gameList = await topDB.get('game-list');
      const topDbs = gameList.dbs.map((item: T.DBListDocItem) => item.gameId);
      if(topDbs.includes(gameId)) {
        return sendError(res, `Database for ${gameId} already exists`, 409);
      }
      else {
        // Possible user is re-attempting to complete creation of a db that didn't finish; log a warning
        logger.error(`Trying to add game ${gameId} which already has a database but isn't in top/game-list; proceeding with future steps`)
      }
    }

    //call replicator update func to create replication document which makes db
    //request body must contain username, password, id. (uname/pw should be the replication user, make sure to do separate catch so creds not sent in err msgs).
    //Request headers.Host should be like http://localhost:5984 (no trailing slash)
    try {
      const body = {username: couch_replicator_user, password: couch_replicator_password, id: gameId};
      //const body = {username: 'fakecreds', password: 'errortime', id: gameId};
      //const body = {username: 'fakecreds', id: gameId};
      const updateResponseMsg = await replicatorDB.updateWithHandler('replicate_from_template', 'create', gameId, body); 
      logger.info(`replication doc resp msg is ${JSON.stringify(updateResponseMsg)}`);
      logger.info(`replication doc resp okayness is ${updateResponseMsg.ok}`);
      if(!updateResponseMsg.ok) throw new Error(nodeUtil.inspect(updateResponseMsg));

      // If doc was successfully created in _replicator but, say, creds are bad, the db will silently fail to be created. Check for success.
      const retryTimeMs = 2000;
      //const maxTimeMs = 20000; //TODO: switch back once done testing
      const maxTimeMs = 5000;
      const startTime = (new Date).getTime();

      do {
        await mySleep(retryTimeMs); 
        //wait a bit so replicator has time to make db
        allDBs = await adminNano.db.list(); 
        logger.info(`Checking for creation of db ${gameId}`)
      }
      while (!allDBs.includes(gameId) && (new Date).getTime() - startTime < maxTimeMs);

      if(!allDBs.includes(gameId)) {
        return sendError(res, `Timed out waiting for database creation for game ${gameId}`, 500);
      }
    }
    catch(err: any) {
      return sendError(res, `Error inserting replication document, ${err}`, err.statusCode || (err.status ?? 500));
    }

    //make _design/columns. Catch 409, that indicates retrying after partial success
    const configDoc: Omit<T.DesignDoc, '_rev'> = {
      _id: '_design/columns',
      displayName: displayName,
      universalPropDefs: {},
      columnDefs: {},
    }
    const createdDB = adminNano.use(gameId);
    try {
      const insertResult = await createdDB.insert(configDoc);
    }
    catch(err: any) {
      if(err.status === 409) {
        logger.error(`Error creating db ${gameId}, _design/columns already exists. Proceeding.`);
      }
      else {
        return sendError(res, `Error creating db ${gameId}, _design/columns could not be created. ${err.message}`, err.status || 400);
      }
    }

    //update _security w read role. Only incomplete dbs not in top make it to this step, so won't overwrite customized perms.
    const secDoc: Security.SecObj = {
      admins: { names: [], roles: ['_admin'] },
      members: { names: [], roles: ['read'] },
      uploaders: [],
    }
    const putResult = await createdDB.insert(secDoc as Nano.MaybeDocument, '_security'); 

    //modify top list
    const updateResponseMsg = await topDB.updateWithHandler('update_list', 'add_game', 'game-list', req.body); 

    return sendSuccess(res, `Created database for game`);
  }
  catch(err: any) {
    return sendError(res, `Error creating game, ${err}`, err.status ?? 500);
  }
});


/**
 * PUT. Upload new configuration which defines a game's columns, their restrictions, the game's displayed name, etc.
 * Body contains configuration document.
 * TODO: check if game displayName has changed; if so, modify its entry in top/list
 */
router.put(CompileConstants.API_CONFIG_MATCH, needsPermissions("GameAdmin"), 
           async (req: Request<{gameId:string}>, res) => {
  try {
    const db = adminNano.use(req.params.gameId);

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
      logger.warn('Validation result: '+JSON.stringify(DesignDocValidator.errors)+' for design doc '+JSON.stringify(newDesignDoc));
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


/**
 * PUT. Upload new _security document. Only applies given admins.names, members.names, and uploaders. 
 * Body contains SecObj document.
 * TODO: should Game Admins be allowed to remove Game Admins?
 */
router.put(CompileConstants.API_AUTHORIZED_USERS_MATCH, needsPermissions("GameAdmin"), 
           async (req: TypedRequest<{gameId:string}, Security.SecObj>, res) => {
  try {
    const {gameId} = req.params;
    const submittedSecObj: Security.SecObj = req.body;
    const gameDb = adminNano.use(gameId);
    const couchAuthDb = adminNano.use('sl-users');

    logger.info("Submitting new SecObj "+JSON.stringify(submittedSecObj));

    // fetch current doc
    const currentSecObj = await gameDb.get('_security') as Security.SecObj;

    //check that no public/user in admins. Wouldn't do anything but it's confusing.
    if(submittedSecObj.admins?.names?.includes('public') || submittedSecObj.admins?.names?.includes('user')) {
      return sendError(res, "Cannot include public or user in game admins", 400);
    }

    //user should only be in one of admins/members/uploaders. 
    //OK to be server manager and also something else, otherwise would need to remove them from all db perms upon giving manager role
    const sharedElements = findSharedElements([submittedSecObj.admins?.names ?? [], submittedSecObj.members?.names ?? [], submittedSecObj.uploaders ?? []]);
    if(sharedElements.length > 0) {
      return sendError(res, "Error, users "+sharedElements.join(", ")+" are present in multiple roles. Only include users in the highest role you want them to have.", 400);
    }

    //type validation
    let typeValidationResult = SecObjValidator(submittedSecObj);
    if(typeValidationResult) {
      logger.info('SecObj Type validation successful');
    }
    else {
      logger.warn('Validation result: '+JSON.stringify(SecObjValidator.errors)+' for _security doc '+JSON.stringify(submittedSecObj));
      return sendError(res, "Type validation failed", 400);
    }

    //check that right names are either "public", "user", or a SL user
    //TODO: write custom view that only returns verified accounts? Even if they get perms, non-verified accounts still get rejected by credential middleware
    const allUsers: Nano.DocumentViewResponse<null, unknown> = await couchAuthDb.view('auth', 'key');
    let submittedUsers = [...submittedSecObj.admins?.names ?? [], ...submittedSecObj.members?.names ?? [], ...submittedSecObj.uploaders ?? []];
    submittedUsers = [...new Set(submittedUsers)];
    const realUsers = allUsers.rows.map((row) => row.key);
    const fakeSubmittedUsers = submittedUsers.filter((submitted) => submitted !== 'public' && submitted !== 'user' && !realUsers.includes(submitted));
    if(fakeSubmittedUsers.length > 0) {
      return sendError(res, "Users '"+fakeSubmittedUsers.join("', '")+"' do not exist. Please double-check spelling and enter their username, not their email.", 400);
    }

    //merge submitted names onto current doc
    if(submittedSecObj.admins?.names) set(currentSecObj, 'admins.names', submittedSecObj.admins.names);
    if(submittedSecObj.members?.names) set(currentSecObj, 'members.names', submittedSecObj.members.names);
    if(submittedSecObj.uploaders) currentSecObj.uploaders = submittedSecObj.uploaders;

    //upload new _security doc
    try {
      const putResult = await gameDb.insert(currentSecObj as Nano.MaybeDocument, '_security'); 
    }
    catch(err: any) {
      return sendError(res, "Error updating authorized users: " + err, err.statusCode);
    }

    return sendSuccess(res, "Successfully updated authorized users");
  }
  catch(err) {
    return sendError(res, `Server Error to ${req.url}, ${err}`);
  }
});

/**
 * PUT. Upload new changes for given character. Body contains change document.
 * Not applied to character until this change is published.
 */
router.put(CompileConstants.API_CHANGE_MATCH, needsPermissions("Uploader"),
           async (req: Request<{gameId:string, characterId:string, changeTitle:string}>, res) => {
  let error = await uploadChange(req);
  if(error) sendError(res, error.message, error.status);
  else sendSuccess(res, "Changes uploaded, someone with editor permissions must publish these changes.", 201);
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
    let typeValidationResult = ChangeDocValidator(changeDoc); //NOTE: this mutates changeDoc by removing additional properties!
    if(typeValidationResult) {
      logger.info('Type validation successful');
    }
    else {
      logger.warn("Type validation errors "+JSON.stringify(ChangeDocValidator.errors));
      //logger.info("In changeDoc "+JSON.stringify(changeDoc));
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
    const designDoc = await db.get('_design/columns') as T.DesignDoc; 
    designDoc.universalPropDefs = colUtil.insertDefsSortGroupsCompileRegexes(designDoc.universalPropDefs, true, true, false, false);
    designDoc.columnDefs = colUtil.insertDefsSortGroupsCompileRegexes(designDoc.columnDefs, false, true, false, false);

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

    const charDocErrors = colUtil.getCharDocErrors(newCharDoc, designDoc, true);
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
      //logger.info("Before >> "+JSON.stringify(charDoc));
      //logger.info("After >> "+JSON.stringify(newCharDoc));
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
      //logger.info("TESTING, not actually inserting. Doc is "+JSON.stringify(uploadDoc));
      await db.insert(uploadDoc); 
    }
    catch(err: any) {
      return getErrorObject("Error inserting change document, " + err, err.statusCode); //usually 409 for conflicts
    }
    return false;
    //TODO: send email notifications to editors?
  }
  catch(err) {
    return getErrorObject(`Server Error uploading change, ${err}`);
  }
}

/**
 * PATCH. Update character by publishing an existing change. Body contains title of said change.
 */
router.patch(CompileConstants.API_CHARACTER_MATCH, needsPermissions("Editor"),
           async (req: TypedRequest<{gameId:string, characterId:string}, PublishChangeBody>, res) => {
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
      const errors = colUtil.getCharDocErrors(charDoc, designDoc, true); //skips moveName checks
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

/**
 * POST - create a new character. Body contains id and display name.
 */
router.post(CompileConstants.API_CHARACTERS_MATCH, needsPermissions("GameAdmin"),
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

    return sendSuccess(res, "Character created!", 201);
  }
  catch(err) {
    return sendError(res, `Server Error creating character, ${err}`);
  }
});

/**
 * DELETE. Delete character *and* all changes. 
 */
router.delete(CompileConstants.API_CHARACTER_MATCH, needsPermissions("Reader"), //TODO: change back to GameAdmin once testing done
           async (req: Request<{gameId:string, characterId:string}>, res) => {
  try {
    const {gameId, characterId} = req.params;
    const db = adminNano.use(gameId);
    const charDocId = util.getCharDocId(characterId);
    let charDoc: T.CharDocWithMeta;

    //fetch current charDoc
    try {
      charDoc = await db.get(charDocId) as T.CharDocWithMeta;
    }
    catch(err) {
      return sendError(res, `Error getting character document ${charDocId}: ${err}`, 404);
    }

    const viewParams: Nano.DocumentViewParams = {descending: true, startkey: [characterId, {}], endkey: [characterId]};
    const allChanges: Nano.DocumentViewResponse<ListChangesViewRowValue, unknown> = await db.view('changes', 'list-changes', viewParams);
    const deleteDocIds: {_id: string, _rev: string, _deleted: true}[] = allChanges.rows.map((row) => ({_id: row.id, _rev: row.value._rev, _deleted: true}));
    deleteDocIds.push({_id: charDocId, _rev: charDoc._rev, _deleted: true});

    try {
      const deleteResult = await db.bulk({docs: deleteDocIds});
      console.info("Delete result is " + JSON.stringify(deleteResult));
      
      let failedCharDocDeletion: Nano.DocumentBulkResponse | null = null;
      let failedChangeDeletions: string[] = [];
      //log all errors
      for(const resultItem of deleteResult) {
        if(resultItem.error) {
          if(resultItem.id === charDocId) {
            failedCharDocDeletion = resultItem;
          }
          else {
            failedChangeDeletions.push(resultItem.id);
          }
          logger.error(`Deletion of document ${resultItem.id} during deletion of character ${characterId} failed with ${resultItem.error}: ${resultItem.reason}`);
        }
      }
      //Tell user there was an error if charDoc didn't delete
      if(failedCharDocDeletion) {
        return sendError(res, `Error deleting character (${failedCharDocDeletion.error}: ${failedCharDocDeletion.reason})`, 400);
      }
      //If charDoc did delete but some change docs didn't, let user see that as success (since char is gone from their perspective), but log an error to clean up.
      else if(failedChangeDeletions.length > 0) {
        logger.error(`Deletion of changes ${failedChangeDeletions.join(', ')} during deletion of character ${characterId} failed although the character doc was deleted. Requires manual cleanup.`);
        return sendSuccess(res, `Character ${characterId} has been deleted, though some of their changes weren't.`, 200);
      }
    }
    catch(bulkDeleteErr: any) {
      return sendError(res, `Error during bulk deletion, ${bulkDeleteErr}`, bulkDeleteErr.statusCode);
    };

    return sendSuccess(res, `Character ${characterId} and all of their changes have been deleted`, 200);
  }
  catch(err) {
    return sendError(res, `Server Error deleting character, ${err}`);
  }
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

//router.get('/gettest', function(req, res, next) {
  //testObject.val++;
  ////return sendSuccess(res, `test val = ${testObject.val}, imported val = ${testModuleObj.val} now incrementing`);
  //return sendSuccess(res, `Stringified nano ` + JSON.stringify(adminNano));
//});

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
