import { useIonAlert } from '@ionic/react';
import React, { useEffect, useCallback }from 'react';
import { useParams, useHistory } from 'react-router';
import { useDoc, usePouch } from 'use-pouchdb';
//import {MoveOrder, ColumnDef, T.ColumnDefs, ColumnData, Cols, PropCols, MoveCols, T.CharDoc, T.ChangeDoc, T.ChangeDocWithMeta } from '../types/characterTypes';
import type * as T from '../types/characterTypes'; //==
import * as myPouch from '../services/pouch';
import * as util from '../services/util';
import { PublishChangeBody } from '../types/utilTypes';
import { State, useCharacterDispatch, useTrackedCharacterState, useMiddleware, MiddlewareFn } from '../services/CharacterReducer';
import { useMyToast } from '../services/hooks';
import { SegmentUrl } from '../types/utilTypes';
import { cloneDeep } from 'lodash';


type CharProviderProps = {
  children: React.ReactNode,
  gameId: string,
}


export const CharacterDocAccess: React.FC<CharProviderProps> = ({children, gameId}) => {
  const { characterId } = useParams<{ characterId: string; }>(); //router has its own props
  //TODO: just use existing local db with no revisions or conflict? Need some changes to Local Provider then... and can't sync in future... use conflicty one??
  const remoteDatabase: PouchDB.Database = usePouch('remote'); 
  const localPersonalDatabase: PouchDB.Database = usePouch('localPersonal'); 
  const { doc, loading, state: docState, error } = useDoc<T.CharDoc>(util.getCharDocId(characterId)); 
  const state = useTrackedCharacterState();
  const dispatch = useCharacterDispatch();
  const history = useHistory();
  const [presentMyToast, dismissToast] = useMyToast(); 
  const [presentAlert, dismissAlert] = useIonAlert(); 
  const docEditId = util.getDocEditId(gameId, characterId);

  //Initialization, start loading local edits (charDoc automatically starts reloading due to the hook)
  //Also called when switching characters.
  useEffect(() => {
    if(state.initialized) {
      console.log("Character "+characterId+" uninitialized. Loading character docs");
      dispatch({actionType:'deinitialize', characterId: characterId});
    }
    localPersonalDatabase.get<T.ChangeDoc>(docEditId).then((doc)=> {
      console.log("Loaded edit doc for "+characterId);
      dispatch({actionType:'loadEditsFromLocal', editChanges: doc});
    }).catch((err) => {
      console.log(`Edit doc for ${characterId} loading error: ${err.message}`);
      dispatch({actionType:'loadEditsFromLocal', editChanges: undefined});
    });
  }, [characterId, docEditId]);

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
      console.error(`Docs for ${characterId} not yet initialized, cannot write changes.`);
    }
    if(!state.editChanges) {
      console.error(`${characterId} does not have changes to write.`); 
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
    delete (changeList as any).conflictList;
    delete (changeList as any).rebaseSource;
    delete (changeList as any).mergeSource;
    delete (changeList as any)._id;
    delete (changeList as any)._rev; //type validation rejects extra props. Using --remove-additional is mistakenly stripping some things
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

    const [apiUrl, method] = util.getApiUploadChangeUrl(gameId, state.characterId, changeList.updateTitle);
    myPouch.makeApiCall(apiUrl, method, changeList).then((res) => {
      console.log("Upload response = " + JSON.stringify(res));
      if(action.publish) {
        dispatch({actionType: 'publishChangeList', character: action.character, title: changeList.updateTitle, justUploaded: true});
      }
      else {
        presentMyToast("Changes uploaded. Someone with editor permissions must publish these changes to apply them to the character.", 'success');
        //redirect to this specific change in changes section. Currently redirecting to frontpage or general changes section.
        let url = util.getChangeUrl(gameId, state.characterId, changeList.updateTitle);
        history.push(url); 
        //dispatch({actionType:'deleteEdits'});
      }
    }).catch((err) => {
      if(err.status === 409) {
        presentMyToast(`Changes named ${changeList.updateTitle} already exist`, 'danger');
      }
      else if(err.status === 422) {
        //TODO: this means based on outdated charDoc, gotta fetch newer charDoc!
        presentMyToast(err.message, 'danger');
      }
      else {
        presentMyToast('Upload failed: ' + err.message, 'danger');
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

    let [apiUrl, method] = util.getApiPublishChangeUrl(gameId, action.character);
    const body: PublishChangeBody = {changeTitle: action.title};

    console.log(`Publishing changeDoc ${apiUrl} with payload ${JSON.stringify(body)}`);
    myPouch.makeApiCall(apiUrl, method, body).then((res) => {
      //TODO: if this change was submitted by a user without write perms and current user is admin, prompt for whether to give author write perms
      console.log("Response: "+JSON.stringify(res));
      presentMyToast(res.message, 'success');
      let url = util.getCharacterUrl(gameId, state.characterId); 
      //TODO: getting error about "Node to be removed is not a child of this node," can I access history here? If so, close any alerts/popovers first.
      history.push(url);
    }).catch((err) => {
      console.error("Error publishing change: "+ err.message);
      if(action.justUploaded) {
        presentMyToast(`Changes were uploaded successfully, but there was an error publishing them: ${err.message}`, 'danger');
      }
      else {
        presentMyToast(`Error publishing change: ${err.message}`, 'danger');
      }
    });
  }, [gameId]);


  const promptImportChangesCallback: MiddlewareFn = useCallback((state, action, dispatch) => {
    if (action.actionType !== 'promptImportChanges') {
      console.warn("Publish changelist middleware being called for action "+action.actionType);
      return;
    }

    //forbid if have conflicts
    if(state.editChanges?.conflictList) {
      presentAlert("Your existing edits have unresolved conflicts. Resolve these conflicts before importing.");
    }
    else { 
      //TODO: navigate to edits after importing?
      if(state.editChanges) {
        presentAlert(`You have existing edits. Would you like to merge these changes with your own?`, 
          [ {text: 'Cancel', role: 'cancel'},
            {text: 'Yes', handler: () => {
              dispatch({actionType: "importChanges", changes: action.changes});
              let url = util.getEditUrl(gameId, state.characterId); 
              history.push(url);
            }},
          ]);
      }
      else {
        dispatch({actionType: "importChanges", changes: action.changes});
      }
    }
  }, [presentAlert]);


  useMiddleware("CharacterDocAccess", 
                { uploadChangeList: uploadChangeListCallback, 
                  publishChangeList: publishChangeListCallback,
                  promptImportChanges: promptImportChangesCallback,
                });


  if (docState === 'error') {
    console.error("heckin errorino in CharacterDocAccess: " + JSON.stringify(error));
    if(error?.status && error.status === 404) {
      const deletedString = (error.reason === "deleted") ? "(Deleted)" : "";
      return (<div>Character {characterId} does not exist {deletedString}</div>);
    }
    return (<span>Error loading character: {error?.message}</span>);
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
