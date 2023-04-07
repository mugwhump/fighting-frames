import { useIonToast, } from '@ionic/react';
import React, { useEffect, useCallback }from 'react';
import { useParams, useHistory } from 'react-router';
import { useDoc, usePouch } from 'use-pouchdb';
//import {MoveOrder, ColumnDef, T.ColumnDefs, ColumnData, Cols, PropCols, MoveCols, T.CharDoc, T.ChangeDoc, T.ChangeDocWithMeta } from '../types/characterTypes';
import type * as T from '../types/characterTypes'; //==
import * as myPouch from '../services/pouch';
import * as util from '../services/util';
import { PublishChangeBody } from '../types/utilTypes';
import { State, useCharacterDispatch, useTrackedCharacterState, useMiddleware, MiddlewareFn } from '../services/CharacterReducer';
import { SegmentUrl } from '../types/utilTypes';
import { cloneDeep } from 'lodash';


type CharProviderProps = {
  children: React.ReactNode,
  gameId: string,
}


export const CharacterDocAccess: React.FC<CharProviderProps> = ({children, gameId}) => {
  const { character } = useParams<{ character: string; }>(); //router has its own props
  //TODO: just use existing local db with no revisions or conflict? Need some changes to Local Provider then... and can't sync in future... use conflicty one??
  const remoteDatabase: PouchDB.Database = usePouch('remote'); 
  const localPersonalDatabase: PouchDB.Database = usePouch('localPersonal'); 
  const { doc, loading, state: docState, error } = useDoc<T.CharDoc>(util.getCharDocId(character)); 
  const state = useTrackedCharacterState();
  const dispatch = useCharacterDispatch();
  const history = useHistory();
  const [presentToast, dismissToast] = useIonToast(); 
  const docEditId = util.getDocEditId(gameId, character);

  //Initialization, start loading local edits (charDoc automatically starts reloading due to the hook)
  //Also called when switching characters.
  useEffect(() => {
    if(state.initialized) {
      console.log("Character "+character+" uninitialized. Loading character docs");
      dispatch({actionType:'deinitialize', characterId: character});
    }
    localPersonalDatabase.get<T.ChangeDoc>(docEditId).then((doc)=> {
      console.log("Loaded edit doc for "+character);
      dispatch({actionType:'loadEditsFromLocal', editChanges: doc});
    }).catch((err) => {
      console.log(`Edit doc for ${character} loading error: ${err.message}`);
      dispatch({actionType:'loadEditsFromLocal', editChanges: undefined});
    });
  }, [character, docEditId]);

  // Write edit doc if changed
  useEffect(() => {
    if(state.editsNeedWriting && state.initialized) {
      if(state.editChanges) {
        writeChangeList();
      }
      else { // Delete edit doc (can be triggered manually, or if all edits are reverted)
        deleteLocal();
      }
    }
  }, [state.editChanges, state.editsNeedWriting]);

  // load character document
  useEffect(() => {
    if(doc) {
      dispatch({actionType:'setCharDoc', charDoc:doc});
    }
  }, [doc]);


  async function writeChangeList() {
    //TODO: only do if local enabled. Also hide segments if not.
    if(!state.initialized) {
      console.error(`Docs for ${character} not yet initialized, cannot write changes.`);
    }
    if(!state.editChanges) {
      console.error(`${character} does not have changes to write.`); 
      return;
    }
    //TODO: This is NOT a copy, same in-memory JSON obj. changeList now has a runtime _id field (though typescript won't let you use it)
    //also a _rev field
    const putDoc: PouchDB.Core.PutDocument<T.ChangeDoc> = state.editChanges; 
    putDoc._id = docEditId; 
    try {
      const currentDoc = await localPersonalDatabase.get<T.ChangeDoc>(docEditId);
      putDoc._rev = currentDoc._rev;
    }
    catch(err) {
      putDoc._rev = undefined;
    }

    return await localPersonalDatabase.put(putDoc).then(() => {
      console.log("Successful write to edit doc");
      dispatch({actionType:'editsWritten'});
    }).catch((err) => {
      if(err.name === "conflict") { //if one write starts while another's in progress, 409 immediate conflict.
        console.log(`conflict writing edit, retrying: ` + JSON.stringify(err));
        writeChangeList();
      }
      else {
        throw(err);
      }
    });
  }

  async function deleteLocal() {
    console.log("Deleting local changes");
    try {
      const currentDoc = await localPersonalDatabase.get<T.ChangeDoc>(docEditId);
      try {
        await localPersonalDatabase.remove(docEditId, currentDoc._rev);
        dispatch({actionType:'editsWritten'});
      } catch(err) {
        console.error("Error deleting local edits: " + err);
      }
    }
    catch(err) {
      console.error("No local edits to delete: " + err);
    }
  }


  const uploadChangeListCallback: MiddlewareFn = useCallback((state, action, dispatch) => {
    if (action.actionType !== 'uploadChangeList') {
      console.warn("Upload changelist middleware being called for action "+action.actionType);
      return;
    }
    //const changeList: T.ChangeDocServer = action.changes;
    const changeList: T.ChangeDocServer = cloneDeep<T.ChangeDocServer>(action.changes); //TODO: just for testing
    //delete (changeList as any).conflictList;
    //delete (changeList as any).rebaseSource;
    //delete (changeList as any).mergeSource;
    //delete (changeList as any)._id;
    //delete (changeList as any)._rev; //type validation rejects extra props. Okay --remove-additional should make ajv strip them.
    //const id: string = util.getChangeId(state.characterId, changeList.updateTitle!);
    //console.log("Uploading ID " + id);
    //const uploadDoc: T.ChangeDocWithMeta = {...changeList, _id: id, _rev: undefined};

    //changeList.moveChanges!['testo #$%'] = {moveName: {type: 'add', new: 'testo #$%'}, madeUpListField: {type:'add', new: [' trim ', 'b']}};
    //changeList.moveChanges!['testo'] = {moveName: {type: 'add', new: 'testo'}, displayName: {type: 'add', new: 'test move'}}; //must pass
    //changeList.moveChanges!['universalProps '] = {moveName: {type: 'add', new: 'universalProps '}};
    //changeList.moveChanges!['1234567890123456789012345678901'] = {moveName: {type: 'add', new: '1234567890123456789012345678901'}};
    //changeList.moveChanges!['made_up_move#@!'] = {madeUpListField: {type:'add', new: [' trim ', 'b']}}; //caught due to made up field
    //changeList.moveChanges!['made_up_move#@!3'] = {damage: {type:'add', new: [' trim ', 'b']}}; //caught
    //changeList.moveChanges!['AA'] = {damage: {type:'add', new: [' trim ', 'b']}}; //caught
    //changeList.moveChanges!['made_up_move2'] = {madeUpListField: {type:'modify', new: 7, old:6}}; //caught
    //changeList.moveChanges!['bad_move_data'] = 2 as any as T.MoveChanges; //caught

    //changeList.universalPropChanges = {moveOrder: {type: 'modify', new: [{"name":"windy moves","isCategory":true},{"name":"AA"},{name: 'category no remove pls', isCategory: true},{name: '  trim'}], old:state.charDoc.universalProps.moveOrder}, madeUpCol: {type:'add', new: 7}}; 
    //console.log('Before sanitization '+JSON.stringify(changeList));
    //util.sanitizeChangeDoc(changeList);
    //console.log('After sanitization '+JSON.stringify(changeList));

    const apiUrl = util.getApiUploadChangeUrl(gameId, state.characterId, changeList.updateTitle);
    myPouch.makeApiCall(apiUrl, "PUT", changeList).then((res) => {
      console.log("Upload response = " + JSON.stringify(res));
      if(action.publish) {
        dispatch({actionType: 'publishChangeList', character: action.character, title: changeList.updateTitle, justUploaded: true});
      }
      else {
        presentToast("Changes uploaded. Someone with editor permissions must publish these changes to apply them to the character.", 6000);
        //TODO: redirect to this SPECIFIC change in changes section. Currently redirecting to frontpage or general changes section.
        let url = util.getSegmentUrl(gameId, state.characterId, action.publish ? SegmentUrl.Base : SegmentUrl.Changes);
        //history.push(url); TODO: disabled while testing
        //dispatch({actionType:'deleteEdits'});
      }
    }).catch((err) => {
      if(err.status === 409) {
        presentToast(`Changes named ${changeList.updateTitle} already exist`, 6000);
      }
      else if(err.status === 422) {
        //TODO: this means based on outdated charDoc, gotta fetch newer charDoc!
        presentToast(err.message, 6000);
      }
      else {
        presentToast('Upload failed: ' + err.message, 6000);
      }
      console.log("Upload error = " + err.message);
    });
  }, [gameId]);


  //can be called right after uploading, action.justUploaded indicates this
  const publishChangeListCallback: MiddlewareFn = useCallback((state, action, dispatch) => {
    if (action.actionType !== 'publishChangeList') {
      console.warn("Publish changelist middleware being called for action "+action.actionType);
      return;
    }

    let apiUrl = util.getApiPublishChangeUrl(gameId, action.character);
    const body: PublishChangeBody = {changeTitle: action.title};

    console.log(`Publishing changeDoc ${apiUrl} with payload ${JSON.stringify(body)}`);
    myPouch.makeApiCall(apiUrl, "PUT", body).then((res) => {
      //TODO: if this change was submitted by a user without write perms and current user is admin, prompt for whether to give author write perms
      console.log("Response: "+JSON.stringify(res));
      presentToast(res.message, 6000);
      let url = util.getSegmentUrl(gameId, state.characterId, SegmentUrl.Base); 
      //TODO: getting error about "Node to be removed is not a child of this node," can I access history here?
      history.push(url);
    }).catch((err) => {
      console.error("Error publishing change: "+ err.message);
      if(action.justUploaded) {
        presentToast(`Changes were uploaded successfully, but there was an error publishing them: ${err.message}`, 6000);
      }
      else {
        presentToast(`Error publishing change: ${err.message}`, 6000);
      }
    });
  }, [gameId]);


  //const uploadAndPublishChangeListCallback: MiddlewareFn = useCallback((state, action, dispatch) => {
    //if (action.actionType !== 'uploadAndPublishChangeList') {
      //console.warn("Upload+publish changelist middleware being called for action "+action.actionType);
      //return;
    //}
    ////const changeList: T.ChangeDocServer = action.changes;
    //const changeList: T.ChangeDocServer = cloneDeep<T.ChangeDocServer>(action.changes); //TODO: just for testing
    //const apiUrl = util.getApiUploadPublishChangeUrl(gameId, state.characterId, changeList.updateTitle); 
    //myPouch.makeApiCall(apiUrl, "PUT", changeList).then((res) => {
      //console.log("Upload+publish response = " + JSON.stringify(res));
      //presentToast(res.message, 6000);
      ////TODO: redirect to front page
      //let url = util.getSegmentUrl(gameId, state.characterId, SegmentUrl.Base);
      ////history.push(url); TODO: disabled while testing
      ////dispatch({actionType:'deleteEdits'});
    //}).catch((err) => {
      ////TODO: if status is 409 (conflict) and on local, gotta fetch newer charDoc!
      ////TODO: find what error you get from successfully uploading but failing to publish
      //console.log("Upload error = " + err.message);
      //presentToast('Upload failed: ' + err.message, 6000);
    //});
  //}, [gameId]);

  useMiddleware("CharacterDocAccess", 
                { uploadChangeList: uploadChangeListCallback, 
                  publishChangeList: publishChangeListCallback,
                  //uploadAndPublishChangeList: uploadAndPublishChangeListCallback,
                });


  if (docState === 'error') {
    console.error("heckin errorino in Character: " + error?.message);
    return (<span>heckin errorino: {error?.message}</span>);
  }
  if (!state.initialized) {
    return (<h1> loadin</h1>);
  }
  if(state.charDoc._id === "") {
    return (<h1>Empty document</h1>);
  }

  return (
    <>
      {children}
    </>
  )
  //return (
    //<DispatchContext.Provider value={dispatch}>
      //<CharacterContext.Provider value={state}>
        //{children}
      //</CharacterContext.Provider>
    //</DispatchContext.Provider>
  //);
};




export default CharacterDocAccess;
