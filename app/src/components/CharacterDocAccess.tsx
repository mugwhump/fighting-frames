import { useIonToast, } from '@ionic/react';
import React, { useEffect, useCallback }from 'react';
import { useParams, useHistory } from 'react-router';
import { useDoc, usePouch } from 'use-pouchdb';
//import {MoveOrder, ColumnDef, T.ColumnDefs, ColumnData, Cols, PropCols, MoveCols, T.CharDoc, T.ChangeDoc, T.ChangeDocWithMeta } from '../types/characterTypes';
import type * as T from '../types/characterTypes'; //==
import * as myPouch from '../services/pouch';
import * as util from '../services/util';
import { State, useCharacterDispatch, useTrackedCharacterState, useMiddleware, MiddlewareFn } from '../services/CharacterReducer';
import { SegmentUrl } from '../types/utilTypes';


type CharProviderProps = {
  children: React.ReactNode,
  gameId: string,
}


export const CharacterDocAccess: React.FC<CharProviderProps> = ({children, gameId}) => {
  const { character } = useParams<{ character: string; }>(); //router has its own props
  //TODO: just use existing local db with no revisions or conflict? Need some changes to Local Provider then... and can't sync in future... use conflicty one??
  const remoteDatabase: PouchDB.Database = usePouch('remote'); 
  const localPersonalDatabase: PouchDB.Database = usePouch('localPersonal'); 
  const { doc, loading, state: docState, error } = useDoc<T.CharDoc>('character/'+character); 
  const state = useTrackedCharacterState();
  const dispatch = useCharacterDispatch();
  const history = useHistory();
  const [presentToast, dismissToast] = useIonToast(); 
  const docEditId = util.getSegmentUri(gameId, character, SegmentUrl.Edit);

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
    const changeList: T.ChangeDocServer = action.changes;
    const id: string = util.getChangeId(state.characterId, changeList.updateTitle!);
    console.log("Uploading ID " + id);
    const uploadDoc: T.ChangeDocWithMeta = {...changeList, _id: id, _rev: undefined};
    remoteDatabase.put(uploadDoc).then((response) => {
      console.log("Upload response = " + JSON.stringify(response));
      presentToast("Changes uploaded! Someone with write permissions must publish these changes.", 6000);
      //TODO: redirect to this specific change in changes section, with info on how it was just published?. Also lets writers publish what they just uploaded.
      let url = util.getSegmentUri(gameId, state.characterId, SegmentUrl.Changes);
      history.push(url);
      dispatch({actionType:'deleteEdits'});
    }).catch((err) => {
      console.log("Upload error = " + JSON.stringify(err));
      presentToast('Upload failed: ' + err.message, 6000);
    });
  }, [gameId]);

  const publishChangeListCallback: MiddlewareFn = useCallback((state, action, dispatch) => {
    if (action.actionType !== 'publishChangeList') {
      console.warn("Publish changelist middleware being called for action "+action.actionType);
      return;
    }
    let changeId = action.changeListId;
    console.log("Publishing changeDoc " + changeId);
    myPouch.makeApiCall(`game/${gameId}/${changeId}/publish`, "POST").then((data) => {
      console.log("Response: "+JSON.stringify(data));
      presentToast("Change successfully published!", 3000);
      let url = util.getSegmentUri(gameId, state.characterId, SegmentUrl.Base); 
      history.push(url);
    }).catch((err) => {
      console.error("Error publishing change: "+ err.message);
      presentToast("Error publishing change: "+ err.message, 6000);
    });
  }, [gameId]);

  useMiddleware("CharacterDocAccess", {uploadChangeList: uploadChangeListCallback, publishChangeList: publishChangeListCallback});


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
