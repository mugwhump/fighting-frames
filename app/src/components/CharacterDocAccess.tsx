import { useIonModal, useIonToast, IonPopover, IonContent, IonModal, IonRow } from '@ionic/react';
import React, { useRef, useReducer, useState, useCallback, useEffect, Dispatch, ReducerAction, MouseEvent }from 'react';
import { add, trashBin } from 'ionicons/icons';
import { useParams, useHistory, useLocation } from 'react-router';
import { Action } from 'history';
import { Link } from 'react-router-dom';
import { useDoc, usePouch } from 'use-pouchdb';
import { createContainer } from 'react-tracked';
//import {MoveOrder, ColumnDef, T.ColumnDefs, ColumnData, Cols, PropCols, MoveCols, T.CharDoc, T.ChangeDoc, T.ChangeDocWithMeta } from '../types/characterTypes';
import type * as T from '../types/characterTypes'; //==
import { getChangeListMoveOrder, getDefsAndData } from '../services/util';
import { State, CharacterContextProvider , useCharacterDispatch, useTrackedCharacterState , getInitialState, characterReducer, } from '../services/CharacterReducer';
import Character from './Character';
import { SegmentUrl } from './CharacterSegments';
import EditCharacter from './EditCharacter';
import MoveOrUniversalProps from './MoveOrUniversalProps';
import MoveEditModal from './MoveEditModal';
import { CategoryAndChildRenderer } from './CategoryAndChildRenderer';
import { setTimeout } from 'timers';


type CharProviderProps = {
  children: React.ReactNode,
  gameId: string,
}


export const CharacterDocAccess: React.FC<CharProviderProps> = ({children, gameId}) => {
  const { character } = useParams<{ character: string; }>(); //router has its own props
  const baseUrl = "/game/"+gameId+"/character/"+character;
  const localPersonalDatabase: PouchDB.Database = usePouch('localPersonal'); 
  const { doc, loading, state: docState, error } = useDoc<T.CharDoc>('character/'+character); 
  //TODO: manually load editChanges once
  //const [state, dispatch] = useReducer(Reducer, null, init); 
  const state = useTrackedCharacterState();
  const dispatch = useCharacterDispatch();
  const [presentToast, dismissToast] = useIonToast(); 
  const docEditId = baseUrl + SegmentUrl.Edit;

  //Initialization, start loading local edits (charDoc automatically starts reloading due to the hook)
  //Also called when switching characters.
  useEffect(() => {
    if(state.initialized) {
      console.log("Character "+character+" uninitialized. Loading character docs");
      dispatch({actionType:'deinitialize', character: character});
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

  // Present Alert
  useEffect(() => {
    if(state.toastOptions) {
      presentToast(state.toastOptions);
    }
    else {
      dismissToast();
    }
  }, [state.toastOptions]);


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
